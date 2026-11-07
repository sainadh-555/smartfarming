"""
SmartFarm AI — Plant Vision Pipeline & API Verification Suite
Tests the 5 core cases and API requirements from Section A through F.
"""

import sys
import os
import json
import base64

# Import from backend directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from main import app, resolve_vision_config
from fastapi.testclient import TestClient

client = TestClient(app)

def test_1_plant_status_no_key():
    print("\n--- Test 1: GET /api/plant/status (No Key) ---")
    res = client.get("/api/plant/status")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "online"
    # When no env key is set
    assert "inferenceReady" in data
    assert "supportedCrops" in data
    assert data["supportedCrops"] == ["Tomato", "Chili", "Paddy", "Groundnut"]
    print(f"[PASS] Status endpoint active: inferenceReady={data['inferenceReady']}, message='{data['message']}'")

def test_2_plant_status_with_client_gemini_key():
    print("\n--- Test 2: GET /api/plant/status (Gemini Client Key) ---")
    headers = {"X-Vision-Key": "AIzaSyFakeTestKeyForGeminiValidation12345"}
    res = client.get("/api/plant/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["inferenceReady"] is True
    assert data["provider"] == "gemini"
    assert data["model"] == "gemini-1.5-flash"
    assert data["clientKeyProvided"] is True
    print(f"[PASS] Client Gemini key resolved: provider={data['provider']}, model={data['model']}")

def test_3_plant_status_with_client_groq_key():
    print("\n--- Test 3: GET /api/plant/status (Groq Client Key) ---")
    headers = {"X-Vision-Key": "gsk_FakeTestKeyForGroqQwenValidation12345"}
    res = client.get("/api/plant/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["inferenceReady"] is True
    assert data["provider"] == "groq"
    assert data["model"] == "qwen/qwen3.8-27b"
    assert data["clientKeyProvided"] is True
    print(f"[PASS] Client Groq key resolved: provider={data['provider']}, model={data['model']}")

def test_4_unclear_or_corrupt_image():
    print("\n--- Test 4: POST /api/plant/analyze (< 300 bytes JPEG) ---")
    tiny_jpeg = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 50
    res = client.post(
        "/api/plant/analyze",
        files={"file": ("tiny.jpg", tiny_jpeg, "image/jpeg")},
        data={"language": "en"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["validation_status"] == "UNCLEAR_IMAGE"
    assert data["is_plant"] is False
    print(f"[PASS] Corrupt/tiny image correctly identified as UNCLEAR_IMAGE: message='{data['message']}'")

def test_5_unsupported_file_format():
    print("\n--- Test 5: POST /api/plant/analyze (Non-image .txt file) ---")
    fake_txt = b'This is a text file, not a plant photo.'
    res = client.post(
        "/api/plant/analyze",
        files={"file": ("test.txt", fake_txt, "text/plain")},
        data={"language": "en"}
    )
    assert res.status_code == 400
    print(f"[PASS] Unsupported non-image rejected with HTTP 400: detail='{res.json()['detail']}'")

def test_6_no_key_truthful_offline_response():
    print("\n--- Test 6: POST /api/plant/analyze (Valid JPEG without AI key) ---")
    # Minimal 1x1 valid JPEG > 300 bytes
    dummy_jpeg = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00' + b'\x00' * 350
    res = client.post(
        "/api/plant/analyze",
        files={"file": ("leaf.jpg", dummy_jpeg, "image/jpeg")},
        data={"language": "en"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["validation_status"] == "MODEL_UNAVAILABLE"
    # Verify no fake disease was fabricated!
    assert data["condition"] is None
    assert data["model_score"] is None
    assert "Real Computer Vision Pipeline" != data.get("model_info")
    assert "Vision Model Offline" in data.get("model_info")
    print(f"[PASS] Truthful offline response without key: model_info='{data['model_info']}', message='{data['message']}'")

def run_all_tests():
    print("=" * 60)
    print("RUNNING PLANT VISION COMPREHENSIVE PIPELINE VERIFICATION")
    print("=" * 60)
    test_1_plant_status_no_key()
    test_2_plant_status_with_client_gemini_key()
    test_3_plant_status_with_client_groq_key()
    test_4_unclear_or_corrupt_image()
    test_5_unsupported_file_format()
    test_6_no_key_truthful_offline_response()
    print("=" * 60)
    print("ALL 6 CORE PLANT VISION TESTS PASSED (100% SUCCESS)")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()

