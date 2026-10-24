import React, { useState } from 'react';
import { 
  X, 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  Sprout, 
  FlaskConical, 
  Bug, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Activity, 
  Sparkles, 
  Plus, 
  Check, 
  CheckCircle2, 
  Layers,
  MapPin,
  ChevronRight,
  Box
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import Zone3DView from './Zone3DView';

export default function ZoneDetailModal({ zoneId, onClose, onSelectZone }) {
  const { zones, simulateAction, logPesticideSpray } = useFarmData();
  const [activeTab, setActiveTab] = useState('3d'); // '3d' | 'pesticides' | 'crop' | 'telemetry' | 'ai'
  const [isLoggingSpray, setIsLoggingSpray] = useState(false);
  const [spraySuccessMsg, setSpraySuccessMsg] = useState('');

  // Form state for logging a new spray
  const [sprayForm, setSprayForm] = useState({
    pesticideName: '',
    type: 'Bio-Pesticide (Organic)',
    targetPest: '',
    dosage: '',
    carrierVolume: '50 Liters Water',
    method: 'Foliar Spray',
    operator: 'Farm Operator (You)'
  });

  const zone = zones?.find(z => z.zoneId === zoneId);

  if (!zone) return null;

  const { sensorData, analysis, agronomy } = zone;
  const crop = agronomy?.crop || {};
  const pesticideUsage = agronomy?.pesticideUsage || { treatments: [] };
  const fertilizerUsage = agronomy?.fertilizerUsage || { treatments: [] };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          text: 'Healthy & Thriving'
        };
      case 'Attention':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          text: 'Attention Needed'
        };
      case 'Critical':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          text: 'Critical Stress'
        };
      default:
        return {
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          dot: 'bg-gray-500',
          text: status || 'Unknown'
        };
    }
  };

  const statusBadge = getStatusBadge(analysis.plantStatus);

  const handleIrrigate = () => {
    simulateAction('IRRIGATE', zone.zoneId);
  };

  const handleSpraySubmit = (e) => {
    e.preventDefault();
    if (!sprayForm.pesticideName || !sprayForm.dosage) return;

    logPesticideSpray(zone.zoneId, sprayForm);
    setSpraySuccessMsg(`Logged spray for ${sprayForm.pesticideName} (${sprayForm.dosage}) successfully!`);
    setIsLoggingSpray(false);
    setSprayForm({
      pesticideName: '',
      type: 'Bio-Pesticide (Organic)',
      targetPest: '',
      dosage: '',
      carrierVolume: '50 Liters Water',
      method: 'Foliar Spray',
      operator: 'Farm Operator (You)'
    });

    setTimeout(() => {
      setSpraySuccessMsg('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top 1-Acre Field Navigation Bar (Switch between Zone A, B, C, D) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>1-Acre Field Partition</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">{agronomy?.acreageDisplay || '0.25 Acre'}</span>
            </div>
          </div>

          {/* Quick Zone Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl">
            {zones.map((z) => {
              const isCurrent = z.zoneId === zone.zoneId;
              return (
                <button
                  key={z.zoneId}
                  onClick={() => onSelectZone(z.zoneId)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <span>{z.name}</span>
                  <span className="opacity-80 text-[10px]">({z.cropType})</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Hero Header */}
        <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white px-6 py-5 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {zone.name}
                </h2>
                <span className="text-lg font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {crop.name || zone.cropType}
                </span>
                <span className="text-xs italic text-slate-500 font-medium">
                  ({crop.scientificName || 'Botanical spec'})
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                  {statusBadge.text}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {agronomy?.quadrant || 'Quadrant Sector'} • {agronomy?.acreageDisplay || '0.25 Acre (10,890 sq ft)'}
                </span>
                <span>•</span>
                <span>Variety: <strong className="text-slate-700">{crop.variety || 'Standard Hybrid'}</strong></span>
                <span>•</span>
                <span>Stage: <strong className="text-slate-700">{crop.growthStage || 'Vegetative'}</strong></span>
              </div>
            </div>

            {/* Quick Actions (Irrigate & Log) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleIrrigate}
                className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Simulate Irrigation</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('pesticides');
                  setIsLoggingSpray(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-xl hover:bg-emerald-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Log Chemical Spray</span>
              </button>
            </div>
          </div>

          {/* Quick Notification Message if any */}
          {spraySuccessMsg && (
            <div className="mt-3 p-2.5 bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{spraySuccessMsg}</span>
            </div>
          )}

          {/* Core Telemetry Gauge Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
            {/* Soil Moisture */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Soil Moisture</span>
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{sensorData.soilMoisture.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500">vol</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    sensorData.soilMoisture < 25 ? 'bg-rose-500' :
                    sensorData.soilMoisture < 40 ? 'bg-amber-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, sensorData.soilMoisture))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-medium">
                Opt: {crop.optimalMoistureRange || '40-60%'}
              </span>
            </div>

            {/* Air Temperature */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Air Temp</span>
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{sensorData.airTemperature.toFixed(1)}°C</span>
              </div>
              <span className="text-[10px] font-medium text-slate-600 mt-1">
                Soil: {sensorData.soilTemperature.toFixed(1)}°C
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Opt: {crop.optimalTempRange || '22-30°C'}
              </span>
            </div>

            {/* Relative Humidity */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Humidity</span>
                <Wind className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{sensorData.humidity.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500">RH</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1">
                Rainfall: {sensorData.rainfall || 0} mm
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Dew Pt: 21°C</span>
            </div>

            {/* Soil pH */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Soil pH</span>
                <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{sensorData.soilPH.toFixed(1)}</span>
                <span className="text-[10px] font-semibold text-emerald-600">Optimal</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>Acidic (5.5)</span>
                <span>Alk (8.0)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Target: 6.2 - 6.8</span>
            </div>

            {/* Light / Solar Radiation */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Solar Flux</span>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">{sensorData.lightIntensity}</span>
                <span className="text-[10px] text-slate-500">W/m²</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium mt-1">
                Full Daylight
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Photoperiod: 11.5h</span>
            </div>

            {/* Overall Plant Health Score */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium">Health Score</span>
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black ${
                  analysis.overallHealthScore < 50 ? 'text-rose-600' :
                  analysis.overallHealthScore < 75 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {analysis.overallHealthScore}%
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-700 mt-1">
                {analysis.plantStatus.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Conf: {analysis.confidence}%</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center justify-between overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('3d')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === '3d'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Box className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Live 3D Field View</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                3D Twin
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pesticides')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'pesticides'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Bug className="w-4 h-4 text-rose-500" />
              <span>Pesticide & Chemical Usage</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {pesticideUsage.treatments?.length || 0} Sprays
              </span>
            </button>

            <button
              onClick={() => setActiveTab('crop')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'crop'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span>Crop Agronomy & 0.25 Ac Split</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'telemetry'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Detailed Sensor Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Crop Diagnostics</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">

          {/* TAB 0: LIVE 3D FIELD VIEW */}
          {activeTab === '3d' && (
            <div className="space-y-4 animate-fadeIn">
              <Zone3DView zone={zone} onSimulateIrrigate={handleIrrigate} />
              
              {/* 3D Scene Condition Insights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-3 h-3 rounded-full bg-amber-700" />
                    <span>Live Soil Surface Condition</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {sensorData.soilMoisture < 25
                      ? 'Parched dusty soil texture reflects severe moisture deficit (15%). Low specular sheen.'
                      : sensorData.soilMoisture > 65
                      ? 'Waterlogged: Shimmering shallow water layer with wave reflection physics.'
                      : 'Moist rich loam: Optimal moisture retention with balanced nutrient absorption.'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <span>3D Crop Phenology & Wind Physics</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Procedural 3D <strong>{cropType}</strong> vegetation ({crop.variety || 'Hybrid'}) in <strong>{crop.growthStage || 'active development'}</strong> with gentle wind physics.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>IoT Sensor Station & Drip Lateral</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ESP32 wireless node with solar panel, buried soil probe, and black lateral drip lines with clickable animated emitter testing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PESTICIDE & CHEMICAL USAGE */}
          {activeTab === 'pesticides' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-600 mb-1">
                    <Bug className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pesticide Applied</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {pesticideUsage.totalChemicalUsed || '550 ml'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cumulative for this 0.25-Acre sector
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <FlaskConical className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fertilizer Used</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {fertilizerUsage.totalUsed || '22.5 kg'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    NPK & micronutrients delivered
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Last Applied</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {pesticideUsage.lastAppliedDate || 'Recent'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Next: <span className="font-semibold text-slate-700">{pesticideUsage.nextScheduledDate || 'Pending'}</span>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Safety Interval (PHI)</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {pesticideUsage.safetyInterval || '7 Days Safe'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pre-harvest chemical clearance
                  </p>
                </div>
              </div>

              {/* Collapsible / Interactive Form to Log New Spray */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Log New Pesticide or Bio-Spray Application
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsLoggingSpray(!isLoggingSpray)}
                    className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isLoggingSpray ? 'Cancel' : '+ New Spray Record'}
                  </button>
                </div>

                {isLoggingSpray && (
                  <form onSubmit={handleSpraySubmit} className="p-5 space-y-4 bg-white animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Pesticide / Formulation Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. NeemAzal 1% EC or Mancozeb"
                          value={sprayForm.pesticideName}
                          onChange={(e) => setSprayForm({ ...sprayForm, pesticideName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Type / Classification
                        </label>
                        <select
                          value={sprayForm.type}
                          onChange={(e) => setSprayForm({ ...sprayForm, type: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        >
                          <option>Bio-Pesticide (Organic)</option>
                          <option>Systemic Insecticide</option>
                          <option>Contact Fungicide</option>
                          <option>Broad-Spectrum Protectant</option>
                          <option>Microbial Biocontrol</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Dosage / Amount Applied *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 250 ml / 0.25 acre"
                          value={sprayForm.dosage}
                          onChange={(e) => setSprayForm({ ...sprayForm, dosage: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Target Pest or Disease
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Fruit Borer, Aphids, Blight"
                          value={sprayForm.targetPest}
                          onChange={(e) => setSprayForm({ ...sprayForm, targetPest: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Carrier Volume / Water
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 50 Liters Water"
                          value={sprayForm.carrierVolume}
                          onChange={(e) => setSprayForm({ ...sprayForm, carrierVolume: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Operator Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh K. (Certified)"
                          value={sprayForm.operator}
                          onChange={(e) => setSprayForm({ ...sprayForm, operator: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsLoggingSpray(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                      >
                        Save Spray Log
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Pesticide Application History Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Pesticide Application History ({zone.name} • {crop.name})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Log of chemical and biological treatments applied to this 0.25-Acre sector
                    </p>
                  </div>
                  <span className="text-xs bg-slate-100 font-semibold text-slate-700 px-2.5 py-1 rounded-md">
                    Total: {pesticideUsage.treatments?.length || 0} Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Pesticide / Product</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Dosage (0.25 Ac)</th>
                        <th className="py-3 px-4">Target Pest</th>
                        <th className="py-3 px-4">Method & Operator</th>
                        <th className="py-3 px-4">Effectiveness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pesticideUsage.treatments && pesticideUsage.treatments.length > 0 ? (
                        pesticideUsage.treatments.map((t, idx) => (
                          <tr key={t.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-800 font-semibold whitespace-nowrap">
                              {t.date}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{t.pesticideName}</div>
                              <div className="text-[10px] text-slate-500">{t.carrierVolume}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.type.includes('Organic') || t.type.includes('Bio')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {t.dosage}
                            </td>
                            <td className="py-3 px-4 text-rose-700 font-semibold">
                              {t.targetPest}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div>{t.method}</div>
                              <div className="text-[10px] text-slate-400">{t.operator}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {t.effectiveness}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-6 text-center text-slate-400">
                            No pesticide treatments recorded for this zone yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fertilizer & Nutrient History Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Fertilizer & Soil Nutrient Dosing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fertigation and basal nutrient inputs applied to {zone.name}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Fertilizer / Nutrient</th>
                        <th className="py-3 px-4">Amount Used</th>
                        <th className="py-3 px-4">Application Method</th>
                        <th className="py-3 px-4">Agronomic Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {fertilizerUsage.treatments && fertilizerUsage.treatments.length > 0 ? (
                        fertilizerUsage.treatments.map((f, idx) => (
                          <tr key={f.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-800 font-semibold">{f.date}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{f.fertilizerName}</td>
                            <td className="py-3 px-4 font-bold text-purple-700">{f.amount}</td>
                            <td className="py-3 px-4 text-slate-600">{f.method}</td>
                            <td className="py-3 px-4 text-slate-600">{f.target}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-slate-400">
                            No fertilizer records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CROP AGRONOMY & 1-ACRE PARTITION */}
          {activeTab === 'crop' && (
            <div className="space-y-6">
              {/* 1-Acre Land Partition Card */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-5 rounded-2xl shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                      <Layers className="w-4 h-4" />
                      <span>Farm Cadastral Division • 1 Acre Land</span>
                    </div>
                    <h3 className="text-xl font-black">
                      {zone.name}: {agronomy?.quadrant || 'North-West Quadrant'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      The total 1.00 Acre farm (43,560 sq ft) is divided into 4 equal quadrants (0.25 Acre / 10,890 sq ft each) for micro-climate monitoring, precision chemical spraying, and targeted fertigation.
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur p-3.5 rounded-xl border border-white/20 text-center shrink-0">
                    <span className="text-[11px] text-slate-300 block font-medium">Quadrant Acreage</span>
                    <span className="text-2xl font-black text-emerald-400">0.25 Acre</span>
                    <span className="text-[10px] text-slate-400 block">10,890 sq. ft.</span>
                  </div>
                </div>
              </div>

              {/* Crop Profile & Growth Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-emerald-600" />
                    <span>Crop Phenology & Timeline</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Crop Common Name</span>
                      <strong className="text-slate-800">{crop.name}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Botanical Spec</span>
                      <span className="italic text-slate-700">{crop.scientificName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Seed Variety / Hybrid</span>
                      <strong className="text-slate-800">{crop.variety}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Planting / Transplant Date</span>
                      <span className="text-slate-700 font-semibold">{crop.plantingDate}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Expected Harvest Window</span>
                      <span className="text-slate-700 font-semibold">{crop.expectedHarvest}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Estimated Sector Yield</span>
                      <strong className="text-emerald-700 font-bold">{crop.targetYield}</strong>
                    </div>
                  </div>

                  {/* Growth Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Growth Stage: {crop.growthStage}</span>
                      <span className="text-emerald-700 font-bold">{crop.stagePercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${crop.stagePercent || 50}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Day {crop.daysAfterSowing || 45} After Sowing</span>
                      <span>Total Cycle: {crop.totalCropCycleDays || 90} Days</span>
                    </div>
                  </div>
                </div>

                {/* Soil & Irrigation Profile */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <span>Soil Profile & Macro Nutrients (NPK)</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Soil Classification</span>
                      <strong className="text-slate-800">{crop.soilType}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Drip Irrigation Spec</span>
                      <span className="text-slate-700">{crop.dripLine}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Ideal Moisture Threshold</span>
                      <span className="text-slate-700 font-semibold">{crop.optimalMoistureRange}</span>
                    </div>
                  </div>

                  {/* N-P-K Nutrients */}
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-2">
                      Soil Nutrient Levels (Available Macro Elements)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block">Nitrogen (N)</span>
                        <span className="text-sm font-black text-slate-900">{crop.npk?.n?.value || '140 ppm'}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">{crop.npk?.n?.status}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block">Phosphorus (P)</span>
                        <span className="text-sm font-black text-slate-900">{crop.npk?.p?.value || '35 ppm'}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">{crop.npk?.p?.status}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold block">Potassium (K)</span>
                        <span className="text-sm font-black text-slate-900">{crop.npk?.k?.value || '180 ppm'}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">{crop.npk?.k?.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILED SENSOR TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm mb-4">
                  Live IoT Sensor Readings — {sensorData.deviceId || 'ESP32 Node'}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Soil Moisture (Depth: 15cm)</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.soilMoisture.toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Capacitive Sensor v1.2</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Air Ambient Temp</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.airTemperature.toFixed(1)}°C</span>
                    <span className="text-[10px] text-slate-500 block mt-1">SHT31 Precision probe</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Root Zone Temp</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.soilTemperature.toFixed(1)}°C</span>
                    <span className="text-[10px] text-slate-500 block mt-1">DS18B20 Waterproof</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Relative Air Humidity</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.humidity.toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Vapor Pressure: 2.4 kPa</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Soil Hydrogen Ion (pH)</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.soilPH.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Glass electrode sensor</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Solar Radiation / Light</span>
                    <span className="text-xl font-black text-slate-900">{sensorData.lightIntensity} W/m²</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Pyranometer reading</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI CROP DIAGNOSTICS */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-base">Farm Decision Engine Analysis</h4>
                </div>

                <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    AI Diagnosis & Reason
                  </span>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Water Stress Flag</span>
                    <strong className={analysis.waterStress ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                      {analysis.waterStress ? 'Active Moisture Deficit' : 'None Detected'}
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Heat Stress Flag</span>
                    <strong className={analysis.heatStress ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                      {analysis.heatStress ? 'Elevated Temperature' : 'Normal Range'}
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Disease / Fungal Risk</span>
                    <strong className={analysis.diseaseRisk ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                      {analysis.diseaseRisk ? 'Moderate to High' : 'Low Risk'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Viewing: <strong className="text-slate-800">{zone.name}</strong> • 
            Crop: <strong className="text-slate-800">{crop.name}</strong> • 
            Sector Area: <strong className="text-slate-800">0.25 Acre</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
