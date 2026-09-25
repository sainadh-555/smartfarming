#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==========================================
// CONFIGURATION
// ==========================================
// Wi-Fi settings (Wokwi Virtual WiFi)
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Backend API URL (Update this when deploying a real backend)
const char* BACKEND_URL = "http://YOUR_BACKEND_URL/api/sensor-data";
const char* DEVICE_ID = "ESP32-FARM-01";
const char* FARM_ID = "FARM-001";
const char* ZONE_ID = "ZONE-A";

// Timing intervals
const unsigned long SENSOR_UPDATE_INTERVAL = 5000; // 5 seconds
unsigned long lastUpdate = 0;

// ==========================================
// PIN DEFINITIONS
// ==========================================
#define DHT_PIN 15
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN 34
#define SOIL_PH_PIN 35
#define LDR_PIN 32
#define RAINFALL_SWITCH_PIN 33
#define RELAY_PIN 26

// ==========================================
// THRESHOLDS & CONSTANTS
// ==========================================
const float SOIL_MOISTURE_LOW = 30.0;
const float SOIL_MOISTURE_TARGET = 40.0;
const float TEMP_HIGH = 38.0;
const float HUMIDITY_LOW = 35.0;
const float PH_LOW = 5.5;
const float PH_HIGH = 7.5;

// ==========================================
// GLOBALS & OBJECTS
// ==========================================
DHT dht(DHT_PIN, DHT_TYPE);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Sensor Data
float soilMoisture = 0;
float temperature = 0;
float humidity = 0;
float soilPH = 0;
int lightIntensity = 0;
bool rainfall = false;

// Analysis Results
int farmHealthScore = 100;
String plantCondition = "HEALTHY";
String waterStress = "LOW";
String heatStress = "LOW";

// Control Status
bool pumpStatus = false;
String irrigationMode = "AUTO";

void setup() {
  Serial.begin(115200);
  
  // Initialize Pins
  pinMode(RAINFALL_SWITCH_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  // Initialize DHT
  dht.begin();
  
  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 20);
    display.println("SmartFarm AI");
    display.println("Booting...");
    display.display();
  }
  
  // Connect to Wi-Fi
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected!");
  } else {
    Serial.println("\nWi-Fi Failed. Continuing offline simulation.");
  }
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Execute every SENSOR_UPDATE_INTERVAL
  if (currentMillis - lastUpdate >= SENSOR_UPDATE_INTERVAL) {
    lastUpdate = currentMillis;
    
    readSensors();
    evaluateFarmHealth();
    controlIrrigation();
    updateOLED();
    printSerialDashboard();
    sendDataToBackend();
  }
}

void readSensors() {
  // Read DHT22
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  if (isnan(temperature)) temperature = 25.0; // Fallback
  if (isnan(humidity)) humidity = 50.0; // Fallback
  
  // Read Potentiometers & Map
  // Soil Moisture (0-4095) -> (0-100%)
  int rawMoisture = analogRead(SOIL_MOISTURE_PIN);
  soilMoisture = map(rawMoisture, 0, 4095, 0, 100);
  
  // Soil pH (0-4095) -> (4.0 - 9.0)
  int rawPH = analogRead(SOIL_PH_PIN);
  soilPH = 4.0 + ((float)rawPH / 4095.0) * 5.0;
  
  // Read LDR (Light Intensity 0-4095)
  lightIntensity = analogRead(LDR_PIN);
  
  // Read Rainfall Switch (Active LOW due to INPUT_PULLUP)
  rainfall = (digitalRead(RAINFALL_SWITCH_PIN) == LOW);
  
  // Simulated environment interaction:
  if (rainfall) {
    // If it's raining, environmental humidity artificially reads higher
    humidity = min(100.0f, humidity + 20.0f);
  }
}

void evaluateFarmHealth() {
  farmHealthScore = 100;
  plantCondition = "HEALTHY";
  waterStress = "LOW";
  heatStress = "LOW";
  
  // Rule-based prototype intelligence
  
  // Water Stress
  if (soilMoisture < 20) {
    waterStress = "HIGH";
    plantCondition = "HIGH STRESS";
    farmHealthScore -= 30;
  } else if (soilMoisture < SOIL_MOISTURE_LOW) {
    waterStress = "MEDIUM";
    if (plantCondition == "HEALTHY") plantCondition = "MODERATE STRESS";
    farmHealthScore -= 15;
  }
  
  // Heat Stress
  if (temperature > TEMP_HIGH) {
    heatStress = "HIGH";
    if (plantCondition == "HEALTHY") plantCondition = "MODERATE STRESS";
    farmHealthScore -= 20;
  }
  
  // Humidity
  if (humidity < HUMIDITY_LOW) {
    farmHealthScore -= 10;
  }
  
  // pH Level
  if (soilPH < PH_LOW) {
    if (plantCondition == "HEALTHY" || plantCondition == "MODERATE STRESS") plantCondition = "SOIL ACIDITY WARNING";
    farmHealthScore -= 15;
  } else if (soilPH > PH_HIGH) {
    if (plantCondition == "HEALTHY" || plantCondition == "MODERATE STRESS") plantCondition = "SOIL ALKALINITY WARNING";
    farmHealthScore -= 15;
  }
  
  // Clamp score
  if (farmHealthScore < 0) farmHealthScore = 0;
}

