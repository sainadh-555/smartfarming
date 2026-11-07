import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sprout, Bell, Settings, Globe } from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';

export default function MobileHeader() {
  const { 
    farmLocation, 
    alerts, 
    language, 
    setLanguage, 
    operatingMode, 
    hardwareData 
  } = useFarmData();

  const isTe = language === 'te';
  const activeAlertsCount = (alerts || []).filter(a => !a.resolved).length;
  const isConnected = operatingMode === 'live_hardware' && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale;

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 shadow-2xs safe-area-top">
      <div className="flex items-center justify-between gap-2">
        
        {/* Brand & Farm Name */}
        <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Sprout className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                {farmLocation?.name || 'Green Valley'}
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              SmartFarm AI • {farmLocation?.displayLocation || 'Precision Farm'}
            </span>
          </div>
        </NavLink>

        {/* Right Utility Icons: Language, Alerts, Profile/Settings */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Compact Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
            className="px-2 py-1.5 rounded-lg text-[11px] font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 touch-target-min"
            title={isTe ? 'Switch to English' : 'తెలుగులోకి మారండి'}
          >
            <Globe className="w-3 h-3 text-slate-500" />
            <span>{language === 'en' ? 'తెలుగు' : 'EN'}</span>
          </button>

          {/* Alerts Notification Bell */}
          <NavLink
            to="/alerts"
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center touch-target-min active:scale-95"
            title={isTe ? 'హెచ్చరికలు' : 'Alerts'}
          >
            <Bell className="w-5 h-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
                {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
              </span>
            )}
          </NavLink>

          {/* Profile / Settings Icon */}
          <NavLink
            to="/settings"
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center touch-target-min active:scale-95"
            title={isTe ? 'అమరికలు' : 'Settings'}
          >
            <Settings className="w-5 h-5 text-slate-700" />
          </NavLink>

        </div>

      </div>
    </header>
  );
}

