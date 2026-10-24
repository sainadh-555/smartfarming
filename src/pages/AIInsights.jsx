import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import { BrainCircuit, CheckCircle2, MessageSquare, ListFilter, Sparkles, Bell } from 'lucide-react';
import AIAgronomistChat from '../components/AIAgronomistChat';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AIInsights() {
  const { zones } = useFarmData();
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'cards' | 'both'

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-50/80 border-rose-200 text-rose-950';
      case 'HIGH': return 'bg-orange-50/80 border-orange-200 text-orange-950';
      case 'MEDIUM': return 'bg-amber-50/80 border-amber-200 text-amber-950';
      default: return 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-200 text-rose-900 border border-rose-300';
      case 'HIGH': return 'bg-orange-200 text-orange-900 border border-orange-300';
      case 'MEDIUM': return 'bg-amber-200 text-amber-900 border border-amber-300';
      default: return 'bg-emerald-200 text-emerald-900 border border-emerald-300';
    }
  };

  const actionsRequired = zones.filter(z => z.analysis?.riskLevel !== 'LOW');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                AI Insights & Agronomist Copilot
              </h1>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Interactive AI Copilot with proactive notifications, real-time replies, and automated irrigation triggers.
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveView('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'chat'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Copilot Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveView('cards')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'cards'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Decision Cards ({actionsRequired.length})</span>
          </button>

          <button
            onClick={() => setActiveView('both')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hidden lg:flex items-center gap-1.5 ${
              activeView === 'both'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Split Studio</span>
          </button>
        </div>
      </div>

      {/* Main Container based on active view */}
      <div className={`grid gap-6 ${activeView === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* Chat Component Section */}
        {(activeView === 'chat' || activeView === 'both') && (
          <div className={activeView === 'both' ? 'lg:col-span-7' : 'w-full'}>
            <ErrorBoundary title="AI Agronomist Copilot Chat">
              <AIAgronomistChat />
            </ErrorBoundary>
          </div>
        )}

        {/* Decision Cards Section */}
        {(activeView === 'cards' || activeView === 'both') && (
          <div className={`space-y-4 ${activeView === 'both' ? 'lg:col-span-5' : 'max-w-4xl mx-auto w-full'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600" />
                <span>Automated Decision Cards</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Generated by Farm Decision Engine
              </span>
            </div>

            {actionsRequired.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <h4 className="text-base font-bold text-slate-900">Farm conditions are optimal</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  The AI engine analyzed all 4 quadrants and detected no urgent stress or required actions.
                </p>
              </div>
            ) : (
              actionsRequired.map(zone => (
                <div 
                  key={zone.zoneId} 
                  className={`border rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm ${getPriorityStyle(zone.analysis.riskLevel)}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getPriorityBadge(zone.analysis.riskLevel)}`}>
                          Priority: {zone.analysis.riskLevel}
                        </span>
                        <span className="font-bold text-sm text-slate-800">
                          {zone.name} — {zone.cropType}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">
                        "{zone.analysis.recommendedAction === 'IRRIGATE' ? 'Consider irrigation soon.' : 'Monitor plant condition.'}"
                      </h4>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 mb-3 border border-slate-200/50">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Analysis Reason:</h5>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">{zone.analysis.explanation}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-black/10 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Moisture</span>
                      <strong className="text-slate-900 font-bold">{zone.sensorData.soilMoisture.toFixed(0)}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <strong className="text-slate-900 font-bold">{zone.sensorData.airTemperature.toFixed(0)}°C</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Rain</span>
                      <strong className="text-slate-900 font-bold">{zone.sensorData.rainfall || 0} mm</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Health</span>
                      <strong className="text-emerald-700 font-black">{zone.analysis.overallHealthScore}%</strong>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Low Priority Items */}
            {zones.filter(z => z.analysis?.riskLevel === 'LOW').map(zone => (
              <div key={zone.zoneId} className="border border-slate-200 bg-white/70 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Priority: LOW
                  </span>
                  <span className="font-bold text-xs text-slate-700">{zone.name} — {zone.cropType}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-800">"Optimal Thresholds Maintained"</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">Parameters are within ideal range for {zone.cropType}.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
