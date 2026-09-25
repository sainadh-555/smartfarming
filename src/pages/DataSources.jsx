import React from 'react';
import { Database, Server, Wifi, Cpu, Brain, ArrowRight } from 'lucide-react';

export default function DataSources() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Sources & Architecture</h1>
        <p className="text-gray-500">System overview and ESP32 integration details.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5" /> Current Mode: Simulation
        </h2>
        <p className="text-blue-800 text-sm">
          Current MVP is running on simulated ESP32 sensor data. The hardware backend is mocked to demonstrate 
          the AI engine and UI without requiring physical sensors during the Design Thinking & Engineering Orientation evaluation.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">Future Production Architecture</h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
          {/* ESP32 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-300 shadow-sm mb-3">
              <Cpu className="w-8 h-8 text-gray-600" />
            </div>
            <span className="font-bold text-sm text-gray-800">ESP32 + Sensors</span>
            <span className="text-xs text-gray-500 mt-1">Hardware Layer</span>
          </div>

          <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" />

          {/* Wi-Fi/API */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200 shadow-sm mb-3">
              <Wifi className="w-8 h-8 text-blue-600" />
            </div>
            <span className="font-bold text-sm text-gray-800">REST API</span>
            <span className="text-xs text-gray-500 mt-1">POST /api/sensor-data</span>
          </div>

          <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" />

          {/* Backend Engine */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center border-2 border-purple-200 shadow-sm mb-3">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <span className="font-bold text-sm text-gray-800">AI Engine</span>
            <span className="text-xs text-gray-500 mt-1">Decision Logic</span>
          </div>

          <ArrowRight className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" />

          {/* Dashboard */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center border-2 border-green-200 shadow-sm mb-3">
              <Server className="w-8 h-8 text-green-600" />
            </div>
            <span className="font-bold text-sm text-gray-800">Dashboard</span>
            <span className="text-xs text-gray-500 mt-1">Farmer UI</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">ESP32-Ready API Integration</h2>
        <p className="text-sm text-gray-600 mb-4">
          The simulated backend is already consuming data in the exact JSON schema that the ESP32 will transmit.
          Once the hardware is ready, you only need to point the ESP32 to the API endpoint with the following payload format:
        </p>
        
        <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
          <pre>{`{
  "deviceId": "ESP32-FARM-01",
  "farmId": "FARM-001",
  "zoneId": "ZONE-A",
  "timestamp": "2023-10-25T10:00:00Z",
  "soilMoisture": 42.5,
  "soilTemperature": 27.3,
  "airTemperature": 29.1,
  "humidity": 68.0,
  "soilPH": 6.7,
  "lightIntensity": 720,
  "rainfall": 0,
  "plantId": "PLANT-A01",
  "imageUrl": "https://..."
}`}</pre>
        </div>
      </div>
    </div>
  );
}
