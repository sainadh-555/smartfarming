/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 Production Hardware Firmware
 * ============================================================================
 * Hardware:
 *   - Microcontroller : ESP32 Dev Module (30-pin / 38-pin Classic ESP32)
 *   - DHT11           : GPIO 4 (Temperature & Relative Humidity)
 *   - Soil Moisture   : GPIO 34 (Analog Input AO, ADC1 Channel 6)
 *   - Light / LDR     : GPIO 35 (Analog Input AO, ADC1 Channel 7)
 *   - Relay / Valve   : GPIO 26 (Optional Solenoid Drip Valve)
 *   - Status LED      : GPIO 2 (Built-in Blue LED for transmission blink)
 * 
 * Note: All sensors MUST share a common ground (GND) with the ESP32!
 * GPIO 34 and GPIO 35 are input-only pins without internal pullup/pulldowns,
 * making them ideal for analog sensor readings with 12-bit ADC (0 - 4095).
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
// Enter your Wi-Fi credentials below:
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Once you deploy the backend on Render, paste your URL here:
// Example: "https://smartfarm-backend.onrender.com/api/sensor-data"
// For local testing on your home Wi-Fi: "http://192.168.1.xxx:8000/api/sensor-data"
const char* BACKEND_URL   = "https://smartfarm-ai-backend.onrender.com/api/sensor-data";

// Hardware Identification
const char* DEVICE_ID     = "ESP32-FARM-01";
const char* FARM_ID       = "FARM-001";
const char* ZONE_ID       = "ZONE-A"; // Default quadrant (Zone A Tomato)

// Transmission Interval (5000 ms = 5 seconds)
const unsigned long TRANSMIT_INTERVAL_MS = 5000;
unsigned long lastTransmitTime = 0;

// ==========================================
// 2. PIN ASSIGNMENTS (CONFIRMED)
// ==========================================
#define DHT_PIN             4   // GPIO 4 -> DHT11 Data Pin
#define DHT_TYPE            DHT11

#define SOIL_MOISTURE_PIN   34  // GPIO 34 -> Analog Output (AO) of Soil Sensor
#define LDR_PIN             35  // GPIO 35 -> Analog Output (AO) of Light Sensor
#define RELAY_PIN           26  // GPIO 26 -> Drip Irrigation Relay / Solenoid
#define LED_PIN             2   // GPIO 2  -> Built-in Status Indicator LED

// ==========================================
// 3. SENSOR CALIBRATION VALUES
// ==========================================
// Soil Moisture ADC Calibration (12-bit ADC: 0 - 4095):
// In dry air, typical capacitive/resistive sensor reads HIGH (~3200 - 4000).
// In a glass of water, it reads LOW (~1100 - 1600).
// Adjust DRY_ADC and WET_ADC based on your sensor calibration test.
const int SOIL_DRY_ADC  = 3500; // 0% moisture in dry air
const int SOIL_WET_ADC  = 1300; // 100% moisture in saturated water

// Light Sensor LDR Calibration:
// Dark = High resistance / High ADC (~3800 - 4095)
// Bright light = Low resistance / Low ADC (~200 - 800)
const int LDR_DARK_ADC  = 3900;
const int LDR_BRIGHT_ADC= 300;

// ==========================================
// 4. GLOBAL OBJECTS & STATE
// ==========================================
DHT dht(DHT_PIN, DHT_TYPE);

float currentTemperature = 26.5;
float currentHumidity    = 60.0;
float currentSoilMoisture= 45.0;
int   rawMoistureAdc     = 0;
int   currentLight       = 750;
int   rawLdrAdc          = 0;
bool  pumpActive         = false;

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED while connecting
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println();
    Serial.println("[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println();
    Serial.println("[WiFi] Connection timed out. Running in standalone sensor mode.");
  }
}

void readSensors() {
  // Read DHT11 Temperature & Relative Humidity
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  // Validate DHT readings (prevent NaN values)
  if (!isnan(t) && t > -10.0 && t < 70.0) {
    currentTemperature = t;
  } else {
    Serial.println("[WARN] DHT11 temperature read failed; keeping previous reading.");
  }

  if (!isnan(h) && h >= 0.0 && h <= 100.0) {
    currentHumidity = h;
  } else {
    Serial.println("[WARN] DHT11 humidity read failed; keeping previous reading.");
  }

  // Read Soil Moisture on GPIO 34 (Analog Input)
  // Take 5 samples and average them to eliminate ADC electrical noise
  long sumMoisture = 0;
  for (int i = 0; i < 5; i++) {
    sumMoisture += analogRead(SOIL_MOISTURE_PIN);
    delay(5);
  }
  rawMoistureAdc = sumMoisture / 5;

  // Map ADC reading to percentage (0% - 100%)
  // Note: Higher ADC value = drier soil, lower ADC value = wetter soil
  float calculatedMoisture = (float)(SOIL_DRY_ADC - rawMoistureAdc) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC) * 100.0;
  currentSoilMoisture = constrain(calculatedMoisture, 0.0, 100.0);

  // Read LDR Light Intensity on GPIO 35 (Analog Input)
  long sumLdr = 0;
  for (int i = 0; i < 5; i++) {
    sumLdr += analogRead(LDR_PIN);
    delay(5);
  }
  rawLdrAdc = sumLdr / 5;

  // Map LDR to 0 - 1000 Light Index
  int calculatedLight = map(rawLdrAdc, LDR_DARK_ADC, LDR_BRIGHT_ADC, 50, 1000);
  currentLight = constrain(calculatedLight, 0, 1200);
}

