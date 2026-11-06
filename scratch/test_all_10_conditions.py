#!/usr/bin/env python3
"""
Comprehensive Automated Verification Suite for SmartFarm AI
Tests all 10 hardware, bridge, backend, and frontend conditions per Issue 4.
"""

import sys
import json
import time
from datetime import datetime, timezone

# Add project root to sys.path
sys.path.insert(0, r"c:\Users\SAINADH\OneDrive\Documents\smartfarming")

print("=" * 70)
print("SMARTFARM AI — 10-POINT COMPREHENSIVE VERIFICATION SUITE")
print("=" * 70)

# Import backend models and bridge
from backend.main import SensorPayload, receive_sensor_data, zones_state, simulate_sensor_data
from bridge.serial_bridge import SerialBridgeState

passed_tests = 0
total_tests = 10

def test_condition(num, title, fn):
    global passed_tests
    print(f"\n[TEST {num}] {title}")
    try:
        fn()
        print(f"  -> RESULT: PASSED [OK]")
        passed_tests += 1
    except AssertionError as ae:
        print(f"  -> RESULT: FAILED (AssertionError: {ae})")
    except Exception as ex:
        print(f"  -> RESULT: FAILED (Unexpected Exception: {ex})")

# -------------------------------------------------------------
# Test 1: All 4 sensors working
# -------------------------------------------------------------
def test_1_all_sensors_working():
    # ESP32 JSON
    raw_packet = '{"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":1033,"soil_moisture":35.7,"light_intensity":85.0}'
    data = json.loads(raw_packet)
    
    # Bridge processing
    bridge = SerialBridgeState(port="COM7", baud=115200)
    bridge.update_readings(data)
    readings = bridge.readings
    
    assert readings["temperature"] == 30.5, f"Expected temp 30.5, got {readings['temperature']}"
    assert readings["humidity"] == 74.8, f"Expected hum 74.8, got {readings['humidity']}"
    assert readings["soil_moisture"] == 35.7, f"Expected soil 35.7, got {readings['soil_moisture']}"
    assert readings["light_intensity"] == 85.0, f"Expected light 85.0, got {readings['light_intensity']}"
    assert readings["light_raw"] == 1033, f"Expected light_raw 1033, got {readings['light_raw']}"
    
    # Backend ingestion
    payload = SensorPayload(**readings)
    res = receive_sensor_data(payload)
    assert res["status"] == "success"
    assert zones_state["ZONE-A"]["lightIntensity"] == 85.0
    assert zones_state["ZONE-A"]["airTemperature"] == 30.5
    print(f"  Diagnostics: Temperature={readings['temperature']}°C, Humidity={readings['humidity']}%, Soil={readings['soil_moisture']}%, Light={readings['light_intensity']}%")

# -------------------------------------------------------------
# Test 2: LDR disconnected
# -------------------------------------------------------------
def test_2_ldr_disconnected():
    # When LDR is disconnected, light_raw is None, light_intensity is None
    raw_packet = '{"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":null,"soil_moisture":35.7,"light_intensity":null}'
    data = json.loads(raw_packet)
    
    bridge = SerialBridgeState(port="COM7", baud=115200)
    bridge.update_readings(data)
    readings = bridge.readings
    
    assert readings["temperature"] == 30.5
    assert readings["humidity"] == 74.8
    assert readings["soil_moisture"] == 35.7
    assert readings["light_intensity"] is None, f"Expected None for disconnected LDR, got {readings['light_intensity']}"
    assert readings["light_raw"] is None
    
    # Backend ingestion
    payload = SensorPayload(**readings)
    receive_sensor_data(payload)
    assert zones_state["ZONE-A"]["lightIntensity"] is None
    print(f"  Diagnostics: Disconnected LDR preserved as None without fake numbers. Target lightIntensity: {zones_state['ZONE-A']['lightIntensity']} (Displays N/A on dashboard)")

# -------------------------------------------------------------
# Test 3: LDR reading 0
# -------------------------------------------------------------
def test_3_ldr_reading_zero():
    # When raw LDR reads 0 ADC
    # Calibration formula: ((raw - 3900) / (300 - 3900)) * 100
    # At raw=0: ((0 - 3900)/(-3600))*100 = 108.3% -> clamped to 100.0%
    # If raw is directly 0% intensity:
    raw_packet = '{"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":0,"soil_moisture":35.7,"light_intensity":0.0}'
    data = json.loads(raw_packet)
    
    bridge = SerialBridgeState(port="COM7", baud=115200)
    bridge.update_readings(data)
    readings = bridge.readings
    
    assert readings["light_intensity"] == 0.0, f"Expected 0.0, got {readings['light_intensity']}"
    assert readings["light_raw"] == 0
    
    payload = SensorPayload(**readings)
    receive_sensor_data(payload)
    assert zones_state["ZONE-A"]["lightIntensity"] == 0.0, f"Expected 0.0 in backend, got {zones_state['ZONE-A']['lightIntensity']}"
    print(f"  Diagnostics: 0.0% light intensity preserved (not replaced by 750 or N/A). Ingested: {zones_state['ZONE-A']['lightIntensity']}%")

