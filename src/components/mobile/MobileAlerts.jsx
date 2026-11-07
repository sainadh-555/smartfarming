import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  CheckCircle2, 
  Bell, 
  Check, 
  Filter 
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';

export default function MobileAlerts() {
  const { alerts = [], resolveAlert, language } = useFarmData();
  const isTe = language === 'te';
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'Critical': return <AlertOctagon className="w-5 h-5 text-rose-600" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (severity) => {
    switch(severity) {
      case 'Critical': 
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          borderLeft: 'border-l-4 border-l-rose-600'
        };
      case 'Warning': 
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          borderLeft: 'border-l-4 border-l-amber-500'
        };
      default: 
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          borderLeft: 'border-l-4 border-l-blue-500'
        };
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'ACTIVE') return !alert.resolved;
    if (filterSeverity === 'RESOLVED') return alert.resolved;
    return alert.severity.toUpperCase() === filterSeverity;
  });

  return (
    <div className="space-y-3 pb-6 max-w-lg mx-auto">
      
      {/* Priority Filter Bar */}
      <section className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: isTe ? 'అన్నీ' : 'All Alerts' },
            { id: 'ACTIVE', label: isTe ? 'క్రియాశీల' : 'Active' },
            { id: 'Critical', label: isTe ? 'తీవ్రమైనవి' : 'Critical' },
            { id: 'Warning', label: isTe ? 'హెచ్చరికలు' : 'Warnings' },
            { id: 'RESOLVED', label: isTe ? 'పరిష్కరించబడినవి' : 'Resolved' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterSeverity(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target-min cursor-pointer ${
                filterSeverity === f.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Alerts List */}
      <div className="space-y-2.5">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => {
            const p = getPriorityBadge(alert.severity);

            return (
              <div 
                key={alert.id}
                className={`bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs ${p.borderLeft} flex flex-col justify-between gap-2.5 transition-all`}
              >
                {/* Header: Zone, Severity Badge, Time */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.severity)}
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">
                        {alert.zoneId || 'Farm Zone'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {alert.timestamp || 'Real-Time'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${p.bg}`}>
                    {alert.severity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {alert.message || alert.description}
                </p>

                {/* Actionable Recommendation & Resolve Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 truncate">
                    👉 {alert.action || (isTe ? 'సెన్సార్ తనిఖీ చేయండి' : 'Check field conditions')}
                  </span>

                  {!alert.resolved ? (
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 touch-target-min"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isTe ? 'పరిష్కరించండి' : 'Resolve'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isTe ? 'పరిష్కరించబడింది' : 'Resolved'}</span>
                    </span>
                  )}
                </div>

              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              {isTe ? 'అన్నీ సాధారణ స్థితిలో ఉన్నాయి' : 'All Clear — No Active Alerts'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTe ? 'మీ పొలంలో ఎటువంటి సమస్యలు లేవు' : 'All soil moisture and climate parameters optimal.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

