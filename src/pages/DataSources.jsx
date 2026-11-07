import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Cpu, 
  Check, 
  Copy, 
  Layers, 
  Binary,
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
  Bluetooth,
  X,
  ChevronDown
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { ISOBUS_PGN_DEFINITIONS, generateIsoBusTelemetryFrame } from '../services/standardsEngine';
import MobileConnection from '../components/mobile/MobileConnection';

export default function DataSources() {
  const { 
    zones, 
    operatingMode,
    setOperatingMode,
    sourceLabel,
    hardwareData,
    simulationBaseline,
    simulationData,
    startRealSimulation,
    hardwareSource,
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
    connectWebBluetooth,
    disconnectWebBluetooth,
    isWebBluetoothSupported,
    bleConnected,
    bleConnecting,
    language,
    t
  } = useFarmData();

  const isTe = language === 'te';
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');
  const [selectedPgn, setSelectedPgn] = useState('PGN_65488');
  const [copied, setCopied] = useState(false);
  const [webSerialConnecting, setWebSerialConnecting] = useState(false);
  const [webSerialFeedback, setWebSerialFeedback] = useState(null);
  const [bleConnectingState, setBleConnectingState] = useState(false);
  const [bleFeedback, setBleFeedback] = useState(null);

  const handleConnectWebSerial = async () => {
    setWebSerialConnecting(true);
    setWebSerialFeedback(null);
    try {
      await connectWebSerial();
      setWebSerialFeedback({
        type: 'success',
        message: isTe ? 'ESP32 USB ద్వారా కనెక్ట్ చేయబడింది!' : 'ESP32 connected via USB Serial! Streaming live readings.'
      });
    } catch (err) {
      const msg = err.message || '';
      const isBusy = msg.includes('Permission') || msg.includes('busy') || msg.includes('Access');
      setWebSerialFeedback({
        type: 'error',
        message: isBusy
          ? (isTe ? 'COM పోర్ట్ బిజీగా ఉంది! దయచేసి Arduino IDE Serial Monitor మూసివేయండి.' : 'Port is busy! Please close Arduino IDE Serial Monitor first.')
          : (err.message || 'Failed to connect.')
      });
    } finally {
      setWebSerialConnecting(false);
    }
  };

  const handleDisconnectWebSerial = async () => {
    try {
      await disconnectWebSerial();
      setWebSerialFeedback({
        type: 'info',
        message: isTe ? 'USB Serial డిస్‌కనెక్ట్ చేయబడింది.' : 'USB Serial disconnected.'
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleConnectWebBluetooth = async () => {
    setBleConnectingState(true);
    setBleFeedback(null);
    try {
      const res = await connectWebBluetooth();
      setBleFeedback({
        type: 'success',
        message: isTe 
          ? `Bluetooth LE ESP32 (${res.deviceName}) కనెక్ట్ చేయబడింది!`
          : `Bluetooth LE ESP32 (${res.deviceName}) connected!`
      });
    } catch (err) {
      setBleFeedback({
        type: 'error',
        message: err.message || (isTe ? 'Bluetooth LE కనెక్షన్ విఫలమైంది.' : 'Bluetooth LE connection failed.')
      });
    } finally {
      setBleConnectingState(false);
    }
  };

  const handleDisconnectWebBluetooth = async () => {
    try {
      await disconnectWebBluetooth();
      setBleFeedback({
        type: 'info',
        message: isTe ? 'Bluetooth LE డిస్‌కనెక్ట్ చేయబడింది.' : 'Bluetooth LE disconnected.'
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // Bridge Testing
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
    standard: "ISO 11783-10 (ISOBUS Task Controller)",
    telemetrySource: sourceLabel,
    operatingMode,
    activePort: usbPort || "None",
    hardwareStatus: operatingMode === 'live_hardware' ? hardwareData.connectionStatus : operatingMode,
    timestamp: new Date().toISOString(),
    zoneId: activeZone.zoneId,
    cropType: activeZone.cropType,
    sensorData: {
      temperature: activeZone.sensorData?.airTemperature,
      humidity: activeZone.sensorData?.humidity,
      soilMoisture: activeZone.sensorData?.soilMoisture,
      lightIntensity: activeZone.sensorData?.lightIntensity
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

  const handleTestCloud = async () => {
    setTestingCloud(true);
    setCloudTestResult(null);
    const res = await testBackendConnection(inputCloudUrl);
    setCloudTestResult(res);
    setTestingCloud(false);
  };

  const isFresh = hardwareData?.lastUpdatedEpoch 
    ? ((Date.now() - hardwareData.lastUpdatedEpoch) < 8500)
    : false;
  const hasHardware = operatingMode === 'live_hardware' && hardwareData?.hasReadings && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale && isFresh;

  return (
    <>
      <div className="lg:hidden">
        <MobileConnection />
      </div>

      <div className="hidden lg:block space-y-6 max-w-6xl mx-auto pb-10">
        {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'డేటా మూలాలు & హార్డ్‌వేర్ నిర్వహణ' : 'Data Sources & Hardware Ingestion'}
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {operatingMode === 'live_hardware' ? 'Live Mode' : 'Simulation'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTe 
              ? 'ESP32 భౌతిక హార్డ్‌వేర్, పైథాన్ సిమ్యులేషన్ మరియు క్లౌడ్ సింక్ నిర్వహణ' 
              : 'Connect your physical ESP32 via USB or BLE, or run the agricultural simulation'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setOperatingMode('live_hardware')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              operatingMode === 'live_hardware'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>{isTe ? 'లైవ్ హార్డ్‌వేర్' : 'Live Hardware'}</span>
          </button>
          
          <button
            onClick={() => {
              startRealSimulation();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              operatingMode === 'simulation'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTe ? 'సిమ్యులేట్ డేటా' : 'Simulate Data'}</span>
          </button>
        </div>
      </div>

      {/* Hardware Connection Card: USB Serial & Bluetooth LE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isTe ? 'ESP32 పరికర కనెక్షన్' : 'Physical ESP32 Device Connection'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTe ? 'USB కేబుల్ లేదా బ్లూటూత్ LE ద్వారా నేరుగా కనెక్ట్ చేయండి' : 'Direct connection via Web Serial (USB) or Web Bluetooth (BLE)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${hasHardware ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-bold text-slate-700">
              {hasHardware ? (isTe ? 'కనెక్ట్ అయింది' : 'Connected') : (isTe ? 'డిస్‌కనెక్ట్' : 'Disconnected')}
            </span>
          </div>
        </div>

        {/* 2 Connection Methods: USB & BLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. USB Serial Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cable className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-extrabold text-slate-900">
                    USB Serial Cable (115200 Baud)
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Chrome / Edge
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {isTe 
                  ? 'మీ కంప్యూటర్ USB పోర్ట్‌కి ESP32 ని కనెక్ట్ చేసి బ్రౌజర్ ద్వారా నేరుగా రీడింగ్‌లను పొందండి.' 
                  : 'Connect your ESP32 directly via USB cable. Reads telemetry straight into your browser.'}
              </p>
            </div>

            <div>
              {webSerialFeedback && (
                <div className={`mb-2 p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                  webSerialFeedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : (webSerialFeedback.type === 'info' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-rose-50 border-rose-200 text-rose-800')
                }`}>
                  {webSerialFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  <span>{webSerialFeedback.message}</span>
                </div>
              )}

              {hardwareData.port?.includes('WebSerial') && hardwareData.connectionStatus === 'connected' ? (
                <button
                  type="button"
                  onClick={handleDisconnectWebSerial}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isTe ? 'USB డిస్‌కనెక్ట్ చేయండి' : 'Disconnect USB'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWebSerial}
                  disabled={webSerialConnecting || !isWebSerialSupported()}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Cable className={`w-3.5 h-3.5 text-emerald-400 ${webSerialConnecting ? 'animate-pulse' : ''}`} />
                  <span>{webSerialConnecting ? (isTe ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...') : (isTe ? 'కనెక్ట్ ESP32 (USB)' : 'Connect ESP32 (USB)')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Bluetooth LE Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-extrabold text-slate-900">
                    Bluetooth Low Energy (BLE)
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Wireless GATT
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {isTe 
                  ? 'వైర్‌లెస్ బ్లూటూత్ LE ద్వారా మొబైల్ లేదా ల్యాప్‌టాప్‌కి ESP32 సెన్సార్ డేటాను అందించండి.' 
                  : 'Wireless sensor streaming via Web Bluetooth GATT. Compatible with Android & laptops.'}
              </p>
            </div>

            <div>
              {bleFeedback && (
                <div className={`mb-2 p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                  bleFeedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : (bleFeedback.type === 'info' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-rose-50 border-rose-200 text-rose-800')
                }`}>
                  {bleFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  <span>{bleFeedback.message}</span>
                </div>
              )}

              {bleConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectWebBluetooth}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isTe ? 'Bluetooth డిస్‌కనెక్ట్ చేయండి' : 'Disconnect Bluetooth'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWebBluetooth}
                  disabled={bleConnectingState || !isWebBluetoothSupported()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Bluetooth className={`w-3.5 h-3.5 text-blue-200 ${bleConnectingState ? 'animate-pulse' : ''}`} />
                  <span>{bleConnectingState ? (isTe ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...') : (isTe ? 'కనెక్ట్ ESP32 (BLE)' : 'Connect ESP32 (BLE)')}</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Current Hardware Sensor Readings Preview */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs uppercase font-bold text-slate-400 block mb-2">
            {isTe ? 'ప్రస్తుత సెన్సార్ రీడింగ్‌లు (హార్డ్‌వేర్)' : 'Active Sensor Readings:'}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}</span>
              <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                {hasHardware && typeof hardwareData.temperature === 'number' ? `${hardwareData.temperature.toFixed(1)}°C` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isTe ? 'గాలి తేమ' : 'Humidity'}</span>
              <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                {hasHardware && typeof hardwareData.humidity === 'number' ? `${hardwareData.humidity.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isTe ? 'మట్టి తేమ' : 'Soil Moisture'}</span>
              <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                {hasHardware ? `${(typeof hardwareData.soilMoisture === 'number' ? hardwareData.soilMoisture : 48.2).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isTe ? 'సూర్యరశ్మి' : 'Light'}</span>
              <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                {hasHardware ? `${(typeof hardwareData.lightIntensity === 'number' ? hardwareData.lightIntensity : 74.0).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud & Local Bridge Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Bridge Tester */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" />
              <span>Local USB Bridge (Python)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {isTe ? 'కంప్యూటర్‌లో పైథాన్ బ్రిడ్జ్ నడుస్తుంటే తనిఖీ చేయండి' : 'Test connectivity to local serial bridge daemon (127.0.0.1:5000)'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputBridgeUrl}
                onChange={(e) => setInputBridgeUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50"
              />
              <button
                type="button"
                onClick={handleTestBridge}
                disabled={testingBridge}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {testingBridge ? '...' : (isTe ? 'పరీక్షించండి' : 'Test')}
              </button>
            </div>

            {bridgeTestResult && (
              <div className={`p-2 rounded-lg text-xs font-semibold ${bridgeTestResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                {bridgeTestResult.success ? '✓ Bridge Online' : `✗ Failed: ${bridgeTestResult.error}`}
              </div>
            )}
          </div>
        </div>

        {/* Cloud Backend Tester */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Render Cloud Backend</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {isTe ? 'రిమోట్ క్లౌడ్ సర్వర్‌తో అనుసంధానం' : 'Production cloud API for remote telemetry sync'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCloudUrl}
                onChange={(e) => setInputCloudUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50"
              />
              <button
                type="button"
                onClick={handleTestCloud}
                disabled={testingCloud}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {testingCloud ? '...' : (isTe ? 'పరీక్షించండి' : 'Test')}
              </button>
            </div>

            {cloudTestResult && (
              <div className={`p-2 rounded-lg text-xs font-semibold ${cloudTestResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                {cloudTestResult.success ? '✓ Cloud Backend Online' : `✗ Failed: ${cloudTestResult.error}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPANDABLE TECHNICAL DIAGNOSTICS & PROTOCOL INSPECTOR    */}
      {/* ======================================================== */}
      <details className="group bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white shadow-md">
        <summary className="flex items-center justify-between cursor-pointer list-none select-none">
          <div className="flex items-center gap-2">
            <Binary className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-white">
              {isTe ? 'సాంకేతిక వివరాలు & ప్రోటోకాల్ ఇన్స్పెక్టర్ (క్లిక్ చేసి చూడండి)' : 'Technical Diagnostics & ISOBUS Protocol Inspector (Expand)'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {zones.map(z => (
                <button
                  key={z.zoneId}
                  onClick={() => setSelectedZoneId(z.zoneId)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    selectedZoneId === z.zoneId ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {z.zoneId.replace('ZONE-', '')}
                </button>
              ))}
            </div>

            <button
              onClick={copyPayload}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-64">
            <pre>{JSON.stringify(samplePayload, null, 2)}</pre>
          </div>
        </div>
      </details>

    </div>
    </>
  );
}
