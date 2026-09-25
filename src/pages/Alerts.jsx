import React from 'react';
import { useFarmData } from '../context/FarmContext';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function Alerts() {
  const { alerts, resolveAlert } = useFarmData();

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'Critical': return <AlertOctagon className="w-6 h-6 text-red-600" />;
      case 'Warning': return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'Information': return <Info className="w-6 h-6 text-blue-600" />;
      default: return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  const getAlertStyle = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-red-50 border-red-200';
      case 'Warning': return 'bg-orange-50 border-orange-200';
      case 'Information': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Alerts</h1>
        <p className="text-gray-500">Real-time notifications and AI-generated warnings.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
            <p className="text-lg font-medium">All systems normal</p>
            <p className="text-sm mt-1">No active alerts to display.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-5 flex items-start gap-4 transition-colors ${alert.resolved ? 'bg-gray-50 opacity-60' : getAlertStyle(alert.severity)}`}
              >
                <div className="shrink-0 mt-1">
                  {getAlertIcon(alert.severity)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900">
                      {alert.zoneName} - {alert.severity}
                    </h4>
                    <span className="text-xs text-gray-500 font-medium">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">
                    {alert.message}
                  </p>
                  
                  {!alert.resolved && (
                    <button 
                      onClick={() => resolveAlert(alert.id)}
                      className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  {alert.resolved && (
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
