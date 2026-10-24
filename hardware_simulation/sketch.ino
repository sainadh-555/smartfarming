/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 Wokwi Simulation & Hardware Sketch
 * ============================================================================
 * Pins (Confirmed Classic ESP32):
 *   - DHT11 / DHT22 : GPIO 4
 *   - Soil Moisture : GPIO 34 (Analog AO)
 *   - Light / LDR   : GPIO 35 (Analog AO)
 *   - Relay Pump    : GPIO 26
 *   - Status LED    : GPIO 2
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Wi-Fi settings (Wokwi Virtual WiFi)
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Backend API URL
const char* BACKEND_URL   = "https://smartfarm-ai-backend.onrender.com/api/sensor-data";
const char* DEVICE_ID     = "ESP32-FARM-01";
const char* FARM_ID       = "FARM-001";
const char* ZONE_ID       = "ZONE-A";

// Timing intervals
const unsigned long SENSOR_UPDATE_INTERVAL = 5000;
unsigned long lastUpdate = 0;

// Pin Definitions
#define DHT_PIN             4
#define DHT_TYPE            DHT11
#define SOIL_MOISTURE_PIN   34
#define LDR_PIN             35
#define RELAY_PIN           26
#define LED_PIN             2

DHT dht(DHT_PIN, DHT_TYPE);

float soilMoisture = 45.0;
float temperature  = 28.0;
float humidity     = 65.0;
int   lightIntensity = 750;
bool  pumpStatus   = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  
  dht.begin();
  
  Serial.println("\nConnecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected!");
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\nWi-Fi Failed. Continuing offline simulation.");
  }
}

void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastUpdate >= SENSOR_UPDATE_INTERVAL) {
    lastUpdate = currentMillis;
    
    // Read Sensors
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperature = t;
    if (!isnan(h)) humidity = h;
    
    int rawMoisture = analogRead(SOIL_MOISTURE_PIN);
    // Invert mapping: 4095 (dry) -> 0%, 1300 (wet) -> 100%
    soilMoisture = constrain((float)(3500 - rawMoisture) / (float)(3500 - 1300) * 100.0, 0.0, 100.0);
    
    int rawLdr = analogRead(LDR_PIN);
    lightIntensity = constrain(map(rawLdr, 3900, 300, 50, 1000), 0, 1200);
    
    // Print Serial Dashboard
    Serial.println("========================================");
    Serial.println("       SMARTFARM AI - ESP32 TELEMETRY   ");
    Serial.println("========================================");
    Serial.printf("Air Temp       : %.1f C  [GPIO 4]\n", temperature);
    Serial.printf("Humidity       : %.1f %%  [GPIO 4]\n", humidity);
    Serial.printf("Soil Moisture  : %.1f %%  [GPIO 34, raw %d]\n", soilMoisture, rawMoisture);
    Serial.printf("Light          : %d lux  [GPIO 35, raw %d]\n", lightIntensity, rawLdr);
    Serial.printf("Pump Status    : %s      [GPIO 26]\n", pumpStatus ? "ON" : "OFF");
    Serial.printf("Wi-Fi          : %s\n", WiFi.status() == WL_CONNECTED ? "CONNECTED" : "OFFLINE");
    Serial.println("========================================\n");
    
    // Send HTTP POST to Backend
    if (WiFi.status() == WL_CONNECTED) {
      StaticJsonDocument<512> doc;
      doc["deviceId"] = DEVICE_ID;
      doc["farmId"] = FARM_ID;
      doc["zoneId"] = ZONE_ID;
      doc["timestamp"] = millis() / 1000;
      doc["soilMoisture"] = soilMoisture;
      doc["soilTemperature"] = temperature - 1.5;
      doc["airTemperature"] = temperature;
      doc["humidity"] = humidity;
      doc["soilPH"] = 6.6;
      doc["lightIntensity"] = lightIntensity;
      doc["rainfall"] = 0;
      doc["pumpStatus"] = pumpStatus;
      
      String jsonStr;
      serializeJson(doc, jsonStr);
      
      HTTPClient http;
      http.begin(BACKEND_URL);
      http.addHeader("Content-Type", "application/json");
      int code = http.POST(jsonStr);
      Serial.printf("[HTTP] POST Code: %d\n", code);
      http.end();
    }
  }
}
