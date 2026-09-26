import React, { useState } from 'react';
import { Save, Bell, Smartphone, Shield, Wifi, Cpu } from 'lucide-react';

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500">Configure your SmartFarm MVP preferences and hardware integrations.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hardware Settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gray-600" />
            <h3 className="font-bold text-gray-800">Hardware & Sensors (ESP32)</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
              <input type="text" defaultValue="ESP32-FARM-01" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nature-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Sync Interval</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nature-500">
                <option>Real-time (Every 5 seconds)</option>
                <option>Every 1 minute</option>
                <option>Every 5 minutes</option>
                <option>Hourly</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-gray-800">Auto-Calibration</p>
                <p className="text-sm text-gray-500">Allow AI to calibrate pH and moisture sensors</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nature-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nature-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* AI & Automation Settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="font-bold text-gray-800">AI Engine Rules</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Irrigation Confidence Threshold</label>
              <input type="range" min="0" max="100" defaultValue="75" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-nature-600" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Aggressive (Save crops)</span>
                <span>75%</span>
                <span>Conservative (Save water)</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-gray-800">Autonomous Irrigation</p>
                <p className="text-sm text-gray-500">Allow AI to trigger water pumps automatically</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nature-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nature-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden md:col-span-2">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-bold text-gray-800">Notifications & Alerts</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">SMS Alerts (Critical Only)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nature-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nature-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Webhook Integration</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nature-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nature-600"></div>
                </label>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
              <div className="p-1 bg-blue-100 rounded text-blue-700 mt-1">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Push Notifications</h4>
                <p className="text-xs text-blue-800 mt-1">Your browser currently has push notifications disabled. To receive real-time AI insights, please enable them in your browser settings.</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
