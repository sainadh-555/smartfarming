# SmartFarm AI™ — ESP32 Hardware Wiring & Arduino IDE 2.x Guide

This guide walks you through connecting your physical **ESP32 Dev Module** to the DHT11, Soil Moisture, and Light (LDR) sensors and uploading [`esp/esp.ino`](./esp.ino).

---

## 🔌 Hardware Pin Assignments (Confirmed)

| Sensor / Module | Sensor Pin | ESP32 GPIO Pin | Description / Type |
| :--- | :--- | :--- | :--- |
| **DHT11** | `VCC` | `3.3V` or `VIN (5V)` | Power |
| **DHT11** | `GND` | `GND` | **Common Ground** |
| **DHT11** | `DATA / OUT` | **`GPIO 4`** | Digital Temperature & Humidity |
| **Soil Moisture** | `VCC` | `3.3V` | Power |
| **Soil Moisture** | `GND` | `GND` | **Common Ground** |
| **Soil Moisture** | `AO` (Analog Out) | **`GPIO 34`** | ADC1_CH6 (12-bit Analog Input) |
| **Light / LDR** | `VCC` | `3.3V` | Power |
| **Light / LDR** | `GND` | `GND` | **Common Ground** |
| **Light / LDR** | `AO` (Analog Out) | **`GPIO 35`** | ADC1_CH7 (12-bit Analog Input) |
| **Relay / Solenoid** (Optional) | `IN` | **`GPIO 26`** | Digital Output (Pump Switch) |

> [!IMPORTANT]
> **Common Ground:** All sensors must have their ground pins connected to an ESP32 `GND` pin. If using a breadboard, connect the ESP32 `GND` to the negative power rail.

---

## 🛠️ Arduino IDE 2.x Setup

### Step 1: Install ESP32 Board Package
1. Open **Arduino IDE 2.x**.
2. Go to **File > Preferences** (or `Ctrl + ,`).
3. In **Additional boards manager URLs**, add:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**.
5. Go to **Tools > Board > Boards Manager...**, search for `esp32`, and install **esp32 by Espressif Systems** (version 2.0.14 or later).

### Step 2: Install Required Libraries
Open **Tools > Manage Libraries...** (or `Ctrl + Shift + I`) and install:
1. **ArduinoJson** by *Benoît Blanchon* (Version 6.x or 7.x)
2. **DHT sensor library** by *Adafruit* (Install all dependencies including *Adafruit Unified Sensor*)

### Step 3: Select Board & Port
1. Plug your ESP32 into your computer via a USB data cable (ensure it is a data cable, not charge-only).
2. Go to **Tools > Board > esp32 > ESP32 Dev Module**.
3. Go to **Tools > Port** and select your ESP32 COM port (e.g., `COM3`, `COM4`, etc.).
4. Set **Upload Speed:** `921600` (or `115200` if upload fails).

### Step 4: Configure Credentials & Upload
1. In [`esp/esp.ino`](./esp.ino), edit your Wi-Fi credentials:
   ```cpp
   const char* WIFI_SSID     = "Your_WiFi_Name";
   const char* WIFI_PASSWORD = "Your_WiFi_Password";
   ```
2. Once your backend is running on Render, set `BACKEND_URL`:
   ```cpp
   const char* BACKEND_URL = "https://your-app.onrender.com/api/sensor-data";
   ```
3. Click the **Upload** arrow button (or `Ctrl + U`).
4. If the console says `Connecting...___...___`, press and hold the **BOOT** button on your ESP32 for 2 seconds until uploading starts.

### Step 5: Verify on Serial Monitor
1. Open **Tools > Serial Monitor** (or `Ctrl + Shift + M`).
2. Set the baud rate to **115200 baud**.
3. You should see:
   ```text
   ========================================================
            SmartFarm AI™ — Live ESP32 Telemetry           
   ========================================================
    Device ID      : ESP32-FARM-01
    Quadrant       : ZONE-A (0.25 Acre Cadastre)
    Wi-Fi Status   : CONNECTED (Signal: -58 dBm)
   --------------------------------------------------------
    Air Temp       : 28.2 °C  [GPIO 4 DHT11]
    Air Humidity   : 64.0 %  [GPIO 4 DHT11]
    Soil Moisture  : 45.2 %  [GPIO 34 ADC raw: 2410]
    Light Index    : 780 lux [GPIO 35 ADC raw: 950]
    Pump / Solenoid: STANDBY (OFF) [GPIO 26]
   ========================================================
   ```
