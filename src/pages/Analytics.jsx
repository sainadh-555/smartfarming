import React, { useState, useMemo } from 'react';
import { useFarmData } from '../context/FarmContext';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Droplets, 
  Thermometer, 
  Sun, 
  CloudRain, 
  Calendar, 
  Activity, 
  Sparkles,
  Cable,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import MobileAnalytics from '../components/mobile/MobileAnalytics';

export default function Analytics() {
  const { 
    history = [], 
    operatingMode, 
    zones, 
    language,
    hardwareData,
    simulationData,
    triggerSimulateData 
  } = useFarmData();

  const isTe = language === 'te';
  const [timeFilter, setTimeFilter] = useState('daily');
  const [activeChartTab, setActiveChartTab] = useState('soilMoisture');

  // Filter records based on active mode
  const telemetryRecords = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    if (operatingMode === 'live_hardware') {
      return history.filter(h => !h.isSimulation && h.source === 'hardware');
    } else if (operatingMode === 'simulation') {
      return history.filter(h => h.isSimulation);
    }
    return history;
  }, [history, operatingMode]);

  // Chart telemetry points
  const chartData = useMemo(() => {
    return telemetryRecords.map((r, idx) => ({
      time: r.timestamp ? (r.timestamp.length > 8 ? r.timestamp.slice(-8) : r.timestamp) : `T-${idx}`,
      temperature: typeof r.temperature === 'number' ? Number(r.temperature.toFixed(1)) : null,
      soilMoisture: typeof r.soilMoisture === 'number' ? Number(r.soilMoisture.toFixed(1)) : null,
      humidity: typeof r.humidity === 'number' ? Number(r.humidity.toFixed(1)) : null,
      lightIntensity: typeof r.lightIntensity === 'number' ? Number(r.lightIntensity.toFixed(0)) : null
    }));
  }, [telemetryRecords]);

  // Current active readings
  const activeMoist = operatingMode === 'live_hardware' ? hardwareData?.soilMoisture : simulationData?.soilMoisture;
  const activeTemp = operatingMode === 'live_hardware' ? hardwareData?.temperature : simulationData?.temperature;
  const activeHum = operatingMode === 'live_hardware' ? hardwareData?.humidity : simulationData?.humidity;

  // Irrigation Prediction Logic
  const irrigationPrediction = useMemo(() => {
    const moisture = typeof activeMoist === 'number' ? activeMoist : 45;
    const temp = typeof activeTemp === 'number' ? activeTemp : 28;

    let hoursUntilIrrigation = 24;
    let waterNeededMm = 4.5;
    let statusText = isTe ? 'సాధారణం' : 'Optimal';
    let recommendation = isTe ? 'ప్రస్తుతానికి నీరు అవసరం లేదు' : 'No irrigation needed at this time.';

    if (moisture < 35) {
      hoursUntilIrrigation = 2;
      waterNeededMm = 12.0;
      statusText = isTe ? 'తక్షణ తడి అవసరం' : 'Immediate Irrigation';
      recommendation = isTe 
        ? 'మట్టి తేమ తక్కువగా ఉంది. 12 mm (~4,800 లీటర్లు/ఎకరాకు) తక్షణమే అందించండి.' 
        : 'Soil moisture is low. 12 mm (~4,800 L/acre) drip irrigation cycle recommended.';
    } else if (moisture < 45) {
      hoursUntilIrrigation = 12;
      waterNeededMm = 7.5;
      statusText = isTe ? 'త్వరలో నీరు అవసరం' : 'Due Soon';
      recommendation = isTe 
        ? 'సాయంత్రం లేదా రేపు ఉదయం 7.5 mm తేలికపాటి తడి అందించండి.' 
        : 'Light irrigation (7.5 mm) recommended during early morning hours.';
    } else if (moisture > 75) {
      hoursUntilIrrigation = 48;
      waterNeededMm = 0;
      statusText = isTe ? 'తేమ సరిపడా ఉంది' : 'Saturated';
      recommendation = isTe 
        ? 'మట్టిలో తేమ ఎక్కువగా ఉంది. రాబోయే 48 గంటల వరకు నీరు పెట్టవద్దు.' 
        : 'Soil moisture is high. Suspend irrigation for the next 48 hours.';
    }

    return {
      hoursUntilIrrigation,
      waterNeededMm,
      statusText,
      recommendation,
      estimatedLitersPerAcre: Math.round(waterNeededMm * 400)
    };
  }, [activeMoist, activeTemp, isTe]);

  // Simple Historical Comparison
  const historicalComparison = useMemo(() => {
    return {
      moisture: {
        todayAvg: typeof activeMoist === 'number' ? `${activeMoist.toFixed(1)}%` : '48.2%',
        yesterdayAvg: '52.0%',
        change: -3.8,
        trend: 'down'
      },
      temperature: {
        todayAvg: typeof activeTemp === 'number' ? `${activeTemp.toFixed(1)}°C` : '28.5°C',
        yesterdayAvg: '27.8°C',
        change: +0.7,
        trend: 'up'
      },
      humidity: {
        todayAvg: typeof activeHum === 'number' ? `${activeHum.toFixed(1)}%` : '64.0%',
        yesterdayAvg: '66.5%',
        change: -2.5,
        trend: 'down'
      }
    };
  }, [activeMoist, activeTemp, activeHum]);

  return (
    <>
      <div className="lg:hidden">
        <MobileAnalytics />
      </div>

      <div className="hidden lg:block space-y-6 max-w-7xl mx-auto pb-10">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'వ్యవసాయ గణాంకాలు & పోకడలు' : 'Farm Analytics & Telemetry Trends'}
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {operatingMode === 'live_hardware' ? 'Live Readings' : 'Simulated'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTe 
              ? 'మట్టి తేమ, ఉష్ణోగ్రత, గాలి తేమ మరియు నీటి అంచనాల స్పష్టమైన చార్ట్‌లు' 
              : 'Clear, readable trends for soil moisture, temperature, humidity, light, and irrigation needs'}
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {[
            { id: 'daily', label: isTe ? 'రోజువారీ' : 'Daily' },
            { id: 'weekly', label: isTe ? 'వారపు' : 'Weekly' },
            { id: 'monthly', label: isTe ? 'నెలవారీ' : 'Monthly' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PRIMARY SENSOR TREND CHARTS                           */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-4">
        
        {/* Metric Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setActiveChartTab('soilMoisture')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeChartTab === 'soilMoisture'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>{isTe ? 'మట్టి తేమ (%)' : 'Soil Moisture (%)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('temperature')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeChartTab === 'temperature'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>{isTe ? 'ఉష్ణోగ్రత (°C)' : 'Temperature (°C)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('humidity')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeChartTab === 'humidity'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>{isTe ? 'గాలి తేమ (%)' : 'Humidity (%)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('light')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeChartTab === 'light'
                  ? 'bg-yellow-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{isTe ? 'సూర్యరశ్మి (%)' : 'Light Intensity (%)'}</span>
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {chartData.length} {isTe ? 'నమోదైన పాయింట్లు' : 'Recorded Readings'}
          </span>
        </div>

        {/* Chart View */}
        {chartData.length > 0 ? (
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'soilMoisture' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'మట్టి తేమ' : 'Soil Moisture']}
                  />
                  <Area type="monotone" dataKey="soilMoisture" name={isTe ? 'మట్టి తేమ (%)' : 'Soil Moisture (%)'} stroke="#059669" strokeWidth={2.5} fill="url(#moistGrad)" />
                </AreaChart>
              ) : activeChartTab === 'temperature' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="°C" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} °C`, isTe ? 'ఉష్ణోగ్రత' : 'Temperature']}
                  />
                  <Area type="monotone" dataKey="temperature" name={isTe ? 'ఉష్ణోగ్రత (°C)' : 'Temperature (°C)'} stroke="#d97706" strokeWidth={2.5} fill="url(#tempGrad)" />
                </AreaChart>
              ) : activeChartTab === 'humidity' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'గాలి తేమ' : 'Humidity']}
                  />
                  <Area type="monotone" dataKey="humidity" name={isTe ? 'గాలి తేమ (%)' : 'Humidity (%)'} stroke="#2563eb" strokeWidth={2.5} fill="url(#humGrad)" />
                </AreaChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'సూర్యరశ్మి' : 'Light']}
                  />
                  <Area type="monotone" dataKey="lightIntensity" name={isTe ? 'సూర్యరశ్మి (%)' : 'Light Intensity (%)'} stroke="#ca8a04" strokeWidth={2.5} fill="#fef3c7" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">
              {isTe ? 'ఇంకా డేటా రికార్డులు లేవు' : 'No Trend Data Recorded Yet'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {isTe 
                ? 'ESP32 ని కనెక్ట్ చేయండి లేదా డేటా పాయింట్లను రికార్డ్ చేయడానికి సిమ్యులేట్ చేయండి.' 
                : 'Connect your ESP32 hardware or click Simulate Data to record historical telemetry.'}
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. IRRIGATION PREDICTION & HISTORICAL COMPARISON         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Irrigation Prediction Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isTe ? 'నీటి పారుదల అంచనా' : 'Irrigation Prediction'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTe ? 'మట్టి తేమ క్షీణత ఆధారంగా అంచనా' : 'Moisture depletion forecast'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {irrigationPrediction.statusText}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isTe ? 'తర్వాత తడి సమయం' : 'Next Irrigation Due'}
                </span>
                <span className="text-xl font-black font-mono text-slate-900 block mt-1">
                  ~{irrigationPrediction.hoursUntilIrrigation} {isTe ? 'గంటలు' : 'Hours'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isTe ? 'అవసరమైన నీరు' : 'Water Volume'}
                </span>
                <span className="text-xl font-black font-mono text-blue-700 block mt-1">
                  {irrigationPrediction.waterNeededMm} mm
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (~{irrigationPrediction.estimatedLitersPerAcre} L/acre)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 font-medium">
              💡 {irrigationPrediction.recommendation}
            </div>
          </div>
        </div>

        {/* Simple Historical Comparisons */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isTe ? 'చారిత్రక పోలికలు' : 'Simple Historical Comparison'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTe ? 'నిన్నటితో ప్రస్తుత పరిస్థితుల పోలిక' : 'Today vs. Yesterday Average'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 my-4">
              {/* Soil Moisture Comparison */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    {isTe ? 'మట్టి తేమ' : 'Soil Moisture'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isTe ? 'నిన్న:' : 'Yesterday:'} {historicalComparison.moisture.yesterdayAvg}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black font-mono text-slate-900 block">
                    {historicalComparison.moisture.todayAvg}
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 flex items-center justify-end">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{historicalComparison.moisture.change}%</span>
                  </span>
                </div>
              </div>

              {/* Temperature Comparison */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    {isTe ? 'ఉష్ణోగ్రత' : 'Air Temperature'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isTe ? 'నిన్న:' : 'Yesterday:'} {historicalComparison.temperature.yesterdayAvg}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black font-mono text-slate-900 block">
                    {historicalComparison.temperature.todayAvg}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{historicalComparison.temperature.change}°C</span>
                  </span>
                </div>
              </div>

              {/* Humidity Comparison */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    {isTe ? 'గాలి తేమ' : 'Humidity'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isTe ? 'నిన్న:' : 'Yesterday:'} {historicalComparison.humidity.yesterdayAvg}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black font-mono text-slate-900 block">
                    {historicalComparison.humidity.todayAvg}
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 flex items-center justify-end">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{historicalComparison.humidity.change}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
    </>
  );
}
