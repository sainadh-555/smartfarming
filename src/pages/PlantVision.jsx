import React from 'react';
import { useFarmData } from '../context/FarmContext';
import { Camera, Upload, AlertCircle } from 'lucide-react';

export default function PlantVision() {
  const { zones } = useFarmData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plant Vision</h1>
          <p className="text-gray-500">Computer vision analysis of plant health over time.</p>
        </div>
        <button className="flex items-center gap-2 bg-nature-600 text-white px-4 py-2 rounded-lg hover:bg-nature-700 transition-colors">
          <Upload className="w-4 h-4" />
          Upload Image
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>AI/ML Prototype:</strong> The images below represent simulated model outputs (e.g. YOLO/CNN). 
          In production, the ESP32 camera module will automatically transmit images here for real-time inference.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {zones.map(zone => (
          <div key={zone.zoneId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="relative h-48 sm:h-64">
              <img 
                src={zone.sensorData.imageUrl} 
                alt={`${zone.cropType} in ${zone.name}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Latest Capture
              </div>
              <div className={`absolute top-4 right-4 backdrop-blur px-3 py-1 rounded-full text-sm font-bold shadow-sm
                ${zone.analysis.plantStatus === 'Healthy' ? 'bg-green-500/90 text-white' : 
                  zone.analysis.plantStatus === 'Attention' ? 'bg-yellow-400/90 text-yellow-900' : 
                  'bg-red-500/90 text-white'}`}>
                Health: {zone.analysis.overallHealthScore}%
              </div>
            </div>
            
            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-900">{zone.name} - {zone.cropType}</h3>
              
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Visual Analysis</h4>
                <ul className="space-y-2 text-sm">
                  {zone.analysis.overallHealthScore > 80 ? (
                    <>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Leaf color appears normal
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        No obvious severe damage detected
                      </li>
                    </>
                  ) : zone.analysis.overallHealthScore > 50 ? (
                    <>
                      <li className="flex items-center gap-2 text-yellow-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        Mild stress indication on outer leaves
                      </li>
                      <li className="flex items-center gap-2 text-yellow-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        Slight discoloration detected
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Severe wilting detected
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        High probability of structural damage
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historical Trend (7 Days)</h4>
                <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">7d ago</div>
                    <div className="font-semibold text-gray-700">{Math.min(100, zone.analysis.overallHealthScore + 5)}%</div>
                  </div>
                  <div className="text-gray-300">→</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">3d ago</div>
                    <div className="font-semibold text-gray-700">{Math.min(100, zone.analysis.overallHealthScore + 2)}%</div>
                  </div>
                  <div className="text-gray-300">→</div>
                  <div className="text-center">
                    <div className="text-xs text-nature-600 font-bold mb-1">Now</div>
                    <div className="font-bold text-nature-700">{zone.analysis.overallHealthScore}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
