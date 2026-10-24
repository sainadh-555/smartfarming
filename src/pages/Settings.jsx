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
  CheckCircle2 
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Settings() {
  const { unitSystem, setUnitSystem, language, setLanguage } = useFarmData();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
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
              System & International Standards Settings
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ISO 11783 & GlobalG.A.P.
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure precision agriculture units, CAN-bus baud rates, language preferences, and AI threshold triggers.
          </p>
        </div>

        <button 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-95 shrink-0"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          {saved ? 'Settings Persisted!' : 'Save All Preferences'}
        </button>
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

        {/* AI & FAO-56 Engine Rules */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-sm text-slate-800">FAO-56 Penman-Monteith & AI Policy</h3>
          </div>
          <div className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Drip Irrigation Depletion Threshold (RAW p-factor)</label>
              <input type="range" min="20" max="60" defaultValue="40" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>20% (Conservative)</span>
                <span className="font-bold text-emerald-600">40% RAW (FAO-56 Default)</span>
                <span>60% (Deficit Irrigation)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-bold text-slate-800">Autonomous Solenoid Relay Trigger</p>
                <p className="text-[11px] text-slate-500">Enable ISO 11783-10 Task Controller to actuate drip pumps automatically</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications & Auditing */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm text-slate-800">Regulatory Notifications & Audio Chimes</h3>
          </div>
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">GlobalG.A.P. Pre-Harvest Warning</p>
                <p className="text-[11px] text-slate-500">Alert 48 hours prior to pre-harvest interval expiration</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Web Audio API Agronomist Chimes</p>
                <p className="text-[11px] text-slate-500">Soft acoustic alerts on proactive agronomic anomaly</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
