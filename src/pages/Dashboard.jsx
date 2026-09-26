import React from 'react';
import { useFarmData } from '../context/FarmContext';
import { generateFarmHealthScore } from '../ai/farmDecisionEngine';
import { Droplets, Thermometer, Wind, Activity, CheckCircle, AlertTriangle, Bell, Brain, CloudRain, Sun, Calendar, TrendingUp } from 'lucide-react';

const KPICard = ({ title, value, status, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 h-full">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className={`text-sm mt-1 font-medium ${status.color}`}>{status.text}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { zones, alerts, simulateAction } = useFarmData();
  
  if (!zones || zones.length === 0) return null;

  // Calculate aggregates
  const avgMoisture = Math.round(zones.reduce((acc, z) => acc + z.sensorData.soilMoisture, 0) / zones.length);
  const avgTemp = (zones.reduce((acc, z) => acc + z.sensorData.airTemperature, 0) / zones.length).toFixed(1);
  const avgHumidity = Math.round(zones.reduce((acc, z) => acc + z.sensorData.humidity, 0) / zones.length);
  const overallHealth = generateFarmHealthScore(zones.map(z => ({...z.sensorData, cropType: z.cropType})));
  
  const activeAlerts = alerts.filter(a => !a.resolved);
  
  // Find if irrigation is required anywhere
  const needsIrrigation = zones.some(z => z.analysis.irrigationRecommendation);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Overview</h1>
          <p className="text-gray-500">Real-time condition of all monitored zones.</p>
        </div>
        
        {/* Demo Simulation Controls */}
        <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex gap-2 hidden lg:flex">
          <button onClick={() => simulateAction('IRRIGATE')} className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
            Simulate Irrigation
          </button>
          <button onClick={() => simulateAction('RAINFALL')} className="px-3 py-1.5 text-sm font-medium bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100">
            Simulate Rainfall
          </button>
          <button onClick={() => simulateAction('STRESS', 'ZONE-A')} className="px-3 py-1.5 text-sm font-medium bg-orange-50 text-orange-700 rounded hover:bg-orange-100">
            Simulate Stress
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          title="Avg Soil Moisture" 
          value={`${avgMoisture}%`}
          status={{ text: avgMoisture < 30 ? 'Low' : avgMoisture > 70 ? 'High' : 'Optimal', color: avgMoisture < 30 ? 'text-red-600' : 'text-green-600' }}
          icon={Droplets}
          colorClass="bg-blue-100 text-blue-600"
        />
        <KPICard 
          title="Avg Temperature" 
          value={`${avgTemp}°C`}
          status={{ text: avgTemp > 35 ? 'High' : 'Normal', color: avgTemp > 35 ? 'text-orange-600' : 'text-green-600' }}
          icon={Thermometer}
          colorClass="bg-orange-100 text-orange-600"
        />
        <KPICard 
          title="Avg Humidity" 
          value={`${avgHumidity}%`}
          status={{ text: 'Good', color: 'text-green-600' }}
          icon={Wind}
          colorClass="bg-cyan-100 text-cyan-600"
        />
        <KPICard 
          title="Farm Health" 
          value={`${overallHealth}/100`}
          status={{ text: overallHealth > 80 ? 'Healthy' : 'Attention Needed', color: overallHealth > 80 ? 'text-green-600' : 'text-orange-600' }}
          icon={Activity}
          colorClass="bg-green-100 text-green-600"
        />
        <KPICard 
          title="Irrigation" 
          value={needsIrrigation ? 'Required' : 'Standby'}
          status={{ text: needsIrrigation ? 'Action Needed' : 'Not Required', color: needsIrrigation ? 'text-blue-600' : 'text-gray-500' }}
          icon={needsIrrigation ? AlertTriangle : CheckCircle}
          colorClass={needsIrrigation ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}
        />
        <KPICard 
          title="Active Alerts" 
          value={activeAlerts.length}
          status={{ text: activeAlerts.length > 0 ? 'Review Needed' : 'All Clear', color: activeAlerts.length > 0 ? 'text-red-600' : 'text-green-600' }}
          icon={Bell}
          colorClass={activeAlerts.length > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Zone Status</h2>
          <div className="space-y-4">
            {zones.map(zone => (
              <div key={zone.zoneId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{zone.name} - {zone.cropType}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Moisture: {zone.sensorData.soilMoisture.toFixed(1)}% | Temp: {zone.sensorData.airTemperature.toFixed(1)}°C
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${zone.analysis.plantStatus === 'Healthy' ? 'bg-green-100 text-green-800' : 
                      zone.analysis.plantStatus === 'Attention' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {zone.analysis.plantStatus}
                  </span>
                  {zone.analysis.irrigationRecommendation && (
                    <div className="text-xs text-blue-600 font-medium mt-1">Irrigation Rec.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" /> 
            AI Engine Recommendations
          </h2>
          <div className="space-y-4">
            {zones.filter(z => z.analysis.riskLevel !== 'LOW').map(zone => (
              <div key={`rec-${zone.zoneId}`} className={`p-4 rounded-lg border-l-4 
                ${zone.analysis.riskLevel === 'CRITICAL' ? 'border-red-500 bg-red-50' : 
                  zone.analysis.riskLevel === 'HIGH' ? 'border-orange-500 bg-orange-50' : 
                  'border-yellow-500 bg-yellow-50'}`}>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900">{zone.name}</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded 
                    ${zone.analysis.riskLevel === 'CRITICAL' ? 'bg-red-200 text-red-800' : 
                      zone.analysis.riskLevel === 'HIGH' ? 'bg-orange-200 text-orange-800' : 
                      'bg-yellow-200 text-yellow-800'}`}>
                    {zone.analysis.riskLevel} PRIORITY
                  </span>
                </div>
                <p className="text-sm mt-2 font-medium text-gray-800">{zone.analysis.recommendedAction}: {zone.analysis.explanation}</p>
              </div>
            ))}
            {zones.filter(z => z.analysis.riskLevel !== 'LOW').length === 0 && (
              <div className="p-4 rounded-lg bg-green-50 border-l-4 border-green-500">
                <h4 className="font-bold text-green-900">All zones optimal</h4>
                <p className="text-sm text-green-800 mt-1">The AI engine detects no significant stress or required actions at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Features Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weather Forecast */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl border border-blue-600 shadow-sm p-6 text-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CloudRain className="w-5 h-5" /> 
            Live Weather Forecast
          </h2>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-4xl font-bold">28°C</div>
              <div className="text-blue-100 mt-1">Partly Cloudy</div>
            </div>
            <Sun className="w-12 h-12 text-yellow-300" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm border-t border-blue-400/50 pt-4">
            <div>
              <div className="text-blue-200 mb-1">Tomorrow</div>
              <div className="font-bold">26°C</div>
            </div>
            <div>
              <div className="text-blue-200 mb-1">Thursday</div>
              <div className="font-bold">24°C</div>
            </div>
            <div>
              <div className="text-blue-200 mb-1">Friday</div>
              <div className="font-bold">27°C</div>
            </div>
          </div>
        </div>

        {/* Harvest Prediction */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-nature-600" /> 
            AI Harvest Prediction
          </h2>
          <div className="space-y-4">
            {zones.slice(0, 2).map((zone, idx) => (
              <div key={`harvest-${zone.zoneId}`} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800">{zone.cropType}</span>
                  <span className="text-sm font-bold text-nature-600">{idx === 0 ? '14 Days' : '32 Days'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-nature-500 h-2 rounded-full" style={{ width: idx === 0 ? '85%' : '60%' }}></div>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                  <span>Est. Yield: {idx === 0 ? '4.2 Tons' : '2.8 Tons'}</span>
                  <span>Confidence: 92%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Price Tracker */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" /> 
            Live Market Prices
          </h2>
          <div className="space-y-3">
            {[
              { crop: 'Tomato', price: '$1.45/kg', trend: '+5.2%', up: true },
              { crop: 'Corn', price: '$0.80/kg', trend: '-1.1%', up: false },
              { crop: 'Soybeans', price: '$1.10/kg', trend: '+2.4%', up: true }
            ].map(item => (
              <div key={item.crop} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">{item.crop}</span>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{item.price}</div>
                  <div className={`text-xs font-medium ${item.up ? 'text-green-600' : 'text-red-600'}`}>
                    {item.trend} today
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
