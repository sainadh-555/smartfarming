import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Wifi, 
  Cpu, 
  Brain, 
  ArrowRight, 
  ShieldCheck, 
  Code, 
  Check, 
  Copy, 
  Radio, 
  Layers, 
  Binary,
  Zap
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { ISOBUS_PGN_DEFINITIONS, generateIsoBusTelemetryFrame } from '../services/standardsEngine';

export default function DataSources() {
  const { zones, isSimulationRunning } = useFarmData();
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');
  const [selectedPgn, setSelectedPgn] = useState('PGN_65488');
  const [copied, setCopied] = useState(false);

  const activeZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0];
  const isoFrame = generateIsoBusTelemetryFrame(activeZone.zoneId, activeZone.sensorData);

  const samplePayload = {
    standard: "ISO 11783-10:2025 (ISOBUS)",
    controllerUnit: `ECU-${activeZone.zoneId}-ESP32`,
    sourceAddress: isoFrame.sourceAddress,
    busSpeedKbps: 250,
    timestamp: new Date().toISOString(),
    zoneId: activeZone.zoneId,
    cropType: activeZone.cropType,
    pgnFrames: isoFrame.pgnFrames,
    hardwareDiagnostics: {
      batteryVoltage: "3.78 V (LiFePO4 Solar)",
      rssi: "-64 dBm (LoRaWAN 868 MHz)",
      firmwareVersion: "ESP-IDF v5.2.1 / ISOBUS-Stack 3.4",
      sensorBus: "RS-485 Modbus RTU (9600-8-N-1)"
    }
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ISO 11783 (ISOBUS) & IoT Architecture
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ISO/IEC 25010
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise hardware abstraction layer, CAN-bus Parameter Group Numbers (PGNs), and OpenAg telemetry standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-mono font-bold text-slate-700">
            {isSimulationRunning ? 'ISOBUS 10Hz Broadcast' : 'Standby Telemetry'}
          </span>
        </div>
      </div>

      {/* ISO 11783 / OpenAg 4-Tier Enterprise Architecture */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <h2 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          International 4-Tier Precision Agriculture Architecture (W3C Web of Things Standard)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          
          {/* Tier 1: Sensor & Mast Node */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-emerald-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">TIER 1 • FIELD LAYER</span>
              <h3 className="font-extrabold text-slate-900 text-sm mt-1">ESP32 Mast Nodes</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                4× Field Quadrant Units with RS-485 Modbus soil sensors, SHT31 microclimate, solar LiFePO4, and MCP2515 CAN transceiver.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-500">
              Protocol: CAN 2.0B / Modbus RTU
            </div>
          </div>

          {/* Tier 2: ISOBUS Gateway */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-blue-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-4 shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider block">TIER 2 • TELEMETRY BUS</span>
              <h3 className="font-extrabold text-slate-900 text-sm mt-1">ISOBUS Gateway</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                ISO 11783-10 Task Controller (TC-BAS & TC-GEO). Ingests CAN frames over LoRaWAN 868MHz and bridges to MQTT TLS 1.3.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-500">
              Standard: ISO 11783-10:2025
            </div>
          </div>

          {/* Tier 3: Agronomic Engine */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-purple-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mb-4 shadow-sm">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase tracking-wider block">TIER 3 • COGNITIVE ML</span>
              <h3 className="font-extrabold text-slate-900 text-sm mt-1">Decision AI Engine</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                FAO-56 Penman-Monteith Evapotranspiration, EPPO CNN plant disease diagnostics, and GlobalG.A.P. IPM audit pipeline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-500">
              Standard: FAO-56 / GlobalG.A.P.
            </div>
          </div>

          {/* Tier 4: Digital Twin Presentation */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-emerald-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4 shadow-sm">
                <Server className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider block">TIER 4 • DIGITAL TWIN</span>
              <h3 className="font-extrabold text-slate-900 text-sm mt-1">WebGL 3D Twin</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                High-performance Three.js procedural twin rendering live quadrant soil moisture, wind-animated crops, and drip irrigation lines.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-500">
              Engine: Three.js WebGL / React 19
            </div>
          </div>

        </div>
      </div>

      {/* Interactive ISO 11783 CAN-Bus Telemetry Inspector */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Binary className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Live ISO 11783 CAN-Bus Telemetry Inspector
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Select an active quadrant and Parameter Group Number (PGN) to inspect live field frames.
            </p>
          </div>

          {/* Quadrant Selector */}
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {zones.map(z => (
              <button
                key={z.zoneId}
                onClick={() => setSelectedZoneId(z.zoneId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedZoneId === z.zoneId 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {z.zoneId.replace('ZONE-', '')}
              </button>
            ))}
          </div>
        </div>

        {/* PGN Frame Switcher */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
          {Object.entries(ISOBUS_PGN_DEFINITIONS).map(([key, def]) => (
            <button
              key={key}
              onClick={() => setSelectedPgn(key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedPgn === key
                  ? 'bg-slate-800 border-emerald-500/80 text-white shadow-xs'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] font-mono font-bold text-emerald-400 block">
                {key.replace('_', ' ')}
              </span>
              <strong className="text-xs font-bold text-white block mt-0.5 truncate">{def.name}</strong>
              <span className="text-[10px] text-slate-500 block truncate">{def.standard}</span>
            </button>
          ))}
        </div>

        {/* Live Decoded JSON Schema */}
        <div className="mt-5 relative">
          <div className="flex items-center justify-between pb-2 text-xs font-mono text-slate-400">
            <span>JSON CAN Payload (ISO 11783-10 Task Controller)</span>
            <button
              onClick={copyPayload}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Payload'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96 leading-relaxed">
            <pre>{JSON.stringify(samplePayload, null, 2)}</pre>
          </div>
        </div>
      </div>

    </div>
  );
}
