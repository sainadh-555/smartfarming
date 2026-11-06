import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Sun, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';
import { 
  predictSoilMoisture, 
  predictTemperatureStress, 
  predictIrrigationRequirement 
} from '../../ai/predictionEngine';

export default function MobileAnalytics() {
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
  const [timeFilter, setTimeFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [activeTab, setActiveTab] = useState('moisture'); // 'moisture' | 'temp' | 'humidity' | 'light'

  // Extract valid non-fabricated telemetry records
  const telemetryData = useMemo(() => {
    if (!history || !Array.isArray(history) || history.length === 0) {
      // Provide single live point if no rolling history yet
      const curM = operatingMode === 'live_hardware' ? hardwareData?.soilMoisture : simulationData?.soilMoisture;
      const curT = operatingMode === 'live_hardware' ? hardwareData?.temperature : simulationData?.temperature;
      const curH = operatingMode === 'live_hardware' ? hardwareData?.humidity : simulationData?.humidity;
      const curL = operatingMode === 'live_hardware' ? (hardwareData?.lightIntensity ?? hardwareData?.light_intensity) : simulationData?.lightIntensity;

      if (curM !== undefined || curT !== undefined) {
        return [{
          time: 'Now',
          soilMoisture: curM,
          temperature: curT,
          humidity: curH,
          lightIntensity: curL
        }];
      }
      return [];
    }

    return history.map((item, index) => ({
      time: item.timestamp || `${index + 1}m`,
      soilMoisture: typeof item.soilMoisture === 'number' ? item.soilMoisture : null,
      temperature: typeof item.temperature === 'number' ? item.temperature : null,
      humidity: typeof item.humidity === 'number' ? item.humidity : null,
      lightIntensity: typeof item.lightIntensity === 'number' ? item.lightIntensity : null
    }));
  }, [history, operatingMode, hardwareData, simulationData]);

  // Active Metric Config
  const metricConfig = useMemo(() => {
    switch (activeTab) {
      case 'temp':
        return {
          key: 'temperature',
          label: isTe ? 'ఉష్ణోగ్రత (°C)' : 'Temperature (°C)',
          unit: '°C',
          stroke: '#f59e0b',
          fill: '#fef3c7',
          icon: Thermometer,
          domain: [15, 45]
        };
      case 'humidity':
        return {
          key: 'humidity',
          label: isTe ? 'గాలి తేమ (%)' : 'Humidity (%)',
          unit: '%',
          stroke: '#0d9488',
          fill: '#ccfbf1',
          icon: Wind,
          domain: [20, 100]
        };
      case 'light':
        return {
          key: 'lightIntensity',
          label: isTe ? 'సూర్యరశ్మి (%)' : 'Light Intensity (%)',
          unit: '%',
          stroke: '#eab308',
          fill: '#fef9c3',
          icon: Sun,
          domain: [0, 100]
        };
      case 'moisture':
      default:
        return {
          key: 'soilMoisture',
          label: isTe ? 'మట్టి తేమ (%)' : 'Soil Moisture (%)',
          unit: '%',
          stroke: '#2563eb',
          fill: '#dbeafe',
          icon: Droplets,
          domain: [0, 100]
        };
    }
  }, [activeTab, isTe]);

  // Calculate summary metrics (Avg, Min, Max)
  const stats = useMemo(() => {
    const validVals = telemetryData
      .map(d => d[metricConfig.key])
      .filter(v => typeof v === 'number');

    if (validVals.length === 0) return { avg: 'N/A', min: 'N/A', max: 'N/A' };
    const sum = validVals.reduce((a, b) => a + b, 0);
    const avg = (sum / validVals.length).toFixed(1);
    const min = Math.min(...validVals).toFixed(1);
    const max = Math.max(...validVals).toFixed(1);
    return { avg, min, max };
  }, [telemetryData, metricConfig.key]);

  // Active zone agronomic predictions
  const primaryZone = zones[0] || {};
  const moistureForecast = useMemo(() => {
    const curM = operatingMode === 'live_hardware' ? hardwareData?.soilMoisture : (primaryZone.sensorData?.soilMoisture || 48);
    const curT = operatingMode === 'live_hardware' ? hardwareData?.temperature : (primaryZone.sensorData?.airTemperature || 28);
    if (typeof curM !== 'number') return null;
    return predictSoilMoisture(curM, curT || 28, 4.2);
  }, [hardwareData, primaryZone, operatingMode]);

  return (
    <div className="space-y-4 pb-6 max-w-lg mx-auto">
      
      {/* ======================================================== */}
      {/* 1. TIME RANGE SELECTOR (DAILY / WEEKLY / MONTHLY)        */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'daily', label: isTe ? 'రోజువారీ' : 'Daily' },
            { id: 'weekly', label: isTe ? 'వారం' : 'Weekly' },
            { id: 'monthly', label: isTe ? 'నెలవారీ' : 'Monthly' }
          ].map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTimeFilter(filter.id)}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all touch-target-min cursor-pointer ${
                timeFilter === filter.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. METRIC SELECTOR TABS                                  */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'moisture', label: isTe ? 'మట్టి తేమ' : 'Soil Moisture', icon: Droplets },
          { id: 'temp', label: isTe ? 'ఉష్ణోగ్రత' : 'Temperature', icon: Thermometer },
          { id: 'humidity', label: isTe ? 'గాలి తేమ' : 'Humidity', icon: Wind },
          { id: 'light', label: isTe ? 'సూర్యరశ్మి' : 'Light', icon: Sun },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer active:scale-95 touch-target-min ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-emerald-900/20'
                  : 'bg-white text-slate-700 border border-slate-200/90'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. FULL-WIDTH RESPONSIVE TELEMETRY CHART                 */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {timeFilter.toUpperCase()} • TELEMETRY TREND
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
              {metricConfig.label}
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {telemetryData.length} Points
          </span>
        </div>

        {/* Chart View */}
        <div className="h-56 w-full pt-3">
          {telemetryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig.stroke} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={metricConfig.stroke} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  domain={metricConfig.domain} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                  }}
                  formatter={(val) => [`${val} ${metricConfig.unit}`, metricConfig.label]}
                />
                <Area 
                  type="monotone" 
                  dataKey={metricConfig.key} 
                  stroke={metricConfig.stroke} 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#metricGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              {isTe ? 'టెలిమెట్రీ డేటా అందుబాటులో లేదు' : 'Awaiting sensor telemetry points...'}
            </div>
          )}
        </div>

        {/* Summary Stats Strip (Avg / Min / Max) */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
          <div className="p-2 rounded-xl bg-slate-50">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'సగటు' : 'Average'}</span>
            <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
              {stats.avg !== 'N/A' ? `${stats.avg}${metricConfig.unit}` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'కనిష్టం' : 'Minimum'}</span>
            <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
              {stats.min !== 'N/A' ? `${stats.min}${metricConfig.unit}` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'గరిష్టం' : 'Maximum'}</span>
            <span className="text-xs font-mono font-black text-slate-800 block mt-0.5">
              {stats.max !== 'N/A' ? `${stats.max}${metricConfig.unit}` : 'N/A'}
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. IRRIGATION ANALYSIS & PREDICTION SUMMARIES            */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-extrabold text-slate-900">
            {isTe ? 'నీటి పారుదల & అంచనాలు' : 'Irrigation & Growth Analysis'}
          </h3>
        </div>

        {/* Prediction Cards */}
        <div className="space-y-2">
          
          {/* Soil Moisture Depletion Forecast */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {isTe ? '24 గంటల తేమ క్షీణత అంచనా' : '24-Hour Soil Moisture Forecast'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {moistureForecast ? moistureForecast.explanation : (isTe ? 'రోజువారీ బాష్పీభవనం ప్రకారం మట్టి తేమ క్రమంగా తగ్గుతుంది.' : 'Moisture expected to deplete moderately based on current solar heat.')}
              </p>
            </div>
            {moistureForecast && (
              <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg shrink-0">
                {moistureForecast.predictedValue}%
              </span>
            )}
          </div>

          {/* Practical Irrigation Advice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {isTe ? 'రైతు సలహా' : 'Agronomic Action Recommendation'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {isTe 
                  ? 'మట్టి తేమ 40% కన్నా తగ్గితేనే డ్రిప్ పద్ధతిలో 25 నిమిషాల పాటు నీరు అందించండి. ఉదయం లేదా సాయంత్రం వేళలు నీరు పెట్టడానికి ఉత్తమం.' 
                  : 'Apply drip irrigation for 25 minutes only when moisture drops below 40%. Best done in early morning to minimize solar evaporation.'}
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
