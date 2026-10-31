import React, { useState, useEffect, useMemo } from 'react';
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
  Layers, 
  ArrowUpRight, 
  Download,
  Sparkles,
  X,
  Radio,
  MapPin,
  Clock,
  Compass,
  Navigation,
  LocateFixed,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Snowflake,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Cable
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import ZoneDetailModal from '../components/ZoneDetailModal';
import AddPlotModal from '../components/AddPlotModal';

// Clean Weather Icon Resolver
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
    history = [],
    operatingMode, 
    hardwareData, 
    simulationData, 
    triggerSimulateData, 
    exitSimulation,
    usbStatus,
    usbPort,
    downloadAuditCSV,
    farmLocation,
    requestLiveLocation,
    resetLocation,
    isLocating,
    locationError,
    language,
    t,
    connectWebSerial,
    isWebSerialSupported,
    deleteZone,
    formatINR
  } = useFarmData();

  const isTe = language === 'te';
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeTrendMetric, setActiveTrendMetric] = useState('temperature');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState(null);
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [serialConnecting, setSerialConnecting] = useState(false);

  const handleConnectWebSerial = async () => {
    setSerialConnecting(true);
    setLocationFeedback(null);
    try {
      await connectWebSerial();
      setLocationFeedback({
        type: 'success',
        message: isTe ? 'ESP32 COM7 వద్ద విజయవంతంగా కనెక్ట్ చేయబడింది! లైవ్ డేటా ప్రసారం అవుతోంది.' : 'ESP32 connected via Web Serial on COM7! Live telemetry streaming.'
      });
      setTimeout(() => setLocationFeedback(null), 6000);
    } catch (err) {
      const msg = err.message || '';
      const isBusy = msg.includes('Permission') || msg.includes('busy') || msg.includes('Access');
      setLocationFeedback({
        type: 'error',
        message: isBusy 
          ? (isTe ? 'COM7 పోర్ట్ బిజీగా ఉంది! దయచేసి ముందుగా Arduino IDE లో Serial Monitor మూసివేయండి.' : 'Port COM7 is busy! Please close Arduino IDE Serial Monitor first.')
          : (err.message || 'Failed to open serial port.')
      });
      setTimeout(() => setLocationFeedback(null), 8000);
    } finally {
      setSerialConnecting(false);
    }
  };

  // Live ticking clock (seconds precision)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real external weather from Open-Meteo for the current location (dynamic coordinates)
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
    const interval = setInterval(loadWeather, 120000); // 2-min refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [farmLocation?.latitude, farmLocation?.longitude]);

  // Handler for Take Live Location button
  const handleAcquireLocation = async () => {
    setLocationFeedback(null);
    try {
      const loc = await requestLiveLocation();
      setLocationFeedback({
        type: 'success',
        message: `Live GPS locked: ${loc.city || loc.name} (${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°)`
      });
      setTimeout(() => setLocationFeedback(null), 6000);
    } catch (err) {
      setLocationFeedback({
        type: 'error',
        message: err.message || 'Failed to detect location. Please allow browser location permissions.'
      });
      setTimeout(() => setLocationFeedback(null), 7000);
    }
  };

  // Handler to revert to default farm location
  const handleResetLocation = () => {
    resetLocation();
    setLocationFeedback({
      type: 'info',
      message: 'Reverted location to Green Valley Farm default (Hyderabad, IN).'
    });
    setTimeout(() => setLocationFeedback(null), 4000);
  };

  // Handler for ONE SIMULATE DATA button
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

  // ----------------------------------------------------
  // Sensor Value Extraction (Strict N/A Rules)
  // ----------------------------------------------------
  let tempDisplay = 'N/A';
  let humidityDisplay = 'N/A';
  let moistureDisplay = 'N/A';
  let lightDisplay = 'N/A';

  if (isLive) {
    if (hasHardware) {
      tempDisplay = typeof hardwareData.temperature === 'number' ? `${hardwareData.temperature.toFixed(1)}°C` : 'N/A';
      humidityDisplay = typeof hardwareData.humidity === 'number' ? `${hardwareData.humidity.toFixed(1)}%` : 'N/A';
      moistureDisplay = typeof hardwareData.soilMoisture === 'number' ? `${hardwareData.soilMoisture.toFixed(1)}%` : 'N/A';
      lightDisplay = typeof hardwareData.lightIntensity === 'number' ? `${hardwareData.lightIntensity.toFixed(0)}%` : 'N/A';
    } else {
      // Disconnected or awaiting data: Strictly N/A per instructions
      tempDisplay = 'N/A';
      humidityDisplay = 'N/A';
      moistureDisplay = 'N/A';
      lightDisplay = 'N/A';
    }
  } else if (isSimulated && simulationData) {
    tempDisplay = typeof simulationData.temperature === 'number' ? `${simulationData.temperature.toFixed(1)}°C` : 'N/A';
    humidityDisplay = typeof simulationData.humidity === 'number' ? `${simulationData.humidity.toFixed(1)}%` : 'N/A';
    moistureDisplay = typeof simulationData.soilMoisture === 'number' ? `${simulationData.soilMoisture.toFixed(1)}%` : 'N/A';
    lightDisplay = typeof simulationData.lightIntensity === 'number' ? `${simulationData.lightIntensity.toFixed(0)}%` : 'N/A';
  }

  // ----------------------------------------------------
  // Farm Health Evaluation
  // ----------------------------------------------------
  const healthScore = useMemo(() => {
    if (!zones || zones.length === 0) return null;
    return generateFarmHealthScore(zones.map(z => ({ ...z.sensorData, cropType: z.cropType })));
  }, [zones]);

  let healthStatus = 'Awaiting Data';
  let healthColor = 'text-slate-400 bg-slate-100 border-slate-200';
  let irrigationRecommendation = 'Awaiting live sensor readings to determine moisture requirements.';

  if (typeof healthScore === 'number') {
    if (healthScore >= 80) {
      healthStatus = 'Optimal';
      healthColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (healthScore >= 60) {
      healthStatus = 'Attention Needed';
      healthColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      healthStatus = 'Critical Stress';
      healthColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    // Irrigation recommendation derived from active soil moisture
    const currentMoisture = isLive ? hardwareData?.soilMoisture : simulationData?.soilMoisture;
    if (typeof currentMoisture === 'number') {
      if (currentMoisture < 30) {
        irrigationRecommendation = 'Soil moisture is critically depleted (< 30%). Drip irrigation cycle recommended immediately.';
      } else if (currentMoisture < 45) {
        irrigationRecommendation = 'Soil moisture is moderate (30-45%). Light irrigation scheduled during early morning hours.';
      } else if (currentMoisture > 80) {
        irrigationRecommendation = 'Soil moisture is near saturation (> 80%). Suspend irrigation and verify field drainage lines.';
      } else {
        irrigationRecommendation = 'Soil moisture is in the optimal range (45-70%). No irrigation needed at this time.';
      }
    }
  }

  // Active alerts list
  const activeAlerts = (alerts || []).filter(a => !a.resolved);

  // Time-series history data for simple trends
  const trendData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map(h => ({
      time: h.timestamp || '',
      temperature: typeof h.temperature === 'number' ? h.temperature : null,
      humidity: typeof h.humidity === 'number' ? h.humidity : null,
      soilMoisture: typeof h.soilMoisture === 'number' ? h.soilMoisture : null,
      lightIntensity: typeof h.lightIntensity === 'number' ? h.lightIntensity : null,
      type: h.isSimulation ? 'Simulated' : 'Actual'
    }));
  }, [history]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ======================================================== */}
      {/* 1. PROFESSIONAL SAAS HEADER                              */}
      {/* ======================================================== */}
      <header className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Farm Branding & Geolocation */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                SmartFarm AI
              </span>
              <span className="text-slate-300">•</span>
              
              {/* Geolocation Tag & Live Location Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className={`w-3.5 h-3.5 ${farmLocation?.isLive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {farmLocation?.displayLocation || DEFAULT_FARM_LOCATION.displayLocation}
                </span>

                {farmLocation?.isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE GPS
                  </span>
                )}

                {/* Take Live Location Button */}
                <button
                  type="button"
                  onClick={handleAcquireLocation}
                  disabled={isLocating}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                    farmLocation?.isLive
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 active:scale-95'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-300 hover:border-emerald-400 active:scale-95'
                  }`}
                  title={farmLocation?.isLive ? "Refresh live GPS coordinates from browser" : "Detect your real live location using browser GPS"}
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin text-emerald-600' : (farmLocation?.isLive ? 'text-emerald-600' : 'text-slate-500')}`} />
                  <span>{isLocating ? 'Acquiring GPS...' : (farmLocation?.isLive ? 'Refresh GPS' : 'Take Live Location')}</span>
                </button>

                {farmLocation?.isLive && (
                  <button
                    type="button"
                    onClick={handleResetLocation}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer transition-colors"
                    title="Reset to default farm location"
                  >
                    Reset
                  </button>
                )}
              </div>

              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString()}
              </span>
            </div>

            {/* Location Feedback Toast */}
            {locationFeedback && (
              <div className={`mt-2.5 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between transition-all duration-300 ${
                locationFeedback.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : (locationFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200')
              }`}>
                <span className="font-medium flex items-center gap-1.5">
                  {locationFeedback.type === 'error' ? '⚠️' : '📍'} {locationFeedback.message}
                </span>
                <button
                  type="button"
                  onClick={() => setLocationFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold ml-2 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {farmLocation?.name || DEFAULT_FARM_LOCATION.name}
              </h1>

              {/* Hardware Connection Status */}
              <div className="flex items-center gap-1.5">
                {hasHardware ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Hardware Connected {usbPort ? `(${usbPort})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Hardware Disconnected (USB Serial)
                  </span>
                )}

                {/* Subtle Simulation Active Pill */}
                {isSimulated && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    Simulation Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Center: Connect ESP32 (Web Serial) & ONE prominent SIMULATE DATA button */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isLive && !hasHardware && isWebSerialSupported() && (
              <button
                type="button"
                onClick={handleConnectWebSerial}
                disabled={serialConnecting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                title={isTe ? 'బ్రౌజర్ ద్వారా COM7 కి నేరుగా కనెక్ట్ చేయండి (Arduino IDE Serial Monitor మూసివేయండి)' : 'Connect directly to COM7 (Close Arduino IDE Serial Monitor first)'}
              >
                <Cable className={`w-3.5 h-3.5 text-emerald-400 ${serialConnecting ? 'animate-pulse' : ''}`} />
                <span>{serialConnecting ? (isTe ? 'కనెక్ట్ అవుతోంది...' : 'Connecting...') : (isTe ? 'ESP32 కనెక్ట్ చేయండి (COM7)' : 'Connect ESP32 (COM7)')}</span>
              </button>
            )}

            {isSimulated && (
              <button
                type="button"
                onClick={exitSimulation}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 active:scale-95"
                title="Exit simulation and restore live hardware readings"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Exit Simulation</span>
              </button>
            )}

            <button
              type="button"
              id="simulate-data-button"
              onClick={handleSimulateClick}
              disabled={isSimulating}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white shadow-sm transition-all flex items-center gap-2 active:scale-95 ${
                isSimulating 
                  ? 'bg-emerald-400 cursor-wait' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20'
              }`}
              title="Generate fresh, internally consistent sensor readings via Python backend"
            >
              <Sparkles className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulated ? 'Simulate Data' : 'SIMULATE DATA'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN SENSOR CARDS (4 CLEAN CARDS)                     */}
      {/* ======================================================== */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>Primary In-Field Sensors</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {isLive ? 'Physical Hardware Readings' : 'Simulated Readings (Python)'}
            </span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            DHT11 (GPIO 4) • Soil (GPIO 34) • LDR (GPIO 35)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Temperature Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Air Temperature</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                <Thermometer className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {tempDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Target: 22.0 – 30.0°C</span>
                <span className="font-mono text-[11px] text-slate-400">DHT11</span>
              </p>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Air Humidity</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
                <Wind className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {humidityDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Target: 50.0 – 75.0%</span>
                <span className="font-mono text-[11px] text-slate-400">DHT11</span>
              </p>
            </div>
          </div>

          {/* Soil Moisture Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Soil Moisture</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {moistureDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Field Capacity: 45 – 70%</span>
                <span className="font-mono text-[11px] text-slate-400">GPIO 34</span>
              </p>
            </div>
          </div>

          {/* Light Intensity Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Light Intensity</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                <Sun className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {lightDisplay}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Photosynthetic Band</span>
                <span className="font-mono text-[11px] text-slate-400">LDR (GPIO 35)</span>
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. LIVE WEATHER & FARM HEALTH GRID                       */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dedicated Live Weather Section (Open-Meteo) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    Live Outdoor Weather
                    {farmLocation?.isLive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                        GPS
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hyper-local agrometeorological feed for {farmLocation?.city || farmLocation?.name || 'Local Farm'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {weatherLoading ? 'Updating...' : (weatherData?.timestamp ? `Synced ${weatherData.timestamp}` : 'Satellite Link')}
              </span>
            </div>

            {/* Current Outdoor Weather Headline */}
            <div className="flex items-center justify-between my-5">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                    {weatherData?.outdoorTemperature !== null && weatherData?.outdoorTemperature !== undefined 
                      ? `${weatherData.outdoorTemperature.toFixed(1)}°C` 
                      : 'N/A'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Outdoor</span>
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-1 flex items-center gap-1.5">
                  <span>{weatherData?.weatherCondition || 'N/A'}</span>
                </div>
              </div>

              <div className="p-3 bg-sky-50 rounded-2xl text-sky-600">
                <WeatherIconComponent iconName={weatherData?.weatherIcon} className="w-9 h-9" />
              </div>
            </div>

            {/* Weather Metric Breakdown */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Outdoor RH</span>
                <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                  {weatherData?.outdoorHumidity !== null && weatherData?.outdoorHumidity !== undefined 
                    ? `${weatherData.outdoorHumidity}%` 
                    : 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Wind Speed</span>
                <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                  {weatherData?.windSpeed !== null && weatherData?.windSpeed !== undefined 
                    ? `${weatherData.windSpeed} km/h` 
                    : 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{isTe ? 'వర్షపాతం' : 'Rainfall'}</span>
                <span className="text-sm font-black font-mono text-blue-700 block mt-0.5">
                  {weatherData?.rainfall !== null && weatherData?.rainfall !== undefined 
                    ? `${weatherData.rainfall} mm` 
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* 5-Day Upcoming Weather Forecast Strip */}
            {weatherData?.dailyForecast && weatherData.dailyForecast.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                  {isTe ? 'రాబోయే 5 రోజుల వాతావరణ సూచన:' : '5-Day Upcoming Forecast:'}
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {weatherData.dailyForecast.map((day, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{day.dayName}</span>
                      <WeatherIconComponent iconName={day.icon} className="w-5 h-5 text-sky-600 my-1" />
                      <span className="text-[11px] font-black font-mono text-slate-800">
                        {day.maxTemp !== null ? `${Math.round(day.maxTemp)}°` : 'N/A'}
                      </span>
                      <span className="text-[9px] text-blue-600 font-mono font-bold mt-0.5">
                        {day.rainMm > 0 ? `${day.rainMm}mm` : '0mm'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Independent external satellite data</span>
            <span>Does not substitute ESP32 soil probes</span>
          </div>
        </div>

        {/* Farm Health & Irrigation Advisory */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Farm Health & Irrigation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Threshold analysis derived from available valid telemetry
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${healthColor}`}>
                {healthStatus}
              </span>
            </div>

            {/* Health Score Overview */}
            <div className="flex items-center justify-between my-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Health Score</span>
                <div className="text-3xl font-black font-mono tracking-tight text-slate-900 mt-0.5">
                  {typeof healthScore === 'number' ? `${healthScore} / 100` : 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className="text-sm font-bold text-slate-800">
                  {healthStatus}
                </span>
              </div>
            </div>

            {/* Irrigation Advisory Note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Irrigation Recommendation:</span>
              <p className="text-slate-600 leading-relaxed">
                {irrigationRecommendation}
              </p>
            </div>

            {/* Basic Farming Alerts */}
            <div className="mt-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Active Alerts:</span>
              {activeAlerts.length > 0 ? (
                <div className="space-y-1.5">
                  {activeAlerts.slice(0, 2).map(alert => (
                    <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{alert.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>All biophysical thresholds within normal operating limits.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Automated valve actuators disengaged</span>
            <span>Manual confirmation required for pump</span>
          </div>
        </div>

      </section>

      {/* ======================================================== */}
      {/* 4. SIMPLE PROFESSIONAL ANALYTICS                         */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Sensor Analytics & Telemetry History</span>
            </h3>
            <p className="text-xs text-slate-400">
              Chronological log of actual physical measurements and simulation iterations
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {[
              { id: 'temperature', label: 'Temperature (°C)' },
              { id: 'humidity', label: 'Humidity (%)' },
              { id: 'soilMoisture', label: 'Soil Moisture (%)' },
              { id: 'lightIntensity', label: 'Light (%)' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTrendMetric(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTrendMetric === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Chart or Clean Empty State */}
        {trendData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '12px',
                    fontFamily: 'monospace' 
                  }}
                  formatter={(val) => [`${val}`, activeTrendMetric]}
                />
                <Area 
                  type="monotone" 
                  dataKey={activeTrendMetric} 
                  stroke="#059669" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#metricGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">
              No Sensor Telemetry Logged Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Connect your ESP32 microcontroller via USB serial bridge or click the <strong>SIMULATE DATA</strong> button above to record telemetry iterations.
            </p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 5. FARM ZONES & CROPS (PRESERVED CORE FEATURE)           */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Farm Zones & Crops (4 Quadrants)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select any zone to view crop agronomy and open the 3D field digital twin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddPlotModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTe ? '+ ప్లాట్ జోడించండి' : '+ Add Plot'}</span>
            </button>
            <button
              type="button"
              onClick={downloadAuditCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 self-start sm:self-auto"
              title="Export farm data to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTe ? 'CSV డౌన్‌లోడ్' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => {
            const agro = zone.agronomy;
            const isZoneLiveA = isLive && zone.zoneId === 'ZONE-A';
            const isStandby = isLive && zone.zoneId !== 'ZONE-A';

            let zMoist = 'N/A';
            let zTemp = 'N/A';

            if (isLive) {
              if (isZoneLiveA && hasHardware) {
                zMoist = typeof hardwareData.soilMoisture === 'number' ? `${hardwareData.soilMoisture.toFixed(1)}%` : 'N/A';
                zTemp = typeof hardwareData.temperature === 'number' ? `${hardwareData.temperature.toFixed(1)}°C` : 'N/A';
              } else if (isStandby) {
                zMoist = 'Standby';
                zTemp = 'Standby';
              }
            } else if (isSimulated) {
              zMoist = typeof zone.sensorData?.soilMoisture === 'number' ? `${zone.sensorData.soilMoisture.toFixed(1)}%` : 'N/A';
              zTemp = typeof zone.sensorData?.airTemperature === 'number' ? `${zone.sensorData.airTemperature.toFixed(1)}°C` : 'N/A';
            }

            return (
              <div 
                key={zone.zoneId}
                onClick={() => setSelectedZone(zone)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold font-mono text-xs shadow-2xs">
                        {zone.zoneId.replace('ZONE-', '')}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {zone.name} — {agro?.crop?.name || zone.cropType}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {agro?.crop?.variety || 'Hybrid'} • {agro?.acreage || 0.25} Acres
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                      <span>3D Field View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Telemetry Snapshot */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/70 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Moisture</span>
                      <strong className="text-xs font-black font-mono text-slate-800 block">
                        {zMoist}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Temp</span>
                      <strong className="text-xs font-black font-mono text-slate-800 block">
                        {zTemp}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Health</span>
                      <strong className="text-xs font-black font-mono text-emerald-600 block">
                        {typeof zone.analysis?.overallHealthScore === 'number' && (hasHardware || isSimulated) 
                          ? `${zone.analysis.overallHealthScore}%` 
                          : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-mono">
                  <span>Soil: {agro?.crop?.soilType || 'Sandy Loam'}</span>
                  <span>{isZoneLiveA ? 'ESP32 Primary Node' : (isStandby ? 'Auxiliary Node' : 'Simulated')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. MODAL: 3D DIGITAL TWIN & FIELD INSPECTOR              */}
      {/* ======================================================== */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          agronomy={selectedZone.agronomy}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Add Plot Modal */}
      <AddPlotModal
        isOpen={showAddPlotModal}
        onClose={() => setShowAddPlotModal(false)}
      />

    </div>
  );
}
