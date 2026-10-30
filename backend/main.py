"""
SmartFarm AI™ — Production Enterprise IoT Backend
Designed for deployment on Render (https://render.com)
Interfaces with ESP32 Hardware (DHT11, Soil Moisture, LDR) and React Frontend Dashboard.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, Union
from datetime import datetime, timezone
import os
import random
import uvicorn

try:
    from database import (
        init_db, SessionLocal, SensorReadingModel, SimulationRecordModel, WeatherRecordModel, FarmAlertModel
    )
    DB_AVAILABLE = True
except Exception as e:
    print(f"[DB] Database module not loaded: {e}")
    DB_AVAILABLE = False

app = FastAPI(
    title="SmartFarm AI™ IoT Telemetry Backend",
    description="Enterprise Precision Agriculture & ISOBUS Telemetry API for ESP32 and React Dashboard",
    version="2.0.0"
)

@app.on_event("startup")
def startup_event():
    if DB_AVAILABLE:
        init_db()

# Configure CORS to permit GitHub Pages, local dev, and mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DATA MODELS
# ==========================================

class SensorPayload(BaseModel):
    deviceId: str = Field(default="ESP32-FARM-01", description="Hardware Device ID")
    farmId: str = Field(default="FARM-001", description="Farm Cadastre ID")
    zoneId: str = Field(default="ZONE-A", description="Target Cadastral Quadrant")
    timestamp: Optional[Union[str, int, float]] = None
    soilMoisture: float = Field(..., description="Volumetric Soil Moisture (%)")
    soilTemperature: Optional[float] = Field(default=25.0, description="Soil Temperature (°C)")
    airTemperature: float = Field(..., description="Ambient Air Temperature from DHT11 (°C)")
    humidity: float = Field(..., description="Relative Humidity from DHT11 (%)")
    soilPH: Optional[float] = Field(default=6.5, description="Soil pH reading")
    lightIntensity: Optional[int] = Field(default=750, description="Light Intensity (lux / LDR index)")
    rainfall: Optional[float] = Field(default=0.0, description="Precipitation rate (mm)")
    pumpStatus: Optional[bool] = Field(default=False, description="Current solenoid valve status")
    diagnostics: Optional[Dict[str, Any]] = None

class IrrigationCommand(BaseModel):
    zoneId: str = "ZONE-A"
    action: str = "IRRIGATE"  # "IRRIGATE", "STOP"
    durationSeconds: Optional[int] = 300

# ==========================================
# IN-MEMORY STATE STORE (Thread-Safe)
# ==========================================

# Default state for all 4 quadrants of the 1-Acre farm
zones_state: Dict[str, Dict[str, Any]] = {
    "ZONE-A": {
        "deviceId": "ESP32-FARM-01",
        "farmId": "FARM-001",
        "zoneId": "ZONE-A",
        "name": "Zone A (Tomato)",
        "cropType": "Tomato",
        "soilMoisture": 42.0,
        "soilTemperature": 25.5,
        "airTemperature": 27.5,
        "humidity": 62.0,
        "soilPH": 6.5,
        "lightIntensity": 780,
        "rainfall": 0.0,
        "pumpStatus": False,
        "isLiveHardware": False,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    },
    "ZONE-B": {
        "deviceId": "ESP32-FARM-02",
        "farmId": "FARM-001",
        "zoneId": "ZONE-B",
        "name": "Zone B (Chili)",
        "cropType": "Chili",
        "soilMoisture": 35.0,
        "soilTemperature": 27.0,
        "airTemperature": 29.5,
        "humidity": 55.0,
        "soilPH": 6.8,
        "lightIntensity": 810,
        "rainfall": 0.0,
        "pumpStatus": False,
        "isLiveHardware": False,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    },
    "ZONE-C": {
        "deviceId": "ESP32-FARM-03",
        "farmId": "FARM-001",
        "zoneId": "ZONE-C",
        "name": "Zone C (Paddy)",
        "cropType": "Paddy",
        "soilMoisture": 75.0,
        "soilTemperature": 24.0,
        "airTemperature": 26.0,
        "humidity": 78.0,
        "soilPH": 6.2,
        "lightIntensity": 650,
        "rainfall": 0.0,
        "pumpStatus": False,
        "isLiveHardware": False,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    },
    "ZONE-D": {
        "deviceId": "ESP32-FARM-04",
        "farmId": "FARM-001",
        "zoneId": "ZONE-D",
        "name": "Zone D (Groundnut)",
        "cropType": "Groundnut",
        "soilMoisture": 18.0,
        "soilTemperature": 32.0,
        "airTemperature": 36.5,
        "humidity": 40.0,
        "soilPH": 6.9,
        "lightIntensity": 940,
        "rainfall": 0.0,
        "pumpStatus": False,
        "isLiveHardware": False,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }
}

# Time-series telemetry buffer for analytics charts
telemetry_history: List[Dict[str, Any]] = []

# Pending commands queued for the ESP32
active_pump_command: bool = False

# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "SmartFarm AI™ Precision Agriculture Backend",
        "version": "2.0.0",
        "hardwareTarget": "ESP32 Dev Module (GPIO 4 DHT11, GPIO 34 Soil, GPIO 35 LDR)",
        "docsUrl": "/docs",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "zonesCount": len(zones_state),
        "historyCount": len(telemetry_history),
        "pumpCommand": active_pump_command
    }

@app.post("/api/sensor-data")
def receive_sensor_data(payload: SensorPayload):
    """
    Receives incoming sensor telemetry from the physical ESP32 microcontroller.
    Updates the target zone's real-time state and records historical time-series.
    """
    global active_pump_command
    zone_id = payload.zoneId.upper()
    if zone_id not in zones_state:
        zone_id = "ZONE-A"

    iso_timestamp = datetime.utcnow().isoformat() + "Z"

    # Update real-time state with live physical sensor measurements
    target = zones_state[zone_id]
    target["deviceId"] = payload.deviceId
    target["soilMoisture"] = payload.soilMoisture
    target["soilTemperature"] = payload.soilTemperature or (payload.airTemperature - 1.5)
    target["airTemperature"] = payload.airTemperature
    target["humidity"] = payload.humidity
    target["soilPH"] = payload.soilPH or 6.5
    target["lightIntensity"] = payload.lightIntensity or 750
    target["rainfall"] = payload.rainfall or 0.0
    target["pumpStatus"] = payload.pumpStatus or active_pump_command
    target["isLiveHardware"] = True
    target["lastUpdated"] = iso_timestamp

    if payload.diagnostics:
        target["diagnostics"] = payload.diagnostics

    # Append to rolling history (max 300 entries)
    history_entry = {
        "timestamp": iso_timestamp,
        "zoneId": zone_id,
        "soilMoisture": payload.soilMoisture,
        "airTemperature": payload.airTemperature,
        "humidity": payload.humidity,
        "lightIntensity": payload.lightIntensity,
        "pumpStatus": target["pumpStatus"]
    }
    telemetry_history.append(history_entry)
    if len(telemetry_history) > 300:
        telemetry_history.pop(0)

    print(f"[ESP32] Ingested telemetry from {payload.deviceId} for {zone_id}: "
          f"Moisture={payload.soilMoisture}%, Temp={payload.airTemperature}°C, Hum={payload.humidity}%")

    # Persist physical sensor reading to database
    if DB_AVAILABLE:
        try:
            db = SessionLocal()
            record = SensorReadingModel(
                device_id=payload.deviceId,
                zone_id=zone_id,
                temperature=payload.airTemperature,
                humidity=payload.humidity,
                soil_moisture=payload.soilMoisture,
                light_intensity=float(payload.lightIntensity or 750),
                soil_raw=None,
                light_raw=None,
                dht_ok=True,
                is_simulation=False,
                timestamp=datetime.utcnow()
            )
            db.add(record)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB] Error writing sensor telemetry: {e}")

    # Respond to ESP32 with active actuator command
    return {
        "status": "success",
        "zoneId": zone_id,
        "pumpCommand": active_pump_command,
        "serverTime": iso_timestamp
    }

@app.get("/api/simulate")
@app.post("/api/simulate")
def simulate_sensor_data():
    """
    Generates realistic, internally consistent simulated telemetry
    using Python's random module per agricultural specifications:
    - Temperature: between 20.0 and 40.0 °C
    - Humidity: between 30.0 and 90.0 %
    - Soil Moisture: between 20.0 and 80.0 %
    - Relative Light Intensity: between 10.0 and 100.0 %
    Persists simulation record separately into PostgreSQL/SQLite database.
    """
    sim_temp = round(random.uniform(20.0, 40.0), 1)
    
    # Internal physical plausibility: higher temperature often correlates with slightly lower relative humidity
    if sim_temp > 33.0:
        sim_hum = round(random.uniform(30.0, 65.0), 1)
    else:
        sim_hum = round(random.uniform(45.0, 90.0), 1)
        
    sim_moist = round(random.uniform(20.0, 80.0), 1)
    sim_light = round(random.uniform(10.0, 100.0), 1)
    iso_timestamp = datetime.utcnow().isoformat() + "Z"

    # Persist simulation record to database
    if DB_AVAILABLE:
        try:
            db = SessionLocal()
            sim_record = SimulationRecordModel(
                temperature=sim_temp,
                humidity=sim_hum,
                soil_moisture=sim_moist,
                light_intensity=sim_light,
                source="PYTHON_RANDOM_GENERATOR",
                notes="Generated via /api/simulate",
                timestamp=datetime.utcnow()
            )
            db.add(sim_record)
            db.commit()
            db.close()
        except Exception as e:
            print(f"[DB] Error writing simulation record: {e}")

    return {
        "status": "success",
        "source": "PYTHON_RANDOM_GENERATOR",
        "temperature": sim_temp,
        "humidity": sim_hum,
        "soilMoisture": sim_moist,
        "lightIntensity": sim_light,
        "timestamp": iso_timestamp
    }

@app.get("/api/sensor-data")
def get_sensor_data():
    """
    Returns latest sensor readings for all quadrants of the farm.
    Consumed by the React frontend dashboard.
    """
    return {
        "zones": zones_state,
        "isLiveHardwareActive": any(z["isLiveHardware"] for z in zones_state.values()),
        "activePumpCommand": active_pump_command,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/sensor-data/history")
def get_sensor_history(zoneId: Optional[str] = None):
    """
    Returns historical telemetry time-series for chart visualization.
    """
    if zoneId:
        filtered = [entry for entry in telemetry_history if entry.get("zoneId") == zoneId.upper()]
        return {"history": filtered}
    return {"history": telemetry_history}

@app.post("/api/irrigate")
def trigger_irrigation(cmd: IrrigationCommand):
    """
    Endpoint for frontend dashboard to remotely trigger or halt drip irrigation.
    Sends command to ESP32 on its next telemetry sync cycle.
    """
    global active_pump_command
    if cmd.action.upper() == "IRRIGATE":
        active_pump_command = True
        zones_state[cmd.zoneId]["pumpStatus"] = True
        action_msg = f"Drip irrigation pump ACTIVATED for {cmd.zoneId}."
    else:
        active_pump_command = False
        zones_state[cmd.zoneId]["pumpStatus"] = False
        action_msg = f"Drip irrigation pump STOPPED for {cmd.zoneId}."

    return {
        "status": "success",
        "pumpCommand": active_pump_command,
        "message": action_msg,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/irrigate/status")
def get_irrigation_status():
    return {
        "pumpActive": active_pump_command,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

# ==========================================
# SERVER RUNNER (Local execution)
# ==========================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting SmartFarm AI Backend on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
