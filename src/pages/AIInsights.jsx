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
  HelpCircle,
  Check
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
  const { zones, history, language, operatingMode, hardwareData, simulationData } = useFarmData();
  const isTe = language === 'te';

  const [activeView, setActiveView] = useState('chat');
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-A');

  const activeZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0] || {};
  const currentSensor = activeZone.sensorData || {};
  const cropType = activeZone.cropType || 'Tomato';
  const acreage = activeZone.agronomy?.acreage || 0.25;

  const currentMoist = operatingMode === 'live_hardware' ? hardwareData?.soilMoisture : (currentSensor.soilMoisture || 48);
  const currentTemp = operatingMode === 'live_hardware' ? hardwareData?.temperature : (currentSensor.airTemperature || 28);
  const currentHum = operatingMode === 'live_hardware' ? hardwareData?.humidity : (currentSensor.humidity || 65);

  // Short, concise actionable recommendations per Section 7
  const actionableRecommendations = useMemo(() => {
    const recs = [];

    // 1. Soil Moisture Recommendation
    if (typeof currentMoist === 'number') {
      if (currentMoist < 35) {
        recs.push({
          type: 'warning',
          icon: Droplets,
          text: isTe ? 'మట్టి తేమ తక్కువగా ఉంది. నీటి పారుదల సిఫార్సు చేయబడింది.' : 'Soil moisture is low. Irrigation recommended.'
        });
      } else if (currentMoist > 75) {
        recs.push({
          type: 'info',
          icon: Droplets,
          text: isTe ? 'మట్టి తేమ ఎక్కువగా ఉంది. నీరు పెట్టడం వాయిదా వేయండి.' : 'Soil moisture is high. Suspend irrigation to prevent root rot.'
        });
      } else {
        recs.push({
          type: 'success',
          icon: CheckCircle2,
          text: isTe ? 'మట్టి తేమ అనుకూల పరిధిలో ఉంది. నీరు అవసరం లేదు.' : 'Soil moisture is in the optimal range. No irrigation needed.'
        });
      }
    }

    // 2. Temperature Recommendation
    if (typeof currentTemp === 'number') {
      if (currentTemp > 32) {
        recs.push({
          type: 'warning',
          icon: Thermometer,
          text: isTe ? 'ఉష్ణోగ్రత సాధారణ పరిధి కంటే ఎక్కువగా ఉంది. పంట వేడిమి ఒత్తిడిని నివారించండి.' : 'Temperature is above the preferred range. Ensure hydration during peak sun.'
        });
      } else if (currentTemp < 18) {
        recs.push({
          type: 'info',
          icon: Thermometer,
          text: isTe ? 'ఉష్ణోగ్రత తక్కువగా ఉంది. మొక్కల ఎదుగుదల నెమ్మదించవచ్చు.' : 'Temperature is below optimal crop growth threshold.'
        });
      } else {
        recs.push({
          type: 'success',
          icon: CheckCircle2,
          text: isTe ? 'ఉష్ణోగ్రత పంట ఎదుగుదలకు పూర్తి అనుకూలంగా ఉంది.' : 'Temperature is within preferred agronomic limits.'
        });
      }
    }

    // 3. Rain / Weather Recommendation
    recs.push({
      type: 'info',
      icon: CloudRain,
      text: isTe ? 'వాతావరణం పొడిగా ఉంది. సాధారణ షెడ్యూల్ ప్రకారం కొనసాగించండి.' : 'Dry weather expected. Continue regular field monitoring.'
    });

    return recs;
  }, [currentMoist, currentTemp, isTe]);

  // Run transparent agricultural prediction models
  const soilMoisturePred = useMemo(() => {
    return predictSoilMoisture({
      history,
      currentMoisture: currentMoist,
      currentTemp: currentTemp,
      forecastRainMm: 0,
      cropType,
      language
    });
  }, [history, currentMoist, currentTemp, cropType, language]);

  const tempStressPred = useMemo(() => {
    return predictTemperatureStress({
      currentTemp,
      cropType,
      language
    });
  }, [currentTemp, cropType, language]);

  const irrigationPred = useMemo(() => {
    return predictIrrigationRequirement({
      soilMoisture: currentMoist,
      currentTemp,
      forecastRainMm: 0,
      cropType,
      acreage,
      language
    });
  }, [currentMoist, currentTemp, cropType, acreage, language]);

  const cropHealthRisk = useMemo(() => {
    return analyzeCropHealthRisk({
      soilMoisture: currentMoist,
      currentTemp,
      humidity: currentHum,
      cropType,
      language
    });
  }, [currentMoist, currentTemp, currentHum, cropType, language]);

  const rainfallAnalysis = useMemo(() => {
    return analyzeRainfallSavings({
      forecastRainMm: 0,
      acreage,
      language
    });
  }, [acreage, language]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'రైతు సహాయక AI అంతర్దృష్టులు' : 'Farmer AI Insights & Recommendations'}
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isTe ? 'ఖచ్చితమైన వ్యవసాయం' : 'Actionable Agronomy'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isTe 
              ? 'స్పష్టమైన, సంక్షిప్తమైన వ్యవసాయ సలహాలు మరియు నీటి పారుదల అంచనాలు' 
              : 'Concise, practical recommendations for irrigation, heat stress, and crop protection'}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveView('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'chat'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isTe ? 'Farm AI సహాయకుడు' : 'Farm AI Assistant'}</span>
          </button>

          <button
            onClick={() => setActiveView('predictions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeView === 'predictions'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTe ? 'అంచనాలు & సిఫార్సులు' : 'Agro Predictions'}</span>
          </button>
        </div>
      </div>

      {activeView === 'predictions' ? (
        <div className="space-y-6">

          {/* ======================================================== */}
          {/* 1. SHORT ACTIONABLE RECOMMENDATIONS (SECTION 7 REQUIREMENT) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{isTe ? 'తక్షణ చర్యల సిఫార్సులు' : 'Actionable Farm Recommendations'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actionableRecommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                    rec.type === 'warning' 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
                      : (rec.type === 'success' 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                          : 'bg-blue-50/70 border-blue-200 text-blue-950')
                  }`}
                >
                  <rec.icon className={`w-4 h-4 shrink-0 mt-0.5 ${
                    rec.type === 'warning' ? 'text-amber-600' : (rec.type === 'success' ? 'text-emerald-600' : 'text-blue-600')
                  }`} />
                  <p className="text-xs font-semibold leading-relaxed">
                    {rec.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. AGRO-PREDICTION SUMMARY CARDS                        */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Soil Moisture Prediction */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
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
                        {isTe ? 'రాబోయే 24 గంటలు' : 'Next 24h'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {soilMoisturePred.status === 'WARNING' ? (isTe ? 'నీరు అవసరం' : 'Low') : (isTe ? 'అనుకూలం' : 'Optimal')}
                  </span>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {soilMoisturePred.predictedValue !== null ? `${soilMoisturePred.predictedValue}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {soilMoisturePred.actionableAdvice}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                {isTe ? 'పర్యవేక్షణ:' : 'Target:'} 45–70%
              </div>
            </div>

            {/* 2. Temperature Stress */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'ఉష్ణోగ్రత ఒత్తిడి' : 'Temperature Stress'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isTe ? 'పగటి గరిష్ట' : 'Peak Daytime'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {tempStressPred.status}
                  </span>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {tempStressPred.predictedValue !== null ? `${tempStressPred.predictedValue}°C` : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {tempStressPred.actionableAdvice}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                {isTe ? 'పరిమితి:' : 'Target:'} 22–32°C
              </div>
            </div>

            {/* 3. Irrigation Water Volume */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {isTe ? 'నీటి అవసరం' : 'Irrigation Volume'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {acreage} {isTe ? 'ఎకరాలు' : 'Acres'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {irrigationPred.status}
                  </span>
                </div>

                <div className="my-3">
                  <div className="text-2xl font-black font-mono text-slate-900">
                    ~{irrigationPred.recommendedVolumeLiters.toLocaleString('en-IN')} L
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {irrigationPred.actionableAdvice}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                {isTe ? 'సమయం:' : 'Timing:'} {irrigationPred.recommendedTimeWindow}
              </div>
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