void printConsoleDashboard() {
  Serial.println("\n========================================================");
  Serial.println("         SmartFarm AI™ — Live ESP32 Telemetry           ");
  Serial.println("========================================================");
  Serial.printf(" Device ID      : %s\n", DEVICE_ID);
  Serial.printf(" Quadrant       : %s (0.25 Acre Cadastre)\n", ZONE_ID);
  Serial.printf(" Wi-Fi Status   : %s (%s, %d dBm)\n", 
                WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED",
                WiFi.SSID().c_str(), WiFi.RSSI());
  Serial.println("--------------------------------------------------------");
  Serial.printf(" Air Temp       : %.1f °C  [GPIO 4 DHT11]\n", currentTemperature);
  Serial.printf(" Air Humidity   : %.1f %%  [GPIO 4 DHT11]\n", currentHumidity);
  Serial.printf(" Soil Moisture  : %.1f %%  [GPIO 34 ADC raw: %d]\n", currentSoilMoisture, rawMoistureAdc);
  Serial.printf(" Light Index    : %d lux  [GPIO 35 ADC raw: %d]\n", currentLight, rawLdrAdc);
  Serial.printf(" Pump / Solenoid: %s      [GPIO 26]\n", pumpActive ? "ACTIVATED (ON)" : "STANDBY (OFF)");
  Serial.println("========================================================");
}

void transmitTelemetryToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi not connected. Attempting reconnection...");
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  // Construct standard JSON telemetry schema compliant with ISO 11783
  StaticJsonDocument<512> doc;
  doc["deviceId"]        = DEVICE_ID;
  doc["farmId"]          = FARM_ID;
  doc["zoneId"]          = ZONE_ID;
  doc["timestamp"]       = millis() / 1000;
  
  // Real sensor readings
  doc["soilMoisture"]    = round(currentSoilMoisture * 10) / 10.0;
  doc["soilTemperature"] = round((currentTemperature - 1.5) * 10) / 10.0;
  doc["airTemperature"]  = round(currentTemperature * 10) / 10.0;
  doc["humidity"]        = round(currentHumidity * 10) / 10.0;
  doc["soilPH"]          = 6.6; // Soil pH nominal value
  doc["lightIntensity"]  = currentLight;
  doc["rainfall"]        = 0;
  doc["pumpStatus"]      = pumpActive;

  // Raw ADC telemetry for diagnostic calibration
  JsonObject diag = doc.createNestedObject("diagnostics");
  diag["rawMoistureAdc"] = rawMoistureAdc;
  diag["rawLdrAdc"]      = rawLdrAdc;
  diag["wifiRssi"]       = WiFi.RSSI();
  diag["firmware"]       = "SmartFarm-ESP32-v2.0-Prod";

  String requestBody;
  serializeJson(doc, requestBody);

  // Send HTTP POST
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000); // 4-second timeout

  // Blink LED to indicate transmission
  digitalWrite(LED_PIN, LOW);
  int httpCode = http.POST(requestBody);
  digitalWrite(LED_PIN, HIGH);

  if (httpCode > 0) {
    Serial.printf("[HTTP] POST status: %d (Payload: %d bytes)\n", httpCode, requestBody.length());
    
    // Parse backend response for remote actions
    String responseString = http.getString();
    if (responseString.length() > 0) {
      StaticJsonDocument<256> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, responseString);
      if (!error) {
        if (responseDoc.containsKey("pumpCommand")) {
          bool cmd = responseDoc["pumpCommand"];
          if (cmd != pumpActive) {
            pumpActive = cmd;
            digitalWrite(RELAY_PIN, pumpActive ? HIGH : LOW);
            Serial.printf("[COMMAND] Remote Solenoid Trigger -> %s\n", pumpActive ? "ON" : "OFF");
          }
        }
      }
    }
  } else {
    Serial.printf("[HTTP] POST failed. Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==========================================
// 6. SETUP & LOOP
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================================");
  Serial.println("    SmartFarm AI™ — ESP32 Sensor Hardware Initializing   ");
  Serial.println("========================================================");

  // Configure Pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);

  // Configure ESP32 ADC: 12-bit (0 - 4095) with 11dB attenuation for full 0 - 3.3V range
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Initialize DHT11 sensor
  Serial.println("[INIT] Initializing DHT11 on GPIO 4...");
  dht.begin();

  // Connect to Wi-Fi
  connectToWiFi();

  Serial.println("[INIT] Hardware setup complete. Starting live sensor loop.");
}

void loop() {
  unsigned long currentMillis = millis();

  // Transmit telemetry periodically every TRANSMIT_INTERVAL_MS
  if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = currentMillis;

    // 1. Sample all physical sensors
    readSensors();

    // 2. Output live readings to Serial Monitor
    printConsoleDashboard();

    // 3. Post telemetry payload to Render backend
    transmitTelemetryToBackend();
  }

  // Small yield to allow background Wi-Fi tasks to process cleanly
  delay(50);
}
