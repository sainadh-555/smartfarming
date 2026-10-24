import React, { useState, useRef } from 'react';
import { useFarmData } from '../context/FarmContext';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Bug, 
  Droplets, 
  Thermometer, 
  Wind, 
  FlaskConical, 
  Activity, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { PRESET_DIAGNOSES, analyzeUploadedImage } from '../ai/plantVisionEngine';

export default function PlantVision() {
  const { zones, logPesticideSpray, simulateAction } = useFarmData();
  const fileInputRef = useRef(null);

  // Active diagnosis state (defaults to the first realistic sample)
  const [activeDiagnosis, setActiveDiagnosis] = useState(PRESET_DIAGNOSES[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedZoneTarget, setSelectedZoneTarget] = useState('ZONE-A');

  // Handle local user file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      runInference(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Run simulated ML inference with scanner animation
  const runInference = (imageUrl, filenameOrHint = '') => {
    setIsScanning(true);
    setToastMessage('Running YOLOv8 + ResNet50 neural inference on leaf image...');

    setTimeout(() => {
      const matchedZone = zones.find(z => z.zoneId === selectedZoneTarget) || zones[0];
      const result = analyzeUploadedImage(imageUrl, matchedZone, filenameOrHint);
      setActiveDiagnosis(result);
      setIsScanning(false);
      setToastMessage('Diagnosis complete! ML inference & ESP32 telemetry correlation verified.');
      setTimeout(() => setToastMessage(''), 4000);
    }, 1200);
  };

  // Load a preset sample
  const handleSelectPreset = (preset) => {
    setSelectedZoneTarget(preset.zoneId);
    runInference(preset.image, preset.cropName);
  };

  // Quick apply prescription to zone treatment history
  const handleApplyPrescription = () => {
    if (!activeDiagnosis) return;
    const targetZoneId = activeDiagnosis.zoneId || selectedZoneTarget;

    logPesticideSpray(targetZoneId, {
      pesticideName: activeDiagnosis.prescription.chemical,
      type: 'Targeted Treatment',
      targetPest: activeDiagnosis.title,
      dosage: activeDiagnosis.prescription.dosage,
      carrierVolume: '50 Liters Water',
      method: 'High-Pressure Foliar Spray',
      operator: 'AI Prescription Engine'
    });

    setToastMessage(`Prescription logged into ${activeDiagnosis.cropName} (${targetZoneId}) treatment record!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Quick simulate remedial irrigation
  const handleRemedialIrrigate = () => {
    const targetZoneId = activeDiagnosis.zoneId || selectedZoneTarget;
    simulateAction('IRRIGATE', targetZoneId);
    setToastMessage(`Irrigation triggered for ${targetZoneId} to alleviate moisture stress!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Computer Vision & Deep Learning Diagnostics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Plant Vision & AI Disease Detection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload leaf or crop photos for real-time neural inference (YOLOv8 & CNNs), disease classification, and automated ESP32 sensor correlation.
          </p>
        </div>

        {/* Upload Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Crop Photo</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sample Quick Selector Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quick Diagnostic Samples (1-Click AI Test)</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Click any sample to run instant ML inference
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_DIAGNOSES.map((preset) => {
            const isSelected = activeDiagnosis?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <img 
                  src={preset.image} 
                  alt={preset.cropName} 
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {preset.cropName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {preset.title.split('(')[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main ML Inference & Diagnosis Studio */}
      {activeDiagnosis && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Studio Header Bar */}
          <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  AI Computer Vision Diagnosis: {activeDiagnosis.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  Architecture: {activeDiagnosis.model} • Latency: 32ms
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showBoundingBoxes} 
                  onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-400"
                />
                <span>Detection Bounding Boxes</span>
              </label>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors"
              >
                Upload Different Image
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Image with Scanning Effect & Bounding Boxes */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner group">
                <img 
                  src={activeDiagnosis.image} 
                  alt={activeDiagnosis.cropName}
                  className="w-full h-full object-cover"
                />

                {/* Laser Scanning Line Animation when analyzing */}
                {isScanning && (
                  <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce z-30" />
                )}

                {/* ML Object Bounding Boxes Overlay */}
                {showBoundingBoxes && !isScanning && activeDiagnosis.detections?.map((box, idx) => (
                  <div
                    key={idx}
                    className="absolute border-2 rounded transition-all duration-300 animate-fadeIn"
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                      borderColor: box.color,
                      backgroundColor: `${box.color}20`
                    }}
                  >
                    <span 
                      className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-black text-white shadow-xs whitespace-nowrap"
                      style={{ backgroundColor: box.color }}
                    >
                      {box.label} ({box.confidence}%)
                    </span>
                  </div>
                ))}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeDiagnosis.cropName} ({activeDiagnosis.scientificName})</span>
                </div>

                <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-white shadow-xs">
                  Confidence: {activeDiagnosis.confidence}%
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-3 inset-x-3 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-lg border border-slate-700/60 text-white text-[11px] flex justify-between items-center">
                  <span>Growth Stage: <strong>{activeDiagnosis.growthStage}</strong></span>
                  <span className="text-emerald-400 font-bold">Health: {activeDiagnosis.healthScore}%</span>
                </div>
              </div>

              {/* Bounding Box Legend */}
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>Active Lesions</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Chlorosis/Curling</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>Healthy Tissue</span>
                </span>
              </div>
            </div>

            {/* Right Column: Deep Diagnostic Report & ESP32 Correlation */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Classification & Severity Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pathological Classification (EPPO Standard)
                  </span>
                  <h4 className="text-lg font-black text-slate-900">
                    {activeDiagnosis.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {activeDiagnosis.eppoCode && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                        EPPO: {activeDiagnosis.eppoCode}
                      </span>
                    )}
                    {activeDiagnosis.fracIracCode && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                        {activeDiagnosis.fracIracCode}
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {activeDiagnosis.mrlStatus || 'GlobalG.A.P. MRL Safe'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-1.5">
                    Surface Lesion Impact: <strong className="text-slate-800">{activeDiagnosis.affectedArea}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Severity Rating
                  </span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                    activeDiagnosis.status === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    activeDiagnosis.status === 'Attention' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {activeDiagnosis.severity}
                  </span>
                </div>
              </div>

              {/* ESP32 IoT Node Correlation Strip */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/60 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      ESP32 IoT Node Telemetry Correlation ({activeDiagnosis.esp32Data.deviceId})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {activeDiagnosis.esp32Data.zoneName}
                  </span>
                </div>

                {/* Sensor values at capture */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-orange-500" />
                      <span>Air Temp</span>
                    </span>
                    <strong className="text-slate-900 font-bold">{activeDiagnosis.esp32Data.airTemp}°C</strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                      <Wind className="w-3 h-3 text-cyan-500" />
                      <span>Canopy Humidity</span>
                    </span>
                    <strong className="text-slate-900 font-bold">{activeDiagnosis.esp32Data.humidity}%</strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-blue-500" />
                      <span>Soil Moisture</span>
                    </span>
                    <strong className="text-slate-900 font-bold">{activeDiagnosis.esp32Data.soilMoisture}%</strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-slate-500 text-[10px] flex items-center gap-1">
                      <FlaskConical className="w-3 h-3 text-purple-500" />
                      <span>Soil pH</span>
                    </span>
                    <strong className="text-slate-900 font-bold">{activeDiagnosis.esp32Data.soilPH}</strong>
                  </div>
                </div>

                {/* Epidemiological Reason */}
                <p className="text-xs text-blue-950 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-blue-100">
                  <strong>Agronomic Correlation:</strong> {activeDiagnosis.correlationAnalysis}
                </p>
              </div>

              {/* Chemical & Organic Prescription Plan */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-emerald-700" />
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Targeted Prescription & Chemical Dosages
                  </h5>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600 font-medium">Recommended Pesticide / Fungicide:</span>
                    <strong className="text-slate-900 font-bold">{activeDiagnosis.prescription.chemical}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600 font-medium">Exact Dosage / Water Ratio:</span>
                    <span className="text-emerald-800 font-bold">{activeDiagnosis.prescription.dosage}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600 font-medium">Organic Alternative:</span>
                    <span className="text-slate-800 font-semibold">{activeDiagnosis.prescription.organicOption}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600 font-medium">Nutrient & Foliar Support:</span>
                    <span className="text-purple-800 font-medium">{activeDiagnosis.prescription.fertilizer}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 font-medium">Pre-Harvest Safety Interval (PHI):</span>
                    <span className="text-slate-800 font-bold">{activeDiagnosis.prescription.phi}</span>
                  </div>
                </div>

                {/* Cultural Practice Recommendation */}
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-[11px] text-emerald-950">
                  <strong>Cultural Practice Advice:</strong> {activeDiagnosis.prescription.culturalPractice}
                </div>

                {/* Action Buttons to update system */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    onClick={handleApplyPrescription}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Spray into Zone Treatment History</span>
                  </button>

                  <button
                    onClick={handleRemedialIrrigate}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Run Remedial Drip Irrigation</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Camera Feeds from Monitored Farm Quadrants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Field Camera Feeds — 1-Acre Quadrant Nodes</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Click any camera stream to run deep neural inference
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {zones.map((zone) => {
            const agronomy = zone.agronomy;
            const status = zone.analysis?.plantStatus || 'Healthy';

            return (
              <div 
                key={zone.zoneId} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group cursor-pointer"
                onClick={() => {
                  setSelectedZoneTarget(zone.zoneId);
                  runInference(zone.sensorData.imageUrl, zone.cropType);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="relative h-56 overflow-hidden bg-slate-900">
                  <img 
                    src={zone.sensorData.imageUrl} 
                    alt={`${zone.cropType} in ${zone.name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{zone.sensorData.deviceId || 'ESP32-CAM'}</span>
                  </div>
                  
                  <div className={`absolute top-3 right-3 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                    status === 'Healthy' ? 'bg-emerald-500 text-white' : 
                    status === 'Attention' ? 'bg-amber-400 text-amber-950' : 
                    'bg-rose-500 text-white'
                  }`}>
                    Health: {zone.analysis.overallHealthScore}%
                  </div>

                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                    <span>Inspect with AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-black text-slate-900">
                        {zone.name} — {zone.cropType}
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">
                        {agronomy?.quadrant || '0.25 Acre'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 italic mb-3">
                      {agronomy?.crop?.variety || 'Hybrid Cultivar'} • Day {agronomy?.crop?.daysAfterSowing || 45}
                    </p>
                    
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Canopy Moisture:</span>
                        <strong>{zone.sensorData.soilMoisture.toFixed(0)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Thermal Reading:</span>
                        <strong>{zone.sensorData.airTemperature.toFixed(1)}°C</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Visual Assessment:</span>
                        <strong className={status === 'Healthy' ? 'text-emerald-700' : status === 'Attention' ? 'text-amber-700' : 'text-rose-700'}>
                          {zone.analysis.plantStatus}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>7-Day Health Trend</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span>Click to scan with ML</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
