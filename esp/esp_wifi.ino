/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 Wi-Fi Cloud Telemetry Firmware
 * Target Backend: https://smartfarming-e3b2.onrender.com
 * ============================================================================
 * Hardware Pinout:
 *   - Microcontroller : ESP32 Dev Module
 *   - DHT11 Data      : GPIO 4
 *   - Soil Moisture AO: GPIO 34 (Analog Input)
 *   - LDR Light AO    : GPIO 35 (Analog Input)
 *   - Relay / Pump    : GPIO 23 (Active HIGH or LOW)
 *   - Status LED      : GPIO 2  (Built-in LED)
 * 
 * Features:
 *   - Auto-reconnect to 2.4GHz Wi-Fi
 *   - HTTPS POST to https://smartfarming-e3b2.onrender.com/api/sensor-data
 *   - Ingests pump/irrigation command from server response
 *   - Dual fallback: Serial debugging + Cloud streaming
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>

// ==========================================
// 1. WI-FI & BACKEND CONFIGURATION
// ==========================================
const char* WIFI_SSID     = "YOUR_WIFI_NAME";      // Replace with your 2.4GHz Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // Replace with your Wi-Fi Password

// Render Backend API Endpoint
const char* SERVER_URL    = "https://smartfarming-e3b2.onrender.com/api/sensor-data";

// Device & Zone Identifiers
const char* DEVICE_ID     = "ESP32-DEV-01";
const char* ZONE_ID       = "ZONE-A";

// ==========================================
// 2. HARDWARE PIN DEFINITIONS
// ==========================================
#define DHT_PIN             4    // GPIO 4 -> DHT11 Data Pin
#define DHT_TYPE            DHT11

#define SOIL_MOISTURE_PIN   34   // GPIO 34 -> Soil Moisture Sensor Analog AO
#define LDR_PIN             35   // GPIO 35 -> LDR Light Sensor Analog AO
#define PUMP_RELAY_PIN      23   // GPIO 23 -> Relay module for irrigation valve
#define LED_PIN             2    // GPIO 2  -> Built-in LED indicator

// Calibration ADC Values (12-bit: 0 - 4095)
const int SOIL_DRY_ADC      = 3500;  // 0% moisture
const int SOIL_WET_ADC      = 1300;  // 100% moisture
const int LDR_DARK_ADC      = 3900;
const int LDR_BRIGHT_ADC    = 300;

// Transmission Interval (Default: 4000 ms / 4 seconds)
const unsigned long TRANSMIT_INTERVAL_MS = 4000;
unsigned long lastTransmitTime = 0;

DHT dht(DHT_PIN, DHT_TYPE);

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("[Wi-Fi] Connecting to network...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] Local IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Will retry next cycle.");
    digitalWrite(LED_PIN, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=========================================");
  Serial.println("SmartFarm AI — Wi-Fi Cloud Node Starting");
  Serial.println("Target: https://smartfarming-e3b2.onrender.com");
  Serial.println("=========================================");

  pinMode(LED_PIN, OUTPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW);

  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  analogReadResolution(12);

  dht.begin();
  connectToWiFi();
}

void loop() {
  unsigned long now = millis();

  // Handle Wi-Fi connection health
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Periodic transmission
  if (now - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = now;

    // 1. Read DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    bool dhtOk = !isnan(humidity) && !isnan(temperature);

    // 2. Read Soil Moisture (Average 8 samples)
    long soilSum = 0;
    for (int i = 0; i < 8; i++) {
      soilSum += analogRead(SOIL_MOISTURE_PIN);
      delay(2);
    }
    int soilRaw = soilSum / 8;
    float soilMoisture = (float)(SOIL_DRY_ADC - soilRaw) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC) * 100.0;
    if (soilMoisture < 0.0) soilMoisture = 0.0;
    if (soilMoisture > 100.0) soilMoisture = 100.0;

    // 3. Read Light LDR (Average 8 samples)
    long ldrSum = 0;
    for (int i = 0; i < 8; i++) {
      ldrSum += analogRead(LDR_PIN);
      delay(2);
    }
    int lightRaw = ldrSum / 8;
    float lightPct = (float)(LDR_DARK_ADC - lightRaw) / (float)(LDR_DARK_ADC - LDR_BRIGHT_ADC) * 100.0;
    if (lightPct < 0.0) lightPct = 0.0;
    if (lightPct > 100.0) lightPct = 100.0;
    int lightLux = (int)(lightPct * 12.0); // Approximate lux conversion

    // 4. Print local Serial diagnosis
    Serial.printf("[Sensors] Temp: %.1f C | Hum: %.1f %% | Soil: %.1f %% (ADC %d) | Light: %d lux (ADC %d)\n",
                  dhtOk ? temperature : -999.0,
                  dhtOk ? humidity : -999.0,
                  soilMoisture, soilRaw,
                  lightLux, lightRaw);

    // 5. Build JSON Payload
    String jsonPayload = "{";
    jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
    jsonPayload += "\"zoneId\":\"" + String(ZONE_ID) + "\",";
    jsonPayload += "\"soilMoisture\":" + String(soilMoisture, 1) + ",";
    
    if (dhtOk) {
      jsonPayload += "\"airTemperature\":" + String(temperature, 1) + ",";
      jsonPayload += "\"humidity\":" + String(humidity, 1) + ",";
      jsonPayload += "\"soilTemperature\":" + String(temperature - 1.5, 1) + ",";
    } else {
      jsonPayload += "\"airTemperature\":27.0,";
      jsonPayload += "\"humidity\":60.0,";
      jsonPayload += "\"soilTemperature\":25.5,";
    }

    jsonPayload += "\"lightIntensity\":" + String(lightLux) + ",";
    jsonPayload += "\"soilPH\":6.5,";
    jsonPayload += "\"rainfall\":0.0,";
    jsonPayload += "\"pumpStatus\":" + String(digitalRead(PUMP_RELAY_PIN) == HIGH ? "true" : "false");
    jsonPayload += "}";

    // 6. Transmit over HTTPS to Render Cloud Backend
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure client;
      client.setInsecure(); // Skip SSL certificate validation for ease of use
      client.setTimeout(6000);

      HTTPClient http;
      http.begin(client, SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("[Cloud POST] HTTP %d: %s\n", httpResponseCode, response.c_str());

        // Check if server commanded pump activation
        if (response.indexOf("\"pumpCommand\":true") >= 0) {
          digitalWrite(PUMP_RELAY_PIN, HIGH);
          Serial.println("[Actuator] PUMP COMMAND ACTIVATED by Cloud Backend");
        } else if (response.indexOf("\"pumpCommand\":false") >= 0) {
          digitalWrite(PUMP_RELAY_PIN, LOW);
        }
      } else {
        Serial.printf("[Cloud POST Error] %s (Code: %d)\n", http.errorToString(httpResponseCode).c_str(), httpResponseCode);
      }

      http.end();
    } else {
      Serial.println("[Cloud] Skipping transmission - Wi-Fi offline");
    }
  }
}
