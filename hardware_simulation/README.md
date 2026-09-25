# SmartFarm AI - ESP32 Hardware Simulation

This folder contains a complete, working hardware simulation for the SmartFarm AI project. It is designed to run in [Wokwi](https://wokwi.com/), a browser-based electronics simulator.

## 1. How to run the simulation
1. Go to [wokwi.com](https://wokwi.com/) and create a new ESP32 project.
2. Copy the contents of `diagram.json` into the Wokwi `diagram.json` file.
3. Copy the contents of `sketch.ino` into the Wokwi `sketch.ino` file.
4. Copy the contents of `libraries.txt` into the Wokwi `libraries.txt` file (or manually add them via the Library Manager).
5. Click **Play** to start the simulation.

## 2. Components Used
- **ESP32-WROOM-32**: The main microcontroller collecting data and connecting to Wi-Fi.
- **DHT22**: Temperature and Humidity sensor.
- **Potentiometer 1 (Soil Moisture)**: Simulates an analog soil moisture sensor (0-100%).
- **Potentiometer 2 (Soil pH)**: Simulates an analog soil pH sensor (pH 4.0 - 9.0).
- **LDR (Photoresistor)**: Simulates light intensity.
- **Slide Switch (Rainfall)**: Simulates a digital rain detector.
- **Relay Module & LED**: Simulates the water pump for irrigation.
- **SSD1306 OLED**: 128x64 I2C display for local farm status dashboard.

## 3. GPIO Connections
| Component | ESP32 Pin | Purpose |
| :--- | :--- | :--- |
| DHT22 Data | GPIO 15 | Air Temp & Humidity |
| Soil Moisture | GPIO 34 (ADC1_CH6) | Analog mapping to 0-100% |
| Soil pH | GPIO 35 (ADC1_CH7) | Analog mapping to pH 4.0-9.0 |
| Light Sensor | GPIO 32 (ADC1_CH4) | Raw light intensity reading |
| Rain Switch | GPIO 33 | Digital input (Active LOW via pullup) |
| Relay / Pump | GPIO 26 | Digital output |
| OLED SDA | GPIO 21 | I2C Data |
| OLED SCL | GPIO 22 | I2C Clock |

## 4. How the Irrigation Logic Works
The ESP32 runs a rule-based engine. 
In **AUTO** mode:
- If `Soil Moisture < 30%` AND `Rainfall == NO`, the relay triggers the pump **ON**.
- If `Soil Moisture >= 40%` OR `Rainfall == YES`, the pump turns **OFF**.
These values are defined at the top of the sketch as `SOIL_MOISTURE_LOW` and `SOIL_MOISTURE_TARGET`.

## 5. JSON Generation & HTTP Transmission
Every 5 seconds, the ESP32 calculates farm health using the "Prototype Rule-Based Intelligence" and constructs a JSON payload via `ArduinoJson`. 
It then attempts to POST this payload to `BACKEND_URL`. 
If the backend is offline (as expected in a standalone simulation demo), the ESP32 gracefully catches the error, prints `"Backend unavailable - simulation continuing"`, and keeps running the local irrigation and OLED logic.

## 6. How to simulate different farm conditions
While the simulation is running, click on the components in the Wokwi editor:
- **Change Temperature/Humidity**: Click the DHT22 and drag the sliders.
- **Change Soil Moisture**: Click the first Potentiometer and turn the knob. Watch the pump turn on when it drops below 30%.
- **Simulate Rainfall**: Click the Slide Switch. Notice how the pump turns off immediately even if moisture is low.
- **Change Soil pH**: Click the second potentiometer to adjust between highly acidic (pH 4) and highly alkaline (pH 9).

## 7. Connecting to the SmartFarm Dashboard
To link this simulation to a live dashboard:
1. Deploy a Node.js/Express backend with an endpoint at `POST /api/sensor-data`.
2. Update the `BACKEND_URL` variable in `sketch.ino` to point to your live server (e.g., `http://your-app.com/api/sensor-data`).
3. Wokwi's virtual Wi-Fi will transmit the data over the real internet, and your dashboard will update in real-time.
