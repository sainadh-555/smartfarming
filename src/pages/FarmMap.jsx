import React from 'react';
import { useFarmData } from '../context/FarmContext';

export default function FarmMap() {
  const { zones } = useFarmData();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'bg-green-500 border-green-600';
      case 'Attention': return 'bg-yellow-400 border-yellow-500';
      case 'Critical': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farm Map</h1>
        <p className="text-gray-500">Visual overview of your agricultural zones.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
          {zones.map(zone => (
            <div 
              key={zone.zoneId} 
              className={`relative h-64 rounded-xl border-4 flex flex-col items-center justify-center p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${getStatusColor(zone.analysis.plantStatus)} bg-opacity-10`}
            >
              <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ${getStatusColor(zone.analysis.plantStatus)} animate-pulse`} />
              
              <h3 className="text-2xl font-bold text-gray-800">{zone.name}</h3>
              <p className="text-lg text-gray-600 font-medium mb-4">{zone.cropType}</p>
              
              <div className="bg-white/90 backdrop-blur rounded-lg p-3 w-full max-w-[200px] shadow-sm">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Moisture</span>
                  <span className="font-semibold">{zone.sensorData.soilMoisture.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Health</span>
                  <span className="font-semibold">{zone.analysis.overallHealthScore}%</span>
                </div>
                <div className="text-center mt-2 font-bold text-xs">
                  {zone.analysis.plantStatus.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm font-medium">Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400"></div>
          <span className="text-sm font-medium">Attention Needed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm font-medium">Critical Stress</span>
        </div>
      </div>
    </div>
  );
}
