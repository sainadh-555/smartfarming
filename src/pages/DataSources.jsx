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
  Globe
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { ISOBUS_PGN_DEFINITIONS, generateIsoBusTelemetryFrame } from '../services/standardsEngine';

export default function DataSources() {
  const { 
    zones, 
    isSimulationRunning,
    dataMode,
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
    testBackendConnection
  } = useFarmData();

  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');
  const [selectedPgn, setSelectedPgn] = useState('PGN_65488');
  const [copied, setCopied] = useState(false);

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
    telemetrySource: dataMode === 'cloud_backend' 
      ? `Render Cloud Service (${backendUrl})` 
      : (dataMode === 'usb_hardware' ? "ESP32 USB Serial (115200 baud)" : "Virtual Simulation Engine"),
    activePort: usbPort || "None",
    hardwareStatus: dataMode === 'cloud_backend' ? cloudStatus : (dataMode === 'usb_hardware' ? usbStatus : 'simulated'),
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

  // Determine status color and text for USB badge
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
          desc: 'No packets received for > 8 seconds. Check ESP32 power.'
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
              Render & USB Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Seamlessly switch between Live Render Cloud, local ESP32 USB cable, or virtual simulation.
          </p>
        </div>

        {/* 3-Mode Global Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl border border-slate-300 flex-wrap">
          <button
            onClick={() => setDataMode('simulation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              dataMode === 'simulation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulation</span>
          </button>
          <button
            onClick={() => setDataMode('usb_hardware')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              dataMode === 'usb_hardware'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>Live USB Cable</span>
          </button>
          <button
            onClick={() => setDataMode('cloud_backend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              dataMode === 'cloud_backend'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Render Cloud</span>
          </button>
        </div>
      </div>

      {/* Mode Status Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        dataMode === 'cloud_backend'
          ? (cloudStatus === 'connected' ? 'bg-purple-50/80 border-purple-200 text-purple-950' : 'bg-slate-900 border-slate-800 text-white')
          : dataMode === 'usb_hardware'
          ? (usbStatus === 'connected' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-slate-900 border-slate-800 text-white')
          : 'bg-blue-50/80 border-blue-200 text-slate-900'
      } flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${
            dataMode === 'cloud_backend'
              ? (cloudStatus === 'connected' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-400')
              : dataMode === 'usb_hardware'
              ? (usbStatus === 'connected' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400')
              : 'bg-blue-600 text-white'
          } shrink-0`}>
            {dataMode === 'cloud_backend' ? <Globe className="w-6 h-6" /> : (dataMode === 'usb_hardware' ? <Cable className="w-6 h-6" /> : <Activity className="w-6 h-6" />)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                Current Mode:
              </span>
              <strong className="text-sm font-extrabold">
                {dataMode === 'cloud_backend' 
                  ? 'Render Cloud Backend' 
                  : (dataMode === 'usb_hardware' ? 'Live USB Hardware' : 'Simulation Mode')}
              </strong>
              {dataMode === 'cloud_backend' && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  cloudStatus === 'connected' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                } border flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  {cloudStatus === 'connected' ? 'Cloud Synced' : 'Connecting to Render...'}
                </span>
              )}
              {dataMode === 'usb_hardware' && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${statusDisplay.bgColor} ${statusDisplay.textColor} border ${statusDisplay.borderColor} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDisplay.color} ${usbStatus === 'connected' ? 'animate-ping' : ''}`} />
                  {statusDisplay.title}
                </span>
              )}
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${
              (dataMode === 'cloud_backend' && cloudStatus !== 'connected') || (dataMode === 'usb_hardware' && usbStatus !== 'connected')
                ? 'text-slate-300' 
                : 'text-slate-600'
            }`}>
              {dataMode === 'cloud_backend'
                ? `Ingesting live multi-zone telemetry from production backend at ${backendUrl}.`
                : dataMode === 'usb_hardware'
                ? (usbStatus === 'connected'
                    ? `Physical ESP32 streaming live telemetry from ${usbPort || 'USB'}. Zone A reflects real sensor readings.`
                    : 'The dashboard is ready for direct USB connection. Launch the local Python bridge to connect.')
                : 'The hardware backend is mocked with realistic agricultural dynamic data across all 4 cadastral quadrants.'}
            </p>
          </div>
        </div>

        {/* Live Metrics Ticker */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 shadow-2xs">
            <div className="text-[10px] opacity-75 font-bold uppercase">
              {dataMode === 'cloud_backend' ? 'CLOUD SYNC' : (dataMode === 'usb_hardware' ? 'USB SYNC' : 'SIMULATION')}
            </div>
            <div className="font-bold">
              {dataMode === 'cloud_backend' 
                ? (lastCloudSync || 'Polling...') 
                : (dataMode === 'usb_hardware' ? (usbLastSync || 'Never') : (isSimulationRunning ? '10 Hz Stream' : 'Standby'))}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER CLOUD BACKEND INTEGRATION CARD */}
      <div className={`bg-white rounded-2xl border-2 ${dataMode === 'cloud_backend' ? 'border-purple-500 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden transition-all`}>
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

      {/* LOCAL USB SERIAL BRIDGE CARD */}
      <div className={`bg-white rounded-2xl border-2 ${dataMode === 'usb_hardware' ? 'border-emerald-500 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden transition-all`}>
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
                Switch the mode toggle at the top of this page to <span className="font-semibold text-emerald-400">"Live USB Cable"</span>.
              </li>
            </ol>
          </div>

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
                {z.zoneId === 'ZONE-A' && dataMode === 'usb_hardware' && (
                  <span className="ml-1 text-[9px] px-1 bg-emerald-500 text-white rounded">USB</span>
                )}
                {dataMode === 'cloud_backend' && (
                  <span className="ml-1 text-[9px] px-1 bg-purple-500 text-white rounded">CLOUD</span>
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
