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
  Zap,
  Cable,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
  ExternalLink,
  Droplets,
  Thermometer,
  Sun,
  Globe,
  Sparkles,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { ISOBUS_PGN_DEFINITIONS, generateIsoBusTelemetryFrame } from '../services/standardsEngine';

export default function DataSources() {
  const { 
    zones, 
    // Hybrid Mode Controls
    operatingMode,
    setOperatingMode,
    sourceLabel,
    hardwareData,
    simulationBaseline,
    simulationData,
    startRealSimulation,
    // Protocol Ingestion Controls
    hardwareSource,
    setDataMode,
    bridgeUrl,
    setBridgeUrl,
    usbStatus,
    usbPort,
    usbLastSync,
    usbRawReadings,
    usbError,
    testBridgeConnection,
    backendUrl,
    setBackendUrl,
    cloudStatus,
    lastCloudSync,
    testBackendConnection,
    connectWebSerial,
    disconnectWebSerial,
    isWebSerialSupported,
    language,
    t
  } = useFarmData();

  const isTe = language === 'te';
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');
  const [selectedPgn, setSelectedPgn] = useState('PGN_65488');
  const [copied, setCopied] = useState(false);
  const [simulatedNotice, setSimulatedNotice] = useState(false);
  const [webSerialConnecting, setWebSerialConnecting] = useState(false);
  const [webSerialFeedback, setWebSerialFeedback] = useState(null);

  const handleConnectWebSerial = async () => {
    setWebSerialConnecting(true);
    setWebSerialFeedback(null);
    try {
      await connectWebSerial();
      setWebSerialFeedback({
        type: 'success',
        message: isTe ? 'ESP32 COM7 వద్ద విజయవంతంగా కనెక్ట్ చేయబడింది! లైవ్ డేటా ప్రసారం ప్రారంభమైంది.' : 'ESP32 connected via Web Serial on COM7! Live telemetry streaming.'
      });
    } catch (err) {
      const msg = err.message || '';
      const isBusy = msg.includes('Permission') || msg.includes('busy') || msg.includes('Access');
      setWebSerialFeedback({
        type: 'error',
        message: isBusy
          ? (isTe ? 'COM7 పోర్ట్ బిజీగా ఉంది! దయచేసి ముందుగా Arduino IDE లో Serial Monitor మూసివేయండి.' : 'Port COM7 is busy! Please close the Serial Monitor in Arduino IDE first.')
          : (err.message || 'Failed to connect.')
      });
    } finally {
      setWebSerialConnecting(false);
    }
  };

  // USB Bridge Testing
  const [testingBridge, setTestingBridge] = useState(false);
  const [bridgeTestResult, setBridgeTestResult] = useState(null);
  const [inputBridgeUrl, setInputBridgeUrl] = useState(bridgeUrl || 'http://127.0.0.1:5000');

  // Cloud Backend Testing
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState(null);
  const [inputCloudUrl, setInputCloudUrl] = useState(backendUrl || 'https://smartfarming-e3b2.onrender.com');

  const activeZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0];
  const isoFrame = generateIsoBusTelemetryFrame(activeZone.zoneId, activeZone.sensorData);

  const samplePayload = {
    standard: "ISO 11783-10:2025 (ISOBUS)",
    telemetrySource: sourceLabel,
    operatingMode,
    activePort: usbPort || "None",
    hardwareStatus: operatingMode === 'live_hardware' ? hardwareData.connectionStatus : operatingMode,
    controllerUnit: `ECU-${activeZone.zoneId}-ESP32`,
    sourceAddress: isoFrame.sourceAddress,
    timestamp: new Date().toISOString(),
    zoneId: activeZone.zoneId,
    cropType: activeZone.cropType,
    liveSensorTelemetry: {
      temperatureC: activeZone.sensorData?.airTemperature,
      humidityPct: activeZone.sensorData?.humidity,
      soilMoisturePct: activeZone.sensorData?.soilMoisture,
      rawMoistureAdc: activeZone.sensorData?.soilRaw || null,
      rawLdrAdc: activeZone.sensorData?.lightRaw || null,
      dhtStatus: activeZone.sensorData?.dhtOk === false ? "FAILED_OR_UNWIRED" : "OPERATIONAL"
    },
    pgnFrames: isoFrame.pgnFrames
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestBridge = async () => {
    setTestingBridge(true);
    setBridgeTestResult(null);
    const res = await testBridgeConnection(inputBridgeUrl);
    setBridgeTestResult(res);
    setTestingBridge(false);
  };

  const handleSaveBridgeUrl = () => {
    setBridgeUrl(inputBridgeUrl);
  };

  const handleTestCloud = async () => {
    setTestingCloud(true);
    setCloudTestResult(null);
    const res = await testBackendConnection(inputCloudUrl);
    setCloudTestResult(res);
    setTestingCloud(false);
  };

  const handleSaveCloudUrl = () => {
    setBackendUrl(inputCloudUrl);
  };

  const handleTriggerSimulateData = () => {
    startRealSimulation();
    setSimulatedNotice(true);
    setTimeout(() => setSimulatedNotice(false), 3000);
  };

  const getUsbStatusDisplay = () => {
    switch (usbStatus) {
      case 'connected':
        return {
          color: 'bg-emerald-500',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-300',
          bgColor: 'bg-emerald-50',
          title: 'Connected & Streaming',
          desc: `Active serial connection on ${usbPort || 'COM Port'}`
        };
      case 'waiting_data':
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-300',
          bgColor: 'bg-amber-50',
          title: 'Waiting for Sensor Frames',
          desc: `Serial port ${usbPort || ''} open. Awaiting first JSON packet.`
        };
      case 'stale':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          title: 'Telemetry Stale',
          desc: 'No packets received for > 8 seconds. Retaining last reading.'
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-rose-500',
          textColor: 'text-rose-700',
          borderColor: 'border-rose-300',
          bgColor: 'bg-rose-50',
          title: 'Bridge Disconnected',
          desc: usbError || 'Local Python bridge is offline or COM port is closed.'
        };
    }
  };

  const statusDisplay = getUsbStatusDisplay();
  const hasRealBaseline = simulationBaseline?.hasRealBaseline && hardwareData.hasReadings;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Data Sources & Hardware Ingestion
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Hybrid Ingestion Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Seamlessly switch between Live ESP32 Hardware, real-data-based simulation, or manual sensor overrides.
          </p>
        </div>

        {/* 3-Mode Global Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl border border-slate-300 flex-wrap">
          <button
            onClick={() => setOperatingMode('live_hardware')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              operatingMode === 'live_hardware'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>Live Hardware</span>
          </button>
          
          <button
            onClick={handleTriggerSimulateData}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              operatingMode === 'simulation'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Data</span>
          </button>

          <button
            onClick={() => setOperatingMode('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              operatingMode === 'manual'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual Mode</span>
          </button>
        </div>
      </div>

      {/* Mode Status Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        operatingMode === 'simulation'
          ? 'bg-purple-50/90 border-purple-200 text-purple-950'
          : operatingMode === 'manual'
          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
          : (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale 
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
              : 'bg-slate-900 border-slate-800 text-white')
      } flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${
            operatingMode === 'simulation'
              ? 'bg-purple-600 text-white'
              : operatingMode === 'manual'
              ? 'bg-amber-600 text-white'
              : (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-emerald-400')
          } shrink-0`}>
            {operatingMode === 'simulation' ? <Sparkles className="w-6 h-6" /> : (operatingMode === 'manual' ? <Sliders className="w-6 h-6" /> : <Cable className="w-6 h-6" />)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                Current Operating Mode:
              </span>
              <strong className="text-sm font-extrabold">
                {operatingMode === 'simulation' 
                  ? 'Real-Data-Based Simulation Mode' 
                  : (operatingMode === 'manual' ? 'Manual Mode (User Custom Overrides)' : 'Live Hardware Mode')}
              </strong>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-300 text-slate-800">
                {sourceLabel}
              </span>
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${
              operatingMode === 'live_hardware' && hardwareData.connectionStatus !== 'connected'
                ? 'text-slate-300' 
                : 'text-slate-600'
            }`}>
              {operatingMode === 'simulation'
                ? (hasRealBaseline 
                    ? `Simulation active with real ESP32 baseline captured at ${simulationBaseline?.capturedAt}. Hardware readings are preserved.`
                    : 'Simulation active with synthetic baseline. Connect an ESP32 to base simulations on real hardware readings.')
                : operatingMode === 'manual'
                ? 'Manual mode active. Values are user-entered and will not modify physical hardware.'
                : (hardwareData.connectionStatus === 'connected' && !hardwareData.isStale
                    ? `Physical ESP32 streaming live telemetry from ${hardwareData.port || 'USB'}. Zone A reflects real measurements.`
                    : 'Awaiting USB serial packet from ESP32. Ensure bridge script is running.')}
            </p>
          </div>
        </div>

        {/* Live Metrics Ticker */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 shadow-2xs">
            <div className="text-[10px] opacity-75 font-bold uppercase">
              {operatingMode.toUpperCase()}
            </div>
            <div className="font-bold">
              {operatingMode === 'live_hardware' 
                ? (hardwareData.hasReadings ? `Sync: ${hardwareData.lastUpdated}` : 'Waiting...') 
                : (operatingMode === 'simulation' ? 'Simulation Active' : 'Manual Active')}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. REAL-DATA-BASED SIMULATION & BASELINE CARD (SECTION 7 REQUIREMENT) */}
      {/* ------------------------------------------------------------- */}
      <div className={`bg-white rounded-2xl border-2 ${operatingMode === 'simulation' ? 'border-purple-500 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden transition-all`}>
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between text-white gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-white">Real-Data-Based Simulation Mode</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {operatingMode === 'simulation' ? 'ACTIVE' : 'READY'}
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Captures immutable hardware readings as a baseline and modifies a separate simulation state
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerSimulateData}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate Data</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Feedback Alert */}
          {simulatedNotice && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                {hasRealBaseline 
                  ? `Simulation baseline captured from ESP32 at ${simulationBaseline?.capturedAt}! Switch to the Dashboard to adjust sliders.` 
                  : 'No real hardware readings available yet. Switched to manual simulation mode with default values.'}
              </span>
            </div>
          )}

          {/* Section 7 Telemetry Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Hardware Connection Status */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Hardware Connection Status
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  hardwareData.connectionStatus === 'connected' && !hardwareData.isStale
                    ? 'bg-emerald-500 animate-ping'
                    : (hardwareData.isStale 
                        ? 'bg-orange-500' 
                        : (hardwareData.connectionStatus === 'waiting_data' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'))
                }`} />
                <strong className="text-sm font-black text-slate-900">
                  {hardwareData.connectionStatus === 'connected' && !hardwareData.isStale
                    ? `Connected (${usbPort || 'USB'})`
                    : (hardwareData.isStale 
                        ? 'Stale Telemetry (Paused)' 
                        : (hardwareData.connectionStatus === 'waiting_data' ? 'Waiting for Sensor Frames' : 'Bridge Offline'))}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                Protocol: {hardwareSource === 'usb_hardware' ? 'Local USB Bridge' : 'Render Cloud'}
              </span>
            </div>

            {/* 2. Simulation Baseline Availability */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Simulation Baseline Availability
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                {hasRealBaseline ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <strong className={`text-sm font-black ${hasRealBaseline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {hasRealBaseline ? 'Available (Real ESP32)' : 'No Real Baseline Yet'}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {hasRealBaseline 
                  ? `Captured at ${simulationBaseline?.capturedAt}` 
                  : 'Manual simulation available without ESP32'}
              </span>
            </div>

            {/* 3. Number of Readings Collected */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Readings Collected & Last Sync
              </span>
              <div className="text-sm font-black text-slate-900 mt-2 font-mono">
                {hardwareData.readingsCount} packets collected
              </div>
              <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                Last Data Collection: <strong>{hardwareData.lastUpdated || 'Never'}</strong>
              </span>
            </div>

          </div>

          {/* Latest Real Readings Summary Grid */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Latest Ground Truth Readings (Immutable Physical Hardware Data)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold block">REAL TEMPERATURE</span>
                <strong className="text-base font-black font-mono text-slate-900 block mt-1">
                  {hardwareData.temperature !== null ? `${hardwareData.temperature.toFixed(1)}°C` : 'Waiting...'}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold block">REAL HUMIDITY</span>
                <strong className="text-base font-black font-mono text-slate-900 block mt-1">
                  {hardwareData.humidity !== null ? `${hardwareData.humidity.toFixed(1)}%` : 'Waiting...'}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold block">REAL MOISTURE</span>
                <strong className="text-base font-black font-mono text-slate-900 block mt-1">
                  {hardwareData.soilMoisture !== null ? `${hardwareData.soilMoisture.toFixed(1)}%` : 'Waiting...'}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold block">REAL LIGHT</span>
                <strong className="text-base font-black font-mono text-slate-900 block mt-1">
                  {hardwareData.lightIntensity !== null ? `${hardwareData.lightIntensity}%` : 'Waiting...'}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-purple-900/80 mt-3">
              * The simulation engine never overwrites these readings. When you adjust simulated temperature or moisture, changes exist strictly within the simulation layer.
            </p>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. LOCAL USB SERIAL BRIDGE CARD */}
      {/* ------------------------------------------------------------- */}
      <div className={`bg-white rounded-2xl border-2 ${hardwareSource === 'usb_hardware' && operatingMode === 'live_hardware' ? 'border-emerald-500 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden transition-all`}>
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between text-white gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Physical ESP32 USB Cable Ingestion</h3>
              <p className="text-xs text-slate-400">Direct USB Serial at 115200 baud via local Python bridge (127.0.0.1:5000)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              Direct USB • No Wi-Fi
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Arduino IDE Serial Monitor Exclusive Lock Callout */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="font-bold text-amber-900 block mb-0.5">
                  {isTe ? 'ముఖ్యమైన సూచన (COM7):' : 'Important Note for Connecting COM7:'}
                </strong>
                <span className="text-amber-800 leading-relaxed">
                  {isTe 
                    ? 'Arduino IDE లో Serial Monitor తెరిచి ఉంటే, COM7 పోర్ట్ లాక్ చేయబడుతుంది. వెబ్‌లో కనెక్ట్ చేయడానికి లేదా పైథాన్ బ్రిడ్జ్ ప్రారంభించడానికి ముందు Arduino IDE లోని Serial Monitor ను మూసివేయండి.' 
                    : 'In Windows, only one application can access COM7 at a time. Please close the Serial Monitor in Arduino IDE before clicking "Connect" or running the Python bridge.'}
                </span>
              </div>
            </div>

            {isWebSerialSupported() && (
              <button
                type="button"
                onClick={handleConnectWebSerial}
                disabled={webSerialConnecting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-2 shadow-xs"
              >
                <Cable className={`w-4 h-4 text-emerald-400 ${webSerialConnecting ? 'animate-pulse' : ''}`} />
                <span>{webSerialConnecting ? (isTe ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...') : (isTe ? 'బ్రౌజర్ ద్వారా కనెక్ట్ చేయండి (COM7)' : 'Connect ESP32 (COM7 Direct)')}</span>
              </button>
            )}
          </div>

          {webSerialFeedback && (
            <div className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              webSerialFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {webSerialFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{webSerialFeedback.message}</span>
            </div>
          )}
          
          {/* Real Sensor Telemetry Display Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Latest Physical ESP32 Sensor Telemetry (Node: ESP32-DEV-USB)
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Port: <strong>{usbPort || 'Auto-detect'}</strong> • Baud: <strong>115200</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Air Temperature Card */}
              <div className={`p-4 rounded-xl border ${
                usbRawReadings?.temperature !== null && usbRawReadings?.temperature !== undefined
                  ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">GPIO 4 • DHT11</span>
                  <Thermometer className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500 font-semibold">Air Temperature</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {usbRawReadings?.temperature !== null && usbRawReadings?.temperature !== undefined
                      ? `${usbRawReadings.temperature.toFixed(1)} °C`
                      : <span className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" /> Sensor Unavailable</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {usbRawReadings?.dht_ok === false ? 'Read failed (check pin 4)' : 'Physical DHT11'}
                  </div>
                </div>
              </div>

              {/* Relative Humidity Card */}
              <div className={`p-4 rounded-xl border ${
                usbRawReadings?.humidity !== null && usbRawReadings?.humidity !== undefined
                  ? 'bg-blue-50/50 border-blue-200 text-blue-950'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">GPIO 4 • DHT11</span>
                  <Droplets className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500 font-semibold">Relative Humidity</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {usbRawReadings?.humidity !== null && usbRawReadings?.humidity !== undefined
                      ? `${usbRawReadings.humidity.toFixed(1)} %`
                      : <span className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" /> Sensor Unavailable</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {usbRawReadings?.dht_ok === false ? 'Signal error' : 'Ambient Canopy RH'}
                  </div>
                </div>
              </div>

              {/* Soil Moisture Card */}
              <div className="p-4 rounded-xl border bg-emerald-50/50 border-emerald-200 text-emerald-950">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">GPIO 34 • ADC1_CH6</span>
                  <Droplets className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500 font-semibold">Soil VWC Moisture</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {usbRawReadings?.soil_moisture !== null && usbRawReadings?.soil_moisture !== undefined
                      ? `${usbRawReadings.soil_moisture.toFixed(1)} %`
                      : <span className="text-sm text-slate-400 font-bold">Standby</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    Raw ADC: <strong>{usbRawReadings?.soil_raw !== null && usbRawReadings?.soil_raw !== undefined ? `${usbRawReadings.soil_raw} / 4095` : 'Awaiting packet'}</strong>
                  </div>
                </div>
              </div>

              {/* Ambient Light Card */}
              <div className="p-4 rounded-xl border bg-yellow-50/50 border-yellow-200 text-yellow-950">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-700">GPIO 35 • ADC1_CH7</span>
                  <Sun className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500 font-semibold">Ambient Light</div>
                  <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {usbRawReadings?.light_lux !== null && usbRawReadings?.light_lux !== undefined
                      ? `${usbRawReadings.light_lux} lux`
                      : <span className="text-sm text-slate-400 font-bold">Standby</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    Raw ADC: <strong>{usbRawReadings?.light_raw !== null && usbRawReadings?.light_raw !== undefined ? `${usbRawReadings.light_raw} / 4095` : 'Awaiting packet'}</strong>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Local Bridge Endpoint & Test */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Local USB Serial Bridge API URL (Loopback Interface)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Binds to: <strong>127.0.0.1:5000</strong>
              </span>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputBridgeUrl}
                onChange={(e) => setInputBridgeUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button
                type="button"
                onClick={handleTestBridge}
                disabled={testingBridge}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingBridge ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>{testingBridge ? 'Testing...' : 'Test Bridge'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveBridgeUrl}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
              >
                Save
              </button>
            </div>

            {/* Test Result Message */}
            {bridgeTestResult && (
              <div className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                bridgeTestResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {bridgeTestResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong>Bridge Online:</strong> Connected to local bridge at {inputBridgeUrl}. Serial status: <strong>{bridgeTestResult.data.serial_status}</strong> on port <strong>{bridgeTestResult.data.port}</strong>.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <strong>Connection Failed:</strong> {bridgeTestResult.error}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Windows Setup Instructions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-slate-100">
            <h4 className="text-xs font-extrabold text-white mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Windows Launch Instructions for Local USB Bridge
            </h4>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <span className="font-semibold text-white">Plug your ESP32 into a USB port</span> on your Windows PC.
              </li>
              <li>
                <span className="font-semibold text-amber-300">IMPORTANT: Close Arduino IDE Serial Monitor</span> before starting the bridge. (Only one program can own a COM port at a time).
              </li>
              <li>
                Open PowerShell or Command Prompt in the project folder:
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 mt-1 select-all">
                  python bridge/serial_bridge.py --port COM7
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  *(Replace <code>COM7</code> with your board's port from Device Manager. Default is <code>COM3</code> at <code>115200</code> baud).*
                </span>
              </li>
              <li>
                Switch the mode toggle at the top of this page to <span className="font-semibold text-emerald-400">"Live Hardware"</span>.
              </li>
            </ol>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RENDER CLOUD BACKEND INTEGRATION CARD */}
      {/* ------------------------------------------------------------- */}
      <div className={`bg-white rounded-2xl border-2 ${hardwareSource === 'cloud_backend' ? 'border-purple-500 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden transition-all`}>
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between text-white gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Render Production Cloud Backend</h3>
              <p className="text-xs text-purple-200">Deployed Python FastAPI Web Service at {backendUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={`${backendUrl}/docs`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1 border border-white/20 transition-all"
            >
              <span>Swagger Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Render Backend API Endpoint
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputCloudUrl}
                onChange={(e) => setInputCloudUrl(e.target.value)}
                placeholder="https://smartfarming-e3b2.onrender.com"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleTestCloud}
                disabled={testingCloud}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingCloud ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>{testingCloud ? 'Testing...' : 'Test Connection'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCloudUrl}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Live service: <code>https://smartfarming-e3b2.onrender.com</code>. Ingests ESP32 Wi-Fi HTTP POST payloads and serves real-time telemetry to the dashboard.
            </p>
          </div>

          {/* Test Cloud Result Box */}
          {cloudTestResult && (
            <div className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
              cloudTestResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {cloudTestResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>Render Backend Online!</strong> Status: <strong>{cloudTestResult.data?.status || 'healthy'}</strong>. Connected to {backendUrl}. Zones active: <strong>{cloudTestResult.data?.zonesCount || 4}</strong>.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <strong>Connection Failed:</strong> {cloudTestResult.error}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ISO 11783 CAN-Bus Telemetry Inspector */}
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
                {z.zoneId === 'ZONE-A' && operatingMode === 'live_hardware' && (
                  <span className="ml-1 text-[9px] px-1 bg-emerald-500 text-white rounded">USB</span>
                )}
                {operatingMode === 'simulation' && (
                  <span className="ml-1 text-[9px] px-1 bg-purple-500 text-white rounded">SIM</span>
                )}
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
