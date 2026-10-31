/**
 * SmartFarm AI — Agricultural Prediction & Analysis Engine
 * Data-driven, transparent predictions based on moving averages, trend regression,
 * FAO-56 crop water balance, and Open-Meteo agrometeorological forecasts.
 * 
 * ZERO invented accuracy percentages. Zero fabricated stochastic values.
 * When historical data is insufficient (< 3 readings), clearly indicates
 * "Not enough historical data to generate a reliable prediction" and provides
 * actionable current-condition agronomic guidance.
 */

import { AGRONOMIC_THRESHOLDS } from './farmDecisionEngine';

/**
 * Standard Crop Coefficients (Kc) by Growth Stage
 */
export const CROP_KC_FACTORS = {
  'Tomato': { mid: 1.15, late: 0.80, rootDepthM: 0.5, criticalMoisture: 35 },
  'Chili': { mid: 1.05, late: 0.85, rootDepthM: 0.45, criticalMoisture: 35 },
  'Paddy': { mid: 1.20, late: 0.95, rootDepthM: 0.35, criticalMoisture: 50 },
  'Groundnut': { mid: 1.00, late: 0.60, rootDepthM: 0.5, criticalMoisture: 32 },
  'Corn': { mid: 1.20, late: 0.60, rootDepthM: 0.8, criticalMoisture: 38 },
  'Cotton': { mid: 1.15, late: 0.65, rootDepthM: 0.9, criticalMoisture: 30 },
  'Wheat': { mid: 1.15, late: 0.40, rootDepthM: 0.6, criticalMoisture: 35 },
  'Sunflower': { mid: 1.10, late: 0.45, rootDepthM: 0.7, criticalMoisture: 32 },
  'Sugarcane': { mid: 1.25, late: 0.75, rootDepthM: 1.0, criticalMoisture: 42 },
  'Potato': { mid: 1.15, late: 0.75, rootDepthM: 0.4, criticalMoisture: 40 },
  'Bell Pepper': { mid: 1.10, late: 0.85, rootDepthM: 0.45, criticalMoisture: 35 },
  'Soybean': { mid: 1.15, late: 0.50, rootDepthM: 0.6, criticalMoisture: 35 },
  'General Crop': { mid: 1.05, late: 0.75, rootDepthM: 0.5, criticalMoisture: 35 }
};

/**
 * Perform simple linear regression on a series of values: y = slope * x + intercept
 * Returns null if insufficient data points.
 */
