import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  Sparkles, 
  Cable, 
  Bluetooth, 
  MapPin, 
  Clock, 
  CloudRain, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  ChevronRight, 
  RefreshCw,
  X
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';
import { generateFarmHealthScore } from '../../ai/farmDecisionEngine';

export default function MobileHome() {
  const { 
    operatingMode,
    hardwareData,
    simulationData,
    farmLocation,
    weatherData,
    alerts,
    zones,
    language,
    triggerSimulateData,
    connectWebSerial,
    connectWebBluetooth,
    disconnectWebSerial,
    disconnectWebBluetooth,
    isWebSerialSupported,
    isWebBluetoothSupported,
    usbPort
  } = useFarmData();

  const isTe = language === 'te';
  const [isSimulating, setIsSimulating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionNote, setConnectionNote] = useState(null);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return isTe ? 'శుభోదయం' : 'Good morning';
    if (hour < 17) return isTe ? 'శుభ మధ్యాహ్నం' : 'Good afternoon';
    return isTe ? 'శుభ సాయంత్రం' : 'Good evening';
  }, [isTe]);

  // Connection & Hardware state
  const isLive = operatingMode === 'live_hardware';
  const isSimulated = operatingMode === 'simulation';
  const isFresh = hardwareData?.lastUpdatedEpoch ? ((Date.now() - hardwareData.lastUpdatedEpoch) < 8500) : false;
  const hasHardware = isLive && hardwareData?.hasReadings && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale && isFresh;

  // Sensor Readouts (Strict N/A when hardware readings unavailable)
  let tempDisplay = 'N/A';
  let humDisplay = 'N/A';
  let moistDisplay = 'N/A';
  let lightDisplay = 'N/A';

  let tempStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let humStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let moistStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';
  let lightStatus = isTe ? 'అందుబాటులో లేదు' : 'Unavailable';

  if (isLive) {
    if (hasHardware) {
      const t = hardwareData.temperature;
      const h = hardwareData.humidity;
      const m = hardwareData.soilMoisture;
      const l = hardwareData.lightIntensity ?? hardwareData.light_intensity ?? null;

      tempDisplay = typeof t === 'number' ? `${t.toFixed(1)}°C` : 'N/A';
      humDisplay = typeof h === 'number' ? `${h.toFixed(1)}%` : 'N/A';
      moistDisplay = typeof m === 'number' ? `${m.toFixed(1)}%` : 'N/A';
      lightDisplay = typeof l === 'number' ? `${l.toFixed(0)}%` : 'N/A';

      if (typeof t === 'number') {
        tempStatus = t >= 20 && t <= 32 ? (isTe ? 'అనుకూలం' : 'Optimal') : (t > 32 ? (isTe ? 'ఎక్కువ వేడి' : 'High') : (isTe ? 'చల్లగా ఉంది' : 'Low'));
      }
      if (typeof h === 'number') {
        humStatus = h >= 50 && h <= 75 ? (isTe ? 'సాధారణం' : 'Normal') : (h > 75 ? (isTe ? 'ఎక్కువ తేమ' : 'High') : (isTe ? 'పొడి గాలి' : 'Dry'));
      }
      if (typeof m === 'number') {
        moistStatus = m >= 45 && m <= 70 ? (isTe ? 'తగినంత తేమ' : 'Optimal') : (m < 35 ? (isTe ? 'నీరు అవసరం' : 'Low') : (isTe ? 'ఎక్కువ తేమ' : 'Saturated'));
      }
      if (typeof l === 'number') {
        lightStatus = l >= 70 ? (isTe ? 'ప్రకాశవంతం' : 'Bright') : (l >= 35 ? (isTe ? 'సరిపడా' : 'Adequate') : (isTe ? 'తక్కువ వెలుతురు' : 'Low Light'));
      }
    }
  } else if (isSimulated && simulationData) {
    const t = simulationData.temperature;
    const h = simulationData.humidity;
    const m = simulationData.soilMoisture;
    const l = simulationData.lightIntensity ?? simulationData.light_intensity ?? null;

    tempDisplay = typeof t === 'number' ? `${t.toFixed(1)}°C` : 'N/A';
    humDisplay = typeof h === 'number' ? `${h.toFixed(1)}%` : 'N/A';
    moistDisplay = typeof m === 'number' ? `${m.toFixed(1)}%` : 'N/A';
    lightDisplay = typeof l === 'number' ? `${l.toFixed(0)}%` : 'N/A';

    tempStatus = isTe ? 'సిమ్యులేట్' : 'Simulated';
    humStatus = isTe ? 'సిమ్యులేట్' : 'Simulated';
    moistStatus = isTe ? 'సిమ్యులేట్' : 'Simulated';
    lightStatus = isTe ? 'సిమ్యులేట్' : 'Simulated';
  }

  // Farm Health Score Evaluation
  const healthScore = useMemo(() => {
    if (!zones || zones.length === 0) return null;
    return generateFarmHealthScore(zones.map(z => ({ ...z.sensorData, cropType: z.cropType })));
  }, [zones]);

  let healthStatusText = isTe ? 'డేటా కోసం వేచి ఉంది' : 'Awaiting Data';
  let healthBadgeColor = 'text-slate-600 bg-slate-100 border-slate-200';
  let irrigationGuidance = isTe 
    ? 'నీటి అవసరాన్ని లెక్కించడానికి లైవ్ సెన్సార్ రీడింగ్‌ల కోసం వేచి చూస్తున్నాము.' 
    : 'Awaiting live sensor readings to determine irrigation requirement.';

  if ((hasHardware || isSimulated) && typeof healthScore === 'number') {
    if (healthScore >= 80) {
      healthStatusText = isTe ? 'అనుకూలం (ఉత్తమం)' : 'Optimal Condition';
      healthBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (healthScore >= 60) {
      healthStatusText = isTe ? 'శ్రద్ధ అవసరం' : 'Attention Needed';
      healthBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      healthStatusText = isTe ? 'కీలక పరిస్థితి' : 'Critical Stress';
      healthBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    const activeM = isLive ? hardwareData?.soilMoisture : simulationData?.soilMoisture;
    if (typeof activeM === 'number') {
      if (activeM < 35) {
        irrigationGuidance = isTe 
          ? 'మట్టి తేమ తక్కువగా ఉంది (< 35%). తక్షణమే బిందు సేద్యం ద్వారా నీరు అందించండి.' 
          : 'Soil moisture is low (< 35%). Irrigation cycle recommended.';
      } else if (activeM < 45) {
        irrigationGuidance = isTe 
          ? 'మట్టి తేమ కొద్దిగా తగ్గింది (35-45%). తేలికపాటి తడి అందించండి.' 
          : 'Soil moisture is moderate (35-45%). Light irrigation cycle recommended.';
      } else if (activeM > 75) {
        irrigationGuidance = isTe 
          ? 'మట్టిలో తేమ ఎక్కువగా ఉంది (> 75%). నీరు పెట్టడం నిలిపివేయండి.' 
          : 'Soil moisture is high (> 75%). Delay irrigation and verify field drainage.';
      } else {
        irrigationGuidance = isTe 
          ? 'మట్టి తేమ సాధారణ అనుకూల పరిధిలో ఉంది (45-70%). ప్రస్తుతం నీరు అవసరం లేదు.' 
          : 'Soil moisture is optimal. No irrigation needed at this time.';
      }
    }
  }

  // Active Unresolved Alerts
  const activeAlerts = (alerts || []).filter(a => !a.resolved);

  // Quick Hardware Connect
  const handleConnect = async () => {
    setConnecting(true);
    setConnectionNote(null);
    try {
      if (isWebBluetoothSupported()) {
        await connectWebBluetooth();
        setConnectionNote({ type: 'success', text: isTe ? 'ESP32 Bluetooth LE కనెక్ట్ అయింది!' : 'Connected to ESP32 via Bluetooth LE!' });
      } else if (isWebSerialSupported()) {
        await connectWebSerial();
        setConnectionNote({ type: 'success', text: isTe ? 'ESP32 USB ద్వారా కనెక్ట్ అయింది!' : 'Connected to ESP32 via USB Serial!' });
      } else {
        setConnectionNote({ 
          type: 'info', 
          text: isTe 
            ? 'ఈ మొబైల్ బ్రౌజర్‌లో బ్లూటూత్ లేదా USB అందుబాటులో లేదు. డేటా మూలాలలో క్లౌడ్ సింక్ ఉపయోగించండి.' 
            : 'Web Bluetooth/Serial not available in this mobile browser. Use Cloud Sync or Simulation.' 
        });
      }
    } catch (err) {
      setConnectionNote({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setConnecting(false);
      setTimeout(() => setConnectionNote(null), 5000);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await triggerSimulateData();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-4 pb-6 max-w-lg mx-auto">
      
      {/* ======================================================== */}
      {/* 1. WELCOME SECTION                                       */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              {greeting}, Farmer
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {farmLocation?.name || 'Green Valley Farm'}
            </h1>
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>{farmLocation?.displayLocation || 'Precision Agriculture Field'}</span>
            </p>
          </div>

          {/* Current Weather Pill */}
          {weatherData && (
            <div className="bg-sky-50 border border-sky-200/90 rounded-xl px-2.5 py-1.5 text-right shrink-0">
              <span className="text-xs font-mono font-black text-sky-900 block">
                {weatherData.outdoorTemperature !== null ? `${weatherData.outdoorTemperature.toFixed(1)}°C` : 'Live'}
              </span>
              <span className="text-[10px] font-semibold text-sky-700 block truncate max-w-[85px]">
                {weatherData.weatherCondition || 'Weather'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. CONNECTION & TELEMETRY SECTION                        */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              hasHardware 
                ? 'bg-emerald-500 animate-ping' 
                : (isSimulated ? 'bg-purple-500 animate-pulse' : 'bg-slate-300')
            }`} />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                {isTe ? 'కనెక్షన్ స్థితి' : 'ESP32 Gateway'}
              </span>
              <span className="text-xs font-extrabold text-slate-800 truncate block mt-0.5">
                {hasHardware 
                  ? (isTe ? 'లైవ్ హార్డ్‌వేర్ కనెక్ట్ అయింది' : 'Hardware Connected (Live)') 
                  : (isSimulated 
                      ? (isTe ? 'పైథాన్ సిమ్యులేషన్ మోడ్' : 'Python Simulation Mode') 
                      : (isTe ? 'డిస్‌కనెక్ట్ అయింది' : 'Hardware Disconnected'))}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!hasHardware && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 touch-target-min"
              >
                <Bluetooth className={`w-3.5 h-3.5 text-blue-300 ${connecting ? 'animate-pulse' : ''}`} />
                <span>{connecting ? '...' : (isTe ? 'కనెక్ట్' : 'Connect')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 touch-target-min"
              title="Simulate Data"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? '...' : (isTe ? 'సిమ్యులేట్' : 'Simulate')}</span>
            </button>
          </div>

        </div>

        {/* Feedback Alert if present */}
        {connectionNote && (
          <div className={`mt-2.5 text-[11px] font-medium p-2 rounded-xl flex items-center justify-between ${
            connectionNote.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : (connectionNote.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700')
          }`}>
            <span>{connectionNote.text}</span>
            <button onClick={() => setConnectionNote(null)} className="font-bold ml-2">×</button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. MOBILE SENSOR CARDS (2-COLUMN RESPONSIVE GRID)         */}
      {/* ======================================================== */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            {isTe ? 'లైవ్ సెన్సార్ రీడింగ్‌లు' : 'Real-Time Sensor Metrics'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {hasHardware ? 'ESP32 (115200)' : 'STRICT N/A'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          
          {/* 1. Temperature Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Thermometer className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900 leading-tight">
                {tempDisplay}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="font-semibold text-slate-600 truncate">{tempStatus}</span>
                <span className="text-slate-400 font-mono">°C</span>
              </div>
            </div>
          </div>

          {/* 2. Humidity Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'గాలి తేమ' : 'Humidity'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wind className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900 leading-tight">
                {humDisplay}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="font-semibold text-slate-600 truncate">{humStatus}</span>
                <span className="text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* 3. Soil Moisture Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'మట్టి తేమ' : 'Soil Moisture'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900 leading-tight">
                {moistDisplay}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="font-semibold text-slate-600 truncate">{moistStatus}</span>
                <span className="text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* 4. Light Intensity Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isTe ? 'సూర్యరశ్మి' : 'Light Intensity'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900 leading-tight">
                {lightDisplay}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="font-semibold text-slate-600 truncate">{lightStatus}</span>
                <span className="text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. FARM HEALTH & IRRIGATION SECTION                      */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                {isTe ? 'పంట ఆరోగ్యం & నీటి సిఫార్సు' : 'Crop Health & Irrigation Advisory'}
              </h3>
            </div>
          </div>

          {/* Health Score Pill */}
          {typeof healthScore === 'number' && (
            <span className={`text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${healthBadgeColor}`}>
              {healthScore} / 100
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">{healthStatusText}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pl-5">
            {irrigationGuidance}
          </p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. WEATHER SUMMARY SECTION                               */}
      {/* ======================================================== */}
      {weatherData && (
        <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-extrabold text-slate-900">
                {isTe ? 'వాతావరణ సూచన' : 'Field Weather Conditions'}
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              {weatherData.weatherCondition}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 text-center">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'బయట ఉష్ణోగ్రత' : 'Outdoor'}</span>
              <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                {weatherData.outdoorTemperature !== null ? `${weatherData.outdoorTemperature.toFixed(1)}°C` : 'N/A'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'వర్షం' : 'Rain'}</span>
              <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                {weatherData.precipitationMm !== null ? `${weatherData.precipitationMm.toFixed(1)}mm` : '0 mm'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'గాలి వేగం' : 'Wind'}</span>
              <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                {weatherData.windSpeedKmh !== null ? `${weatherData.windSpeedKmh.toFixed(0)} km/h` : '12 km/h'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'తేమ' : 'Humidity'}</span>
              <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
                {weatherData.outdoorHumidity !== null ? `${weatherData.outdoorHumidity.toFixed(0)}%` : '60%'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 6. ACTIVE ALERTS SECTION (ONLY ACTIVE ALERTS)            */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-extrabold text-slate-900">
              {isTe ? 'క్రియాశీల హెచ్చరికలు' : 'Active Field Alerts'}
            </h3>
          </div>
          <NavLink to="/alerts" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center">
            <span>{isTe ? 'అన్నీ చూడండి' : 'View All'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="pt-2.5 space-y-2">
          {activeAlerts.length > 0 ? (
            activeAlerts.slice(0, 3).map((a) => (
              <div 
                key={a.id} 
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
              >
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">{a.zoneId || 'Farm Zone'}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{a.timestamp || 'Now'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                    {a.message || a.description || 'Threshold anomaly detected.'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-3 text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-600">
                {isTe ? 'అన్ని సెన్సార్లు సాధారణంగా పనిచేస్తున్నాయి' : 'All field conditions optimal'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isTe ? 'ప్రస్తుతానికి ఎటువంటి సమస్యలు లేవు' : '0 active alerts on your farm'}
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
