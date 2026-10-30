import React, { useState } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Check, 
  X, 
  Sparkles, 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { SIMULATION_PRESETS } from '../ai/farmDecisionEngine';

export default function SimulationControlPanel({ className = '' }) {
  const {
    operatingMode,
    sourceLabel,
    simulationData,
    simulationBaseline,
    manualData,
    simulationDeltas,
    hardwareData,
    updateSimulationData,
    updateManualData,
    resetSimulationToBaseline,
    resetSimulationToDefaults,
    applyScenarioPreset,
    exitSimulation
  } = useFarmData();

  const isManual = operatingMode === 'manual';
  const activeData = isManual ? manualData : simulationData;
  const updateHandler = isManual ? updateManualData : updateSimulationData;

  const [appliedFeedback, setAppliedFeedback] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Local state for immediate smooth slider feel before flushing
  const handleSliderChange = (field, val) => {
    setActivePreset(null);
    updateHandler({ [field]: parseFloat(val) });
  };

  const handlePresetClick = (presetKey) => {
    setActivePreset(presetKey);
    applyScenarioPreset(presetKey);
    triggerAppliedNotice();
  };

  const triggerAppliedNotice = () => {
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  const hasRealBaseline = simulationBaseline?.hasRealBaseline && hardwareData.hasReadings;

  return (
    <div className={`bg-white rounded-2xl border-2 ${isManual ? 'border-amber-400' : 'border-purple-400'} shadow-lg overflow-hidden transition-all ${className}`}>
      
      {/* Header Bar */}
      <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between text-white gap-3 ${
        isManual 
          ? 'bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950' 
          : 'bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-white shadow-xs ${isManual ? 'bg-amber-600' : 'bg-purple-600'}`}>
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isManual ? 'Manual Sensor Input Panel' : 'Real-Data-Based Simulation Control'}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isManual 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              }`}>
                {sourceLabel}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isManual 
                ? 'Directly set customized sensor conditions without an ESP32.' 
                : hasRealBaseline 
                ? `Simulating from real ESP32 baseline captured at ${simulationBaseline.capturedAt || 'recently'}. Original hardware data remains untouched.`
                : 'No physical hardware data available yet. Operating with synthetic baseline.'}
            </p>
          </div>
        </div>

        {/* Global Exit & Quick Reset */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => {
              if (hasRealBaseline) resetSimulationToBaseline();
              else resetSimulationToDefaults();
              triggerAppliedNotice();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
            title={hasRealBaseline ? 'Reset to real ESP32 baseline values' : 'Reset to default values'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{hasRealBaseline ? 'Reset to Baseline' : 'Reset Defaults'}</span>
          </button>

          <button
            onClick={exitSimulation}
            className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
            title="Exit simulation and return to live hardware"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Simulation</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
        isManual 
          ? 'bg-amber-50/90 text-amber-900 border-amber-200' 
          : hasRealBaseline 
          ? 'bg-purple-50/90 text-purple-900 border-purple-200' 
          : 'bg-blue-50/90 text-blue-900 border-blue-200'
      }`}>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            {isManual ? (
              <strong>Manual Mode:</strong>
            ) : hasRealBaseline ? (
              <strong>Real Baseline Connected:</strong>
            ) : (
              <strong>Notice:</strong>
            )}
            {' '}
            {isManual 
              ? 'All farm health, irrigation needs, and alerts recalculate instantly from your manual inputs.' 
              : hasRealBaseline 
              ? `Real ESP32 readings (Zone A) are preserved as immutable ground truth. All changes here are simulated deltas.`
              : 'Connect an ESP32 in "Live Hardware" mode to capture a real baseline, or adjust below for manual simulation.'}
          </span>
        </div>

        {appliedFeedback && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shrink-0 animate-pulse">
            <Check className="w-3.5 h-3.5" /> Applied!
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        
        {/* 4 Interactive Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* 1. Temperature */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-600" />
                <span>Air Temperature</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">20–45 °C</span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="0.5"
                min="20.0"
                max="45.0"
                value={activeData.temperature ?? 28.0}
                onChange={(e) => handleSliderChange('temperature', e.target.value)}
                className="w-20 px-2.5 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <span className="text-xs font-bold text-slate-500">°C</span>
            </div>

            <input 
              type="range"
              min="20.0"
              max="45.0"
              step="0.5"
              value={activeData.temperature ?? 28.0}
              onChange={(e) => handleSliderChange('temperature', e.target.value)}
              className="w-full accent-amber-600 cursor-pointer"
            />

            {/* Baseline Delta comparison */}
            {!isManual && simulationDeltas?.temperature && (
              <div className="pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between font-mono">
                <span className="text-slate-500">
                  Actual: <strong>{simulationDeltas.temperature.baseline !== null ? `${simulationDeltas.temperature.baseline}°C` : 'N/A'}</strong>
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded ${
                  simulationDeltas.temperature.diff > 0 
                    ? 'bg-rose-100 text-rose-800' 
                    : (simulationDeltas.temperature.diff < 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700')
                }`}>
                  Diff: {simulationDeltas.temperature.formattedDiff || simulationDeltas.temperature.text}
                </span>
              </div>
            )}
          </div>

          {/* 2. Soil Moisture */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Soil Moisture</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">0–100 %</span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="1"
                min="0"
                max="100"
                value={activeData.soilMoisture ?? 45}
                onChange={(e) => handleSliderChange('soilMoisture', e.target.value)}
                className="w-20 px-2.5 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>

            <input 
              type="range"
              min="0"
              max="100"
              step="1"
              value={activeData.soilMoisture ?? 45}
              onChange={(e) => handleSliderChange('soilMoisture', e.target.value)}
              className="w-full accent-blue-600 cursor-pointer"
            />

            {/* Baseline Delta comparison */}
            {!isManual && simulationDeltas?.soilMoisture && (
              <div className="pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between font-mono">
                <span className="text-slate-500">
                  Actual: <strong>{simulationDeltas.soilMoisture.baseline !== null ? `${simulationDeltas.soilMoisture.baseline}%` : 'N/A'}</strong>
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded ${
                  simulationDeltas.soilMoisture.diff > 0 
                    ? 'bg-blue-100 text-blue-800' 
                    : (simulationDeltas.soilMoisture.diff < 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                }`}>
                  Diff: {simulationDeltas.soilMoisture.formattedDiff || simulationDeltas.soilMoisture.text}
                </span>
              </div>
            )}
          </div>

          {/* 3. Humidity */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-teal-600" />
                <span>Relative Humidity</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">20–100 %</span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="1"
                min="20"
                max="100"
                value={activeData.humidity ?? 60}
                onChange={(e) => handleSliderChange('humidity', e.target.value)}
                className="w-20 px-2.5 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>

            <input 
              type="range"
              min="20"
              max="100"
              step="1"
              value={activeData.humidity ?? 60}
              onChange={(e) => handleSliderChange('humidity', e.target.value)}
              className="w-full accent-teal-600 cursor-pointer"
            />

            {/* Baseline Delta comparison */}
            {!isManual && simulationDeltas?.humidity && (
              <div className="pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between font-mono">
                <span className="text-slate-500">
                  Actual: <strong>{simulationDeltas.humidity.baseline !== null ? `${simulationDeltas.humidity.baseline}%` : 'N/A'}</strong>
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded ${
                  simulationDeltas.humidity.diff > 0 
                    ? 'bg-teal-100 text-teal-800' 
                    : (simulationDeltas.humidity.diff < 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                }`}>
                  Diff: {simulationDeltas.humidity.formattedDiff || simulationDeltas.humidity.text}
                </span>
              </div>
            )}
          </div>

          {/* 4. Light Intensity */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-yellow-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-yellow-600" />
                <span>Light Intensity</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">0–100 %</span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="1"
                min="0"
                max="100"
                value={activeData.lightIntensity ?? 65}
                onChange={(e) => handleSliderChange('lightIntensity', e.target.value)}
                className="w-20 px-2.5 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
              />
              <span className="text-xs font-bold text-slate-500">% rel</span>
            </div>

            <input 
              type="range"
              min="0"
              max="100"
              step="1"
              value={activeData.lightIntensity ?? 65}
              onChange={(e) => handleSliderChange('lightIntensity', e.target.value)}
              className="w-full accent-yellow-600 cursor-pointer"
            />

            {/* Baseline Delta comparison */}
            {!isManual && simulationDeltas?.lightIntensity && (
              <div className="pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between font-mono">
                <span className="text-slate-500">
                  Actual: <strong>{simulationDeltas.lightIntensity.baseline !== null ? `${simulationDeltas.lightIntensity.baseline}%` : 'N/A'}</strong>
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded ${
                  simulationDeltas.lightIntensity.diff > 0 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : (simulationDeltas.lightIntensity.diff < 0 ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-700')
                }`}>
                  Diff: {simulationDeltas.lightIntensity.formattedDiff || simulationDeltas.lightIntensity.text}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* 6 Simulation Scenario Presets */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Simulation Scenario Presets (Click to Test Agronomic Reactions)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Adjusts simulated values while leaving hardware baseline intact
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(SIMULATION_PRESETS).map(([key, preset]) => {
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetClick(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 group ${
                    isSelected
                      ? 'bg-purple-900 text-white border-purple-700 shadow-md ring-2 ring-purple-400/50'
                      : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:shadow-xs'
                  }`}
                >
                  <strong className={`block text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-purple-700'}`}>
                    {preset.name}
                  </strong>
                  <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                    {preset.temperature}°C • {preset.soilMoisture}% M
                  </div>
                  <span className={`block text-[9px] truncate mt-0.5 ${isSelected ? 'text-purple-300' : 'text-slate-400'}`}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerAppliedNotice();
              }}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Simulation</span>
            </button>

            {hasRealBaseline ? (
              <button
                type="button"
                onClick={() => {
                  resetSimulationToBaseline();
                  triggerAppliedNotice();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to ESP32 Baseline</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetSimulationToDefaults();
                  triggerAppliedNotice();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Defaults</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Mode: <strong>{operatingMode.toUpperCase()}</strong> • Source: <strong>{sourceLabel}</strong>
          </div>
        </div>

      </div>

    </div>
  );
}
