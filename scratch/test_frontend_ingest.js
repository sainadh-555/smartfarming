/**
 * Node.js Frontend Ingestion & Formatting Verification Script
 */

const sanitizeNum = (val, min, max) => {
  if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  return Number(num.toFixed(1));
};

function ingest(r) {
  const rawTemp = r.temperature !== undefined ? r.temperature : r.airTemperature;
  const rawHum = r.humidity;
  
  const rawMoist = r.soil_moisture !== undefined ? r.soil_moisture : r.soilMoisture;
  let moist = null;
  if (rawMoist !== null && rawMoist !== undefined && rawMoist !== '' && !isNaN(Number(rawMoist))) {
    const num = Number(rawMoist);
    if (num >= 0.0 && num <= 100.0) {
      moist = Number(num.toFixed(1));
    } else if (num > 100.0 && num <= 4095.0) {
      const calc = ((3500 - num) / (3500 - 1300)) * 100;
      moist = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
    }
  } else if (typeof r.soil_raw === 'number' || typeof r.soilRaw === 'number') {
    const sRaw = typeof r.soil_raw === 'number' ? r.soil_raw : r.soilRaw;
    if (sRaw >= 0 && sRaw <= 4095) {
      const calc = ((3500 - sRaw) / (3500 - 1300)) * 100;
      moist = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
    }
  }

  const rawLight = (
    r.light_intensity !== undefined 
      ? r.light_intensity 
      : (r.lightIntensity !== undefined 
        ? r.lightIntensity 
        : (r.light_percent !== undefined ? r.light_percent : null))
  );

  let light = null;
  if (rawLight !== null && rawLight !== undefined && rawLight !== '' && !isNaN(Number(rawLight))) {
    const num = Number(rawLight);
    if (num >= 0.0 && num <= 100.0) {
      light = Number(num.toFixed(1));
    } else if (num > 100.0 && num <= 4095.0) {
      const calc = ((num - 3900) / (300 - 3900)) * 100;
      light = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
    }
  } else if (typeof r.light_raw === 'number' || typeof r.lightRaw === 'number') {
    const lRaw = typeof r.light_raw === 'number' ? r.light_raw : r.lightRaw;
    if (lRaw >= 0 && lRaw <= 4095) {
      const calc = ((lRaw - 3900) / (300 - 3900)) * 100;
      light = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
    }
  }

  const temp = sanitizeNum(rawTemp, -15.0, 70.0);
  const hum = sanitizeNum(rawHum, 0.0, 100.0);

  return {
    temperature: temp,
    humidity: hum,
    soilMoisture: moist,
    lightIntensity: light
  };
}

function formatDisplays(hw, isConnected, isFresh) {
  const hasHardware = isConnected && isFresh;
  let tempDisplay = 'N/A';
  let humidityDisplay = 'N/A';
  let moistureDisplay = 'N/A';
  let lightDisplay = 'N/A';

  if (hasHardware) {
    const tVal = hw.temperature;
    const hVal = hw.humidity;
    const mVal = hw.soilMoisture;
    const lVal = hw.lightIntensity;

    tempDisplay = typeof tVal === 'number' ? `${tVal.toFixed(1)}°C` : 'N/A';
    humidityDisplay = typeof hVal === 'number' ? `${hVal.toFixed(1)}%` : 'N/A';
    moistureDisplay = typeof mVal === 'number' ? `${mVal.toFixed(1)}%` : 'N/A';
    lightDisplay = typeof lVal === 'number' ? `${lVal.toFixed(0)}%` : 'N/A';
  }

  return { tempDisplay, humidityDisplay, moistureDisplay, lightDisplay };
}

console.log("Testing Frontend Ingestion & Formatting Logic:");

// Condition 1: All 4 sensors working
const c1 = ingest({ temperature: 30.5, humidity: 74.8, soil_raw: 2500, light_raw: 1033, soil_moisture: 35.7, light_intensity: 85.0 });
const d1 = formatDisplays(c1, true, true);
console.log("Condition 1 (All working):", d1);
if (d1.lightDisplay !== '85%' || d1.tempDisplay !== '30.5°C') throw new Error("C1 failed");

// Condition 2: LDR disconnected
const c2 = ingest({ temperature: 30.5, humidity: 74.8, soil_raw: 2500, light_raw: null, soil_moisture: 35.7, light_intensity: null });
const d2 = formatDisplays(c2, true, true);
console.log("Condition 2 (LDR disconnected):", d2);
if (d2.lightDisplay !== 'N/A' || d2.tempDisplay !== '30.5°C') throw new Error("C2 failed");

// Condition 3: LDR reading 0
const c3 = ingest({ temperature: 30.5, humidity: 74.8, soil_raw: 2500, light_raw: 0, soil_moisture: 35.7, light_intensity: 0.0 });
const d3 = formatDisplays(c3, true, true);
console.log("Condition 3 (LDR 0):", d3);
if (d3.lightDisplay !== '0%') throw new Error("C3 failed");

// Condition 4: LDR reading 4095
const c4 = ingest({ temperature: 30.5, humidity: 74.8, soil_raw: 2500, light_raw: 4095, soil_moisture: 35.7, light_intensity: 100.0 });
const d4 = formatDisplays(c4, true, true);
console.log("Condition 4 (LDR 4095):", d4);
if (d4.lightDisplay !== '100%') throw new Error("C4 failed");

// Condition 5: Hardware disconnected / stale
const d5 = formatDisplays(c1, false, false);
console.log("Condition 5 (Disconnected/Stale):", d5);
if (d5.lightDisplay !== 'N/A' || d5.tempDisplay !== 'N/A' || d5.moistureDisplay !== 'N/A' || d5.humidityDisplay !== 'N/A') {
  throw new Error("C5 failed");
}

console.log("ALL FRONTEND INGESTION CHECKS PASSED!");