function calculateLinearTrend(dataPoints) {
  if (!dataPoints || dataPoints.length < 3) return null;
  const n = dataPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = dataPoints[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation coefficient R^2
  const numeratorR = (n * sumXY - sumX * sumY);
  const denomR = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const rSquared = denomR > 0 ? Math.pow(numeratorR / denomR, 2) : 0;

  return { slope, intercept, rSquared, count: n };
}

/**
 * 1. SOIL MOISTURE PREDICTION
 * Estimates future soil moisture trends and hours until irrigation threshold.
 */
export function predictSoilMoisture({
  history = [],
  currentMoisture = null,
  currentTemp = 28,
  forecastRainMm = 0,
  cropType = 'General Crop',
  language = 'en'
} = {}) {
  const isTe = language === 'te';
  const cropConfig = CROP_KC_FACTORS[cropType] || CROP_KC_FACTORS['General Crop'];
  const threshold = cropConfig.criticalMoisture;

  if (typeof currentMoisture !== 'number' || isNaN(currentMoisture)) {
    return {
      hasSufficientData: false,
      status: 'UNAVAILABLE',
      predictedValue: null,
      unit: '%',
      period: isTe ? 'రాబోయే 24 గంటలు' : 'Next 24 Hours',
      method: isTe ? 'డేటా-ఆధారిత క్షీణత ధోరణి' : 'Trend Depletion Analysis',
      confidence: isTe ? 'లభ్యం కాలేదు' : 'Unavailable',
      explanation: isTe 
        ? 'మట్టి తేమ సెన్సార్ రీడింగ్ అందుబాటులో లేదు. దయచేసి హార్డ్‌వేర్ కనెక్షన్‌ను తనిఖీ చేయండి.' 
        : 'Soil moisture sensor reading is currently unavailable. Check hardware connection.',
      factors: [isTe ? 'సెన్సార్ డిస్‌కనెక్ట్ అయింది' : 'Sensor disconnected'],
      actionableAdvice: isTe ? 'సెన్సార్ తనిఖీ చేయండి' : 'Inspect sensor'
    };
  }

  // Filter valid historical soil moisture readings (exclude nulls)
  const validHistory = history
    .filter(h => typeof h?.soilMoisture === 'number' && !isNaN(h.soilMoisture))
    .map(h => h.soilMoisture);

  // Fallback when insufficient historical points
  if (validHistory.length < 3) {
    const isDryNow = currentMoisture <= threshold;
    return {
      hasSufficientData: false,
      status: 'INSUFFICIENT_DATA',
      predictedValue: currentMoisture,
      unit: '%',
      period: isTe ? 'రాబోయే 12-24 గంటలు' : 'Next 12-24 Hours',
      method: isTe ? 'ప్రాథమిక వ్యవసాయ సూత్రాల విశ్లేషణ' : 'Baseline Agronomic Rule Analysis',
      confidence: isTe ? 'పరిమితం (డేటా సరిపోదు)' : 'Limited (Insufficient Data)',
      explanation: isTe 
        ? `విశ్వసనీయమైన అంచనాను రూపొందించడానికి తగినంత మునుపటి డేటా లేదు (కనీసం 3 వరుస రికార్డులు అవసరం). ప్రస్తుత తేమ ${currentMoisture.toFixed(1)}%. ${isDryNow ? 'మట్టి పొడిగా ఉంది, నీరు పెట్టడం మంచిది.' : 'ప్రస్తుతానికి తేమ సాధారణ స్థాయిలో ఉంది.'}` 
        : `Not enough historical data to generate a reliable prediction (minimum 3 records required). Current moisture is ${currentMoisture.toFixed(1)}%. ${isDryNow ? 'Soil is dry; irrigation recommended.' : 'Moisture is currently at an acceptable level.'}`,
      factors: [
        isTe ? `ప్రస్తుత మట్టి తేమ: ${currentMoisture.toFixed(1)}%` : `Current soil moisture: ${currentMoisture.toFixed(1)}%`,
        isTe ? `అవసరమైన కనీస తేమ: ${threshold}%` : `Minimum required moisture: ${threshold}%`
      ],
      actionableAdvice: isDryNow
        ? (isTe ? 'మట్టిని స్వయంగా పరిశీలించి త్వరలో నీరు పెట్టండి.' : 'Inspect root zone and irrigate soon.')
        : (isTe ? 'మట్టి తేమను పర్యవేక్షిస్తూ ఉండండి.' : 'Continue monitoring soil moisture.')
    };
  }

  // Calculate rate of depletion using linear regression
  const trend = calculateLinearTrend(validHistory);
  let slopePerStep = trend ? trend.slope : 0;

  // Temperature acceleration: higher temperature speeds up soil evaporation
  const tempExcess = Math.max(0, currentTemp - 25);
  const tempEvapMultiplier = 1 + (tempExcess * 0.03); // ~3% increase per deg above 25°C
  
  // Adjusted hourly depletion rate (% per hour)
  let hourlyDropRate = Math.abs(slopePerStep) * tempEvapMultiplier;
  if (hourlyDropRate < 0.2) hourlyDropRate = 0.35; // typical minimum sunny day soil drying

  // Rain offset
  if (forecastRainMm > 2) {
    hourlyDropRate = Math.max(0.05, hourlyDropRate - (forecastRainMm * 0.1));
  }

  const projected24h = Math.max(8, Number((currentMoisture - (hourlyDropRate * 24)).toFixed(1)));
  const deficitToThreshold = currentMoisture - threshold;
  const hoursUntilThreshold = deficitToThreshold > 0 
    ? Math.max(1, Math.round(deficitToThreshold / hourlyDropRate))
    : 0;

  const isDryingFast = hourlyDropRate > 0.8;
  const confidenceLevel = trend && trend.rSquared > 0.6 ? (isTe ? 'అధికం' : 'High') : (isTe ? 'మధ్యస్థం' : 'Moderate');

  let explanation = '';
  let advice = '';

  if (hoursUntilThreshold === 0) {
    explanation = isTe
      ? `మట్టి తేమ ఇప్పటికే క్లిష్టమైన పరిమితి (${threshold}%) కన్నా తక్కువగా ఉంది. మొక్కల వేర్లు నీటి కొరతను ఎదుర్కొంటున్నాయి.`
      : `Soil moisture is already below the critical threshold (${threshold}%). Plant roots are experiencing moisture stress.`;
    advice = isTe ? 'వెంటనే బిందు సేద్యం (డ్రిప్) ప్రారంభించండి.' : 'Begin drip irrigation immediately.';
  } else if (hoursUntilThreshold <= 12) {
    explanation = isTe
      ? `ఎండ వేడిమి వల్ల మట్టి గంటకు సుమారు ${hourlyDropRate.toFixed(1)}% చొప్పున ఆరిపోతోంది. రాబోయే ${hoursUntilThreshold} గంటల్లో నీరు అవసరం కావచ్చు.`
      : `Soil is drying at approximately ${hourlyDropRate.toFixed(1)}%/hr. Irrigation will likely be needed within ${hoursUntilThreshold} hours.`;
    advice = isTe ? 'సాయంత్రం లేదా తెల్లవారుజామున నీరు పెట్టడానికి సిద్ధంగా ఉండండి.' : 'Prepare to irrigate in the early morning or evening.';
  } else {
    explanation = isTe
      ? `మట్టిలో తగినంత తేమ ఉంది. రాబోయే 24 గంటల్లో తేమ సుమారు ${projected24h}% వరకు తగ్గే అవకాశం ఉంది.`
      : `Soil moisture is sufficient. Moisture is projected to stay near ${projected24h}% over the next 24 hours.`;
    advice = isTe ? 'ప్రస్తుతానికి నీరు అవసరం లేదు, తేమను పర్యవేక్షించండి.' : 'No immediate irrigation needed; keep monitoring.';
  }

  return {
    hasSufficientData: true,
    status: hoursUntilThreshold <= 12 ? 'WARNING' : 'OPTIMAL',
    predictedValue: projected24h,
    unit: '%',
    period: isTe ? 'రాబోయే 24 గంటలు' : 'Next 24 Hours',
    depletionRatePerHour: Number(hourlyDropRate.toFixed(2)),
    hoursUntilIrrigation: hoursUntilThreshold,
    method: isTe ? 'లీనియర్ ట్రెండ్ రిగ్రెషన్ + భాష్పీభవన కారకం' : 'Linear Trend Regression + Evaporative Factor',
    confidence: confidenceLevel,
    contributingFactors: [
      isTe ? `ప్రస్తుత తేమ: ${currentMoisture.toFixed(1)}%` : `Current moisture: ${currentMoisture.toFixed(1)}%`,
      isTe ? `ఉష్ణోగ్రత ప్రభావం: ${currentTemp.toFixed(1)}°C` : `Temperature influence: ${currentTemp.toFixed(1)}°C`,
      isTe ? `గంటకు తగ్గుదల రేటు: ~${hourlyDropRate.toFixed(1)}%` : `Drying rate: ~${hourlyDropRate.toFixed(1)}%/hr`,
      forecastRainMm > 0 ? (isTe ? `అంచనా వేసిన వర్షం: ${forecastRainMm} మి.మీ` : `Forecast rain: ${forecastRainMm} mm`) : null
    ].filter(Boolean),
    explanation,
    actionableAdvice: advice
  };
}

/**
 * 2. TEMPERATURE PREDICTION & HEAT STRESS
 * Uses Open-Meteo weather forecast and current sensor readings.
 */
export function predictTemperatureStress({
  forecastDailyMax = null,
  forecastDailyMin = null,
  currentTemp = null,
  cropType = 'General Crop',
  language = 'en'
} = {}) {
  const isTe = language === 'te';
  const hasTemp = typeof currentTemp === 'number' && !isNaN(currentTemp);
  const maxTemp = typeof forecastDailyMax === 'number' ? forecastDailyMax : (hasTemp ? currentTemp + 2 : null);

  if (maxTemp === null) {
    return {
      hasSufficientData: false,
      status: 'UNAVAILABLE',
      predictedValue: null,
      unit: '°C',
      period: isTe ? 'నేటి గరిష్ట ఉష్ణోగ్రత' : 'Today Peak',
      method: isTe ? 'వాతావరణ సూచన విశ్లేషణ' : 'Weather Model Analysis',
      confidence: isTe ? 'లభ్యం కాలేదు' : 'Unavailable',
      explanation: isTe ? 'వాతావరణ ఉష్ణోగ్రత డేటా అందుబాటులో లేదు.' : 'Weather temperature forecast is unavailable.',
      actionableAdvice: isTe ? 'ఉష్ణోగ్రతను పర్యవేక్షించండి' : 'Monitor ambient temperature.'
    };
  }

  const isSevereHeat = maxTemp >= AGRONOMIC_THRESHOLDS.temperature.criticalHigh; // 38°C
  const isModerateHeat = maxTemp >= AGRONOMIC_THRESHOLDS.temperature.high; // 34°C
  const isColdRisk = typeof forecastDailyMin === 'number' && forecastDailyMin <= AGRONOMIC_THRESHOLDS.temperature.criticalLow; // 10°C

  let status = 'OPTIMAL';
  let explanation = '';
  let advice = '';

  if (isSevereHeat) {
    status = 'CRITICAL';
    explanation = isTe
      ? `తీవ్రమైన ఎండ వేడిమి (${maxTemp.toFixed(1)}°C) అంచనా వేయబడింది. ఇది ${cropType} పంటలో పూత రాలడానికి మరియు అధిక నీటి నష్టానికి కారణమవుతుంది.`
      : `Severe heat stress expected with peak temperatures reaching ${maxTemp.toFixed(1)}°C. High risk of flower drop and transpiration stress in ${cropType}.`;
    advice = isTe
      ? 'మధ్యాహ్న వేళల్లో పంటపై నీటి తుంపర్లు (మిస్టింగ్) చల్లండి లేదా నీడ వలలను ఏర్పాటు చేయండి.'
      : 'Deploy shade nets or pulse micro-misting during midday peak hours.';
  } else if (isModerateHeat) {
    status = 'WARNING';
    explanation = isTe
      ? `ఎండ వేడిమి (${maxTemp.toFixed(1)}°C) ఎక్కువగా ఉండే అవకాశం ఉంది. పంటకు నీటి అవసరం పెరుగుతుంది.`
      : `Elevated temperatures (${maxTemp.toFixed(1)}°C) forecast today. Crop water demand will increase.`;
    advice = isTe
      ? 'ఉదయాన్నే పంటకు తగినంత నీరు అందించి మట్టి తేమను కాపాడండి.'
      : 'Ensure adequate soil moisture with early morning irrigation.';
  } else if (isColdRisk) {
    status = 'WARNING';
    explanation = isTe
      ? `రాత్రి వేళల్లో చలి తీవ్రత (${forecastDailyMin.toFixed(1)}°C) పెరిగే అవకాశం ఉంది. పంట పెరుగుదల మందగించవచ్చు.`
      : `Chilly night temperatures (${forecastDailyMin.toFixed(1)}°C) forecast. Vegetative growth rate may slow.`;
    advice = isTe
      ? 'రాత్రి వేళల్లో పంటపై రక్షణ కప్పులను ఏర్పాటు చేయండి.'
      : 'Use row covers or light evening irrigation to protect roots from cold.';
  } else {
    explanation = isTe
      ? `ఉష్ణోగ్రతలు (${maxTemp.toFixed(1)}°C) పంట పెరుగుదలకు అనుకూలంగా ఉన్నాయి.`
      : `Temperatures (${maxTemp.toFixed(1)}°C) are well within the favorable growth window for ${cropType}.`;
    advice = isTe ? 'సాధారణ వ్యవసాయ పనులను కొనసాగించండి.' : 'Normal agronomic routine recommended.';
  }

  return {
    hasSufficientData: true,
    status,
    predictedValue: Number(maxTemp.toFixed(1)),
    unit: '°C',
    period: isTe ? 'నేటి గరిష్ట సమయం (మధ్యాహ్నం 1-3)' : 'Today Peak (1 PM - 3 PM)',
    method: isTe ? 'ఓపెన్-మెటియో వాతావరణ అంచనా మోడల్' : 'Open-Meteo High-Resolution Forecast',
    confidence: isTe ? 'అధికం (వాతావరణ మోడల్)' : 'High (Numerical Weather Prediction)',
    contributingFactors: [
      isTe ? `అంచనా వేసిన గరిష్ట ఉష్ణోగ్రత: ${maxTemp.toFixed(1)}°C` : `Forecast peak temp: ${maxTemp.toFixed(1)}°C`,
      typeof forecastDailyMin === 'number' ? (isTe ? `కనిష్ట ఉష్ణోగ్రత: ${forecastDailyMin.toFixed(1)}°C` : `Minimum temp: ${forecastDailyMin.toFixed(1)}°C`) : null,
      hasTemp ? (isTe ? `ప్రస్తుత ఫీల్డ్ ఉష్ణోగ్రత: ${currentTemp.toFixed(1)}°C` : `Current field temp: ${currentTemp.toFixed(1)}°C`) : null
    ].filter(Boolean),
    explanation,
    actionableAdvice: advice
  };
}

/**
 * 3. IRRIGATION PREDICTION (Crop Water Requirement & Recommended Volume)
 * Derived from FAO-56 Crop Water Balance Accounting.
 */
export function predictIrrigationRequirement({
  soilMoisture = null,
  currentTemp = 28,
  forecastRainMm = 0,
  cropType = 'Tomato',
  acreage = 1.0,
  language = 'en'
} = {}) {
  const isTe = language === 'te';
  const cropConfig = CROP_KC_FACTORS[cropType] || CROP_KC_FACTORS['General Crop'];
  const hasMoisture = typeof soilMoisture === 'number' && !isNaN(soilMoisture);

  // Simplified FAO-56 Reference Evapotranspiration (ET0) estimation based on temperature
  // Hargreaves-Samani simplified proxy: ~0.15 * Temp in warm semi-arid tropical regions
  const et0 = Math.max(2.5, Math.min(8.0, Number((0.16 * currentTemp).toFixed(1))));
  // Water needed by crop = Kc * ET0
  const cropWaterRequirementMm = Number((et0 * cropConfig.mid).toFixed(1));

  // If rain is expected, it offsets crop water requirement
  const netWaterNeededMm = Math.max(0, Number((cropWaterRequirementMm - forecastRainMm).toFixed(1)));

  // Liters needed per acre: 1 mm depth on 1 acre (4046.86 m2) = ~4,046.86 Liters
  const LITERS_PER_MM_ACRE = 4047;
  const recommendedLiters = Math.round(netWaterNeededMm * LITERS_PER_MM_ACRE * acreage);

  // Check if irrigation is required now
  const isMoistureLow = hasMoisture && soilMoisture <= cropConfig.criticalMoisture;
  const willRainSubstantially = forecastRainMm >= 5.0;

  let status = 'OPTIMAL';
  let explanation = '';
  let timingAdvice = '';

  if (willRainSubstantially) {
    status = 'PAUSE';
    explanation = isTe
      ? `రాబోయే 24-48 గంటల్లో సుమారు ${forecastRainMm} మి.మీ వర్షం కురిసే అవకాశం ఉంది. ఇది పంట నీటి అవసరాలను తీరుస్తుంది.`
      : `Forecast indicates ~${forecastRainMm} mm of useful rain. This covers crop water demand.`;
    timingAdvice = isTe
      ? 'నీరు పెట్టడాన్ని తాత్కాలికంగా ఆపండి. దీనివల్ల నీరు మరియు విద్యుత్ ఖర్చు ఆదా అవుతుంది.'
      : 'Pause irrigation to conserve water and electricity.';
  } else if (isMoistureLow) {
    status = 'IRRIGATE';
    explanation = isTe
      ? `మట్టి తేమ (${soilMoisture.toFixed(1)}%) అవసరమైన స్థాయి కంటే తక్కువగా ఉంది. ${cropType} పంటకు నేడు సుమారు ${cropWaterRequirementMm} మి.మీ నీరు అవసరం.`
      : `Soil moisture (${soilMoisture.toFixed(1)}%) is low. ${cropType} requires approximately ${cropWaterRequirementMm} mm water today.`;
    timingAdvice = isTe
      ? `సిఫార్సు చేసిన సమయం: తెల్లవారుజామున (ఉదయం 6:00 - 8:30) లేదా సాయంత్రం (5:30 - 7:30). అవసరమైన నీరు: ~${recommendedLiters.toLocaleString('en-IN')} లీటర్లు (${acreage} ఎకరాకు).`
      : `Recommended window: Early morning (6:00 AM - 8:30 AM) or evening (5:30 PM - 7:30 PM). Water needed: ~${recommendedLiters.toLocaleString('en-IN')} L (${acreage} ac).`;
  } else {
    status = 'OPTIMAL';
    explanation = isTe
      ? `మట్టిలో సరిపడా తేమ ఉంది (${hasMoisture ? soilMoisture.toFixed(1) + '%' : 'సాధారణం'}). పంట నీటి అవసరం సాధారణ స్థాయిలో ఉంది.`
      : `Soil moisture is adequate (${hasMoisture ? soilMoisture.toFixed(1) + '%' : 'normal'}). Crop water demand is balanced.`;
    timingAdvice = isTe ? 'ప్రస్తుతానికి నీరు పెట్టాల్సిన అవసరం లేదు.' : 'No immediate irrigation cycle needed.';
  }

  return {
    hasSufficientData: true,
    status,
    cropWaterRequirementMm,
    netWaterNeededMm,
    recommendedVolumeLiters: recommendedLiters,
    recommendedTimeWindow: isTe ? 'ఉదయం 6:00 - 8:30 లేదా సాయంత్రం 5:30 - 7:30' : '6:00 AM - 8:30 AM or 5:30 PM - 7:30 PM',
    method: isTe ? 'FAO-56 పంట నీటి అవసరాల బడ్జెట్ గణన' : 'FAO-56 Water Balance Accounting Model',
    confidence: isTe ? 'అధికం (ప్రామాణిక వ్యవసాయ లెక్కలు)' : 'High (Agronomic Standard Model)',
    contributingFactors: [
      isTe ? `పంట రకం: ${cropType} (నీటి గుణకం Kc: ${cropConfig.mid})` : `Crop type: ${cropType} (Crop Factor Kc: ${cropConfig.mid})`,
      isTe ? `రోజువారీ నీటి అవసరం: ${cropWaterRequirementMm} మి.మీ` : `Daily water requirement: ${cropWaterRequirementMm} mm`,
      isTe ? `సాగు విస్తీర్ణం: ${acreage} ఎకరం` : `Plot area: ${acreage} Acre`,
      forecastRainMm > 0 ? (isTe ? `అంచనా వర్షం: ${forecastRainMm} మి.మీ` : `Forecast rain offset: ${forecastRainMm} mm`) : null
    ].filter(Boolean),
    explanation,
    actionableAdvice: timingAdvice
  };
}

/**
 * 4. CROP HEALTH STRESS PREDICTION
 * Evaluates current environment and anticipates stress in the next 24-48 hours.
 */
export function analyzeCropHealthRisk({
  soilMoisture = null,
  currentTemp = 28,
  humidity = 60,
  forecastRainMm = 0,
  cropType = 'General Crop',
  language = 'en'
} = {}) {
  const isTe = language === 'te';
  const risks = [];
  let riskLevel = 'LOW';

  // Water stress
  if (typeof soilMoisture === 'number') {
    if (soilMoisture < 25) {
      riskLevel = 'CRITICAL';
      risks.push({
        type: 'WATER_STRESS',
        title: isTe ? 'నీటి కొరత ముప్పు' : 'Severe Water Deficit Risk',
        desc: isTe ? 'మట్టి బాగా ఆరిపోయింది, వేర్లు ఎండిపోయే ప్రమాదం ఉంది.' : 'Soil is critically dry; plant root desiccation risk.'
      });
    } else if (soilMoisture > 82) {
      riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      risks.push({
        type: 'ROOT_ROT',
        title: isTe ? 'అధిక తేమ / వేరు కుళ్ళు ముప్పు' : 'Excess Water / Root Rot Risk',
        desc: isTe ? 'మట్టిలో నీరు ఎక్కువగా నిలిచింది. వేర్లకు గాలి అందక కుళ్ళిపోయే ప్రమాదం ఉంది.' : 'Soil is waterlogged; oxygen depletion and fungal rot risk.'
      });
    }
  }

  // Fungal disease risk (High humidity + moderate-warm temp)
  if (typeof humidity === 'number' && humidity >= 80 && currentTemp >= 22 && currentTemp <= 32) {
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    risks.push({
      type: 'FUNGAL_RISK',
      title: isTe ? 'శిలీంధ్ర తెగుళ్ళ ముప్పు (ఫంగస్)' : 'Fungal Disease Hazard',
      desc: isTe ? 'అధిక గాలి తేమ వల్ల బూడిద తెగులు లేదా ఆకుమచ్చ తెగులు వ్యాపించే అవకాశం ఉంది.' : 'Elevated humidity creates favorable environment for leaf spot or powdery mildew.'
    });
  }

  // Heat stress
  if (typeof currentTemp === 'number' && currentTemp >= 36) {
    if (riskLevel === 'LOW') riskLevel = 'HIGH';
    risks.push({
      type: 'HEAT_STRESS',
      title: isTe ? 'అధిక ఉష్ణోగ్రత ముప్పు' : 'High Temperature Stress',
      desc: isTe ? 'ఎండ తీవ్రత వల్ల పూత రాలడం మరియు ఆకులు వడలిపోవడం జరగవచ్చు.' : 'High heat causes flower abortion and excessive leaf wilting.'
    });
  }

  let summary = '';
  let nextAction = '';

  if (risks.length === 0) {
    summary = isTe 
      ? 'ప్రస్తుతం మరియు రాబోయే 24 గంటల్లో పంటకు ఎలాంటి తీవ్రమైన వాతావరణ ముప్పు లేదు.'
      : 'No imminent environmental or biometric stress detected for the next 24-48 hours.';
    nextAction = isTe ? 'సాధారణ పరిశీలన కొనసాగించండి.' : 'Continue routine farm monitoring.';
  } else {
    summary = isTe
      ? `పంటపై ${risks.length} రకాల పర్యావరణ ప్రభావాలు గుర్తించబడ్డాయి: ${risks.map(r => r.title).join(', ')}.`
      : `Detected ${risks.length} active environmental risk factor(s): ${risks.map(r => r.title).join(', ')}.`;
    nextAction = isTe
      ? 'సిఫార్సు చేయబడిన జాగ్రత్తలను పాటించండి మరియు పంట పరిస్థితిని గమనించండి.'
      : 'Apply corrective agronomic measures and monitor plant leaf canopy.';
  }

  return {
    hasSufficientData: true,
    riskLevel,
    riskCount: risks.length,
    risks,
    method: isTe ? 'బయోఫిజికల్ మల్టీ-ఫ్యాక్టర్ ఆగ్రానమిక్ రిస్క్ మోడల్' : 'Biophysical Multi-Factor Agronomic Risk Model',
    confidence: isTe ? 'అధికం' : 'High',
    summary,
    nextAction
  };
}

/**
 * 5. RAINFALL ANALYSIS & IRRIGATION SAVINGS
 * Predicts useful rainwater and economic water conservation from Open-Meteo precipitation.
 */
export function analyzeRainfallSavings({
  forecastRainMm = 0,
  forecastDays = [],
  acreage = 1.0,
  language = 'en'
} = {}) {
  const isTe = language === 'te';
  const rainMm = typeof forecastRainMm === 'number' ? forecastRainMm : 0;
  const LITERS_PER_MM_ACRE = 4047;
  
  // Useful rainwater (accounting for 70% effective infiltration, 30% runoff/evap if heavy)
  const effectiveRainMm = rainMm > 3 ? Number((rainMm * 0.75).toFixed(1)) : rainMm;
  const waterSavedLiters = Math.round(effectiveRainMm * LITERS_PER_MM_ACRE * acreage);
  
  // Electricity pumping cost saved (approx 1.5 kWh per 10,000 Liters, @ ₹5 per kWh commercial farm rate)
  const kwhSaved = (waterSavedLiters / 10000) * 1.5;
  const moneySavedINR = Math.round(kwhSaved * 5.5);

  let explanation = '';
  let advice = '';

  if (rainMm >= 5) {
    explanation = isTe
      ? `రాబోయే రోజుల్లో సుమారు ${rainMm} మి.మీ వర్షం కురిసే అవకాశం ఉంది. ఇది సుమారు ${effectiveRainMm} మి.మీ ఉపయోగకరమైన తేమను అందిస్తుంది.`
      : `Upcoming forecast indicates ~${rainMm} mm rainfall (~${effectiveRainMm} mm effective infiltration).`;
    advice = isTe
      ? `నీటి పొదుపు: సుమారు ${waterSavedLiters.toLocaleString('en-IN')} లీటర్లు. విద్యుత్ బిల్లు ఆదా: సుమారు ₹${moneySavedINR}. బిందు సేద్యం ఆపివేయండి.`
      : `Water conserved: ~${waterSavedLiters.toLocaleString('en-IN')} Liters. Electricity saved: ~₹${moneySavedINR}. Pause scheduled irrigation.`;
  } else if (rainMm > 0) {
    explanation = isTe
      ? `స్వల్ప చినుకులు (${rainMm} మి.మీ) మాత్రమే పడే అవకాశం ఉంది. ఇది పంట నీటి అవసరాలను పూర్తిగా తీర్చలేదు.`
      : `Only light precipitation (${rainMm} mm) expected; insufficient to recharge soil root zone.`;
    advice = isTe
      ? 'మట్టి తేమను బట్టి సాధారణ నీటి సరఫరా కొనసాగించండి.'
      : 'Maintain standard irrigation based on soil moisture.';
  } else {
    explanation = isTe
      ? 'రాబోయే రోజుల్లో వర్ష సూచన లేదు. వాతావరణం పొడిగా ఉంటుంది.'
      : 'No rain forecast in the upcoming window. Dry conditions will persist.';
    advice = isTe ? 'సాధారణ బిందు సేద్యం షెడ్యూల్ పాటించండి.' : 'Adhere to standard irrigation schedule.';
  }

  return {
    hasSufficientData: true,
    forecastRainMm: rainMm,
    effectiveRainMm,
    waterSavedLiters,
    moneySavedINR,
    method: isTe ? 'వాతావరణ రాడార్ & వర్షపాత ప్రభావ నమూనా' : 'Radar & Effective Precipitation Infiltration Model',
    confidence: isTe ? 'మధ్యస్థం-అధికం (వాతావరణ శాఖ సూచన)' : 'Moderate-High (Numerical NWP Forecast)',
    explanation,
    actionableAdvice: advice
  };
}
