import React, { useState } from 'react';
import { 
  Save, 
  Bell, 
  Smartphone, 
  Shield, 
  Wifi, 
  Cpu, 
  Globe, 
  Scale, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  Server, 
  Activity, 
  AlertCircle,
  ExternalLink,
  Cable,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Settings() {
  const { 
    unitSystem, 
    setUnitSystem, 
    language, 
    setLanguage,
    dataMode,
    setDataMode,
    bridgeUrl,
    setBridgeUrl,
    testBridgeConnection,
    usbStatus,
    usbPort,
    usbLastSync,
    backendUrl,
    setBackendUrl,
    testBackendConnection
  } = useFarmData();

  const [inputBridgeUrl, setInputBridgeUrl] = useState(bridgeUrl || 'http://127.0.0.1:5000');
  const [testingBridge, setTestingBridge] = useState(false);
  const [bridgeResult, setBridgeResult] = useState(null);

  const [inputCloudUrl, setInputCloudUrl] = useState(backendUrl || '');
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudResult, setCloudResult] = useState(null);

  const [saved, setSaved] = useState(false);

  const handleTestBridge = async () => {
    setTestingBridge(true);
    setBridgeResult(null);
    const res = await testBridgeConnection(inputBridgeUrl);
    setBridgeResult(res);
    setTestingBridge(false);
  };

  const handleTestCloud = async () => {
    setTestingCloud(true);
    setCloudResult(null);
    const res = await testBackendConnection(inputCloudUrl);
    setCloudResult(res);
    setTestingCloud(false);
  };

  const handleSave = () => {
    setBridgeUrl(inputBridgeUrl);
    setBackendUrl(inputCloudUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hardware & International System Settings
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ESP32 USB Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure local USB serial bridge, hardware data mode, units of measurement, and agronomy parameters.
          </p>
        </div>

        <button 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-95 shrink-0"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          {saved ? 'Preferences Saved!' : 'Save All Preferences'}
        </button>
      </div>

      {/* Selectable Data Mode Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-extrabold text-sm text-slate-900 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          Active Telemetry Source Mode
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Select whether the dashboard should read from your physical ESP32 USB cable or use the virtual farm simulation engine.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            onClick={() => setDataMode('usb_hardware')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'usb_hardware'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-emerald-600" />
                Live USB Hardware Mode
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${usbStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Streams real physical measurements from your ESP32 on USB serial at 115200 baud via local Python bridge.
            </p>
          </div>

          <div 
            onClick={() => setDataMode('simulation')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'simulation'
                ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                Virtual Simulation Mode
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Simulates realistic agricultural data across 4 cadastral crop quadrants.
            </p>
          </div>
        </div>
      </div>

      {/* Local USB Serial Bridge Configuration Card */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Local USB Serial Bridge Endpoint</h3>
              <p className="text-xs text-slate-500">Connects dashboard to Python bridge on this PC (http://127.0.0.1:5000)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${usbStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {usbStatus === 'connected' ? `ESP32 Connected (${usbPort})` : 'Bridge Disconnected'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Local Bridge API URL (Loopback Interface)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputBridgeUrl}
                onChange={(e) => setInputBridgeUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleTestBridge}
                disabled={testingBridge || !inputBridgeUrl}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingBridge ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>{testingBridge ? 'Testing...' : 'Test Bridge'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default is <code>http://127.0.0.1:5000</code>. Starts reading live telemetry when <code>python bridge/serial_bridge.py</code> is launched.
            </p>
          </div>

          {/* Test Bridge Result Box */}
          {bridgeResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2.5 animate-fadeIn ${
              bridgeResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {bridgeResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>Bridge Online!</strong> Serial status: <strong>{bridgeResult.data.serial_status}</strong> on port <strong>{bridgeResult.data.port}</strong>.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <strong>Connection Failed:</strong> {bridgeResult.error}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmed Pinout Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="font-extrabold text-slate-800 block mb-2 uppercase text-[10px] tracking-wider text-slate-500">
              Confirmed Classic ESP32 Hardware Wiring Map
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">DHT11 SENSOR</span>
                <strong className="text-emerald-700 text-xs">GPIO 4</strong>
                <span className="text-[9px] text-slate-500 block">Data Pin</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">SOIL MOISTURE</span>
                <strong className="text-emerald-700 text-xs">GPIO 34</strong>
                <span className="text-[9px] text-slate-500 block">AO (12-bit ADC)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">LDR LIGHT</span>
                <strong className="text-emerald-700 text-xs">GPIO 35</strong>
                <span className="text-[9px] text-slate-500 block">AO (12-bit ADC)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">COMMON GND</span>
                <strong className="text-emerald-700 text-xs">ESP32 GND</strong>
                <span className="text-[9px] text-slate-500 block">Shared Ground</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Backend Integration (Optional Future Stage) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Optional Cloud Backend (Future Stages)</h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Currently Inactive
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          For future deployments requiring internet Wi-Fi streaming. In current USB cable mode, this cloud backend is not used.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={inputCloudUrl}
            onChange={(e) => setInputCloudUrl(e.target.value)}
            placeholder="https://your-app-name.onrender.com (Optional)"
            className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono bg-slate-50"
          />
          <button
            type="button"
            onClick={handleTestCloud}
            disabled={testingCloud || !inputCloudUrl}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            {testingCloud ? 'Testing...' : 'Test Cloud'}
          </button>
        </div>
      </div>

      {/* International Agronomic Standards & Measurement Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unit System */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            Units of Measurement (ISO 80000-1)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Choose between Metric SI or Imperial US agricultural units.</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUnitSystem('metric')}
              className={`p-3.5 rounded-xl border-2 text-left font-bold text-xs transition-all ${
                unitSystem === 'metric'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block font-mono text-xs">Metric (SI)</span>
              <span className="text-[10px] text-slate-500 font-normal block mt-1">°C, mm, Hectares, Liters</span>
            </button>

            <button
              onClick={() => setUnitSystem('imperial')}
              className={`p-3.5 rounded-xl border-2 text-left font-bold text-xs transition-all ${
                unitSystem === 'imperial'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block font-mono text-xs">Imperial (US)</span>
              <span className="text-[10px] text-slate-500 font-normal block mt-1">°F, in, Acres, Gallons</span>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Interface Language
          </h3>
          <p className="text-xs text-slate-500 mb-4">Select agricultural vocabulary localization.</p>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          >
            <option value="en">English (Global Agronomy Terminology)</option>
            <option value="es">Español (Agronomía y Agricultura de Precisión)</option>
            <option value="fr">Français (Agriculture de Précision)</option>
            <option value="hi">हिन्दी (स्मार्ट कृषि और मृदा विज्ञान)</option>
            <option value="te">తెలుగు (స్మార్ట్ వ్యవసాయం)</option>
          </select>
        </div>
      </div>

    </div>
  );
}
