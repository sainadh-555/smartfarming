import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Bell, 
  ShieldCheck, 
  Sparkles,
  Filter,
  Check
} from 'lucide-react';

export default function Alerts() {
  const { alerts, resolveAlert } = useFarmData();
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'Critical': return <AlertOctagon className="w-5 h-5 text-rose-600" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'Information': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getAlertStyle = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-rose-50/70 border-rose-200';
      case 'Warning': return 'bg-amber-50/70 border-amber-200';
      case 'Information': return 'bg-blue-50/70 border-blue-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'UNRESOLVED') return !alert.resolved;
    if (filterSeverity === 'RESOLVED') return alert.resolved;
    return alert.severity.toUpperCase() === filterSeverity;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Regulatory & Agronomic Audit Alerts
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ISO 11783-10
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time agro-climatic anomalies, moisture deficit triggers, and GlobalG.A.P. compliance flags.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {['ALL', 'UNRESOLVED', 'Critical', 'Warning'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterSeverity(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeverity === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' ? 'All Alerts' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-extrabold text-slate-800">All Precision Quadrants Normal</p>
            <p className="text-xs text-slate-400 mt-1">No active compliance or sensor alarms matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-5 flex items-start gap-4 transition-all ${alert.resolved ? 'bg-slate-50/50 opacity-60' : getAlertStyle(alert.severity)}`}
              >
                <div className="shrink-0 mt-0.5 p-2 bg-white rounded-xl shadow-2xs border border-slate-100">
                  {getAlertIcon(alert.severity)}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {alert.zoneName} — {alert.severity} Incident
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        alert.severity === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.type || alert.severity}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-700 leading-relaxed font-medium mb-3">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    {!alert.resolved ? (
                      <button 
                        onClick={() => resolveAlert(alert.id)}
                        className="text-xs font-bold px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Acknowledge & Resolve</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resolved</span>
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-slate-400">
                      Standard: ISO 11783-10 Exception
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