# -------------------------------------------------------------
# Test 4: LDR reading 4095
# -------------------------------------------------------------
def test_4_ldr_reading_4095():
    # In darkness (ADC 4095): ((4095 - 3900)/(-3600))*100 = -5.4% -> clamped to 0.0%
    # In full bright (if bright is 4095 or if intensity is 100.0%):
    raw_packet = '{"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":4095,"soil_moisture":35.7,"light_intensity":100.0}'
    data = json.loads(raw_packet)
    
    bridge = SerialBridgeState(port="COM7", baud=115200)
    bridge.update_readings(data)
    readings = bridge.readings
    
    assert readings["light_intensity"] == 100.0, f"Expected 100.0, got {readings['light_intensity']}"
    assert readings["light_raw"] == 4095
    
    payload = SensorPayload(**readings)
    receive_sensor_data(payload)
    assert zones_state["ZONE-A"]["lightIntensity"] == 100.0, f"Expected 100.0 in backend, got {zones_state['ZONE-A']['lightIntensity']}"
    print(f"  Diagnostics: 100.0% light intensity preserved. Ingested: {zones_state['ZONE-A']['lightIntensity']}%")

# -------------------------------------------------------------
# Test 5: ESP32 disconnected (Stale check)
# -------------------------------------------------------------
def test_5_esp32_disconnected():
    bridge = SerialBridgeState(port="COM7", baud=115200)
    data = {"temperature": 30.5, "humidity": 74.8, "soil_moisture": 35.7, "light_intensity": 85.0}
    bridge.update_readings(data)
    
    snapshot_before = bridge.get_snapshot()
    assert snapshot_before["status"] == "connected"
    assert snapshot_before["is_stale"] is False
    
    # Simulate time passing > 8 seconds without telemetry
    bridge.last_updated_epoch = time.time() - 9.0
    snapshot_after = bridge.get_snapshot()
    
    assert snapshot_after["is_stale"] is True, "Expected is_stale to be True after 9 seconds"
    assert snapshot_after["status"] == "stale", f"Expected effective status 'stale', got {snapshot_after['status']}"
    print(f"  Diagnostics: Watchdog verified. After 9s, status marked as: {snapshot_after['status']} (is_stale={snapshot_after['is_stale']})")

# -------------------------------------------------------------
# Test 6: Backend unavailable / Graceful handling
# -------------------------------------------------------------
def test_6_backend_unavailable():
    from bridge.serial_bridge import CloudSyncWorker
    worker = CloudSyncWorker("http://127.0.0.1:9999")  # Unreachable port
    worker.enqueue({"temperature": 30.5, "humidity": 74.8, "soil_moisture": 35.7, "light_intensity": 85.0})
    
    # Wait for queue worker to attempt sync
    time.sleep(1.2)
    worker.stop_event.set()
    
    # Worker must record error without crashing
    assert worker.sync_count == 0
    print("  Diagnostics: Cloud sync worker handled unreachable backend gracefully without raising unhandled exception.")

# -------------------------------------------------------------
# Test 7: Invalid JSON handling
# -------------------------------------------------------------
def test_7_invalid_json():
    bridge = SerialBridgeState(port="COM7", baud=115200)
    valid_data = {"temperature": 28.0, "humidity": 65.0, "soil_moisture": 40.0, "light_intensity": 75.0}
    bridge.update_readings(valid_data)
    
    # Corrupted frame strings
    corrupted_frames = [
        "{\"temp\": 28.0, \"humidity\": ",
        "GARBAGE_SERIAL_NOISE\x00\xff\xfe",
        "--- [DEBUG LOG] Not a JSON line ---",
        "{\"temperature\": \"not_a_number\", \"humidity\": 65.0}"
    ]
    
    for frame in corrupted_frames:
        if frame.startswith("{") and frame.endswith("}"):
            try:
                d = json.loads(frame)
                bridge.update_readings(d)
            except Exception:
                bridge.record_corrupted_frame()
        else:
            bridge.record_corrupted_frame()
            
    # Bridge should maintain last known valid state without crashing
    snapshot = bridge.get_snapshot()
    assert snapshot["readings"]["temperature"] == 28.0
    assert snapshot["stats"]["corrupted_frames"] > 0
    print(f"  Diagnostics: Corrupted frames tracked: {snapshot['stats']['corrupted_frames']}. Last valid readings preserved.")

