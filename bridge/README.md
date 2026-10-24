# SmartFarm AI™ — ESP32 USB Serial to HTTP Bridge

Lightweight local bridge enabling your **SmartFarm AI** dashboard ([https://sainadh-555.github.io/smartfarming/](https://sainadh-555.github.io/smartfarming/)) to ingest real physical ESP32 sensor telemetry using **only a USB cable** (no Wi-Fi, no cloud, and no Render needed).

---

## Architecture

```text
┌─────────────────────────┐          USB Cable           ┌────────────────────────────┐
│   ESP32 Dev Module      │ ───────────────────────────> │  Python USB Serial Bridge  │
│  - DHT11 (GPIO 4)       │     115200 Baud Serial       │  (Running on your Windows  │
│  - Soil AO (GPIO 34)    │      Newline JSON:           │   PC at 127.0.0.1:5000)    │
│  - LDR AO  (GPIO 35)    │  {"temperature":29.1, ...}   │   Reads COM port & serves  │
└─────────────────────────┘                              └─────────────┬──────────────┘
                                                                       │
                                                       HTTP GET Polling (every 3s)
                                                       http://127.0.0.1:5000/api/readings
                                                                       │
                                                                       ▼
                                                         ┌────────────────────────────┐
                                                         │ SmartFarm AI Dashboard     │
                                                         │ (GitHub Pages or Localhost)│
                                                         │ Mode: Live USB Hardware    │
                                                         └────────────────────────────┘
```

---

## 1. Quick Start (Windows)

### Prerequisites
- Python 3.8+ installed on your computer.
- ESP32 connected via USB cable.
- **IMPORTANT**: Close the **Arduino IDE Serial Monitor** before starting the bridge. A COM port can only be opened by one program at a time.

### Step 1: Open PowerShell or Command Prompt
Navigate to your project root:
```powershell
cd c:\Users\SAINADH\OneDrive\Documents\smartfarming
```

### Step 2: Install Dependencies
```powershell
pip install -r bridge/requirements.txt
```
*(Only `pyserial` and `flask` are required).*

### Step 3: Run the Bridge
Replace `COM7` with your ESP32's actual COM port:
```powershell
python bridge/serial_bridge.py --port COM7
```

If you don't specify `--port`, it defaults to `COM3` at `115200` baud:
```powershell
python bridge/serial_bridge.py --port COM3 --baud 115200
```

---

## 2. CLI Options

| Argument | Default | Description | Example |
| :--- | :--- | :--- | :--- |
| `--port` | `COM3` | Serial COM port of your ESP32 | `--port COM7` or `--port /dev/ttyUSB0` |
| `--baud` | `115200` | Baud rate matching ESP32 firmware | `--baud 115200` |
| `--host` | `127.0.0.1` | Host loopback interface (strictly local) | `--host 127.0.0.1` |
| `--http-port` | `5000` | Local HTTP API port | `--http-port 5000` |

---

## 3. Endpoints

Once running, verify the bridge in your browser:
- **`http://127.0.0.1:5000/api/readings`**: Latest sensor readings, timestamps, raw ADC values, and stale status.
- **`http://127.0.0.1:5000/api/health`**: Serial bridge connection status and frame statistics.
- **`http://127.0.0.1:5000/api/ports`**: Read-only list of all COM ports detected on Windows.

### Sample Output (`/api/readings`):
```json
{
  "status": "connected",
  "port": "COM7",
  "baud": 115200,
  "is_stale": false,
  "last_updated": "2026-10-24T10:30:15.123456+00:00",
  "seconds_ago": 1.2,
  "readings": {
    "temperature": 29.1,
    "humidity": 79.8,
    "soil_raw": 1800,
    "light_raw": 2200,
    "soil_moisture": 48.5,
    "light_lux": 650,
    "dht_ok": true,
    "uptime_ms": 45210
  },
  "stats": {
    "total_frames_received": 184,
    "corrupted_frames": 0,
    "reconnect_attempts": 0
  }
}
```

---

## 4. COM Port Troubleshooting

### How to Find Your ESP32 COM Port on Windows:
1. Press `Win + X` and select **Device Manager**.
2. Expand **Ports (COM & LPT)**.
3. Look for **Silicon Labs CP210x USB to UART Bridge** or **USB-SERIAL CH340** (e.g., `COM7`).
4. Pass that port to the command: `python bridge/serial_bridge.py --port COM7`.

### "PermissionError: [Errno 13] Access is denied: 'COM7'"
- **Cause**: Another application is currently holding the COM port open.
- **Fix**: Close the **Arduino IDE Serial Monitor** or any terminal (PuTTY, TeraTerm) connected to that port.

### "SerialException: could not open port 'COM7'"
- Check that the USB cable is fully plugged in and supports data transfer (some cheap cables are charging-only).
- Unplug and replug the USB cable. The bridge automatically re-attempts connection every 2 seconds.

### Corrupted JSON or Missing Readings:
- Make sure both the ESP32 sketch and the bridge use **115200 baud**.
- Verify that common ground (`GND`) is connected between the ESP32 and all sensors.

---

## 5. Security & Browser Privacy
- The bridge binds exclusively to `127.0.0.1` (loopback) to prevent unauthorized network access.
- Cross-Origin Resource Sharing (CORS) is restricted to `https://sainadh-555.github.io` and local development servers (`localhost`).
- The bridge does not allow browser clients to execute arbitrary commands or open unconfigured ports.
