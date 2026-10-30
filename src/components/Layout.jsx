import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Sprout, 
  Brain, 
  BarChart3, 
  Bell, 
  Database, 
  Settings, 
  Menu, 
  X, 
  Package, 
  ShieldCheck, 
  Activity, 
  Globe, 
  Download,
  Gauge,
  Wifi,
  Scale
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Layout() {
  const { 
    operatingMode,
    sourceLabel,
    hardwareData,
    startRealSimulation,
    exitSimulation,
    alerts,
    unitSystem,
    toggleUnitSystem,
    language,
    setLanguage,
    t,
    faoEt0,
    globalGap,
    downloadAuditCSV,
    isLiveHardware,
    lastHardwareSync,
    dataMode,
    usbStatus,
    usbPort
  } = useFarmData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Farm Map', path: '/map', icon: Map, sub: 'Field Overview' },
    { name: 'Plant Vision', path: '/vision', icon: Sprout, sub: 'Disease Detection' },
    { name: 'AI Insights', path: '/insights', icon: Brain, sub: 'Farming Copilot' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, sub: 'Sensor Analytics' },
    { name: 'Inventory', path: '/inventory', icon: Package, sub: 'Seeds & Supplies' },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: activeAlertsCount },
    { name: 'Data Sources', path: '/data-sources', icon: Database, sub: 'Hardware & Cloud' },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-glow-emerald">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-white">SmartFarm AI</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Smart Farming System</p>
            </div>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
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
      
      {/* Telemetry Status & Simulation */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sensor Gateway</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 animate-pulse" /> 10 Hz
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

          {operatingMode === 'simulation' || operatingMode === 'manual' ? (
            <button 
              onClick={exitSimulation}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
            >
              Exit Simulation
            </button>
          ) : (
            <button 
              onClick={startRealSimulation}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Simulate Data
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 flex-col shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-slate-800 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full bg-slate-50">
        {/* Global Enterprise Header */}
        <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-2xs z-20">
          
          {/* Left: Mobile Toggle & Farm Identity */}
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Green Valley Farm</h2>
                {operatingMode === 'live_hardware' && (
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : (hardwareData?.isStale
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : (hardwareData?.connectionStatus === 'waiting_data' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300'))
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                        ? 'bg-emerald-600 animate-ping' 
                        : (hardwareData?.isStale ? 'bg-orange-500' : (hardwareData?.connectionStatus === 'waiting_data' ? 'bg-amber-600 animate-pulse' : 'bg-rose-600'))
                    }`} />
                    {hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                      ? `ESP32 USB (${hardwareData?.port || 'LIVE'})` 
                      : (hardwareData?.isStale ? `STALE (${hardwareData?.lastUpdated})` : (hardwareData?.connectionStatus === 'waiting_data' ? 'USB WAITING' : 'USB OFFLINE'))}
                  </span>
                )}
                {operatingMode === 'simulation' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold border border-purple-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    SIMULATION
                  </span>
                )}
                {operatingMode === 'manual' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    MANUAL INPUT
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Field 1 • 1.00 Acre (4 Zones)
              </span>
            </div>
          </div>

          {/* Right: Status Tickers, Unit Switcher, Language & Export */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            
            {/* Water Loss Metric */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              <span>Water Loss:</span>
              <strong className="font-mono font-bold text-blue-700">{faoEt0} mm/day</strong>
            </div>

            {/* Crop Health Score Indicator */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Crop Health:</span>
              <strong className="font-mono font-bold text-emerald-700">{globalGap.ipmScore}%</strong>
            </div>

            {/* Unit Toggle (Metric SI ⟷ Imperial US) */}
            <button
              onClick={toggleUnitSystem}
              title={`Switch Unit System (Currently: ${unitSystem === 'metric' ? 'Metric (°C, mm, ha)' : 'Imperial (°F, in, ac)'})`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-300/70"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-medium">{unitSystem === 'metric' ? 'Metric (°C)' : 'Imperial (°F)'}</span>
            </button>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <label htmlFor="lang-select" className="sr-only">Select Language</label>
              <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none" />
              <select
                id="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-7 pr-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300/70 focus:outline-none cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="hi">हिन्दी</option>
                <option value="te">తెలుగు</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={downloadAuditCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Download Farm Report in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Agronomist Avatar */}
            <div 
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-slate-200"
              title="Certified Farm Agronomist (CCA / FAO Lead)"
            >
              FA
            </div>
          </div>
        </header>
        
        {/* Page Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
