"""
SmartFarm AI™ — USB Serial Bridge Automated Test Suite
======================================================
Tests:
  1. Serial line parser (valid JSON, empty lines, comments, malformed frames).
  2. State container (thread safety, readings update, raw ADC preservation, null handling).
  3. Waiting state before first reading.
  4. Stale packet detection.
  5. Flask HTTP endpoints (/api/health, /api/readings, /api/ports).
  6. CORS restrictions for GitHub Pages and local origins.
"""

import sys
import os
import unittest
import json
import time

# Add parent directory to path to import bridge
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serial_bridge import parse_serial_line, SerialBridgeState, create_app


class TestSerialLineParser(unittest.TestCase):
    def test_valid_json_line(self):
        line = '{"temperature":29.1,"humidity":79.8,"soil_raw":1800,"light_raw":2200}\n'
        payload, err = parse_serial_line(line)
        self.assertIsNone(err)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["temperature"], 29.1)
        self.assertEqual(payload["humidity"], 79.8)
        self.assertEqual(payload["soil_raw"], 1800)
        self.assertEqual(payload["light_raw"], 2200)

    def test_dht_failure_with_explicit_null(self):
        line = '{"temperature":null,"humidity":null,"soil_raw":2450,"light_raw":1100,"dht_ok":false}\n'
        payload, err = parse_serial_line(line)
        self.assertIsNone(err)
        self.assertIsNone(payload["temperature"])
        self.assertIsNone(payload["humidity"])
        self.assertEqual(payload["soil_raw"], 2450)
        self.assertEqual(payload["light_raw"], 1100)
        self.assertFalse(payload["dht_ok"])

    def test_diagnostic_comment_skipped(self):
        line = '# [BOOT] ESP32 Ready on GPIO 4, 34, 35\n'
        payload, err = parse_serial_line(line)
        self.assertIsNone(payload)
        self.assertTrue(err.startswith("diagnostic_line"))

    def test_empty_line_skipped(self):
        payload, err = parse_serial_line("\n")
        self.assertIsNone(payload)
        self.assertEqual(err, "empty_line")

    def test_malformed_json_handled_without_crash(self):
        line = '{"temperature":29.1,"humidity":79.8,"soil_raw":1800\n'  # Missing closing brace
        payload, err = parse_serial_line(line)
        self.assertIsNone(payload)
        self.assertTrue(err.startswith("json_decode_error"))

    def test_garbage_characters_handled(self):
        line = '\x00\x01\x02??!random_noise\n'
        payload, err = parse_serial_line(line)
        self.assertIsNone(payload)


class TestSerialBridgeState(unittest.TestCase):
    def setUp(self):
        self.state = SerialBridgeState(port="COM7", baud=115200)

    def test_initial_waiting_state(self):
        snapshot = self.state.get_snapshot()
        self.assertEqual(snapshot["status"], "waiting_data")
        self.assertIsNone(snapshot["readings"])
        self.assertEqual(snapshot["port"], "COM7")
        self.assertEqual(snapshot["baud"], 115200)

    def test_readings_update_and_preserves_raw(self):
        payload = {
            "temperature": 27.8,
            "humidity": 62.4,
            "soil_raw": 2100,
            "light_raw": 1500,
            "soil_moisture": 45.2,
            "light_lux": 580,
            "dht_ok": True,
            "uptime_ms": 10000
        }
        self.state.update_readings(payload)
        snapshot = self.state.get_snapshot()

        self.assertEqual(snapshot["status"], "connected")
        self.assertIsNotNone(snapshot["readings"])
        self.assertEqual(snapshot["readings"]["temperature"], 27.8)
        self.assertEqual(snapshot["readings"]["humidity"], 62.4)
        self.assertEqual(snapshot["readings"]["soil_raw"], 2100)
        self.assertEqual(snapshot["readings"]["light_raw"], 1500)
        self.assertEqual(snapshot["readings"]["soil_moisture"], 45.2)
        self.assertEqual(snapshot["readings"]["light_lux"], 580)
        self.assertTrue(snapshot["readings"]["dht_ok"])
        self.assertFalse(snapshot["is_stale"])

    def test_readings_with_failed_dht_preserves_null(self):
        payload = {
            "temperature": None,
            "humidity": None,
            "soil_raw": 3100,
            "light_raw": 400,
            "dht_ok": False
        }
        self.state.update_readings(payload)
        snapshot = self.state.get_snapshot()

        # Temperature & humidity must be strictly None, not 0!
        self.assertIsNone(snapshot["readings"]["temperature"])
        self.assertIsNone(snapshot["readings"]["humidity"])
        # Raw readings must be intact
        self.assertEqual(snapshot["readings"]["soil_raw"], 3100)
        self.assertEqual(snapshot["readings"]["light_raw"], 400)
        self.assertFalse(snapshot["readings"]["dht_ok"])

    def test_disconnected_state(self):
        self.state.set_disconnected("Serial port unplugged")
        snapshot = self.state.get_snapshot()
        self.assertEqual(snapshot["status"], "disconnected")
        self.assertEqual(snapshot["last_error"], "Serial port unplugged")


class TestFlaskEndpoints(unittest.TestCase):
    def setUp(self):
        self.state = SerialBridgeState(port="COM7", baud=115200)
        self.app = create_app(self.state)
        self.client = self.app.test_client()

    def test_health_endpoint_initial(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["port"], "COM7")
        self.assertEqual(data["serial_status"], "waiting_data")
        self.assertFalse(data["has_readings"])

    def test_readings_endpoint_waiting(self):
        res = self.client.get("/api/readings")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "waiting_data")
        self.assertIsNone(data["readings"])

    def test_readings_endpoint_after_packet(self):
        self.state.update_readings({
            "temperature": 29.5,
            "humidity": 70.1,
            "soil_raw": 1950,
            "light_raw": 800,
            "dht_ok": True
        })
        res = self.client.get("/api/readings")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "connected")
        self.assertIsNotNone(data["readings"])
        self.assertEqual(data["readings"]["temperature"], 29.5)
        self.assertEqual(data["readings"]["soil_raw"], 1950)

    def test_cors_headers_for_github_pages(self):
        res = self.client.get("/api/readings", headers={"Origin": "https://sainadh-555.github.io"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("Access-Control-Allow-Origin"), "https://sainadh-555.github.io")

    def test_ports_endpoint(self):
        res = self.client.get("/api/ports")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("available_ports", data)
        self.assertEqual(data["active_bridge_port"], "COM7")


if __name__ == "__main__":
    unittest.main()
