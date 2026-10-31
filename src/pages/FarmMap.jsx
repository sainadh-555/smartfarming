import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import ZoneDetailModal from '../components/ZoneDetailModal';
import AddPlotModal from '../components/AddPlotModal';
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
  AlertOctagon,
  Plus,
  Trash2
} from 'lucide-react';

export default function FarmMap() {
  const { zones, formatTemp, formatArea, unitSystem, farmLocation, language, t, deleteZone } = useFarmData();
  const isTe = language === 'te';
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);

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
      {/* Header and Partition Explainer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{isTe ? 'పొలం ప్లాట్ల లేఅవుట్' : 'Farm Layout & Field Plots'} {farmLocation?.isLive ? `• ${farmLocation.displayLocation}` : ''}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {farmLocation?.name || 'Green Valley'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isTe ? 'మొత్తం వైశాల్యం:' : 'Total Monitored Area:'} <strong className="text-slate-800">{zones.reduce((sum, z) => sum + (Number(z.agronomy?.acreage) || 0.25), 0).toFixed(2)} {isTe ? 'ఎకరాలు' : 'Acres'}</strong> across <strong className="text-emerald-700">{zones.length} {isTe ? 'ప్లాట్లు' : 'Plots'}</strong>. {isTe ? 'తేమ, ఉష్ణోగ్రత మరియు 3D పంట దృశ్యాన్ని చూడటానికి ప్లాట్‌పై క్లిక్ చేయండి.' : 'Click any plot to inspect live moisture, temperature, and 3D digital twin.'}
          </p>
        </div>

        {/* Action Button: Add Plot */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowAddPlotModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTe ? '+ కొత్త ప్లాట్ జోడించండి' : '+ Add Field Plot'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid representing the Farm Plots */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
        
        {/* Farm Field Label Tag */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{farmLocation?.displayLocation || 'Active Precision Farm'} • {zones.length} {isTe ? 'ప్లాట్లు నిరంతరం పరిశీలించబడుతున్నాయి' : 'Plots Monitored'}</span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            {zones.length} {isTe ? 'క్రియాశీల ప్లాట్లు' : 'Active Field Plots'}
          </span>
        </div>

        {/* The Plots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {zones.map((zone) => {
            const agronomy = zone.agronomy;
            const pesticideUsage = agronomy?.pesticideUsage;
            const crop = agronomy?.crop;
            const status = zone.analysis?.plantStatus || 'Healthy';
            const isCustom = zone.zoneId?.startsWith('custom-');

            return (
              <div 
                key={zone.zoneId}
                onClick={() => setSelectedZoneId(zone.zoneId)}
                className={`group relative min-h-[300px] rounded-2xl border-4 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${getBorderColor(status)}`}
              >
                {/* Top Row: Quadrant Indicator & Pulsing Live Status Dot */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200/70">
                      {agronomy?.acreage ? `${agronomy.acreage} Acre` : '0.25 Acre'}
                    </span>
                    {isCustom && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(isTe ? `ఈ ప్లాట్ '${zone.name}' ను తొలగించాలనుకుంటున్నారా?` : `Delete plot '${zone.name}'?`)) {
                            deleteZone(zone.zoneId);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={isTe ? 'ప్లాట్ తొలగించు' : 'Delete Plot'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[11px] font-bold uppercase text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      <span>{isTe ? '3D వీక్షణ' : 'Inspect 3D'}</span>
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
                    {crop?.variety || (isTe ? 'ప్రామాణిక సాగు' : 'Precision Cultivar')}
                  </p>
                </div>
                
                {/* Glassmorphic Telemetry Card inside Zone */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-3.5 w-full shadow-xs border border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isTe ? 'తేమ' : 'Soil Moisture'}</span>
                      </span>
                      <strong className="text-slate-800 font-bold font-mono">
                        {typeof zone.sensorData?.soilMoisture === 'number' ? `${zone.sensorData.soilMoisture.toFixed(0)}%` : 'N/A'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isTe ? 'ఉష్ణోగ్రత' : 'Temperature'}</span>
                      </span>
                      <strong className="text-slate-800 font-bold font-mono">
                        {zone.sensorData?.airTemperature != null ? `${formatTemp(zone.sensorData.airTemperature).value}${formatTemp(zone.sensorData.airTemperature).symbol}` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Bug className="w-3.5 h-3.5 text-rose-500" />
                      <span>{isTe ? 'రక్షణ చర్యలు:' : 'Plant Protection:'}</span>
                    </span>
                    <strong className="text-slate-800 font-bold text-[11px]">
                      {pesticideUsage?.totalChemicalUsed || (isTe ? 'సేంద్రీయ స్ప్రే' : 'Organic spray')}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">{isTe ? 'ఆరోగ్యం:' : 'Health:'} {zone.analysis?.overallHealthScore ?? 80}%</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusTextBadge(status)}`}>
                      {status === 'Healthy' ? (isTe ? 'ఆరోగ్యంగా ఉంది' : 'Healthy') : status === 'Attention' ? (isTe ? 'శ్రద్ధ అవసరం' : 'Needs Water') : (isTe ? 'కీలకం' : 'Critical')}
                    </span>
                  </div>
                </div>

                {/* Bottom Call-to-Action Bar */}
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white/95 group-hover:bg-emerald-600 group-hover:text-white px-3.5 py-1.5 rounded-xl shadow-xs border border-emerald-200 group-hover:border-emerald-600 transition-all duration-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-white animate-ping" />
                    <span>{isTe ? 'ప్రత్యక్ష 3D పొలం మరియు తేమ వివరాలు' : 'Click for Live 3D Field & Moisture'}</span>
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
            <span>{isTe ? 'ఆరోగ్యంగా ఉంది (సరైన తేమ)' : 'Healthy (Optimal Moisture & Growth)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
            <span>{isTe ? 'శ్రద్ధ అవసరం (తేమ తగ్గింది)' : 'Attention Needed (Moisture Warning)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
            <span>{isTe ? 'కీలక పరిస్థితి (వెంటనే నీరు అందించాలి)' : 'Critical Stress (Urgent Water Needed)'}</span>
          </div>
        </div>
      </div>

      {/* Add Plot Modal */}
      <AddPlotModal 
        isOpen={showAddPlotModal} 
        onClose={() => setShowAddPlotModal(false)} 
      />

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
