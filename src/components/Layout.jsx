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
    isSimulationRunning, 
    startSimulation, 
    stopSimulation, 
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
    lastHardwareSync
  } = useFarmData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Farm Map', path: '/map', icon: Map, sub: '0.25 Ac Zones' },
    { name: 'Plant Vision', path: '/vision', icon: Sprout, sub: 'EPPO AI Vision' },
    { name: 'AI Insights', path: '/insights', icon: Brain, sub: 'Agronomist Copilot' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, sub: 'FAO-56 Trends' },
    { name: 'Inventory', path: '/inventory', icon: Package, sub: 'GAP Agrochemicals' },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: activeAlertsCount },
    { name: 'Data Sources', path: '/data-sources', icon: Database, sub: 'ISO 11783' },
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
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Precision Ag</p>
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
      
      {/* Standards Compliance Banner */}
      <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="text-[11px]">
          <span className="font-semibold text-slate-200">ISO 11783 & GlobalG.A.P.</span>
          <p className="text-[10px] text-emerald-400/90 font-mono">IFA v6.0 Compliant</p>
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ISOBUS Gateway</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 animate-pulse" /> 10 Hz
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <span className={`w-2 h-2 shrink-0 rounded-full ${
              isLiveHardware 
                ? 'bg-emerald-400 animate-ping' 
                : (isSimulationRunning ? 'bg-blue-400 animate-ping' : 'bg-slate-500')
            }`}></span>
            <span className="text-xs font-medium text-slate-200 truncate">
              {isLiveHardware ? 'ESP32 Live Hardware' : (isSimulationRunning ? 'Live IoT Stream' : 'Standby Mode')}
            </span>
          </div>

          {isSimulationRunning ? (
            <button 
              onClick={stopSimulation}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
            >
              Pause Stream
            </button>
          ) : (
            <button 
              onClick={startSimulation}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Start Live Stream
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
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Green Valley Precision Farm</h2>
                <span className="hidden xl:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> GlobalG.A.P. Certified
                </span>
                {isLiveHardware && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    ESP32 LIVE
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Cadastral ID: <strong>WGS84 16.5062°N, 80.6480°E</strong> (1.00 Acre / 0.40 ha)
              </span>
            </div>
          </div>

          {/* Right: Global Standards Tickers, Unit Switcher, Language & Audit CSV */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            
            {/* FAO-56 Evapotranspiration Metric */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              <span>FAO-56 ET₀:</span>
              <strong className="font-mono font-bold text-blue-700">{faoEt0} mm/day</strong>
            </div>

            {/* GlobalG.A.P. Score Indicator */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>IPM Compliance:</span>
              <strong className="font-mono font-bold text-emerald-700">{globalGap.ipmScore}%</strong>
            </div>

            {/* Unit Toggle (Metric SI ⟷ Imperial US) */}
            <button
              onClick={toggleUnitSystem}
              title={`Switch Unit System (Currently: ${unitSystem === 'metric' ? 'Metric SI (°C, mm, ha)' : 'Imperial US (°F, in, ac)'})`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-300/70"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-mono">{unitSystem === 'metric' ? 'SI Metric' : 'US Imper.'}</span>
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

            {/* Export GlobalG.A.P. Audit CSV Button */}
            <button
              onClick={downloadAuditCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              title="Download GlobalG.A.P. IFA v6.0 Inspection Audit Sheet in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audit CSV</span>
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
