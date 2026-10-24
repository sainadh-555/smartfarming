import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import ZoneDetailModal from '../components/ZoneDetailModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { 
  Layers, 
  Droplets, 
  Thermometer, 
  Bug, 
  Sparkles, 
  Maximize2, 
  MapPin, 
  Info,
  CheckCircle,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';

export default function FarmMap() {
  const { zones } = useFarmData();
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  const getBorderColor = (status) => {
    switch (status) {
      case 'Healthy': return 'border-emerald-500 hover:border-emerald-600 bg-emerald-50/20';
      case 'Attention': return 'border-amber-400 hover:border-amber-500 bg-amber-50/20';
      case 'Critical': return 'border-rose-500 hover:border-rose-600 bg-rose-50/20';
      default: return 'border-slate-300 hover:border-slate-400 bg-slate-50/20';
    }
  };

  const getDotColor = (status) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500';
      case 'Attention': return 'bg-amber-400';
      case 'Critical': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusTextBadge = (status) => {
    switch (status) {
      case 'Healthy': return 'text-emerald-700 bg-emerald-100/80';
      case 'Attention': return 'text-amber-800 bg-amber-100/80';
      case 'Critical': return 'text-rose-700 bg-rose-100/80';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and 1-Acre Partition Explainer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Farm Layout & Zonal Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Farm Map: Green Valley
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Total Area: <strong className="text-slate-800">1.00 Acre (43,560 sq ft)</strong> partitioned into <strong className="text-emerald-700">4 Precision Zones (0.25 Acre each)</strong>. Click any zone to inspect real-time temperature, moisture, crop growth, and pesticide dosage.
          </p>
        </div>

        {/* Quick Instructions Pill */}
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 shadow-2xs self-start md:self-auto">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Interactive Grid:</strong> Click on <strong>Zone A, B, C, or D</strong> below to view all chemical spray logs & telemetry.
          </span>
        </div>
      </div>

      {/* Main 2x2 Grid representing the 1-Acre Field */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
        
        {/* Farm Field Label Tag */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Field Coordinate: 17°23'N, 78°29'E • 4 Sensor Nodes Active</span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            1 Acre = 4 × 0.25 Acre Quadrants
          </span>
        </div>

        {/* The 2x2 Quadrant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {zones.map((zone) => {
            const agronomy = zone.agronomy;
            const pesticideUsage = agronomy?.pesticideUsage;
            const crop = agronomy?.crop;
            const status = zone.analysis?.plantStatus || 'Healthy';

            return (
              <div 
                key={zone.zoneId}
                onClick={() => setSelectedZoneId(zone.zoneId)}
                className={`group relative min-h-[300px] rounded-2xl border-4 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${getBorderColor(status)}`}
              >
                {/* Top Row: Quadrant Indicator & Pulsing Live Status Dot */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200/70">
                    {agronomy?.quadrant ? `${agronomy.quadrant.split(' ')[0]} • 0.25 Acre` : '0.25 Acre'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      <span>Inspect</span>
                    </span>
                    <div className={`w-3.5 h-3.5 rounded-full ${getDotColor(status)} shadow-xs animate-pulse`} />
                  </div>
                </div>
                
                {/* Center: Zone Name and Crop Identity */}
                <div className="text-center my-2">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                    {zone.name}
                  </h3>
                  <p className="text-lg font-bold text-slate-600 mt-0.5">
                    {zone.cropType}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    {crop?.variety || 'Precision Cultivar'}
                  </p>
                </div>
                
                {/* Glassmorphic Telemetry Card inside Zone */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-3.5 w-full shadow-xs border border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span>Moisture</span>
                      </span>
                      <strong className="text-slate-800 font-bold">
                        {zone.sensorData.soilMoisture.toFixed(0)}%
                      </strong>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                        <span>Air Temp</span>
                      </span>
                      <strong className="text-slate-800 font-bold">
                        {zone.sensorData.airTemperature.toFixed(0)}°C
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Bug className="w-3.5 h-3.5 text-rose-500" />
                      <span>Pesticide Applied:</span>
                    </span>
                    <strong className="text-slate-800 font-bold text-[11px]">
                      {pesticideUsage?.totalChemicalUsed || '550 ml'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Health: {zone.analysis.overallHealthScore}%</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusTextBadge(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Bottom Call-to-Action Bar */}
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white/95 group-hover:bg-emerald-600 group-hover:text-white px-3.5 py-1.5 rounded-xl shadow-xs border border-emerald-200 group-hover:border-emerald-600 transition-all duration-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-white animate-ping" />
                    <span>Click for Live 3D Field, Moisture & Pesticide Data</span>
                    <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative Map Legend */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
            <span>Healthy (Optimal Moisture & Growth)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
            <span>Attention Needed (Moisture / Stress Warning)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
            <span>Critical Stress (Urgent Irrigation / Disease Action)</span>
          </div>
        </div>
      </div>

      {/* Modal / Deep-Dive Drawer for Selected Zone */}
      {selectedZoneId && (
        <ErrorBoundary title="Zone Details & 3D Viewer">
          <ZoneDetailModal 
            zoneId={selectedZoneId}
            onClose={() => setSelectedZoneId(null)}
            onSelectZone={(id) => setSelectedZoneId(id)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
