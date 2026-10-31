import React, { useState, useMemo } from 'react';
import { useFarmData } from '../context/FarmContext';
import { 
  BrainCircuit, 
  MessageSquare, 
  Sparkles, 
  Droplets, 
  Thermometer, 
  CloudRain, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingDown,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import AIAgronomistChat from '../components/AIAgronomistChat';
import ErrorBoundary from '../components/ErrorBoundary';
import { 
  predictSoilMoisture, 
  predictTemperatureStress, 
  predictIrrigationRequirement, 
  analyzeCropHealthRisk, 
  analyzeRainfallSavings 
} from '../ai/predictionEngine';

export default function AIInsights() {
  const { zones, history, language, t } = useFarmData();
  const isTe = language === 'te';

  const [activeView, setActiveView] = useState('predictions'); // 'predictions' | 'chat' | 'cards'
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');

  const activeZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0] || {};
  const currentSensor = activeZone.sensorData || {};
  const cropType = activeZone.cropType || 'Tomato';
  const acreage = activeZone.agronomy?.acreage || 0.25;

  // Run the 5 transparent agricultural prediction models
  const soilMoisturePred = useMemo(() => {
    return predictSoilMoisture({
      history,
      currentMoisture: currentSensor.soilMoisture,
      currentTemp: currentSensor.airTemperature || 28,
      forecastRainMm: 0,
      cropType,
      language
    });
  }, [history, currentSensor.soilMoisture, currentSensor.airTemperature, cropType, language]);

  const tempStressPred = useMemo(() => {
    return predictTemperatureStress({
      currentTemp: currentSensor.airTemperature,
      cropType,
      language
    });
  }, [currentSensor.airTemperature, cropType, language]);

  const irrigationPred = useMemo(() => {
    return predictIrrigationRequirement({
      soilMoisture: currentSensor.soilMoisture,
      currentTemp: currentSensor.airTemperature || 28,
      forecastRainMm: 0,
      cropType,
      acreage,
      language
    });
  }, [currentSensor.soilMoisture, currentSensor.airTemperature, cropType, acreage, language]);

  const cropHealthRisk = useMemo(() => {
    return analyzeCropHealthRisk({
      soilMoisture: currentSensor.soilMoisture,
      currentTemp: currentSensor.airTemperature,
      humidity: currentSensor.humidity,
      cropType,
      language
    });
  }, [currentSensor.soilMoisture, currentSensor.airTemperature, currentSensor.humidity, cropType, language]);

  const rainfallAnalysis = useMemo(() => {
    return analyzeRainfallSavings({
      forecastRainMm: 0,
      acreage,
      language
    });
  }, [acreage, language]);

  // Farmer-friendly Q&A computed from current conditions
  const farmerQA = [
    {
      q: isTe ? 'పంటకు నీరు ఎందుకు అవసరం?' : 'Why is irrigation needed?',
      a: currentSensor.soilMoisture <= 35
        ? (isTe 
            ? `మట్టి తేమ ప్రస్తుతం ${currentSensor.soilMoisture?.toFixed(1) || 'తక్కువ'}% వద్ద ఉంది. ఇది క్లిష్టమైన పరిమితి కంటే తక్కువ. మొక్కల వేర్లు ఎండిపోకుండా ఉండటానికి నీరు అవసరం.` 
            : `Soil moisture is at ${currentSensor.soilMoisture?.toFixed(1) || 'low'}%, which is below the root comfort threshold. Irrigation replenishes root-zone moisture to maintain healthy transpiration.`)
        : (isTe 
            ? `ప్రస్తుతం మట్టిలో సరిపడా తేమ ఉంది (${currentSensor.soilMoisture?.toFixed(1) || 'సాధారణం'}%). మొక్కకు తగినంత తేమ లభిస్తున్నందున తక్షణ నీటి అవసరం లేదు.` 
            : `Soil moisture is currently balanced (${currentSensor.soilMoisture?.toFixed(1) || 'normal'}%). Plant roots have sufficient water reserves.`)
    },
    {
      q: isTe ? 'మట్టి బాగా ఆరిపోయిందా?' : 'Is the soil too dry?',
      a: currentSensor.soilMoisture <= 25
        ? (isTe ? 'అవును, మట్టి చాలా పొడిగా ఉంది. వేర్లు వాడిపోయే ప్రమాదం ఉంది.' : 'Yes, soil moisture is critically low. Root stress is active.')
        : (currentSensor.soilMoisture <= 38 
            ? (isTe ? 'మట్టి కొద్దిగా ఆరిపోయింది, త్వరలో నీరు పెట్టడం మంచిది.' : 'Soil is drying out; an irrigation cycle should be scheduled soon.')
            : (isTe ? 'లేదు, మట్టిలో తగినంత తేమ నిల్వ ఉంది.' : 'No, soil moisture is within the healthy optimal range.'))
    },
    {
      q: isTe ? 'ఎండ వేడిమి ఎక్కువగా ఉందా?' : 'Is temperature too high?',
      a: (currentSensor.airTemperature || 28) >= 35
        ? (isTe ? `అవును, ఉష్ణోగ్రత (${currentSensor.airTemperature?.toFixed(1)}°C) ఎక్కువగా ఉంది. పూత రాలకుండా మధ్యాహ్న వేళల్లో జాగ్రత్తలు తీసుకోండి.` : `Yes, field temperature is elevated (${currentSensor.airTemperature?.toFixed(1)}°C). Thermal stress may accelerate evaporation.`)
        : (isTe ? `లేదు, ఉష్ణోగ్రత (${currentSensor.airTemperature?.toFixed(1) || '28'}°C) పంట పెరుగుదలకు అనుకూలంగా ఉంది.` : `No, ambient temperature (${currentSensor.airTemperature?.toFixed(1) || '28'}°C) is within safe agronomic limits.`)
    },
    {
      q: isTe ? 'రైతు ఇప్పుడు ఎలాంటి చర్య తీసుకోవాలి?' : 'What action should the farmer take right now?',
      a: currentSensor.soilMoisture <= 35
        ? (isTe ? 'తెల్లవారుజామున లేదా సాయంత్రం వేళల్లో బిందు సేద్యం (డ్రిప్) ద్వారా నీరు అందించండి.' : 'Prepare to irrigate during early morning or late evening hours via drip line.')
        : (isTe ? 'సాధారణ వ్యవసాయ పనులను కొనసాగించండి మరియు మట్టి తేమను పర్యవేక్షిస్తూ ఉండండి.' : 'Continue routine field monitoring. Check dripper nozzles and leaf canopy.')
    },
    {
      q: isTe ? 'తర్వాత దేనిని గమనించాలి?' : 'What should be monitored next?',
      a: isTe 
        ? 'సాయంత్రం నాటికి మట్టి తేమ ఎంతవరకు తగ్గుతుందో మరియు ఆకుల రంగులో ఏమైనా మార్పు ఉందో గమనించండి.' 
        : 'Monitor root-zone drying rate into the evening and watch for any signs of midday leaf curling.'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'రైతు సహాయక AI అంతర్దృష్టులు & అంచనాలు' : 'Farmer AI Insights & Agricultural Predictions'}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isTe ? 'పారదర్శక డేటా అంచనాలు' : 'Data-Driven Predictions'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isTe 
              ? 'మట్టి తేమ తగ్గుదల, ఎండ ప్రభావం మరియు నీటి అవసరాల ముందస్తు విశ్లేషణ' 
              : 'Actionable agricultural predictions for soil drying, heat stress, irrigation, and weather impact'}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveView('predictions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'predictions'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTe ? 'వ్యవసాయ అంచనాలు (5)' : 'Predictions (5)'}</span>
          </button>

          <button
            onClick={() => setActiveView('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'chat'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isTe ? 'AI చాట్‌బాట్' : 'AI Copilot Chat'}</span>
          </button>
        </div>
      </div>

      {/* Zone Selector for Predictions */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {isTe ? 'ప్లాట్ ఎంచుకోండి:' : 'Evaluate Plot:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {zones.map(z => (
            <button
              key={z.zoneId}
              onClick={() => setSelectedZoneId(z.zoneId)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedZoneId === z.zoneId
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {z.name} ({isTe ? (z.cropType === 'Tomato' ? 'టమోటా' : (z.cropType === 'Chili' ? 'మిర్చి' : (z.cropType === 'Paddy' ? 'వరి' : z.cropType))) : z.cropType})
            </button>
          ))}
        </div>
      </div>

      {activeView === 'predictions' ? (
        <div className="space-y-6">
          
          {/* Top 5 Agricultural Prediction Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Soil Moisture Prediction */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'మట్టి తేమ అంచనా' : 'Soil Moisture Prediction'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {soilMoisturePred.period}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    soilMoisturePred.status === 'WARNING' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {soilMoisturePred.hasSufficientData 
                      ? (soilMoisturePred.status === 'WARNING' ? (isTe ? 'నీరు అవసరం' : 'Drying Soon') : (isTe ? 'సాధారణం' : 'Optimal'))
                      : (isTe ? 'పరిమిత డేటా' : 'Insufficient Data')}
                  </span>
                </div>

                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {soilMoisturePred.predictedValue !== null ? `${soilMoisturePred.predictedValue}%` : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {isTe ? 'అంచనా తేమ (24 గంటలు)' : 'Projected in 24h'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {soilMoisturePred.explanation}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>{isTe ? 'పద్ధతి:' : 'Method:'}</span>
                  <span className="font-semibold text-slate-700">{soilMoisturePred.method}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-medium">
                  💡 {soilMoisturePred.actionableAdvice}
                </div>
              </div>
            </div>

            {/* 2. Temperature Stress Prediction */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'ఉష్ణోగ్రత & ఎండ ప్రభావం' : 'Temperature & Heat Stress'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tempStressPred.period}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tempStressPred.status === 'CRITICAL' 
                      ? 'bg-rose-100 text-rose-800' 
                      : (tempStressPred.status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                  }`}>
                    {tempStressPred.status}
                  </span>
                </div>

                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {tempStressPred.predictedValue !== null ? `${tempStressPred.predictedValue}°C` : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {isTe ? 'అంచనా గరిష్ట ఉష్ణోగ్రత' : 'Peak Daytime Temp'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {tempStressPred.explanation}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>{isTe ? 'పద్ధతి:' : 'Method:'}</span>
                  <span className="font-semibold text-slate-700">{tempStressPred.method}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-900 font-medium">
                  ☀️ {tempStressPred.actionableAdvice}
                </div>
              </div>
            </div>

            {/* 3. Irrigation Water Budgeting */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'సిఫార్సు చేసిన నీటి పరిమాణం' : 'Recommended Irrigation Volume'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isTe ? 'రోజువారీ బడ్జెట్' : 'Daily Water Budget'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    irrigationPred.status === 'IRRIGATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {irrigationPred.status}
                  </span>
                </div>

                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      ~{irrigationPred.recommendedVolumeLiters.toLocaleString('en-IN')} L
                    </span>
                    <span className="text-xs text-slate-500">
                      ({irrigationPred.cropWaterRequirementMm} mm / {acreage} ac)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {irrigationPred.explanation}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>{isTe ? 'సమయం:' : 'Timing:'}</span>
                  <span className="font-semibold text-slate-700">{irrigationPred.recommendedTimeWindow}</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900 font-medium">
                  ⏰ {irrigationPred.actionableAdvice}
                </div>
              </div>
            </div>

            {/* 4. Crop Health Stress Analysis */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'పంట ఆరోగ్య విశ్లేషణ' : 'Crop Health Stress Analysis'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isTe ? 'బయోమెట్రిక్ మూల్యాంకనం' : 'Biometric Evaluation'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cropHealthRisk.riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {cropHealthRisk.riskLevel}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cropHealthRisk.summary}
                  </p>
                  {cropHealthRisk.risks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {cropHealthRisk.risks.map((r, i) => (
                        <div key={i} className="text-[11px] p-1.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          <strong>{r.title}:</strong> {r.desc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                🌱 <strong>{isTe ? 'తదుపరి చర్య:' : 'Next Action:'}</strong> {cropHealthRisk.nextAction}
              </div>
            </div>

            {/* 5. Rainfall Analysis & Water Savings */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                      <CloudRain className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'వర్షపాతం & నీటి పొదుపు' : 'Rainfall & Water Savings'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isTe ? 'వాతావరణ సూచన ఆధారంగా' : 'NWP Weather Model'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {rainfallAnalysis.forecastRainMm} mm
                    </span>
                    <span className="text-xs text-slate-500">
                      {isTe ? 'అంచనా వర్షం' : 'Forecast Precipitation'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {rainfallAnalysis.explanation}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                💰 {rainfallAnalysis.actionableAdvice}
              </div>
            </div>

          </div>

          {/* Farmer-Friendly Direct Action Q&A Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isTe ? 'రైతు ప్రశ్నలు & ప్రత్యక్ష సమాధానాలు' : 'Direct Action Q&A for Farmers'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isTe ? 'సాధారణ భాషలో వ్యవసాయ నిర్ణయాలు మరియు సలహాలు' : 'Simple, actionable guidance without complex terminology'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {farmerQA.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[10px]">
                      Q{idx + 1}
                    </span>
                    <span>{item.q}</span>
                  </div>
                  <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* AI Copilot Chat */
        <ErrorBoundary title="AI Agronomist Copilot Chat">
          <AIAgronomistChat />
        </ErrorBoundary>
      )}

    </div>
  );
}
