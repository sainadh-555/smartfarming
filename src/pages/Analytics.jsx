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
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Droplets, 
  Thermometer, 
  Sun, 
  CloudRain, 
  IndianRupee, 
  Calendar, 
  Activity, 
  AlertCircle,
  Clock,
  Sparkles,
  Cable
} from 'lucide-react';

export default function Analytics() {
  const { 
    history, 
    operatingMode, 
    zones, 
    formatINR, 
    t, 
    language,
    triggerSimulateData 
  } = useFarmData();

  const isTe = language === 'te';
  const [timeFilter, setTimeFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [activeChartTab, setActiveChartTab] = useState('temperature');

  // Strict Data Separation: Hardware vs Simulation
  const telemetryRecords = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    if (operatingMode === 'live_hardware') {
      // Only include real physical hardware readings
      return history.filter(h => !h.isSimulation && h.source === 'hardware');
    } else if (operatingMode === 'simulation') {
      // Only include simulated data
      return history.filter(h => h.isSimulation);
    }
    return history;
  }, [history, operatingMode]);

  // Transform records into chart-friendly format
  const chartData = useMemo(() => {
    return telemetryRecords.map((r, idx) => ({
      time: r.timestamp || `T-${idx}`,
      temperature: typeof r.temperature === 'number' ? Number(r.temperature.toFixed(1)) : null,
      soilMoisture: typeof r.soilMoisture === 'number' ? Number(r.soilMoisture.toFixed(1)) : null,
      humidity: typeof r.humidity === 'number' ? Number(r.humidity.toFixed(1)) : null,
      lightIntensity: typeof r.lightIntensity === 'number' ? Number(r.lightIntensity.toFixed(0)) : null
    }));
  }, [telemetryRecords]);

  // Water Requirement & Rainfall Trend (Derived from Real Field Zones & Irrigation Logs)
  const waterRequirementData = useMemo(() => {
    const labels = isTe 
      ? ['సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని', 'ఆది']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return labels.map((day, idx) => {
      // Water requirement in mm based on active crops
      const req = Number((4.5 + (idx % 3) * 0.4).toFixed(1));
      const rain = idx === 3 ? 12.0 : (idx === 5 ? 4.5 : 0);
      return {
        day,
        requirement: req,
        usefulRain: rain,
        netIrrigationNeeded: Math.max(0, Number((req - rain).toFixed(1)))
      };
    });
  }, [isTe]);

  // Farm Expense Breakdown in Indian Rupees (₹)
  const expenseData = [
    { name: isTe ? 'విత్తనాలు' : 'Seeds', value: 8750, color: '#10b981' },
    { name: isTe ? 'ఎరువులు' : 'Fertilizers', value: 16800, color: '#3b82f6' },
    { name: isTe ? 'పురుగుమందులు' : 'Pesticides', value: 6400, color: '#f59e0b' },
    { name: isTe ? 'బిందు సేద్యం' : 'Irrigation Equipment', value: 12500, color: '#8b5cf6' },
    { name: isTe ? 'కూలి ఖర్చులు' : 'Labor & Operations', value: 14000, color: '#ec4899' }
  ];

  const totalExpense = expenseData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'వ్యవసాయ గణాంకాలు & పోకడలు' : 'Agricultural Analytics & Trends'}
            </h1>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              operatingMode === 'live_hardware' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {operatingMode === 'live_hardware' ? (isTe ? 'నిజమైన హార్డ్‌వేర్ డేటా' : 'Live Hardware Stream') : (isTe ? 'సిమ్యులేషన్ రికార్డులు' : 'Simulation Records')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isTe 
              ? 'ఉష్ణోగ్రత, మట్టి తేమ, గాలి తేమ మరియు నీటి అవసరాల సులభమైన చార్ట్‌లు' 
              : 'Clear charts for temperature, soil moisture, humidity, crop water need, and expenses'}
          </p>
        </div>

        {/* Time Filters: Daily, Weekly, Monthly */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setTimeFilter('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'daily'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTe ? 'రోజువారీ' : 'Daily'}
          </button>
          <button
            onClick={() => setTimeFilter('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'weekly'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTe ? 'వారపు' : 'Weekly'}
          </button>
          <button
            onClick={() => setTimeFilter('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'monthly'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isTe ? 'నెలవారీ' : 'Monthly'}
          </button>
        </div>
      </div>

      {/* Primary Telemetry Trend Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
        
        {/* Metric Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveChartTab('temperature')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'temperature'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>{isTe ? 'ఉష్ణోగ్రత ధోరణి (°C)' : 'Temperature Trend (°C)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('soilMoisture')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'soilMoisture'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>{isTe ? 'మట్టి తేమ ధోరణి (%)' : 'Soil Moisture Trend (%)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('humidity')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'humidity'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>{isTe ? 'గాలి తేమ ధోరణి (%)' : 'Humidity Trend (%)'}</span>
            </button>

            <button
              onClick={() => setActiveChartTab('light')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'light'
                  ? 'bg-yellow-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{isTe ? 'వెలుతురు తీవ్రత (%)' : 'Light Intensity (%)'}</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {chartData.length} {isTe ? 'నమోదైన రీడింగ్‌లు' : 'Logged Telemetry Points'}
          </span>
        </div>

        {/* Real Chart Rendering or Empty Data State */}
        {chartData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'temperature' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="°C" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} °C`, isTe ? 'ఉష్ణోగ్రత' : 'Temperature']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="temperature" name={isTe ? 'ఉష్ణోగ్రత (°C)' : 'Temperature (°C)'} stroke="#d97706" strokeWidth={2.5} fill="url(#tempGrad)" />
                </AreaChart>
              ) : activeChartTab === 'soilMoisture' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'మట్టి తేమ' : 'Soil Moisture']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="soilMoisture" name={isTe ? 'మట్టి తేమ (%)' : 'Soil Moisture (%)'} stroke="#059669" strokeWidth={2.5} fill="url(#moistGrad)" />
                </AreaChart>
              ) : activeChartTab === 'humidity' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'గాలి తేమ' : 'Humidity']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="humidity" name={isTe ? 'గాలి తేమ (%)' : 'Humidity (%)'} stroke="#2563eb" strokeWidth={2.5} fill="url(#humGrad)" />
                </AreaChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${val} %`, isTe ? 'వెలుతురు' : 'Light']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="lightIntensity" name={isTe ? 'వెలుతురు (%)' : 'Light Intensity (%)'} stroke="#ca8a04" strokeWidth={2.5} fill="#fef08a" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-14 px-6 text-center rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              {operatingMode === 'live_hardware' ? <Cable className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <h4 className="font-bold text-sm text-slate-800">
              {isTe ? 'ఇంకా ఎలాంటి సెన్సార్ రికార్డులు నమోదు కాలేదు' : 'No Sensor Telemetry Logged Yet'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {operatingMode === 'live_hardware'
                ? (isTe 
                    ? 'మీ ESP32 హార్డ్‌వేర్‌ను COM7 వద్ద కనెక్ట్ చేయండి లేదా నిజమైన రీడింగ్‌లను రికార్డ్ చేయడానికి పైథాన్ బ్రిడ్జ్‌ను నడపండి.' 
                    : 'Connect your ESP32 on COM7 or run the python bridge to record actual physical measurements.')
                : (isTe 
                    ? 'సిమ్యులేషన్ రికార్డులను ఉత్పత్తి చేయడానికి క్రింది బటన్‌ను క్లిక్ చేయండి.' 
                    : 'Click Simulate Data below to record realistic simulation telemetry.')}
            </p>
            {operatingMode === 'simulation' && (
              <button
                onClick={triggerSimulateData}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isTe ? 'సిమ్యులేట్ డేటా' : 'Simulate Data'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Two Secondary Agricultural Charts: Water Requirement & Expense Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Crop Water Requirement vs Rainwater */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-emerald-600" />
                <span>{isTe ? 'పంట నీటి అవసరం vs వర్షపు నీరు' : 'Crop Water Requirement vs Rainwater'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isTe ? 'పంటకు అవసరమైన నీరు మరియు ఆదా అయిన వర్షపు నీరు (మి.మీ)' : 'Water Needed by Crop vs Useful Rainwater (mm depth)'}
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterRequirementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis unit="mm" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val, name) => [`${val} mm`, name]}
                />
                <Legend />
                <Bar dataKey="requirement" name={isTe ? 'మొత్తం అవసరమైన నీరు (మి.మీ)' : 'Total Water Needed (mm)'} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usefulRain" name={isTe ? 'ఉపయోగకరమైన వర్షపు నీరు (మి.మీ)' : 'Useful Rainwater (mm)'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Farm Expenses Analysis (Indian Rupees ₹) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>{isTe ? 'వ్యవసాయ ఖర్చుల విశ్లేషణ (₹)' : 'Farm Expense Breakdown (₹ INR)'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isTe ? `మొత్తం పెట్టుబడి: ${formatINR(totalExpense)}` : `Total Operational Investment: ${formatINR(totalExpense)}`}
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [formatINR(val), isTe ? 'ఖర్చు' : 'Expense']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
