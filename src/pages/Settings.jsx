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
  ExternalLink
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Settings() {
  const { 
    unitSystem, 
    setUnitSystem, 
    language, 
    setLanguage,
    backendUrl,
    setBackendUrl,
    testBackendConnection,
    isLiveHardware,
    lastHardwareSync 
  } = useFarmData();

  const [inputUrl, setInputUrl] = useState(backendUrl || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    const res = await testBackendConnection(inputUrl);
    setConnectionResult(res);
    setTestingConnection(false);
  };

  const handleSave = () => {
    setBackendUrl(inputUrl);
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
              ESP32 & Render Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure your Render backend endpoint, live ESP32 pinouts, measurement units, and CAN-bus telemetry.
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

      {/* Live Render Backend & ESP32 Configuration Card */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Render Cloud Backend Integration</h3>
              <p className="text-xs text-slate-500">Connect this frontend to your deployed Python FastAPI service on Render</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveHardware ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {isLiveHardware ? `Live ESP32 Synced (${lastHardwareSync})` : 'Simulation Fallback Active'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Backend API URL (Render Web Service)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-app-name.onrender.com (or http://localhost:8000 for local)"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !inputUrl}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingConnection ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Enter your live Render backend URL. Once connected, your real physical ESP32 sensor readings will stream directly into the dashboard!
            </p>
          </div>

          {/* Test Connection Result Box */}
          {connectionResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2.5 animate-fadeIn ${
              connectionResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {connectionResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>Connection Successful!</strong> Connected to backend. Ready to ingest ESP32 live telemetry.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <strong>Connection Failed:</strong> {connectionResult.error}. Make sure your Render backend service is deployed and running.
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
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">DHT11 SENSOR</span>
                <strong className="text-slate-900 font-bold">GPIO 4</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">SOIL MOISTURE</span>
                <strong className="text-slate-900 font-bold">GPIO 34 (AO)</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">LIGHT / LDR</span>
                <strong className="text-slate-900 font-bold">GPIO 35 (AO)</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">SOLENOID VALVE</span>
                <strong className="text-slate-900 font-bold">GPIO 26 (Relay)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* International Standards & Unit System */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-800">International Unit System & i18n</h3>
          </div>
          <div className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit System</label>
              <select 
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="metric">SI Metric Standard (°C, mm, ha, kg/ha, kPa)</option>
                <option value="imperial">Imperial / US Customary (°F, in, ac, lbs/ac, PSI)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Converts all live telemetry, evapotranspiration, and areas across all pages.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Display Language (Internationalization)</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="en">English (Global Precision Ag)</option>
                <option value="es">Español (Spanish Agronomía)</option>
                <option value="fr">Français (French Agriculture de Précision)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pesticide MRL Regulatory Framework</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option>GlobalG.A.P. & Codex Alimentarius (UN FAO/WHO)</option>
                <option>European Food Safety Authority (EFSA MRLs)</option>
                <option>US EPA Tolerance Residues (40 CFR Part 180)</option>
                <option>FSSAI / CIBRC Agricultural Standard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hardware & CAN-Bus Telemetry */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-800">ISO 11783 CAN-Bus & IoT Gateway</h3>
          </div>
          <div className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ISOBUS CAN Baud Rate</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option>250 kbps (ISO 11783-3 Standard)</option>
                <option>500 kbps (High-Throughput Diagnostic)</option>
                <option>125 kbps (Long-Distance Implement Bus)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">LoRaWAN Regional Frequency Plan</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option>IN865-867 (India Harmonized)</option>
                <option>EU863-870 (Europe ISM)</option>
                <option>US902-928 (Americas 915 MHz)</option>
                <option>AS923 (Asia-Pacific)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telemetry Broadcast Rate</label>
              <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option>10 Hz (Real-time Task Controller Stream)</option>
                <option>1 Hz (Periodic Low-Power)</option>
                <option>Every 5 Minutes (Battery Saver Mode)</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
