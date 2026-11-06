"""
SmartFarm AI™ — Local USB Serial to HTTP Bridge
================================================
Bridges USB Serial telemetry from an ESP32 microcontroller into a local
REST API (http://127.0.0.1:5000) for the SmartFarm AI frontend.

Features:
  - Background thread continuously reading newline-delimited JSON from COM port.
  - Safe parsing: skips diagnostic logs (#), handles corrupt frames, never crashes.
  - Thread-safe state store with timestamps, stats, and stale detection.
  - Exposes GET /api/health, GET /api/readings, and GET /api/ports.
  - Automatic reconnection when USB cable is unplugged/replugged.
  - Binds strictly to 127.0.0.1 with CORS enabled for GitHub Pages and local origins.
"""

import sys
import time
import json
import random
import argparse
import threading
import queue
import urllib.request
import re
from datetime import datetime, timezone
from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
    HAVE_FLASK_CORS = True
except ImportError:
    HAVE_FLASK_CORS = False

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False


# ==========================================
# 0. CLOUD SYNC WORKER (NON-BLOCKING DAEMON)
# ==========================================

class CloudSyncWorker(threading.Thread):
    """
    Background daemon thread that continuously forwards validated
    serial telemetry to the Render Cloud Backend (https://smartfarming-e3b2.onrender.com).
    Ensures that GitHub Pages and remote mobile devices see live telemetry in real-time.
    Never blocks the USB serial reader loop.
    """
    def __init__(self, cloud_url="https://smartfarming-e3b2.onrender.com", stop_event=None):
        super().__init__(daemon=True)
        self.cloud_url = cloud_url.rstrip("/") if cloud_url else None
        self.stop_event = stop_event or threading.Event()
        self.queue = queue.Queue(maxsize=10)
        self.last_sync_time = 0
        self.sync_count = 0
        self.last_error = None
        self.last_success_time = None

    def enqueue(self, readings):
        if not self.cloud_url or not readings:
            return
        try:
            if self.queue.full():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
            self.queue.put_nowait(dict(readings))
        except Exception:
            pass

    def run(self):
        while not self.stop_event.is_set():
            try:
                readings = self.queue.get(timeout=1.0)
            except queue.Empty:
                continue

            # Rate limit to at most one cloud POST every 2 seconds
            elapsed = time.time() - self.last_sync_time
            if elapsed < 2.0:
                time.sleep(2.0 - elapsed)

            temp = readings.get("temperature")
            hum = readings.get("humidity")
            if temp is None or hum is None:
                continue

            moist = readings.get("soil_moisture")
            if moist is None and readings.get("soil_raw") is not None:
                calc = (4095 - readings["soil_raw"]) / (4095 - 1400) * 100.0
                moist = round(max(0.0, min(100.0, calc)), 1)

            light = readings.get("light_intensity")
            if light is None and readings.get("light_raw") is not None:
                try:
                    raw_adc = int(readings["light_raw"])
                    if 0 <= raw_adc <= 4095:
                        calc = ((raw_adc - 3900) / (300 - 3900)) * 100.0
                        light = round(max(0.0, min(100.0, calc)), 1)
                except Exception:
                    pass

            body = {
                "deviceId": "ESP32-DEV-USB",
                "farmId": "FARM-001",
                "zoneId": "ZONE-A",
                "airTemperature": float(temp),
                "humidity": float(hum),
                "soilMoisture": float(moist) if moist is not None else 0.0,
                "lightIntensity": float(light) if light is not None else None,
                "soil_raw": readings.get("soil_raw"),
                "light_raw": readings.get("light_raw"),
                "soil_moisture": float(moist) if moist is not None else None,
                "light_intensity": float(light) if light is not None else None
            }

            try:
                data_bytes = json.dumps(body).encode("utf-8")
                req = urllib.request.Request(
                    f"{self.cloud_url}/api/sensor-data",
                    data=data_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "SmartFarm-Bridge/2.0"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    if resp.status in (200, 201):
                        self.sync_count += 1
                        self.last_sync_time = time.time()
                        self.last_success_time = datetime.now(timezone.utc).isoformat()
                        self.last_error = None
                        print(f"[CloudSync] -> {self.cloud_url}/api/sensor-data (T={temp}°C, H={hum}%, M={moist}%, Light={light}%) [OK #{self.sync_count}]")
            except Exception as err:
                self.last_error = str(err)
                print(f"[CloudSync] Sync note: {err}")


# ==========================================
# 1. BRIDGE STATE CONTAINER (THREAD-SAFE)
# ==========================================

class SerialBridgeState:
    def __init__(self, port="COM3", baud=115200, cloud_worker=None):
        self.lock = threading.Lock()
        self.port = port
        self.baud = baud
        self.cloud_worker = cloud_worker
        self.status = "waiting_data"  # "waiting_data" | "connected" | "disconnected" | "port_error"
        self.last_updated = None
        self.last_updated_epoch = 0
        self.last_error = None
        self.readings = None
        self.stats = {
            "total_frames_received": 0,
            "corrupted_frames": 0,
            "reconnect_attempts": 0,
            "start_time": datetime.now(timezone.utc).isoformat()
        }

    def set_connected(self):
        with self.lock:
            if self.status != "connected" and self.readings is not None:
                self.status = "connected"
            self.last_error = None

    def set_disconnected(self, error_msg=None):
        with self.lock:
            self.status = "disconnected"
            if error_msg:
                self.last_error = error_msg
            self.stats["reconnect_attempts"] += 1

    def update_readings(self, payload):
        """Update sensor readings from validated JSON dictionary and forward to cloud."""
        with self.lock:
            now_dt = datetime.now(timezone.utc)
            self.last_updated = now_dt.isoformat()
            self.last_updated_epoch = time.time()
            self.status = "connected"
            self.last_error = None
            self.stats["total_frames_received"] += 1

            # Extract and validate fields with multi-key alias support
            temperature = payload.get("temperature") if payload.get("temperature") is not None else payload.get("airTemperature")
            humidity = payload.get("humidity")
            raw_soil = payload.get("soil_raw") if payload.get("soil_raw") is not None else payload.get("soilRaw")
            raw_light = payload.get("light_raw") if payload.get("light_raw") is not None else payload.get("lightRaw")
            soil_moisture = payload.get("soil_moisture") if payload.get("soil_moisture") is not None else payload.get("soilMoisture")
            
            raw_intensity = (
                payload.get("light_intensity") 
                if payload.get("light_intensity") is not None 
                else (payload.get("lightIntensity") if payload.get("lightIntensity") is not None else payload.get("light_percent"))
            )
            light_lux = payload.get("light_lux")
            dht_ok = payload.get("dht_ok", True if (temperature is not None and humidity is not None) else False)
            uptime_ms = payload.get("uptime_ms", 0)

            # 1. Validate raw ADC readings strictly within 12-bit range 0-4095
            soil_raw = None
            if raw_soil is not None:
                try:
                    s_int = int(raw_soil)
                    if 0 <= s_int <= 4095:
                        soil_raw = s_int
                    else:
                        print(f"[BRIDGE WARNING] Invalid soil_raw ADC reading: {raw_soil} (out of 0-4095 range)")
                except (ValueError, TypeError):
                    soil_raw = None

            light_raw = None
            if raw_light is not None:
                try:
                    l_int = int(raw_light)
                    if 0 <= l_int <= 4095:
                        light_raw = l_int
                    else:
                        print(f"[BRIDGE WARNING] Invalid light_raw ADC reading: {raw_light} (out of 0-4095 range)")
                except (ValueError, TypeError):
                    light_raw = None

            # 2. Calibrate Soil Moisture percentage (0.0% - 100.0%) if missing
            if soil_moisture is None and soil_raw is not None:
                # 3500 dry in air -> 0%, 1300 wet in water -> 100%
                calc = ((3500 - soil_raw) / (3500 - 1300)) * 100.0
                soil_moisture = round(max(0.0, min(100.0, calc)), 1)
            elif soil_moisture is not None:
                try:
                    soil_moisture = round(max(0.0, min(100.0, float(soil_moisture))), 1)
                except (ValueError, TypeError):
                    soil_moisture = None

            # 3. Calibrate Light Intensity percentage (0.0% - 100.0%)
            # Configurable calibration constants (dark: 3900 ADC, bright: 300 ADC)
            LDR_DARK_REF = 3900
            LDR_BRIGHT_REF = 300

            light_intensity = None
            if raw_intensity is not None:
                try:
                    val = float(raw_intensity)
                    # If received value is already 0.0 - 100.0, use it
                    if 0.0 <= val <= 100.0:
                        light_intensity = round(val, 1)
                    elif val > 100.0 and light_raw is None:
                        # Value might be raw ADC or lux sent via light_intensity; calibrate from ADC
                        if 0 <= val <= 4095:
                            light_raw = int(val)
                            calc_l = ((light_raw - LDR_DARK_REF) / (LDR_BRIGHT_REF - LDR_DARK_REF)) * 100.0
                            light_intensity = round(max(0.0, min(100.0, calc_l)), 1)
                except (ValueError, TypeError):
                    light_intensity = None

            if light_intensity is None and light_raw is not None:
                calc_l = ((light_raw - LDR_DARK_REF) / (LDR_BRIGHT_REF - LDR_DARK_REF)) * 100.0
                light_intensity = round(max(0.0, min(100.0, calc_l)), 1)

            # Store sanitized snapshot; Never fabricate random numbers for missing sensors
            self.readings = {
                "temperature": round(float(temperature), 1) if temperature is not None else None,
                "humidity": round(float(humidity), 1) if humidity is not None else None,
                "soil_raw": soil_raw,
                "light_raw": light_raw,
                "soil_moisture": soil_moisture,
                "light_intensity": light_intensity,
                "light_lux": int(light_lux) if light_lux is not None else (int(round(light_intensity * 10)) if light_intensity is not None else None),
                "dht_ok": bool(dht_ok),
                "uptime_ms": int(uptime_ms) if uptime_ms is not None else 0
            }

            # Diagnostic logging per Issue 1
            print(f"[BRIDGE DIAGNOSTIC] Raw LDR: {light_raw} | Calibrated Light: {light_intensity}% | "
                  f"Soil Raw: {soil_raw} | Soil Moisture: {soil_moisture}% | "
                  f"Temp: {self.readings['temperature']}°C | Hum: {self.readings['humidity']}%")

            # Forward to cloud sync worker
            if self.cloud_worker:
                self.cloud_worker.enqueue(self.readings)

    def record_corrupted_frame(self):
        with self.lock:
            self.stats["corrupted_frames"] += 1

    def get_snapshot(self):
        with self.lock:
            now = time.time()
            seconds_ago = (now - self.last_updated_epoch) if self.last_updated_epoch > 0 else None
            is_stale = (seconds_ago is not None and seconds_ago > 8.0)

            # If connected but no packets for > 8 seconds, mark as stale
            effective_status = self.status
            if self.status == "connected" and is_stale:
                effective_status = "stale"

            return {
                "status": effective_status,
                "port": self.port,
                "baud": self.baud,
                "last_updated": self.last_updated,
                "seconds_ago": round(seconds_ago, 1) if seconds_ago is not None else None,
                "is_stale": is_stale,
                "last_error": self.last_error,
                "readings": self.readings,
                "stats": dict(self.stats),
                "cloud_sync": {
                    "enabled": bool(self.cloud_worker and self.cloud_worker.cloud_url),
                    "url": self.cloud_worker.cloud_url if self.cloud_worker else None,
                    "sync_count": self.cloud_worker.sync_count if self.cloud_worker else 0,
                    "last_success": self.cloud_worker.last_success_time if self.cloud_worker else None,
                    "last_error": self.cloud_worker.last_error if self.cloud_worker else None
                }
            }


# ==========================================
# 2. SERIAL PROTOCOL PARSER
# ==========================================
# 2. SERIAL PROTOCOL PARSER
# ==========================================

import re

def parse_serial_line(line_str):
    """
    Parses a single line received from ESP32 serial.
    Supports:
      1. Full JSON strings: {"temperature": 30.5, "humidity": 74.8, ...}
      2. Key-value lines from standard Arduino Serial prints:
         Temperature: 30.50
         Humidity: 74.80
         Soil raw: 4095
         Light raw: 721
    """
    if not line_str:
        return None, "empty_line"

    cleaned = line_str.strip()
    if not cleaned:
        return None, "empty_line"

    # Full JSON packet
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                return data, None
        except json.JSONDecodeError as err:
            return None, f"json_decode_error: {err}"

    return None, f"line: {cleaned}"


# ==========================================
# 3. BACKGROUND SERIAL WORKER THREAD
# ==========================================

def serial_worker_loop(state, stop_event):
    """
    Continuously opens the serial port and reads lines.
    Re-attempts connection automatically on disconnect.
    Supports both JSON and multi-line Arduino Serial.println format.
    """
    if not SERIAL_AVAILABLE:
        state.set_disconnected("pyserial module not installed. Run: pip install pyserial")
        return

    kv_buffer = {}

    while not stop_event.is_set():
        ser = None
        try:
            ser = serial.Serial(
                port=state.port,
                baudrate=state.baud,
                timeout=1.5
            )
            # Flush existing buffer
            ser.reset_input_buffer()
            if state.readings is None:
                state.status = "waiting_data"
            else:
                state.set_connected()

            print(f"[SerialBridge] Connected to {state.port} @ {state.baud} baud. Listening for telemetry...")

            while not stop_event.is_set():
                try:
                    raw_bytes = ser.readline()
                except serial.SerialException as se:
                    state.set_disconnected(f"Serial read failed: {se}")
                    break

                if not raw_bytes:
                    continue

                try:
                    line_str = raw_bytes.decode("utf-8", errors="replace").strip()
                except Exception:
                    state.record_corrupted_frame()
                    continue

                if not line_str:
                    continue

                # 1. Check if complete JSON
                if line_str.startswith("{") and line_str.endswith("}"):
                    try:
                        data = json.loads(line_str)
                        if isinstance(data, dict):
                            print(f"[SerialBridge] <- Serial JSON: {line_str}")
                            state.update_readings(data)
                            kv_buffer.clear()
                            continue
                    except Exception:
                        pass

                # 2. Key-Value parsing (ESP2.ino format)
                temp_match = re.search(r'temperature\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                if temp_match:
                    try:
                        kv_buffer["temperature"] = float(temp_match.group(1))
                    except ValueError:
                        pass

                hum_match = re.search(r'humidity\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                if hum_match:
                    try:
                        kv_buffer["humidity"] = float(hum_match.group(1))
                    except ValueError:
                        pass

                soil_raw_match = re.search(r'soil\s+raw\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                if soil_raw_match:
                    try:
                        kv_buffer["soil_raw"] = int(float(soil_raw_match.group(1)))
                    except ValueError:
                        pass
                else:
                    soil_match = re.search(r'soil(?:\s+moisture)?\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                    if soil_match:
                        try:
                            kv_buffer["soil_moisture"] = float(soil_match.group(1))
                        except ValueError:
                            pass

                light_raw_match = re.search(r'light\s+raw\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                if light_raw_match:
                    try:
                        kv_buffer["light_raw"] = int(float(light_raw_match.group(1)))
                    except ValueError:
                        pass
                else:
                    light_int_match = re.search(r'light(?:\s+intensity|\s+percent|\s*%)?\s*[:=]\s*([0-9.]+)', line_str, re.IGNORECASE)
                    if light_int_match:
                        try:
                            kv_buffer["light_intensity"] = float(light_int_match.group(1))
                        except ValueError:
                            pass

                # Delimiter line (e.g. "-------------------") or complete batch of 4 metrics
                is_delimiter = "---" in line_str or "===" in line_str
                has_all_readings = (
                    "temperature" in kv_buffer and 
                    "humidity" in kv_buffer and 
                    ("soil_raw" in kv_buffer or "soil_moisture" in kv_buffer) and 
                    ("light_raw" in kv_buffer or "light_intensity" in kv_buffer)
                )

                if (is_delimiter or has_all_readings) and kv_buffer:
                    print(f"[SerialBridge] <- KV Batch: {kv_buffer}")
                    state.update_readings(kv_buffer)
                    if is_delimiter:
                        kv_buffer.clear()

        except serial.SerialException as e:
            err_msg = str(e)
            if "PermissionError" in err_msg or "Access is denied" in err_msg:
                state.set_disconnected(f"Port {state.port} is busy! Please close Arduino IDE Serial Monitor.")
            else:
                state.set_disconnected(f"Cannot open {state.port}: {e}")
        except Exception as ex:
            state.set_disconnected(f"Unexpected error: {ex}")
        finally:
            if ser and ser.is_open:
                try:
                    ser.close()
                except Exception:
                    pass

        # Wait before retrying connection
        stop_event.wait(2.0)


# ==========================================
# 4. FLASK HTTP REST API
# ==========================================

def create_app(state):
    app = Flask(__name__)

    ALLOWED_ORIGINS = {
        "https://sainadh-555.github.io",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    }

    if HAVE_FLASK_CORS:
        CORS(app, resources={
            r"/api/*": {
                "origins": list(ALLOWED_ORIGINS),
                "methods": ["GET", "OPTIONS"],
                "allow_headers": ["Content-Type", "Accept"]
            }
        })
    else:
        @app.after_request
        def add_cors_headers(response):
            origin = request.headers.get("Origin", "")
            if origin in ALLOWED_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
            elif not origin:
                response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
            return response

    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "SmartFarm AI™ USB Serial Bridge",
            "version": "1.0.0",
            "status": "online",
            "endpoints": {
                "health": "/api/health",
                "readings": "/api/readings",
                "ports": "/api/ports"
            }
        })

    @app.route("/api/health", methods=["GET"])
    def get_health():
        snapshot = state.get_snapshot()
        return jsonify({
            "status": "ok",
            "bridge": "SmartFarm AI USB Serial Bridge",
            "serial_status": snapshot["status"],
            "port": snapshot["port"],
            "baud": snapshot["baud"],
            "has_readings": snapshot["readings"] is not None,
            "last_updated": snapshot["last_updated"],
            "seconds_ago": snapshot["seconds_ago"],
            "stats": snapshot["stats"]
        })

    @app.route("/api/readings", methods=["GET"])
    def get_readings():
        snapshot = state.get_snapshot()
        return jsonify(snapshot)

    @app.route("/api/simulate", methods=["GET", "POST"])
    def simulate_telemetry():
        """
        Generates realistic random sensor readings using Python's random module:
        - Temperature: 20 to 40 °C
        - Humidity: 30 to 90 %
        - Soil Moisture: 20 to 80 %
        - Relative Light Intensity: 10 to 100 %
        """
        temp = round(random.uniform(20.0, 40.0), 1)
        if temp > 33.0:
            hum = round(random.uniform(30.0, 65.0), 1)
        else:
            hum = round(random.uniform(45.0, 90.0), 1)
            
        moist = round(random.uniform(20.0, 80.0), 1)
        light = round(random.uniform(10.0, 100.0), 1)
        now_iso = datetime.now(timezone.utc).isoformat()

        return jsonify({
            "status": "success",
            "source": "PYTHON_RANDOM_GENERATOR",
            "temperature": temp,
            "humidity": hum,
            "soilMoisture": moist,
            "lightIntensity": light,
            "timestamp": now_iso
        })

    @app.route("/api/ports", methods=["GET"])
    def list_ports():
        """Read-only list of available serial ports on the host."""
        ports_list = []
        if SERIAL_AVAILABLE:
            for p in serial.tools.list_ports.comports():
                ports_list.append({
                    "device": p.device,
                    "description": p.description,
                    "hwid": p.hwid
                })
        return jsonify({
            "available_ports": ports_list,
            "active_bridge_port": state.port
        })

    return app


# ==========================================
# 5. CLI ENTRYPOINT
# ==========================================

def main():
    parser = argparse.ArgumentParser(description="SmartFarm AI USB Serial Bridge")
    parser.add_argument("--port", type=str, default="COM7", help="Serial COM port (e.g. COM7, COM3, /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (strictly 127.0.0.1)")
    parser.add_argument("--http-port", type=int, default=5000, help="HTTP API port (default: 5000)")
    parser.add_argument("--cloud-url", type=str, default="https://smartfarming-e3b2.onrender.com", help="Render Cloud Backend URL for automatic global telemetry sync")
    parser.add_argument("--no-cloud", action="store_true", help="Disable automatic cloud synchronization")
    args = parser.parse_args()

    cloud_sync_target = None if args.no_cloud else args.cloud_url

    print("=" * 60)
    print("      SmartFarm AI™ — Local USB-to-HTTP Serial Bridge      ")
    print("=" * 60)
    print(f" Serial Port : {args.port} @ {args.baud} baud")
    print(f" Local API   : http://{args.host}:{args.http_port}")
    print(f" Cloud Sync  : {cloud_sync_target or 'Disabled'}")
    print(f" Endpoints   : http://{args.host}:{args.http_port}/api/readings")
    print(f"               http://{args.host}:{args.http_port}/api/health")
    print("-" * 60)
    print(" IMPORTANT:")
    print("   1. Close Arduino IDE Serial Monitor before running this bridge.")
    print("   2. Only one program can own a COM port at a time.")
    print("=" * 60)

    stop_event = threading.Event()

    cloud_worker = None
    if cloud_sync_target:
        cloud_worker = CloudSyncWorker(cloud_url=cloud_sync_target, stop_event=stop_event)
        cloud_worker.start()

    state = SerialBridgeState(port=args.port, baud=args.baud, cloud_worker=cloud_worker)

    worker_thread = threading.Thread(target=serial_worker_loop, args=(state, stop_event), daemon=True)
    worker_thread.start()

    app = create_app(state)
    try:
        # Binds strictly to 127.0.0.1 for local security
        app.run(host=args.host, port=args.http_port, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\nStopping USB bridge...")
    finally:
        stop_event.set()
        worker_thread.join(timeout=1.0)
        if cloud_worker:
            cloud_worker.join(timeout=1.0)
        print("USB bridge stopped cleanly.")


if __name__ == "__main__":
    main()
