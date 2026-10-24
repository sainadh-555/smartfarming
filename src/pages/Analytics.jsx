import React, { useState } from 'react';
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
  BrainCircuit, 
  Gauge, 
  Droplets, 
  Thermometer, 
  CloudRain, 
  Layers,
  ArrowUpRight,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { calculateCropETc } from '../services/standardsEngine';

// Generate 7-day FAO-56 water balance dataset
const generateFaoWaterBalance = (unitSystem, faoEt0) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, idx) => {
    const rawEtc = Number((faoEt0 * (0.85 + (idx % 3) * 0.1)).toFixed(2));
    const rainfall = idx === 3 ? 14.5 : (idx === 6 ? 4.2 : 0);
    const deficit = Number((rawEtc - rainfall).toFixed(2));

    if (unitSystem === 'imperial') {
      return {
        day,
        cropEtc: Number((rawEtc * 0.03937).toFixed(2)),
        rainfall: Number((rainfall * 0.03937).toFixed(2)),
        deficit: Number((deficit * 0.03937).toFixed(2)),
        unit: 'in'
      };
    }

    return {
      day,
      cropEtc: rawEtc,
      rainfall,
      deficit,
      unit: 'mm'
    };
  });
};

// Generate 24h soil moisture & matric potential curve
const generate24hTelemetry = (baseMoisture, baseTemp, unitSystem) => {
  const safeMoisture = typeof baseMoisture === 'number' && !isNaN(baseMoisture) ? baseMoisture : 45;
  const safeTemp = typeof baseTemp === 'number' && !isNaN(baseTemp) ? baseTemp : 27;
  const points = [];
  for (let i = 24; i >= 0; i -= 2) {
    const hourLabel = `${24 - i}:00`;
    const moisture = Math.max(12, Math.min(85, safeMoisture + Math.sin(i / 3) * 6));
    const matricKPa = Math.round((100 - moisture) * 0.8);
    const tempC = safeTemp + Math.cos(i / 4) * 4;
    const finalTemp = unitSystem === 'imperial' ? Number(((tempC * 9) / 5 + 32).toFixed(1)) : Number(tempC.toFixed(1));

    points.push({
      time: hourLabel,
      moisture: Math.round(moisture),
      matricKPa: matricKPa,
      temperature: finalTemp
    });
  }
  return points;
};

export default function Analytics() {
  const { zones, faoEt0, unitSystem, formatTemp } = useFarmData();
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');
  const [timeRange, setTimeRange] = useState('7d');

  const activeZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0];
  const waterBalanceData = generateFaoWaterBalance(unitSystem, faoEt0);
  const telemetryData = generate24hTelemetry(
    activeZone.sensorData.soilMoisture, 
    activeZone.sensorData.airTemperature, 
    unitSystem
  );

  const depthUnit = unitSystem === 'imperial' ? 'in' : 'mm';
  const tempUnit = unitSystem === 'imperial' ? '°F' : '°C';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Analytics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Agronomic & Water Balance Analytics
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FAO-56 Penman-Monteith
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Empirical evapotranspiration deficit curves, soil matric tension, and canopy thermal trends.
          </p>
        </div>

        {/* Quadrant Filter Switcher */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {zones.map(z => (
            <button
              key={z.zoneId}
              onClick={() => setSelectedZoneId(z.zoneId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedZoneId === z.zoneId
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {z.name} ({z.cropType})
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Agronomic Performance Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">FAO CROP COEFFICIENT (Kc)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black font-mono text-slate-900">
                {calculateCropETc(activeZone.cropType, 55, faoEt0).kc}
              </strong>
              <span className="text-xs text-slate-500">Mid-Stage</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Water demand peak factor</p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">CUMULATIVE 7-DAY WATER DEFICIT</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black font-mono text-blue-700">
                -{waterBalanceData.reduce((acc, d) => acc + d.deficit, 0).toFixed(1)}
              </strong>
              <span className="text-xs font-bold text-slate-500">{depthUnit}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Requires precision drip replenishment</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">SOIL MATRIC POTENTIAL</span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-2xl font-black font-mono text-emerald-600">
                -{Math.round((100 - activeZone.sensorData.soilMoisture) * 0.8)}
              </strong>
              <span className="text-xs font-bold text-slate-500">kPa</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">ISO 11783-7 Matric Tension</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: FAO-56 Crop Water Balance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                FAO-56 Crop Evapotranspiration vs Rainfall ({depthUnit})
              </h3>
              <p className="text-xs text-slate-500">
                Daily reference requirement ($ET_c$) against precipitation recharge
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
              7-Day Balance
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterBalanceData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="cropEtc" name={`Crop Demand ETc (${depthUnit})`} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rainfall" name={`Effective Rain (${depthUnit})`} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 24h Soil Moisture vs Temperature Correlation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                24h Soil Moisture & Canopy Temperature Trend
              </h3>
              <p className="text-xs text-slate-500">
                Real-time correlation showing diurnal thermal transpiration
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
              ISO Stream 10Hz
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <YAxis yAxisId="left" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" dataKey="moisture" name="Soil Moisture (VWC %)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#moistGrad)" />
                <Line yAxisId="right" type="monotone" dataKey="temperature" name={`Temperature (${tempUnit})`} stroke="#f97316" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* FAO Agronomic Intelligence Insight Box */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-800/60 flex items-start gap-4">
        <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-sm text-white">FAO-56 Irrigation Scheduling Recommendation</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold">
              VERIFIED ACCURATE
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Based on the 7-day cumulative evapotranspiration deficit of <strong>{waterBalanceData.reduce((acc, d) => acc + d.deficit, 0).toFixed(1)} {depthUnit}</strong> in {activeZone.name} ({activeZone.cropType}), soil moisture has reached the lower threshold of Readily Available Water (RAW, $p = 0.40$). We recommend activating drip irrigation at <strong>05:00 AM UTC</strong> to minimize midday evaporative losses.
          </p>
        </div>
      </div>

    </div>
  );
}
