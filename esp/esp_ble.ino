/**
 * ============================================================================
 * SmartFarm AI™ — ESP32 Dual Telemetry Firmware (USB Serial + Bluetooth LE)
 * ============================================================================
 * Hardware Pinout:
 *   - Microcontroller : ESP32 Dev Module
 *   - DHT11 Data      : GPIO 4 (Temperature & Humidity)
 *   - Soil Moisture AO: GPIO 34 (Analog Input, 12-bit ADC 0 - 4095)
 *   - LDR Light AO    : GPIO 35 (Analog Input, 12-bit ADC 0 - 4095)
 *   - Built-in LED    : GPIO 2 (Activity Heartbeat Blink)
 * 
 * Communication Protocols:
 *   1. USB Serial: 115200 baud emitting JSON lines every 2 seconds
 *   2. Bluetooth LE: Nordic UART Service (NUS) notifying the exact same JSON
 * 
 * Target JSON Line Format:
 *   {"temperature":30.5,"humidity":74.8,"soil_moisture":42.0,"light_intensity":85.0}
 * ============================================================================
 */

#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define DHT_PIN             4    // GPIO 4 -> DHT11 Data
#define DHT_TYPE            DHT11

#define SOIL_MOISTURE_PIN   34   // GPIO 34 -> Soil Moisture Sensor Analog AO
#define LDR_PIN             35   // GPIO 35 -> LDR Light Sensor Analog AO
#define LED_PIN             2    // GPIO 2  -> Built-in LED Heartbeat

// ==========================================
// 2. BLE GATT UUIDs (Nordic UART Service)
// ==========================================
#define DEVICE_NAME         "SmartFarm-ESP32"
#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e" // NUS Primary Service
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // Notify Characteristic

// Calibration constants
const int SOIL_DRY_ADC      = 3500;  // 0% moisture
const int SOIL_WET_ADC      = 1300;  // 100% moisture
const int LDR_DARK_ADC      = 3900;  // 0% light
const int LDR_BRIGHT_ADC    = 300;   // 100% light

const unsigned long TRANSMIT_INTERVAL_MS = 2000;
unsigned long lastTransmitTime = 0;

DHT dht(DHT_PIN, DHT_TYPE);

BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Server Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("# [BLE] Client connected via Web Bluetooth");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("# [BLE] Client disconnected");
    }
};

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dht.begin();

  // Initialize BLE
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("# [BOOT] SmartFarm AI ESP32 Ready (USB Serial 115200 + BLE GATT: SmartFarm-ESP32)");
}

void loop() {
  unsigned long currentMillis = millis();

  // Handle BLE re-advertising on disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("# [BLE] Restarted advertising");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = currentMillis;

    digitalWrite(LED_PIN, HIGH);

    // 1. Read DHT11
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    bool dhtValid = true;

    if (isnan(temperature) || isnan(humidity) || temperature < -10.0 || temperature > 70.0 || humidity < 0.0 || humidity > 100.0) {
      dhtValid = false;
    }

    // 2. Read Soil Moisture (GPIO 34)
    long soilSum = 0;
    for (int i = 0; i < 5; i++) {
      soilSum += analogRead(SOIL_MOISTURE_PIN);
      delay(4);
    }
    int soilRaw = (int)(soilSum / 5);
    float soilPct = (float)(SOIL_DRY_ADC - soilRaw) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC) * 100.0;
    float soilMoisture = constrain(soilPct, 0.0, 100.0);

    // 3. Read LDR Light (GPIO 35)
    long ldrSum = 0;
    for (int i = 0; i < 5; i++) {
      ldrSum += analogRead(LDR_PIN);
      delay(4);
    }
    int lightRaw = (int)(ldrSum / 5);
    float lightPct = 0.0f;
    if (LDR_DARK_ADC != LDR_BRIGHT_ADC) {
      lightPct = ((float)(lightRaw - LDR_DARK_ADC) / (float)(LDR_BRIGHT_ADC - LDR_DARK_ADC)) * 100.0f;
    }
    float lightIntensity = constrain(lightPct, 0.0f, 100.0f);

    // 4. Format Target JSON Line
    char jsonBuffer[256];
    if (dhtValid) {
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":%.1f,\"humidity\":%.1f,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_intensity\":%.1f}",
        temperature, humidity, soilRaw, lightRaw, soilMoisture, lightIntensity);
    } else {
      // DHT11 failed: emit null for temperature and humidity per requirements
      snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":null,\"humidity\":null,\"soil_raw\":%d,\"light_raw\":%d,\"soil_moisture\":%.1f,\"light_intensity\":%.1f}",
        soilRaw, lightRaw, soilMoisture, lightIntensity);
    }

    // Transmit over USB Serial (115200 baud)
    Serial.println(jsonBuffer);

    // Transmit over Bluetooth LE (if connected)
    if (deviceConnected && pTxCharacteristic != NULL) {
      String blePayload = String(jsonBuffer) + "\n";
      pTxCharacteristic->setValue((uint8_t*)blePayload.c_str(), blePayload.length());
      pTxCharacteristic->notify();
    }

    digitalWrite(LED_PIN, LOW);
  }

  delay(20);
}

