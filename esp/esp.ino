/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 USB Serial Telemetry Firmware
 * ============================================================================
 * Hardware Pinout:
 *   - Microcontroller : ESP32 Dev Module (30-pin or 38-pin Classic ESP32)
 *   - DHT11 Data      : GPIO 4 (Temperature & Humidity)
 *   - Soil Moisture AO: GPIO 34 (Analog Input, 12-bit ADC 0 - 4095)
 *   - LDR Light AO    : GPIO 35 (Analog Input, 12-bit ADC 0 - 4095)
 *   - Built-in LED    : GPIO 2 (Activity Heartbeat Blink)
 * 
 * Communication Protocol:
 *   - USB Serial at 115200 baud
 *   - Emits exactly ONE newline-delimited JSON object per line every 2 seconds:
 *       {"temperature":29.1,"humidity":79.8,"soil_raw":1800,"light_raw":2200,"soil_moisture":48.5,"light_lux":650,"dht_ok":true,"uptime_ms":12340}
 *   - When DHT11 fails or is disconnected, emits:
 *       {"temperature":null,"humidity":null,"soil_raw":1800,"light_raw":2200,"soil_moisture":48.5,"light_lux":650,"dht_ok":false,"uptime_ms":12340}
 *   - Preserves raw ADC readings; never replaces failed readings with zero.
 *   - Diagnostic lines (if any) are prefixed with '#' so the bridge ignores them.
 * ============================================================================
 */

#include <DHT.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define DHT_PIN             4    // GPIO 4 -> DHT11 Data Pin
#define DHT_TYPE            DHT11

#define SOIL_MOISTURE_PIN   34   // GPIO 34 -> Soil Moisture Sensor Analog AO
#define LDR_PIN             35   // GPIO 35 -> LDR Light Sensor Analog AO
#define LED_PIN             2    // GPIO 2  -> Built-in LED indicator

// ==========================================
// 2. CALIBRATION CONSTANTS
// ==========================================
// Soil Moisture 12-bit ADC (0 - 4095):
// In air (completely dry) typical sensor reads ~3200 - 3900
// In water (fully saturated) typical sensor reads ~1100 - 1600
const int SOIL_DRY_ADC      = 3500;  // Corresponds to 0% moisture
const int SOIL_WET_ADC      = 1300;  // Corresponds to 100% moisture

// LDR Light Sensor 12-bit ADC (0 - 4095):
// Dark environment reads ~3600 - 4095
// Bright outdoor/indoor light reads ~200 - 800
const int LDR_DARK_ADC      = 3900;
const int LDR_BRIGHT_ADC    = 300;

// Transmission Interval (2000 ms = 2 seconds)
const unsigned long TRANSMIT_INTERVAL_MS = 2000;
unsigned long lastTransmitTime = 0;

// Sensor object
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  // Initialize USB Serial at 115200 baud
  Serial.begin(115200);
  
  // Configure LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Configure ESP32 ADC: 12-bit resolution (0 - 4095) with 11dB attenuation (0 - 3.3V range)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Initialize DHT11 sensor
  dht.begin();

  // Initial boot diagnostic line (prefixed with '#' so serial bridge ignores it)
  delay(500);
  Serial.println("# [BOOT] SmartFarm AI ESP32 USB Node Initialized (115200 baud)");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = currentMillis;

    // Toggle heartbeat LED on activity
    digitalWrite(LED_PIN, HIGH);

    // ----------------------------------------------------
    // 1. Read DHT11 Temperature & Relative Humidity
    // ----------------------------------------------------
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    bool dhtOk = true;

    // Check if reading is valid (isnan or out of physical range means failure)
    if (isnan(temperature) || isnan(humidity) || temperature < -10.0 || temperature > 70.0 || humidity < 0.0 || humidity > 100.0) {
      dhtOk = false;
    }

    // ----------------------------------------------------
    // 2. Read Soil Moisture on GPIO 34 (12-bit ADC)
    // ----------------------------------------------------
    // Sample 5 times to smooth electrical noise
    long soilSum = 0;
    for (int i = 0; i < 5; i++) {
      soilSum += analogRead(SOIL_MOISTURE_PIN);
      delay(4);
    }
    int soilRaw = (int)(soilSum / 5);

    // Calculate calibrated percentage (0.0% - 100.0%)
    // Dry ADC > Wet ADC (higher voltage = drier soil)
    float calculatedMoisture = (float)(SOIL_DRY_ADC - soilRaw) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC) * 100.0;
    float soilMoisturePct = constrain(calculatedMoisture, 0.0, 100.0);

    // ----------------------------------------------------
    // 3. Read LDR Light on GPIO 35 (12-bit ADC)
    // ----------------------------------------------------
    long ldrSum = 0;
    for (int i = 0; i < 5; i++) {
      ldrSum += analogRead(LDR_PIN);
      delay(4);
    }
    int lightRaw = (int)(ldrSum / 5);

    // Map raw LDR reading to light lux estimate (0 - 1200 lux)
    int calculatedLux = map(lightRaw, LDR_DARK_ADC, LDR_BRIGHT_ADC, 20, 1000);
    int lightLux = constrain(calculatedLux, 0, 1500);

    // ----------------------------------------------------
    // 4. Format & Emit JSON Object over USB Serial
    // ----------------------------------------------------
    char jsonBuffer[256];
    if (dhtOk) {
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":%.1f,\"humidity\":%.1f,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_lux\":%d,\"dht_ok\":true,\"uptime_ms\":%lu}",
        temperature, humidity, soilRaw, lightRaw, soilMoisturePct, lightLux, currentMillis);
    } else {
      // DHT failed: explicitly emit null for temperature and humidity.
      // Do NOT replace with 0 or fabricate numbers. Raw soil/light are preserved.
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":null,\"humidity\":null,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_lux\":%d,\"dht_ok\":false,\"uptime_ms\":%lu}",
        soilRaw, lightRaw, soilMoisturePct, lightLux, currentMillis);
    }

    // Output strictly one line of JSON
    Serial.println(jsonBuffer);

    // Turn off heartbeat LED
    digitalWrite(LED_PIN, LOW);
  }

  // Small delay to yield to ESP32 system tasks
  delay(20);
}
