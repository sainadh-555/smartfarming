import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Sprout, 
  Brain, 
  BarChart3, 
  Bell, 
  Database, 
  Settings, 
  Package, 
  Download,
  Wifi,
  Scale,
  Globe
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import MobileHeader from './mobile/MobileHeader';
import MobileNavBar from './mobile/MobileNavBar';

export default function Layout() {
  const location = useLocation();
  const { 
    operatingMode,
    hardwareData,
    alerts,
    unitSystem,
    toggleUnitSystem,
    language,
    setLanguage,
    t,
    downloadAuditCSV,
    farmLocation
  } = useFarmData();

  const isTe = language === 'te';
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  // Primary navigation for Desktop Sidebar
  const allNavItems = [
    { name: t('nav_dashboard', 'Dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav_farm_map', 'Farm Map'), path: '/map', icon: Map, sub: isTe ? 'పొలం పటం' : 'Field Overview' },
    { name: t('nav_plant_vision', 'Plant Vision'), path: '/vision', icon: Sprout, sub: isTe ? 'తెగుళ్ల గుర్తింపు' : 'Crop Vision' },
    { name: t('nav_ai_insights', 'Farm AI'), path: '/insights', icon: Brain, sub: isTe ? 'రైతు సలహాదారు' : 'Farming Copilot' },
    { name: t('nav_analytics', 'Analytics'), path: '/analytics', icon: BarChart3, sub: isTe ? 'గణాంకాలు & పోకడలు' : 'Sensor Analytics' },
    { name: t('nav_inventory', 'Inventory'), path: '/inventory', icon: Package, sub: isTe ? 'నిల్వలు & ఖర్చులు (₹)' : 'Supplies & Expenses (₹)' },
    { name: t('nav_alerts', 'Alerts'), path: '/alerts', icon: Bell, badge: activeAlertsCount },
    { name: t('nav_data_sources', 'Data Sources'), path: '/data-sources', icon: Database, sub: isTe ? 'హార్డ్‌వేర్ & క్లౌడ్' : 'Hardware & Cloud' },
    { name: t('nav_settings', 'Settings'), path: '/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-white">SmartFarm AI</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{isTe ? 'స్మార్ట్ ఫార్మింగ్ ప్లాట్‌ఫామ్' : 'Smart Farming Platform'}</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {allNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <div className="flex-1 truncate">
              <div>{item.name}</div>
              {item.sub && (
                <div className="text-[10px] opacity-60 font-normal truncate">{item.sub}</div>
              )}
            </div>
            {item.badge > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-bold py-0.5 px-2 rounded-full text-[10px] shadow-xs">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Telemetry Status Widget */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isTe ? 'సెన్సార్ స్థితి' : 'Sensor Gateway'}</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 animate-pulse" /> {isTe ? 'లైవ్' : 'Active'}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <span className={`w-2 h-2 shrink-0 rounded-full ${
              operatingMode === 'live_hardware'
                ? (hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale ? 'bg-emerald-400 animate-ping' : (hardwareData?.isStale ? 'bg-orange-400' : 'bg-rose-400'))
                : (operatingMode === 'simulation' ? 'bg-purple-400 animate-pulse' : 'bg-amber-400')
            }`}></span>
            <span className="text-xs font-medium text-slate-200 truncate">
              {operatingMode === 'live_hardware'
                ? (hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                    ? `ESP32 USB (${hardwareData?.port || 'LIVE'})` 
                    : (hardwareData?.isStale ? `Stale: ${hardwareData?.lastUpdated}` : 'Hardware Offline'))
                : (operatingMode === 'simulation' ? 'Simulation Engine' : 'Manual Override')}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Interface</span>
            <span className="text-slate-300">USB Serial Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Desktop Sidebar (Preserved exactly for desktop >= 1024px) */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 flex-col shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full bg-slate-50 relative">
        
        {/* Mobile Header (Rendered on mobile < 1024px) */}
        <MobileHeader />

        {/* Desktop Header (Preserved exactly on desktop >= 1024px) */}
        <header className="hidden lg:flex min-h-14 sm:h-16 bg-white border-b border-slate-200/90 items-center justify-between px-6 shrink-0 shadow-2xs z-20">
          
          {/* Left: Farm Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                  {farmLocation?.name || 'Green Valley Farm'}
                </h2>
                {operatingMode === 'live_hardware' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border shrink-0 ${
                    hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : (hardwareData?.isStale
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300')
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                        ? 'bg-emerald-600 animate-ping' 
                        : 'bg-rose-600'
                    }`} />
                    <span>
                      {hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                        ? `ESP32 (${hardwareData?.port || 'LIVE'})` 
                        : (hardwareData?.isStale ? `STALE` : 'USB OFFLINE')}
                    </span>
                  </span>
                )}
                {operatingMode === 'simulation' && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold border border-purple-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    SIMULATION
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {farmLocation?.displayLocation || 'Precision Agriculture Field'} • 1.00 Acre (4 Quadrants)
              </span>
            </div>
          </div>

          {/* Right: Controls & Language */}
          <div className="flex items-center gap-2.5 text-xs shrink-0">
            {/* Unit Toggle Button */}
            <button
              onClick={toggleUnitSystem}
              title={`Switch Unit System (Currently: ${unitSystem === 'metric' ? 'Metric (°C)' : 'Imperial (°F)'})`}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-300/70 cursor-pointer active:scale-95"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold">{unitSystem === 'metric' ? '°C' : '°F'}</span>
            </button>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <label htmlFor="lang-select-desktop" className="sr-only">Select Language</label>
              <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none" />
              <select
                id="lang-select-desktop"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300/70 focus:outline-none cursor-pointer"
              >
                <option value="en">English (EN)</option>
                <option value="te">తెలుగు (TE)</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={downloadAuditCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Download Farm Report in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </header>
        
        {/* Page Content Body (Safe-area padded on mobile so fixed bottom bar never obstructs content) */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8 bg-slate-50/70 w-full pb-20 lg:pb-6">
          <Outlet />
        </div>

        {/* Mobile Fixed Bottom Navigation Bar (5 Destinations per Section 2) */}
        <MobileNavBar />

      </main>
    </div>
  );
}

