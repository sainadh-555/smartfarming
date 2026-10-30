"""
SmartFarm AI™ — PostgreSQL & SQLite Database Integration Layer
==============================================================
Provides persistent storage for:
- Sensor readings (ESP32 hardware telemetry)
- Simulation records (generated test data)
- Weather cache (Open-Meteo records)
- Farm alerts & events

Supports PostgreSQL via DATABASE_URL environment variable,
with automatic SQLite fallback for local development.
Never exposes credentials to the frontend.
"""

import os
import datetime
from sqlalchemy import (
    create_engine, Column, Integer, Float, String, Boolean, DateTime, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL from environment (e.g. postgresql://user:pass@host/dbname on Render)
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Fix Render's legacy postgres:// prefix for SQLAlchemy
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    # Local fallback SQLite database
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'smartfarm.db')}"

# Create SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==========================================
# DATABASE MODELS
# ==========================================

class SensorReadingModel(Base):
    """Stores actual physical hardware readings from ESP32."""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), default="ESP32-FARM-01", index=True)
    zone_id = Column(String(20), default="ZONE-A", index=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    soil_moisture = Column(Float, nullable=True)
    light_intensity = Column(Float, nullable=True)
    soil_raw = Column(Integer, nullable=True)
    light_raw = Column(Integer, nullable=True)
    dht_ok = Column(Boolean, default=True)
    is_simulation = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "deviceId": self.device_id,
            "zoneId": self.zone_id,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "soilMoisture": self.soil_moisture,
            "lightIntensity": self.light_intensity,
            "soilRaw": self.soil_raw,
            "lightRaw": self.light_raw,
            "dhtOk": self.dht_ok,
            "isSimulation": self.is_simulation,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }


class SimulationRecordModel(Base):
    """Stores generated simulation records separately from physical hardware data."""
    __tablename__ = "simulation_records"

    id = Column(Integer, primary_key=True, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    soil_moisture = Column(Float, nullable=False)
    light_intensity = Column(Float, nullable=False)
    source = Column(String(50), default="PYTHON_RANDOM_GENERATOR")
    notes = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "soilMoisture": self.soil_moisture,
            "lightIntensity": self.light_intensity,
            "source": self.source,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }


class WeatherRecordModel(Base):
    """Stores cached Open-Meteo external weather measurements."""
    __tablename__ = "weather_records"

    id = Column(Integer, primary_key=True, index=True)
    outdoor_temp = Column(Float, nullable=True)
    outdoor_humidity = Column(Float, nullable=True)
    weather_condition = Column(String(100), nullable=True)
    wind_speed = Column(Float, nullable=True)
    rainfall = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "outdoorTemp": self.outdoor_temp,
            "outdoorHumidity": self.outdoor_humidity,
            "weatherCondition": self.weather_condition,
            "windSpeed": self.wind_speed,
            "rainfall": self.rainfall,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }


class FarmAlertModel(Base):
    """Stores farm threshold and system alerts."""
    __tablename__ = "farm_alerts"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(20), default="ZONE-A")
    severity = Column(String(20), default="Warning")
    alert_type = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "zoneId": self.zone_id,
            "severity": self.severity,
            "type": self.alert_type,
            "message": self.message,
            "resolved": self.resolved,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }


# Create tables automatically on startup
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print(f"[DB] Initialized database with URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    except Exception as e:
        print(f"[DB] Warning during table creation: {e}")


# Helper dependency to acquire session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