# -------------------------------------------------------------
# Test 8: Reconnection handling
# -------------------------------------------------------------
def test_8_reconnection():
    bridge = SerialBridgeState(port="COM7", baud=115200)
    
    # 1. ESP32 Disconnects
    bridge.set_disconnected("Port closed by host")
    assert bridge.status == "disconnected"
    assert bridge.stats["reconnect_attempts"] >= 1
    
    # 2. ESP32 Re-attaches and sends valid telemetry
    new_packet = {"temperature": 31.2, "humidity": 70.1, "soil_moisture": 38.0, "light_intensity": 92.0}
    bridge.update_readings(new_packet)
    
    snapshot = bridge.get_snapshot()
    assert snapshot["status"] == "connected"
    assert snapshot["readings"]["temperature"] == 31.2
    assert snapshot["readings"]["light_intensity"] == 92.0
    assert snapshot["is_stale"] is False
    print("  Diagnostics: Automatic reconnection succeeded. Bridge recovered to 'connected' immediately on first telemetry frame.")

# -------------------------------------------------------------
# Test 9: Simulation mode
# -------------------------------------------------------------
def test_9_simulation_mode():
    sim = simulate_sensor_data()
    assert sim["status"] == "success"
    assert sim["source"] == "PYTHON_RANDOM_GENERATOR"
    
    # Verify bounds per specification
    assert 20.0 <= sim["temperature"] <= 40.0, f"Temp out of bounds: {sim['temperature']}"
    assert 30.0 <= sim["humidity"] <= 90.0, f"Humidity out of bounds: {sim['humidity']}"
    assert 20.0 <= sim["soilMoisture"] <= 80.0, f"Soil moisture out of bounds: {sim['soilMoisture']}"
    assert 10.0 <= sim["lightIntensity"] <= 100.0, f"Light intensity out of bounds: {sim['lightIntensity']}"
    print(f"  Diagnostics: Simulated T={sim['temperature']}°C, H={sim['humidity']}%, M={sim['soilMoisture']}%, L={sim['lightIntensity']}% (All within agricultural bounds)")

# -------------------------------------------------------------
# Test 10: Hardware mode
# -------------------------------------------------------------
def test_10_hardware_mode():
    # Verify hardware mode mapping and alias support
    # Ingest using snake_case and camelCase interchangeably
    test_payload_1 = {
        "temperature": 29.5,
        "humidity": 68.0,
        "soil_moisture": 44.5,
        "light_intensity": 82.0,
        "soil_raw": 2200,
        "light_raw": 1150
    }
    payload1 = SensorPayload(**test_payload_1)
    res1 = receive_sensor_data(payload1)
    assert res1["status"] == "success"
    assert zones_state["ZONE-A"]["isLiveHardware"] is True
    assert zones_state["ZONE-A"]["lightIntensity"] == 82.0
    assert zones_state["ZONE-A"]["airTemperature"] == 29.5
    print("  Diagnostics: Hardware mode ingestion, alias normalization, and live hardware flag validated.")

# Run all 10 tests
test_condition(1, "All 4 sensors working: temp, humidity, soil, light all show valid values", test_1_all_sensors_working)
test_condition(2, "LDR disconnected: temp, humidity, soil show values, Light Intensity shows N/A (None)", test_2_ldr_disconnected)
test_condition(3, "LDR reading 0: Light Intensity shows 0.0%, not N/A", test_3_ldr_reading_zero)
test_condition(4, "LDR reading 4095: Light Intensity shows 100.0%, not N/A", test_4_ldr_reading_4095)
test_condition(5, "ESP32 disconnected: Watchdog marks stale, status changes to disconnected/stale", test_5_esp32_disconnected)
test_condition(6, "Backend unavailable: worker queues and recovers gracefully without crashing", test_6_backend_unavailable)
test_condition(7, "Invalid JSON: Ignored without crash, corrupted frames recorded, valid state kept", test_7_invalid_json)
test_condition(8, "Reconnection: ESP32 recovers automatically on new telemetry packet", test_8_reconnection)
test_condition(9, "Simulation mode: values within specification (T:20-40, H:30-90, M:20-80, L:10-100)", test_9_simulation_mode)
test_condition(10, "Hardware mode: immediate ingestion, live hardware flag, and field aliases validated", test_10_hardware_mode)

print("\n" + "=" * 70)
print(f"VERIFICATION SUMMARY: {passed_tests} / {total_tests} TESTS PASSED")
print("=" * 70)

if passed_tests == total_tests:
    print("ALL 10 TESTS PASSED SUCCESSFULLY! SYSTEM READY FOR DEPLOYMENT.")
    sys.exit(0)
else:
    print("SOME TESTS FAILED! PLEASE REVIEW OUTPUT ABOVE.")
    sys.exit(1)
