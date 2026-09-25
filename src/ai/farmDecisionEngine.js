/**
 * AI/ML Prototype - Farm Decision Engine
 * This is a transparent rule-based engine and mock ML interface for the MVP.
 * In production, this layer will be replaced with trained ML models 
 * (e.g., Random Forest for sensors, CNN for images).
 */

export const analyzeFarmData = (data) => {
  const {
    soilMoisture,
    airTemperature,
    humidity,
    rainfall,
    plantHealthScore,
    cropType
  } = data;

  let waterStress = false;
  let heatStress = false;
  let diseaseRisk = false;
  
  let riskLevel = "LOW";
  let irrigationRecommendation = false;
  let recommendation = "Conditions are optimal. No immediate action required.";
  let actionType = "MONITOR";
  
  // Basic Rule Engine based on thresholds
  
  // Heat stress logic
  if (airTemperature > 32) {
    heatStress = true;
    riskLevel = "MEDIUM";
  } else if (airTemperature > 36) {
    heatStress = true;
    riskLevel = "HIGH";
  }

  // Water stress logic
  if (soilMoisture < 35 && rainfall === 0) {
    waterStress = true;
    irrigationRecommendation = true;
    
    if (airTemperature > 32) {
      riskLevel = "HIGH";
      recommendation = `Irrigation is recommended for this zone. Soil moisture is below the preferred range (${soilMoisture}%) and the current temperature (${airTemperature}°C) is increasing plant water demand.`;
      actionType = "IRRIGATE";
    } else {
      riskLevel = "MEDIUM";
      recommendation = `Consider irrigation soon. Soil moisture is dropping (${soilMoisture}%).`;
      actionType = "IRRIGATE";
    }
  } else if (soilMoisture < 20) {
    waterStress = true;
    riskLevel = "CRITICAL";
    irrigationRecommendation = true;
    recommendation = `CRITICAL: Immediate irrigation required. Soil moisture is dangerously low (${soilMoisture}%).`;
    actionType = "IRRIGATE";
  }

  // Disease Risk (High humidity + moderate/high temp)
  if (humidity > 70 && airTemperature > 25 && airTemperature < 32 && rainfall > 0) {
    diseaseRisk = true;
    if (riskLevel !== "HIGH" && riskLevel !== "CRITICAL") {
      riskLevel = "MEDIUM";
      recommendation = "High humidity and recent rainfall detected. Conditions are favorable for fungal diseases. Monitor plants closely.";
      actionType = "INSPECT";
    }
  }
  
  // Health score impact
  let overallHealthScore = plantHealthScore;
  if (waterStress) overallHealthScore -= 10;
  if (heatStress) overallHealthScore -= 5;
  if (diseaseRisk) overallHealthScore -= 5;
  
  // Clamp score
  overallHealthScore = Math.max(0, Math.min(100, overallHealthScore));
  
  let plantStatus = "Healthy";
  if (overallHealthScore < 50) plantStatus = "Critical";
  else if (overallHealthScore < 75) plantStatus = "Attention";

  let confidence = 0.85 + (Math.random() * 0.1); // Mock ML confidence
  
  return {
    overallHealthScore: Math.round(overallHealthScore),
    plantStatus,
    irrigationRecommendation,
    waterStress,
    heatStress,
    diseaseRisk,
    soilStatus: soilMoisture < 30 ? "Dry" : (soilMoisture > 70 ? "Wet" : "Optimal"),
    confidence: Math.round(confidence * 100),
    explanation: recommendation,
    recommendedAction: actionType,
    riskLevel
  };
};

export const generateFarmHealthScore = (zonesData) => {
  if (!zonesData || zonesData.length === 0) return 0;
  let totalScore = 0;
  zonesData.forEach(zone => {
    totalScore += analyzeFarmData(zone).overallHealthScore;
  });
  return Math.round(totalScore / zonesData.length);
};
