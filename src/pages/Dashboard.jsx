import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import { generateFarmHealthScore } from '../ai/farmDecisionEngine';
import { 
  calculateCropETc 
} from '../services/standardsEngine';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Bell, 
  CloudRain, 
  Sun, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Gauge, 
  ArrowUpRight, 
  Download,
  Zap,
  Layers,
  FileSpreadsheet,
  Globe,
  Cable,
  Sliders,
  Sparkles,
  RotateCcw,
  X,
  Radio
} from 'lucide-react';
import ZoneDetailModal from '../components/ZoneDetailModal';
import SimulationControlPanel from '../components/SimulationControlPanel';

const ExecutiveKPICard = ({ title, value, unit, statusText, statusColor, subtext, icon: Icon, badge, colorClass }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${colorClass} transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      {badge && (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[140px]">
          {badge}
        </span>
      )}
    </div>

    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{value}</h3>
        {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
        <span className={`font-bold flex items-center gap-1 ${statusColor}`}>
          {statusText}
        </span>
        {subtext && <span className="text-slate-400 font-mono truncate">{subtext}</span>}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { 
    zones, 
    alerts, 
    simulateAction, 
    faoEt0, 
    globalGap, 
    formatTemp, 
    formatArea,
    downloadAuditCSV,
    // Hybrid Operating Mode & Data Objects
    operatingMode,
    setOperatingMode,
    sourceLabel,
    hardwareData,
    simulationBaseline,
    simulationData,
    manualData,
    simulationDeltas,
    startRealSimulation,
    resetSimulationToBaseline,
    resetSimulationToDefaults,
    exitSimulation,
    // Hardware Protocol State
    hardwareSource,
    usbStatus,
    usbPort,
    usbLastSync,
    usbRawReadings,
    usbError,
    bridgeUrl,
    backendUrl,
    cloudStatus,
    lastCloudSync
  } = useFarmData();

  const [selectedZone, setSelectedZone] = useState(null);
  
  if (!zones || zones.length === 0) return null;

  const isLiveMode = operatingMode === 'live_hardware';
  const isSimulationMode = operatingMode === 'simulation';
  const isManualMode = operatingMode === 'manual';
  const liveZoneA = zones.find(z => z.zoneId === 'ZONE-A') || zones[0];

  // ----------------------------------------------------
  // Aggregate / Live Sensor Calculations
  // ----------------------------------------------------
  let displayMoisture = '0%';
  let displayMoistureStatus = 'Optimal Level';
  let displayMoistureColor = 'text-emerald-600';
  let displayMoistureSub = '';

  let displayTempObj = { value: 'Unavailable', symbol: '' };
  let displayTempStatus = 'Normal Temperature';
  let displayTempColor = 'text-emerald-600';
  let displayTempSub = '';

  let avgHumidity = 55;

  if (isLiveMode) {
    if (hardwareData.hasReadings && hardwareData.soilMoisture !== null) {
      displayMoisture = `${hardwareData.soilMoisture.toFixed(1)}%`;
      displayMoistureStatus = hardwareData.soilMoisture < 30 ? 'Low Moisture' : hardwareData.soilMoisture > 75 ? 'High Moisture' : 'Optimal Level';
      displayMoistureColor = hardwareData.soilMoisture < 30 ? 'text-rose-600' : 'text-emerald-600';
      displayMoistureSub = hardwareData.isStale ? `[STALE] Synced ${hardwareData.lastUpdated}` : `Raw ADC: ${hardwareData.soilRaw ?? 'N/A'}`;
    } else if (usbStatus === 'waiting_data') {
      displayMoisture = 'Waiting...';
      displayMoistureStatus = 'Waiting for Sensor';
      displayMoistureColor = 'text-amber-600';
      displayMoistureSub = 'Waiting for first packet';
    } else {
      displayMoisture = 'Unavailable';
      displayMoistureStatus = 'Hardware Disconnected';
      displayMoistureColor = 'text-slate-400';
      displayMoistureSub = 'Check USB cable / Bridge';
    }

    if (hardwareData.hasReadings && hardwareData.temperature !== null) {
      displayTempObj = formatTemp(hardwareData.temperature);
      displayTempStatus = hardwareData.temperature > 34 ? 'High Heat Stress' : 'Normal Temperature';
      displayTempColor = hardwareData.temperature > 34 ? 'text-amber-600' : 'text-emerald-600';
      avgHumidity = hardwareData.humidity !== null ? Math.round(hardwareData.humidity) : 60;
      displayTempSub = hardwareData.isStale ? `[STALE] Synced ${hardwareData.lastUpdated}` : `Humidity: ${hardwareData.humidity?.toFixed(1)}%`;
    } else if (usbStatus === 'waiting_data') {
      displayTempObj = { value: 'Waiting...', symbol: '' };
      displayTempStatus = 'Waiting for Data';
      displayTempColor = 'text-amber-600';
      displayTempSub = 'Sensor initializing';
    } else {
      displayTempObj = { value: 'Unavailable', symbol: '' };
      displayTempStatus = hardwareData.dhtOk === false ? 'DHT11 Check Wiring' : 'Sensor Offline';
      displayTempColor = 'text-rose-600';
      displayTempSub = 'Connect ESP32';
    }
  } else {
    // In Simulation or Manual Mode: values come from the respective state
    const currentVal = isSimulationMode ? simulationData : manualData;
    const m = currentVal.soilMoisture ?? 45;
    const t = currentVal.temperature ?? 28;
    const h = currentVal.humidity ?? 60;

    displayMoisture = `${m.toFixed(1)}%`;
    displayMoistureStatus = m < 30 ? 'Low Moisture' : m > 75 ? 'High Moisture' : 'Optimal Level';
    displayMoistureColor = m < 30 ? 'text-rose-600' : 'text-emerald-600';
    displayMoistureSub = isSimulationMode 
      ? (simulationBaseline?.hasRealBaseline ? 'Simulated from ESP32' : 'Synthetic Baseline')
      : 'Manual User Input';

    displayTempObj = formatTemp(t);
    displayTempStatus = t > 34 ? 'High Heat Stress' : 'Normal Temperature';
    displayTempColor = t > 34 ? 'text-amber-600' : 'text-emerald-600';
    avgHumidity = Math.round(h);
    displayTempSub = `Simulated RH: ${h.toFixed(1)}%`;
  }

  const overallHealth = generateFarmHealthScore(zones.map(z => ({...z.sensorData, cropType: z.cropType})));
  const activeAlerts = alerts.filter(a => !a.resolved);
  const needsIrrigation = zones.some(z => z.analysis?.irrigationRecommendation);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 3-Mode Global Operating Switcher & Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold border ${
                isLiveMode 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : (isSimulationMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30')
              }`}>
                {sourceLabel}
              </span>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                {isLiveMode 
                  ? (hardwareData.hasReadings ? `ESP32 ${usbPort || 'USB'} • ${hardwareData.readingsCount} readings collected` : 'Awaiting physical hardware')
                  : (isSimulationMode 
                      ? (simulationBaseline?.hasRealBaseline ? `Baseline from ESP32 at ${simulationBaseline.capturedAt}` : 'Synthetic agro baseline')
                      : 'Manual user overrides active')}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
              <span>Smart Farm Dashboard</span>
              {isSimulationMode && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                  SIMULATION ACTIVE
                </span>
              )}
              {isManualMode && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  MANUAL MODE
                </span>
              )}
              {isLiveMode && (
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  hardwareData.connectionStatus === 'connected' && !hardwareData.isStale
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' 
                    : (hardwareData.isStale 
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
                        : (hardwareData.connectionStatus === 'waiting_data' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'))
                }`}>
                  {hardwareData.connectionStatus === 'connected' && !hardwareData.isStale 
                    ? 'LIVE ESP32' 
                    : (hardwareData.isStale ? 'STALE TELEMETRY' : (hardwareData.connectionStatus === 'waiting_data' ? 'WAITING DATA' : 'HARDWARE OFFLINE'))}
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300">
              {isLiveMode 
                ? 'Displaying immutable live physical measurements from ESP32 sensors. Original values are never faked.'
                : isSimulationMode 
                ? 'Adjust simulated conditions on top of captured hardware baseline. AI models and farm health recalculate in real-time.'
                : 'Directly modify all agricultural parameters without physical sensors for stress testing and scenario analysis.'}
            </p>
          </div>

          {/* Mode Selector Tabs + Simulate Data Action Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            
            {/* 3 Operating Mode Buttons */}
            <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setOperatingMode('live_hardware')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isLiveMode 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to actual ESP32 sensor telemetry"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Live Hardware</span>
              </button>

              <button
                type="button"
                onClick={() => startRealSimulation()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSimulationMode 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Simulate based on captured hardware baseline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Data</span>
              </button>

              <button
                type="button"
                onClick={() => setOperatingMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isManualMode 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Manually enter custom sensor readings"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual Mode</span>
              </button>
            </div>

            {/* Quick Simulate Data Prominent Action Button (if currently in live mode) */}
            {isLiveMode && (
              <button 
                type="button"
                onClick={() => startRealSimulation()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-950/40 flex items-center gap-1.5 active:scale-95 animate-pulse"
                title="Capture real ESP32 readings as baseline and enter simulation"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Data</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => simulateAction('IRRIGATE')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 active:scale-95"
              title="Start irrigation for dry zones"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Irrigate</span>
            </button>

            <button 
              type="button"
              onClick={downloadAuditCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              title="Download farm data report in CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

        </div>

      </div>

      {/* STALE HARDWARE WARNING BANNER (When hardware is disconnected or stale) */}
      {isLiveMode && hardwareData.isStale && (
        <div className="p-4 rounded-xl border bg-orange-50 border-orange-200 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <div>
              <strong>STALE TELEMETRY DETECTED:</strong> ESP32 packets paused. Retaining last valid measurement from <strong>{hardwareData.lastUpdated}</strong>.
              <span className="block opacity-85 text-[11px] mt-0.5">
                These readings are marked stale and are never represented as live telemetry. Check USB cable and ensure <code>python bridge/serial_bridge.py</code> is running.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => startRealSimulation()}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shrink-0 flex items-center gap-1 text-[11px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate from Last Reading</span>
          </button>
        </div>
      )}

      {/* SIMULATION DELTA COMPARISON CARD (When Simulation Mode is Active) */}
      {isSimulationMode && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl border-2 border-purple-300 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-200 gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Simulation Telemetry & Baseline Comparison
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                  {simulationBaseline?.hasRealBaseline ? 'CAPTURED FROM ESP32' : 'SYNTHETIC BASELINE'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Baseline captured at {simulationBaseline?.capturedAt || 'N/A'}. Adjust sliders below to observe AI recommendations and farm health reactions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetSimulationToBaseline}
                className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title="Reset simulation to captured baseline"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Reset Simulation</span>
              </button>

              <button
                type="button"
                onClick={exitSimulation}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title="Exit simulation and return to live hardware"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Simulation</span>
              </button>
            </div>
          </div>

          {/* 4-Metric Baseline vs Simulated vs Delta Comparison Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Temperature Delta */}
            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Air Temperature</span>
              <div className="text-sm font-black font-mono text-slate-900 mt-1">
                Simulated: <span className="text-purple-700">{simulationData.temperature}°C</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Baseline: {simulationBaseline?.temperature !== null ? `${simulationBaseline.temperature}°C` : 'N/A'}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 text-xs font-mono font-bold">
                Difference:{' '}
                <span className={simulationDeltas?.temperature?.diff > 0 ? 'text-rose-600' : (simulationDeltas?.temperature?.diff < 0 ? 'text-cyan-600' : 'text-slate-600')}>
                  {simulationDeltas?.temperature?.formattedDiff || simulationDeltas?.temperature?.text || '0°C'}
                </span>
              </div>
            </div>

            {/* Soil Moisture Delta */}
            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Soil Moisture</span>
              <div className="text-sm font-black font-mono text-slate-900 mt-1">
                Simulated: <span className="text-blue-700">{simulationData.soilMoisture}%</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Baseline: {simulationBaseline?.soilMoisture !== null ? `${simulationBaseline.soilMoisture}%` : 'N/A'}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 text-xs font-mono font-bold">
                Difference:{' '}
                <span className={simulationDeltas?.soilMoisture?.diff > 0 ? 'text-blue-600' : (simulationDeltas?.soilMoisture?.diff < 0 ? 'text-amber-600' : 'text-slate-600')}>
                  {simulationDeltas?.soilMoisture?.formattedDiff || simulationDeltas?.soilMoisture?.text || '0%'}
                </span>
              </div>
            </div>

            {/* Humidity Delta */}
            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Relative Humidity</span>
              <div className="text-sm font-black font-mono text-slate-900 mt-1">
                Simulated: <span className="text-teal-700">{simulationData.humidity}%</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Baseline: {simulationBaseline?.humidity !== null ? `${simulationBaseline.humidity}%` : 'N/A'}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 text-xs font-mono font-bold">
                Difference:{' '}
                <span className={simulationDeltas?.humidity?.diff > 0 ? 'text-teal-600' : (simulationDeltas?.humidity?.diff < 0 ? 'text-amber-600' : 'text-slate-600')}>
                  {simulationDeltas?.humidity?.formattedDiff || simulationDeltas?.humidity?.text || '0%'}
                </span>
              </div>
            </div>

            {/* Light Intensity Delta */}
            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Light Intensity</span>
              <div className="text-sm font-black font-mono text-slate-900 mt-1">
                Simulated: <span className="text-amber-700">{simulationData.lightIntensity}%</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Baseline: {simulationBaseline?.lightIntensity !== null ? `${simulationBaseline.lightIntensity}%` : 'N/A'}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 text-xs font-mono font-bold">
                Difference:{' '}
                <span className={simulationDeltas?.lightIntensity?.diff > 0 ? 'text-amber-600' : (simulationDeltas?.lightIntensity?.diff < 0 ? 'text-slate-600' : 'text-slate-600')}>
                  {simulationDeltas?.lightIntensity?.formattedDiff || simulationDeltas?.lightIntensity?.text || '0%'}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* INTERACTIVE SIMULATION & MANUAL CONTROL PANEL */}
      {(isSimulationMode || isManualMode) && (
        <SimulationControlPanel />
      )}

      {/* 6-Card Executive KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <ExecutiveKPICard 
          title="Soil Moisture" 
          value={displayMoisture}
          unit=""
          statusText={displayMoistureStatus}
          statusColor={displayMoistureColor}
          subtext={displayMoistureSub}
          icon={Droplets}
          badge={sourceLabel}
          colorClass="bg-blue-50 text-blue-600"
        />

        <ExecutiveKPICard 
          title="Air Temperature" 
          value={`${displayTempObj.value}`}
          unit={displayTempObj.symbol}
          statusText={displayTempStatus}
          statusColor={displayTempColor}
          subtext={displayTempSub}
          icon={Thermometer}
          badge={sourceLabel}
          colorClass="bg-amber-50 text-amber-600"
        />

        <ExecutiveKPICard 
          title="Water Loss (Evap)" 
          value={`${faoEt0}`}
          unit="mm/day"
          statusText="FAO-56 Rate"
          statusColor="text-cyan-700"
          subtext="Daily water loss"
          icon={Gauge}
          badge="FAO-56 ET0"
          colorClass="bg-cyan-50 text-cyan-600"
        />

        <ExecutiveKPICard 
          title="Crop Safety Score" 
          value={`${globalGap.ipmScore}%`}
          unit=""
          statusText="Grade A (Good)"
          statusColor="text-emerald-600"
          subtext="GlobalG.A.P. IFA"
          icon={ShieldCheck}
          badge="Compliance"
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <ExecutiveKPICard 
          title="Farm Health Score" 
          value={`${overallHealth} / 100`}
          unit=""
          statusText={overallHealth > 80 ? 'Healthy Crops' : (overallHealth > 60 ? 'Needs Attention' : 'Critical Stress')}
          statusColor={overallHealth > 80 ? 'text-emerald-600' : (overallHealth > 60 ? 'text-amber-600' : 'text-rose-600')}
          subtext={isSimulationMode ? 'Simulated AI health' : 'Threshold-based score'}
          icon={Activity}
          badge={isSimulationMode ? 'Simulated' : 'Evaluated'}
          colorClass="bg-purple-50 text-purple-600"
        />

        <ExecutiveKPICard 
          title="System Ingestion" 
          value={isLiveMode ? (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale ? 'Live ESP32' : (hardwareData.isStale ? 'Stale' : 'Offline')) : (isSimulationMode ? 'Simulation' : 'Manual')}
          unit=""
          statusText={isLiveMode 
            ? (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale ? `Synced ${hardwareData.lastUpdated}` : (hardwareData.isStale ? 'Packets paused' : 'Check cable')) 
            : (isSimulationMode ? 'Real baseline synced' : 'User input active')}
          statusColor={isLiveMode 
            ? (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale ? 'text-emerald-600' : 'text-rose-600') 
            : (isSimulationMode ? 'text-purple-600' : 'text-amber-600')}
          subtext={isLiveMode ? (hardwareData.port || 'USB Serial') : sourceLabel}
          icon={isLiveMode ? Cable : Sliders}
          badge={sourceLabel}
          colorClass={isLiveMode ? 'bg-emerald-50 text-emerald-700' : (isSimulationMode ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700')}
        />
      </div>

      {/* Farm Zones: Telemetry & 3D View */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Farm Zones & Crops (4 Zones)</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {sourceLabel}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Click any zone to inspect live readings, watering status, crop guidelines, or open the 3D field view.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            4 Active Quadrants
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => {
            const agro = zone.agronomy;
            const stage = agro?.crop?.stagePercent || 50;
            const etcObj = calculateCropETc(agro?.crop?.name || zone.cropType, stage, faoEt0);
            const tempFormatted = formatTemp(zone.sensorData?.airTemperature);
            const areaFormatted = formatArea(agro?.acreage || 0.25);
            const isCritical = zone.analysis?.riskLevel === 'CRITICAL';
            const isWarning = zone.analysis?.riskLevel === 'HIGH';

            const isZoneLiveUsb = isLiveMode && zone.zoneId === 'ZONE-A';
            const isZoneAuxInUsb = isLiveMode && zone.zoneId !== 'ZONE-A';

            const moistureDisplay = typeof zone.sensorData?.soilMoisture === 'number'
              ? `${zone.sensorData.soilMoisture.toFixed(1)}%`
              : (isZoneLiveUsb ? (usbStatus === 'waiting_data' ? 'Waiting...' : 'Unavailable') : 'Standby');

            const tempDisplay = typeof zone.sensorData?.airTemperature === 'number'
              ? `${tempFormatted.value}${tempFormatted.symbol}`
              : (isZoneLiveUsb ? (usbStatus === 'waiting_data' ? 'Waiting...' : 'Unavailable') : 'Standby');

            return (
              <div 
                key={zone.zoneId}
                onClick={() => setSelectedZone(zone)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isZoneAuxInUsb
                    ? 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:shadow-xs'
                    : isCritical 
                    ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400 hover:shadow-md' 
                    : isWarning 
                    ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:shadow-md' 
                    : 'border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {/* Status Beacon */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm shadow-2xs font-mono ${
                      isZoneLiveUsb 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : (isZoneAuxInUsb ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-slate-800 border-slate-200')
                    }`}>
                      {zone.zoneId.replace('ZONE-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {zone.name} — {agro?.crop?.name || zone.cropType}
                        </h4>
                        {isZoneLiveUsb && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            ESP32 USB NODE
                          </span>
                        )}
                        {isZoneAuxInUsb && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Auxiliary (1-ESP32 Setup)
                          </span>
                        )}
                        {!isLiveMode && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                            {sourceLabel}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          zone.analysis?.plantStatus === 'Healthy' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {zone.analysis?.plantStatus || 'Normal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {agro?.crop?.variety || 'Arka Hybrid'} • {areaFormatted.value} {areaFormatted.symbol} ({areaFormatted.sub})
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                    <span>3D Field View</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/70 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">MOISTURE</span>
                    <strong className="text-xs font-black font-mono text-slate-900 block truncate">
                      {moistureDisplay}
                    </strong>
                    {isZoneLiveUsb && zone.sensorData?.soilRaw !== undefined && zone.sensorData?.soilRaw !== null && (
                      <span className="text-[9px] text-slate-400 font-mono block">Raw: {zone.sensorData.soilRaw}</span>
                    )}
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">TEMPERATURE</span>
                    <strong className="text-xs font-black font-mono text-slate-900 block truncate">
                      {tempDisplay}
                    </strong>
                    {isZoneLiveUsb && zone.sensorData?.dhtOk === false && (
                      <span className="text-[9px] text-rose-500 font-bold block">DHT11 Flag</span>
                    )}
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">WATER NEED</span>
                    <strong className="text-xs font-black font-mono text-blue-700 block truncate">
                      {etcObj.etcMmDay} mm/d
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">HEALTH</span>
                    <strong className="text-xs font-black font-mono text-emerald-600 block truncate">
                      {zone.analysis?.overallHealthScore || 85}%
                    </strong>
                  </div>
                </div>

                {/* Agronomic Details */}
                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                  <span className="truncate">
                    Soil: <strong className="text-slate-700">{agro?.crop?.soilType?.split(' ')[0] || 'Sandy Loam'}</strong>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {isZoneLiveUsb 
                      ? `ESP32 USB (${usbPort || 'COM'})` 
                      : (isZoneAuxInUsb ? 'Unmonitored' : (isSimulationMode ? 'Simulation Engine' : 'Manual Override'))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standards Audit & Forecasting Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Crop Safety & Quality Standards */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Crop Safety & Quality Standards</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                PASSED
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pest & Safety Rating:</span>
                <strong className="font-mono font-black text-emerald-600">{globalGap.ipmScore}% (Grade A)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Harvest Safety Buffer:</span>
                <strong className="font-mono text-slate-900">100% Safe</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Crop Health Rotation:</span>
                <strong className="font-mono text-emerald-700">Optimal Rotation</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Irrigation Metering:</span>
                <strong className="font-mono text-slate-900">Active & Monitored</strong>
              </div>
            </div>
          </div>

          <button
            onClick={downloadAuditCSV}
            className="w-full mt-5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Farm Data (CSV)</span>
          </button>
        </div>

        {/* Local Weather Forecast */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-2xl border border-slate-800 shadow-md p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span>Local Weather Forecast</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-400 border border-cyan-500/30">
                Humidity: {avgHumidity}%
              </span>
            </div>

            <div className="flex items-center justify-between my-5">
              <div>
                <div className="text-3xl font-black font-mono tracking-tight">
                  {displayTempObj.value}{displayTempObj.symbol}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Partly Sunny • Good Sunlight</div>
              </div>
              <Sun className="w-10 h-10 text-amber-400 animate-spin-slow" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-3 border-t border-slate-800">
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Tomorrow</div>
                <div className="font-mono font-bold text-white mt-0.5">26°C (68%)</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Friday</div>
                <div className="font-mono font-bold text-white mt-0.5">24°C (Rain)</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Saturday</div>
                <div className="font-mono font-bold text-white mt-0.5">27°C (Sun)</div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4 flex items-center justify-between font-mono">
            <span>Forecast: Local Agro Weather Station</span>
            <span>Update: 10 min ago</span>
          </div>
        </div>

        {/* Live Crop Market Prices */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Live Crop Market Prices</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                LIVE SPOT
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              {[
                { crop: 'Tomato (Grade A)', price: '$1.48 / kg', trend: '+4.2%', up: true, zone: 'Zone A' },
                { crop: 'Guntur Chili (Teja)', price: '$2.85 / kg', trend: '+1.8%', up: true, zone: 'Zone B' },
                { crop: 'Basmati 1509 Paddy', price: '$0.52 / kg', trend: '-0.6%', up: false, zone: 'Zone C' },
                { crop: 'Groundnut (K-6)', price: '$1.15 / kg', trend: '+2.9%', up: true, zone: 'Zone D' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="font-bold text-slate-800">{item.crop}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{item.zone}</span>
                  </div>
                  <div className="text-right">
                    <strong className="font-mono font-bold text-slate-900">{item.price}</strong>
                    <span className={`text-[10px] font-mono font-bold block ${item.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between font-mono">
            <span>Market: Local Mandi / APMC</span>
            <span>Updated Today</span>
          </div>
        </div>

      </div>

      {/* Interactive 3D Digital Twin & Agronomy Modal */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          agronomy={selectedZone.agronomy}
          onClose={() => setSelectedZone(null)}
        />
      )}

    </div>
  );
}
