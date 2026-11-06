import { queryFarmAIEngine } from '../src/services/aiChatService.js';

const testTelemetryConnected = {
  hardwareData: {
    connectionStatus: 'connected',
    hasReadings: true,
    isStale: false,
    port: 'COM7',
    soilMoisture: 32.5,
    temperature: 30.2,
    humidity: 58.0,
    lightIntensity: 82,
    lastUpdated: '06:45 PM'
  },
  operatingMode: 'live_hardware',
  weatherData: {
    outdoorTemperature: 31.0,
    weatherCondition: 'Sunny',
    rainfall: 0.0,
    windSpeed: 14.0
  },
  zones: [
    { zoneId: 'ZONE-A', name: 'Zone A', cropType: 'Tomato', sensorData: { soilMoisture: 32.5, airTemperature: 30.2, humidity: 58 } },
    { zoneId: 'ZONE-B', name: 'Zone B', cropType: 'Chili', sensorData: { soilMoisture: 45.0, airTemperature: 29.0, humidity: 60 } },
    { zoneId: 'ZONE-C', name: 'Zone C', cropType: 'Paddy', sensorData: { soilMoisture: 72.0, airTemperature: 27.5, humidity: 75 } },
    { zoneId: 'ZONE-D', name: 'Zone D', cropType: 'Groundnut', sensorData: { soilMoisture: 30.0, airTemperature: 32.0, humidity: 50 } }
  ],
  alerts: []
};

const testTelemetryDisconnected = {
  hardwareData: {
    connectionStatus: 'disconnected',
    hasReadings: false,
    isStale: false,
    port: null
  },
  operatingMode: 'live_hardware',
  weatherData: {
    outdoorTemperature: 28.5,
    weatherCondition: 'Partly Cloudy',
    rainfall: 0.0,
    windSpeed: 12.0
  },
  zones: [],
  alerts: []
};

const questions = [
  "What is my current farm condition?",
  "Should I irrigate now?",
  "What is my current soil moisture?",
  "Explain today's temperature.",
  "Compare today's and yesterday's readings.",
  "Is rain expected?",
  "Give me a farm health summary.",
  "Explain in Telugu.",
  "What should I do if soil moisture is low?",
  "What data is currently unavailable?"
];

console.log("=== RUNNING FARM AI INTELLIGENCE VERIFICATION ===");

questions.forEach((q, idx) => {
  const isDisconnectTest = q.includes("unavailable");
  const ctx = isDisconnectTest ? testTelemetryDisconnected : testTelemetryConnected;
  const res = queryFarmAIEngine({
    query: q,
    ...ctx,
    language: q.includes("Telugu") ? 'te' : 'en'
  });
  console.log(`\n--------------------------------------------`);
  console.log(`Q${idx + 1}: "${q}"`);
  console.log(`ANSWER:\n${res.text}`);
});