void controlIrrigation() {
  if (irrigationMode == "AUTO") {
    if (soilMoisture < SOIL_MOISTURE_LOW && !rainfall) {
      pumpStatus = true;
      digitalWrite(RELAY_PIN, HIGH); // Turn ON pump
    } else if (soilMoisture >= SOIL_MOISTURE_TARGET || rainfall) {
      pumpStatus = false;
      digitalWrite(RELAY_PIN, LOW); // Turn OFF pump
    }
  }
}

void printSerialDashboard() {
  Serial.println("========================================");
  Serial.println("       SMARTFARM AI - ESP32");
  Serial.println("========================================");
  
  Serial.print("Device ID       : "); Serial.println(DEVICE_ID);
  Serial.print("Farm ID         : "); Serial.println(FARM_ID);
  Serial.print("Zone ID         : "); Serial.println(ZONE_ID);
  Serial.println();
  
  Serial.println("SENSOR DATA");
  Serial.println("----------------------------------------");
  Serial.printf("Soil Moisture   : %.1f %%\n", soilMoisture);
  Serial.printf("Temperature     : %.1f C\n", temperature);
  Serial.printf("Humidity        : %.1f %%\n", humidity);
  Serial.printf("Soil pH         : %.1f\n", soilPH);
  Serial.printf("Light           : %d\n", lightIntensity);
  Serial.printf("Rainfall        : %s\n", rainfall ? "YES" : "NO");
  Serial.println();
  
  Serial.println("ANALYSIS");
  Serial.println("----------------------------------------");
  Serial.printf("Farm Health     : %d/100\n", farmHealthScore);
  Serial.printf("Plant Condition : %s\n", plantCondition.c_str());
  Serial.printf("Water Stress    : %s\n", waterStress.c_str());
  Serial.printf("Heat Stress     : %s\n", heatStress.c_str());
  Serial.println();
  
  Serial.println("IRRIGATION");
  Serial.println("----------------------------------------");
  Serial.printf("Mode            : %s\n", irrigationMode.c_str());
  Serial.printf("Pump            : %s\n", pumpStatus ? "ON" : "OFF");
  Serial.println();
  
  Serial.println("TRANSMISSION");
  Serial.println("----------------------------------------");
  Serial.printf("WiFi            : %s\n", WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
  Serial.println("========================================\n");
}

void updateOLED() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println("SMARTFARM AI");
  
  display.setCursor(0, 16);
  display.printf("Temp: %.1f C", temperature);
  
  display.setCursor(0, 26);
  display.printf("Hum : %.1f %%", humidity);
  
  display.setCursor(0, 36);
  display.printf("Soil: %.1f %%", soilMoisture);
  
  display.setCursor(0, 46);
  display.printf("pH  : %.1f", soilPH);
  
  display.setCursor(0, 56);
  display.printf("Pump: %s", pumpStatus ? "ON" : "OFF");
  
  display.display();
}

void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Create JSON Payload
  StaticJsonDocument<512> doc;
  
  doc["deviceId"] = DEVICE_ID;
  doc["farmId"] = FARM_ID;
  doc["zoneId"] = ZONE_ID;
  doc["timestamp"] = 0; // Replace with NTP time if needed
  
  doc["soilMoisture"] = soilMoisture;
  doc["soilTemperature"] = temperature - 2.0; // Simulated soil temp
  doc["airTemperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soilPH"] = soilPH;
  doc["lightIntensity"] = lightIntensity;
  doc["rainfall"] = rainfall ? 15 : 0;
  
  doc["plantHealth"] = farmHealthScore;
  doc["waterStress"] = waterStress;
  doc["heatStress"] = heatStress;
  doc["irrigation"] = pumpStatus;
  doc["irrigationMode"] = irrigationMode;
  doc["farmHealthScore"] = farmHealthScore;
  doc["plantCondition"] = plantCondition;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // HTTP POST
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.printf("[HTTP] POST Result: %d\n", httpResponseCode);
  } else {
    Serial.printf("[HTTP] POST Failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
    Serial.println("Backend unavailable - simulation continuing.");
  }
  
  http.end();
}
