import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFarmData } from '../context/FarmContext';
import { generateFarmHealthScore } from '../ai/farmDecisionEngine';
import { fetchLiveWeather, DEFAULT_FARM_LOCATION } from '../services/weatherService';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  CloudRain, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  X,
  MapPin,
  Clock,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Cable,
  Bluetooth,
  Settings,
  ChevronRight,
  TrendingUp,
  Map as MapIcon
} from 'lucide-react';

// Weather Icon Resolver
function WeatherIconComponent({ iconName, className }) {
  switch (iconName) {
    case 'Sun': return <Sun className={className} />;
    case 'CloudSun': return <CloudSun className={className} />;
    case 'Cloud': return <CloudRain className={className} />;
    case 'CloudFog': return <CloudFog className={className} />;
    case 'CloudDrizzle': return <CloudDrizzle className={className} />;
    case 'CloudRain': return <CloudRain className={className} />;
    case 'CloudSnow': return <CloudSnow className={className} />;
    case 'CloudLightning': return <CloudLightning className={className} />;
    case 'Snowflake': return <Snowflake className={className} />;
    default: return <CloudSun className={className} />;
  }
}

export default function Dashboard() {
  const { 
    zones, 
    alerts, 
    operatingMode, 
    hardwareData, 
    simulationData, 
    triggerSimulateData, 
    exitSimulation,
    usbPort,
    farmLocation,
    language,
    setLanguage,
    connectWebSerial,
    disconnectWebSerial,
    isWebSerialSupported,
    connectWebBluetooth,
    disconnectWebBluetooth,
    isWebBluetoothSupported,
    bleConnected
  } = useFarmData();

  const isTe = language === 'te';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState(null);
  const [serialConnecting, setSerialConnecting] = useState(false);
  const [bleConnecting, setBleConnecting] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch external weather
  useEffect(() => {
    let mounted = true;
    const loadWeather = async () => {
      setWeatherLoading(true);
      const lat = farmLocation?.latitude ?? DEFAULT_FARM_LOCATION.latitude;
      const lon = farmLocation?.longitude ?? DEFAULT_FARM_LOCATION.longitude;
      const res = await fetchLiveWeather(lat, lon);
      if (mounted) {
        setWeatherData(res);
        setWeatherLoading(false);
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 120000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [farmLocation?.latitude, farmLocation?.longitude]);

  // Serial Connect
  const handleConnectWebSerial = async () => {
    setSerialConnecting(true);
    setConnectionFeedback(null);
    try {
      await connectWebSerial();
      setConnectionFeedback({
        type: 'success',
        message: isTe ? 'ESP32 సీరియల్ పోర్ట్ వద్ద కనెక్ట్ చేయబడింది! లైవ్ డేటా ప్రసారం అవుతోంది.' : 'ESP32 connected via USB Serial! Streaming live readings.'
      });
      setTimeout(() => setConnectionFeedback(null), 5000);
    } catch (err) {
      const msg = err.message || '';
      const isBusy = msg.includes('Permission') || msg.includes('busy') || msg.includes('Access');
      setConnectionFeedback({
        type: 'error',
        message: isBusy 
          ? (isTe ? 'పోర్ట్ బిజీగా ఉంది! దయచేసి Arduino IDE Serial Monitor మూసివేయండి.' : 'COM Port is busy. Please close Arduino IDE Serial Monitor first.')
          : (err.message || 'Failed to open serial port.')
      });
      setTimeout(() => setConnectionFeedback(null), 7000);
    } finally {
      setSerialConnecting(false);
    }
  };

  // BLE Connect
  const handleConnectWebBluetooth = async () => {
    setBleConnecting(true);
    setConnectionFeedback(null);
    try {
      const res = await connectWebBluetooth();
      setConnectionFeedback({
        type: 'success',
        message: isTe 
          ? `Bluetooth LE ESP32 (${res.deviceName}) కనెక్ట్ చేయబడింది!`
          : `Bluetooth LE ESP32 (${res.deviceName}) connected!`
      });
      setTimeout(() => setConnectionFeedback(null), 5000);
    } catch (err) {
      setConnectionFeedback({
        type: 'error',
        message: err.message || (isTe ? 'Bluetooth LE కనెక్షన్ విఫలమైంది.' : 'Bluetooth LE connection failed.')
      });
      setTimeout(() => setConnectionFeedback(null), 7000);
    } finally {
      setBleConnecting(false);
    }
  };

  // Disconnect Hardware
  const handleDisconnectHardware = async () => {
    try {
      if (usbPort?.includes('BLE') || bleConnected) {
        await disconnectWebBluetooth();
      } else {
        await disconnectWebSerial();
      }
      setConnectionFeedback({
        type: 'info',
        message: isTe ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ చేయబడింది. సెన్సార్ విలువలు N/A గా మారాయి.' : 'Hardware disconnected. Sensor values reset to N/A.'
      });
      setTimeout(() => setConnectionFeedback(null), 4000);
    } catch (e) {
      console.warn(e);
    }
  };

  // Simulate Data Trigger
  const handleSimulateClick = async () => {
    setIsSimulating(true);
    try {
      await triggerSimulateData();
    } finally {
      setIsSimulating(false);
    }
  };

  const isLive = operatingMode === 'live_hardware';
  const isSimulated = operatingMode === 'simulation';
  const hasHardware = isLive && hardwareData?.hasReadings && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale;

  // Sensor Value Extraction (Strict N/A when hardware unavailable)
  let tempDisplay = 'N/A';
  let humidityDisplay = 'N/A';
  let moistureDisplay = 'N/A';
  let lightDisplay = 'N/A';

  let tempStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let humStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let moistStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let lightStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';

  if (isLive) {
    if (hasHardware) {
      const tVal = hardwareData.temperature;
      const hVal = hardwareData.humidity;
      const mVal = hardwareData.soilMoisture;
      const lVal = hardwareData.lightIntensity;

      tempDisplay = typeof tVal === 'number' ? `${tVal.toFixed(1)}°C` : 'N/A';
      humidityDisplay = typeof hVal === 'number' ? `${hVal.toFixed(1)}%` : 'N/A';
      moistureDisplay = typeof mVal === 'number' ? `${mVal.toFixed(1)}%` : 'N/A';
      lightDisplay = typeof lVal === 'number' ? `${lVal.toFixed(0)}%` : 'N/A';

      if (typeof tVal === 'number') {
        tempStatus = tVal >= 20 && tVal <= 32 ? (isTe ? 'అనుకూలం' : 'Optimal') : (tVal > 32 ? (isTe ? 'ఎక్కువ వేడి' : 'High') : (isTe ? 'చల్లగా ఉంది' : 'Low'));
      }
      if (typeof hVal === 'number') {
        humStatus = hVal >= 50 && hVal <= 75 ? (isTe ? 'సాధారణం' : 'Normal') : (hVal > 75 ? (isTe ? 'ఎక్కువ తేమ' : 'High') : (isTe ? 'పొడి గాలి' : 'Dry'));
      }
      if (typeof mVal === 'number') {
        moistStatus = mVal >= 45 && mVal <= 70 ? (isTe ? 'తగినంత తేమ' : 'Optimal') : (mVal < 35 ? (isTe ? 'నీరు అవసరం' : 'Low') : (isTe ? 'ఎక్కువ తేమ' : 'Saturated'));
      }
      if (typeof lVal === 'number') {
        lightStatus = lVal >= 40 ? (isTe ? 'సరిపడా వెలుతురు' : 'Adequate') : (isTe ? 'తక్కువ వెలుతురు' : 'Low Light');
      }
    }
  } else if (isSimulated && simulationData) {
    const tVal = simulationData.temperature;
    const hVal = simulationData.humidity;
    const mVal = simulationData.soilMoisture;
    const lVal = simulationData.lightIntensity;

    tempDisplay = typeof tVal === 'number' ? `${tVal.toFixed(1)}°C` : 'N/A';
    humidityDisplay = typeof hVal === 'number' ? `${hVal.toFixed(1)}%` : 'N/A';
    moistureDisplay = typeof mVal === 'number' ? `${mVal.toFixed(1)}%` : 'N/A';
    lightDisplay = typeof lVal === 'number' ? `${lVal.toFixed(0)}%` : 'N/A';

    tempStatus = isTe ? 'సిమ్యులేట్ చేయబడింది' : 'Simulated';
    humStatus = isTe ? 'సిమ్యులేట్ చేయబడింది' : 'Simulated';
    moistStatus = isTe ? 'సిమ్యులేట్ చేయబడింది' : 'Simulated';
    lightStatus = isTe ? 'సిమ్యులేట్ చేయబడింది' : 'Simulated';
  }

  // Farm Health Evaluation
  const healthScore = useMemo(() => {
    if (!zones || zones.length === 0) return null;
    return generateFarmHealthScore(zones.map(z => ({ ...z.sensorData, cropType: z.cropType })));
  }, [zones]);

  let healthStatusText = isTe ? 'డేటా కోసం వేచి ఉంది' : 'Awaiting Data';
  let healthColorBadge = 'text-slate-600 bg-slate-100 border-slate-200';
  let irrigationRecommendation = isTe 
    ? 'నీటి అవసరాన్ని లెక్కించడానికి లైవ్ సెన్సార్ రీడింగ్‌ల కోసం వేచి చూస్తున్నాము.' 
    : 'Awaiting sensor readings to determine irrigation requirement.';

  if ((hasHardware || isSimulated) && typeof healthScore === 'number') {
    if (healthScore >= 80) {
      healthStatusText = isTe ? 'అనుకూలం (ఉత్తమం)' : 'Optimal';
      healthColorBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (healthScore >= 60) {
      healthStatusText = isTe ? 'శ్రద్ధ అవసరం' : 'Attention Needed';
      healthColorBadge = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      healthStatusText = isTe ? 'కీలక పరిస్థితి' : 'Critical Stress';
      healthColorBadge = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    const activeMoist = isLive ? hardwareData?.soilMoisture : simulationData?.soilMoisture;
    if (typeof activeMoist === 'number') {
      if (activeMoist < 35) {
        irrigationRecommendation = isTe 
          ? 'మట్టి తేమ తక్కువగా ఉంది (< 35%). తక్షణమే బిందు సేద్యం (డ్రిప్) ద్వారా నీరు అందించండి.' 
          : 'Soil moisture is low (< 35%). Irrigation recommended.';
      } else if (activeMoist < 45) {
        irrigationRecommendation = isTe 
          ? 'మట్టి తేమ కొద్దిగా తగ్గింది (35-45%). ఉదయం లేదా సాయంత్రం వేళల్లో తేలికపాటి తడి అందించండి.' 
          : 'Soil moisture is moderate (35-45%). Light irrigation cycle recommended.';
      } else if (activeMoist > 75) {
        irrigationRecommendation = isTe 
          ? 'మట్టిలో తేమ ఎక్కువగా ఉంది (> 75%). నీరు పెట్టడం నిలిపివేయండి.' 
          : 'Soil moisture is high (> 75%). Delay irrigation and verify field drainage.';
      } else {
        irrigationRecommendation = isTe 
          ? 'మట్టి తేమ సాధారణ అనుకూల పరిధిలో ఉంది (45-70%). ప్రస్తుతం నీరు అవసరం లేదు.' 
          : 'Soil moisture is in the optimal range. No irrigation needed at this time.';
      }
    }
  }

  const activeAlerts = (alerts || []).filter(a => !a.resolved);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">

      {/* ======================================================== */}
      {/* 1. PROFESSIONAL SAAS HEADER                              */}
      {/* ======================================================== */}
      <header className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Farm Name, Date/Time, Weather Summary */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                SmartFarm AI
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {farmLocation?.displayLocation || DEFAULT_FARM_LOCATION.displayLocation}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentTime.toLocaleDateString(isTe ? 'te-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {farmLocation?.name || DEFAULT_FARM_LOCATION.name}
              </h1>

              {/* Weather Summary Pill in Header */}
              {weatherData && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  <WeatherIconComponent iconName={weatherData.weatherIcon} className="w-4 h-4 text-sky-600" />
                  <span>
                    {weatherData.outdoorTemperature !== null ? `${weatherData.outdoorTemperature.toFixed(1)}°C` : 'N/A'} • {weatherData.weatherCondition || 'Weather Live'}
                  </span>
                </div>
              )}
            </div>

            {/* Hardware Status Dot Indicator */}
            <div className="flex items-center gap-2 mt-2">
              {hasHardware ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isTe ? 'లైవ్ హార్డ్‌వేర్' : 'LIVE HARDWARE'} {usbPort ? `(${usbPort})` : ''}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>{isTe ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ అయింది' : 'Hardware Disconnected'}</span>
                </span>
              )}

              {/* Unobtrusive Simulation Indicator */}
              {isSimulated && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                  <span>{isTe ? 'సిమ్యులేషన్ సక్రియం' : 'Simulation Active'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Controls: Language Selector, Settings Link, Hardware & Simulation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            
            {/* Top Bar Utilities: Language + Settings */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'en' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('te')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'te' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  తెలుగు
                </button>
              </div>

              {/* Settings Link */}
              <Link
                to="/settings"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center cursor-pointer touch-target-min"
                title={isTe ? 'అమరికలు' : 'Settings'}
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </Link>
            </div>

            {/* Compact Hardware Connection & Simulation Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {isLive && !hasHardware && isWebSerialSupported() && (
                <button
                  type="button"
                  onClick={handleConnectWebSerial}
                  disabled={serialConnecting}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Cable className={`w-3.5 h-3.5 text-emerald-400 ${serialConnecting ? 'animate-pulse' : ''}`} />
                  <span>{serialConnecting ? (isTe ? 'కనెక్ట్...' : 'Connecting...') : (isTe ? 'కనెక్ట్ USB' : 'Connect ESP32 (USB)')}</span>
                </button>
              )}

              {isLive && !hasHardware && isWebBluetoothSupported() && (
                <button
                  type="button"
                  onClick={handleConnectWebBluetooth}
                  disabled={bleConnecting}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Bluetooth className={`w-3.5 h-3.5 text-blue-200 ${bleConnecting ? 'animate-pulse' : ''}`} />
                  <span>{bleConnecting ? (isTe ? 'కనెక్ట్...' : 'Connecting...') : (isTe ? 'కనెక్ట్ BLE' : 'Connect ESP32 (BLE)')}</span>
                </button>
              )}

              {isLive && hasHardware && (
                <button
                  type="button"
                  onClick={handleDisconnectHardware}
                  className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isTe ? 'డిస్‌కనెక్ట్' : 'Disconnect'}</span>
                </button>
              )}

              {isSimulated && (
                <button
                  type="button"
                  onClick={exitSimulation}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isTe ? 'నిష్క్రమించు' : 'Exit Simulation'}</span>
                </button>
              )}

              {/* ONE Prominent Simulate Data Button */}
              <button
                type="button"
                id="simulate-data-button"
                onClick={handleSimulateClick}
                disabled={isSimulating}
                className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isTe ? 'డేటా సిమ్యులేట్' : 'Simulate Data'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* Feedback message banner if present */}
        {connectionFeedback && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-xl flex items-center justify-between border transition-all ${
            connectionFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : (connectionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200')
          }`}>
            <span className="font-semibold">{connectionFeedback.message}</span>
            <button
              type="button"
              onClick={() => setConnectionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN SENSOR CARDS (4 CLEAN CARDS, STRICT N/A)         */}
      {/* ======================================================== */}
      <section>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Temperature Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Thermometer className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {tempDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{isTe ? 'స్థితి:' : 'Status:'} <strong className="text-slate-700">{tempStatus}</strong></span>
                <span className="text-[11px] text-slate-400">°C</span>
              </p>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'గాలి తేమ' : 'Humidity'}
              </span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <Wind className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {humidityDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{isTe ? 'స్థితి:' : 'Status:'} <strong className="text-slate-700">{humStatus}</strong></span>
                <span className="text-[11px] text-slate-400">%</span>
              </p>
            </div>
          </div>

          {/* Soil Moisture Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'మట్టి తేమ' : 'Soil Moisture'}
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Droplets className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {moistureDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{isTe ? 'స్థితి:' : 'Status:'} <strong className="text-slate-700">{moistStatus}</strong></span>
                <span className="text-[11px] text-slate-400">%</span>
              </p>
            </div>
          </div>

          {/* Light Intensity Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'సూర్యరశ్మి' : 'Light Intensity'}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {lightDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{isTe ? 'స్థితి:' : 'Status:'} <strong className="text-slate-700">{lightStatus}</strong></span>
                <span className="text-[11px] text-slate-400">%</span>
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. FARM STATUS & WEATHER (CLEAN 2-COLUMN SAAS GRID)      */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* 3A. Farm Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isTe ? 'పొలం పరిస్థితి & నీటి నిర్వహణ' : 'Farm Status & Health'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTe ? 'మట్టి తేమ మరియు పంట పరిస్థితి' : 'Biophysical crop conditions'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${healthColorBadge}`}>
                {healthStatusText}
              </span>
            </div>

            {/* Health Score Overview */}
            <div className="flex items-center justify-between my-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">
                  {isTe ? 'మొత్తం పొలం ఆరోగ్యం' : 'Overall Farm Health'}
                </span>
                <div className="text-3xl font-black font-mono tracking-tight text-slate-900 mt-0.5">
                  {(hasHardware || isSimulated) && typeof healthScore === 'number' ? `${healthScore} / 100` : 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-slate-400 block">
                  {isTe ? 'స్థితి' : 'Condition'}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {healthStatusText}
                </span>
              </div>
            </div>

            {/* Irrigation Recommendation */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">
                {isTe ? 'నీటి పారుదల సిఫార్సు:' : 'Irrigation Recommendation:'}
              </span>
              <p className="text-slate-600 leading-relaxed font-medium">
                {irrigationRecommendation}
              </p>
            </div>

            {/* Active Alerts */}
            <div className="mt-3.5">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1.5">
                {isTe ? 'క్రియాశీల హెచ్చరికలు:' : 'Active Alerts:'}
              </span>
              {activeAlerts.length > 0 ? (
                <div className="space-y-1.5">
                  {activeAlerts.slice(0, 2).map(alert => (
                    <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{alert.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isTe ? 'అన్ని సెన్సార్ పరిమితులు సాధారణంగా ఉన్నాయి.' : 'All farm biophysical parameters are normal.'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link to="/map" className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors">
              <MapIcon className="w-3.5 h-3.5" />
              <span>{isTe ? 'పొలం పటం & 3D ప్లాట్లు చూడండి' : 'View Farm Map & Plots'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3B. Weather Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isTe ? 'స్థానిక వాతావరణం' : 'Farm Weather'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {weatherLoading ? (isTe ? 'నవీకరిస్తోంది...' : 'Syncing...') : (weatherData?.timestamp ? `Synced ${weatherData.timestamp}` : 'Satellite Weather')}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {farmLocation?.city || 'Local Area'}
              </span>
            </div>

            {/* Current Temperature & Weather Condition */}
            <div className="flex items-center justify-between my-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                    {weatherData?.outdoorTemperature !== null && weatherData?.outdoorTemperature !== undefined 
                      ? `${weatherData.outdoorTemperature.toFixed(1)}°C` 
                      : 'N/A'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {isTe ? 'ఉష్ణోగ్రత' : 'Current Temp'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  {weatherData?.weatherCondition || 'Normal'}
                </div>
              </div>

              <div className="p-3 bg-sky-50 rounded-2xl text-sky-600">
                <WeatherIconComponent iconName={weatherData?.weatherIcon} className="w-9 h-9" />
              </div>
            </div>

            {/* Weather Metrics Breakdown: Rain Probability / Rainfall, Wind Speed, Outdoor RH */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {isTe ? 'వర్ష సూచన' : 'Rain Forecast'}
                </span>
                <span className="text-sm font-black font-mono text-blue-700 block mt-0.5">
                  {weatherData?.rainfall !== null && weatherData?.rainfall !== undefined 
                    ? `${weatherData.rainfall} mm` 
                    : '0 mm'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {isTe ? 'గాలి వేగం' : 'Wind Speed'}
                </span>
                <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                  {weatherData?.windSpeed !== null && weatherData?.windSpeed !== undefined 
                    ? `${weatherData.windSpeed} km/h` 
                    : 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {isTe ? 'బయటి తేమ' : 'Outdoor RH'}
                </span>
                <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                  {weatherData?.outdoorHumidity !== null && weatherData?.outdoorHumidity !== undefined 
                    ? `${weatherData.outdoorHumidity}%` 
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* 5-Day Forecast Strip */}
            {weatherData?.dailyForecast && weatherData.dailyForecast.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                  {isTe ? 'రాబోయే 5 రోజుల సూచన:' : '5-Day Forecast:'}
                </span>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {weatherData.dailyForecast.map((day, idx) => (
                    <div key={idx} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase truncate w-full">{day.dayName}</span>
                      <WeatherIconComponent iconName={day.icon} className="w-4 h-4 text-sky-600 my-1" />
                      <span className="text-[11px] font-black font-mono text-slate-800">
                        {day.maxTemp !== null ? `${Math.round(day.maxTemp)}°` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link to="/analytics" className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isTe ? 'వివరణాత్మక గ్రాఫ్‌లు చూడండి' : 'View Detailed Trends'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </section>

    </div>
  );
}
