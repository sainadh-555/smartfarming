/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 USB Serial Telemetry Firmware
 * ============================================================================
 * Hardware Pinout:
 *   - Microcontroller : ESP32 Dev Module (30-pin or 38-pin Classic ESP32)
 *   - DHT11 Data      : GPIO 4  (Air Temperature °C & Relative Humidity %)
 *   - Soil Moisture AO: GPIO 34 (Analog Input, 12-bit ADC 0 - 4095)
 *   - LDR Light AO    : GPIO 35 (Analog Input, 12-bit ADC 0 - 4095)
 *   - Heartbeat LED   : GPIO 2  (Activity Blink on Telemetry Pulse)
 * 
 * Communication Protocol:
 *   - USB Serial at 115200 baud
 *   - Emits exactly ONE newline-delimited JSON line every 2000 ms:
 *       {"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":1033,"soil_moisture":35.7,"light_intensity":85.0}
 *   - When DHT11 is disconnected or reading fails:
 *       {"temperature":null,"humidity":null,"soil_raw":2500,"light_raw":1033,"soil_moisture":35.7,"light_intensity":85.0}
 *   - Diagnostic lines are prefixed with '#' so serial parsers safely ignore them.
 * ============================================================================
 */

#include <DHT.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define DHT_PIN             4    // GPIO 4  -> DHT11 Data Pin
#define DHT_TYPE            DHT11

#define SOIL_MOISTURE_PIN   34   // GPIO 34 -> Soil Moisture Sensor Analog AO
#define LDR_PIN             35   // GPIO 35 -> LDR Light Sensor Analog AO
#define LED_PIN             2    // GPIO 2  -> Built-in Status LED

// ==========================================
// 2. CONFIGURABLE CALIBRATION CONSTANTS
// ==========================================
// Soil Moisture 12-bit ADC (0 - 4095):
// In dry air, typical sensor reads ~3200 - 3900 ADC
// In water / saturated soil, typical sensor reads ~1100 - 1500 ADC
const int SOIL_DRY_ADC      = 3500;  // Corresponds to 0.0% moisture
const int SOIL_WET_ADC      = 1300;  // Corresponds to 100.0% moisture

// LDR Light Sensor 12-bit ADC (0 - 4095):
// Voltage Divider configuration (LDR pull-up/pull-down):
// In dark environment: typical ADC reads ~3600 - 4095
// In bright light: typical ADC reads ~200 - 600
// Formula automatically handles inverted response when DARK > BRIGHT.
const int LDR_DARK_RAW      = 3900;  // Corresponds to 0.0% relative light intensity
const int LDR_BRIGHT_RAW    = 300;   // Corresponds to 100.0% relative light intensity

// Telemetry interval (2000 ms = 2 seconds)
const unsigned long TRANSMIT_INTERVAL_MS = 2000;
unsigned long lastTransmitTime = 0;

// Sensor object
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  // Initialize USB Serial at 115200 baud
  Serial.begin(115200);
  
  // Configure Status LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Configure ESP32 12-bit ADC (0 - 4095) with 11dB attenuation (0 - 3.3V full range)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Initialize DHT11 sensor
  dht.begin();

  delay(400);
  Serial.println("# [BOOT] SmartFarm AI ESP32 Telemetry Node Active (115200 baud)");
  Serial.println("# [PINS] DHT11: GPIO 4 | Soil AO: GPIO 34 | LDR AO: GPIO 35");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = currentMillis;

    // Flash activity LED
    digitalWrite(LED_PIN, HIGH);

    // ----------------------------------------------------
    // 1. Read DHT11 Temperature & Relative Humidity
    // ----------------------------------------------------
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    bool dhtOk = true;

    if (isnan(temperature) || isnan(humidity) || 
        temperature < -10.0 || temperature > 70.0 || 
        humidity < 0.0 || humidity > 100.0) {
      dhtOk = false;
    }

    // ----------------------------------------------------
    // 2. Read Soil Moisture on GPIO 34 (12-bit ADC)
    // ----------------------------------------------------
    long soilSum = 0;
    for (int i = 0; i < 5; i++) {
      soilSum += analogRead(SOIL_MOISTURE_PIN);
      delay(4);
    }
    int soilRaw = (int)(soilSum / 5);

    // Calibrate soil moisture percentage (0.0% - 100.0%)
    float soilPct = ((float)(SOIL_DRY_ADC - soilRaw) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC)) * 100.0f;
    float soilMoisture = constrain(soilPct, 0.0f, 100.0f);

    // ----------------------------------------------------
    // 3. Read LDR Light Sensor on GPIO 35 (12-bit ADC)
    // ----------------------------------------------------
    long ldrSum = 0;
    for (int i = 0; i < 5; i++) {
      ldrSum += analogRead(LDR_PIN);
      delay(4);
    }
    int lightRaw = (int)(ldrSum / 5);

    // Calibrate relative light intensity percentage (0.0% - 100.0%)
    // Formula works for both normal and inverted divider setups
    float lightPct = 0.0f;
    if (LDR_DARK_RAW != LDR_BRIGHT_RAW) {
      lightPct = ((float)(lightRaw - LDR_DARK_RAW) / (float)(LDR_BRIGHT_RAW - LDR_DARK_RAW)) * 100.0f;
    }
    float lightIntensity = constrain(lightPct, 0.0f, 100.0f);

    // ----------------------------------------------------
    // 4. Format & Emit JSON Object over USB Serial
    // ----------------------------------------------------
    char jsonBuffer[256];
    if (dhtOk) {
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":%.1f,\"humidity\":%.1f,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_intensity\":%.1f}",
        temperature, humidity, soilRaw, lightRaw, soilMoisture, lightIntensity);
    } else {
      // DHT11 failed or disconnected: emit null for temp and hum.
      // soil_raw, light_raw, soil_moisture, light_intensity are fully preserved.
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":null,\"humidity\":null,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_intensity\":%.1f}",
        soilRaw, lightRaw, soilMoisture, lightIntensity);
    }

    // Output strictly one JSON line
    Serial.println(jsonBuffer);

    // Turn off activity LED
    digitalWrite(LED_PIN, LOW);
  }

  delay(20);
}
