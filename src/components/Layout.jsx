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
  Menu, 
  X, 
  Package, 
  ShieldCheck, 
  Activity, 
  Globe, 
  Download,
  Gauge,
  Wifi,
  Scale,
  MoreHorizontal,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Layout() {
  const location = useLocation();
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
    usbPort,
    farmLocation
  } = useFarmData();

  // Mobile "More" drawer state
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  const isTe = language === 'te';
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  // Primary navigation for Desktop Sidebar
  const allNavItems = [
    { name: t('nav_dashboard', 'Dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav_farm_map', 'Farm Map'), path: '/map', icon: Map, sub: isTe ? 'పొలం పటం' : 'Field Overview' },
    { name: t('nav_plant_vision', 'Plant Vision'), path: '/vision', icon: Sprout, sub: isTe ? 'తెగుళ్ల గుర్తింపు' : 'Crop Vision' },
    { name: t('nav_ai_insights', 'AI Insights'), path: '/insights', icon: Brain, sub: isTe ? 'రైతు సలహాదారు' : 'Farming Copilot' },
    { name: t('nav_analytics', 'Analytics'), path: '/analytics', icon: BarChart3, sub: isTe ? 'గణాంకాలు & పోకడలు' : 'Sensor Analytics' },
    { name: t('nav_inventory', 'Inventory'), path: '/inventory', icon: Package, sub: isTe ? 'నిల్వలు & ఖర్చులు (₹)' : 'Supplies & Expenses (₹)' },
    { name: t('nav_alerts', 'Alerts'), path: '/alerts', icon: Bell, badge: activeAlertsCount },
    { name: t('nav_data_sources', 'Data Sources'), path: '/data-sources', icon: Database, sub: isTe ? 'హార్డ్‌వేర్ & క్లౌడ్' : 'Hardware & Cloud' },
    { name: t('nav_settings', 'Settings'), path: '/settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Bar (5 core items)
  const mobileBottomTabs = [
    { name: isTe ? 'హోమ్' : 'Home', path: '/', icon: LayoutDashboard },
    { name: isTe ? 'పటం' : 'Map', path: '/map', icon: Map },
    { name: isTe ? 'గణాంకాలు' : 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: isTe ? 'AI సలహా' : 'AI Copilot', path: '/insights', icon: Brain }
  ];

  // "More" Drawer Items (Secondary sections)
  const mobileMoreItems = [
    { name: isTe ? 'తెగుళ్ల గుర్తింపు' : 'Plant Vision', path: '/vision', icon: Sprout, desc: isTe ? 'కెమెరా ద్వారా పంట వ్యాధి గుర్తింపు' : 'AI crop disease diagnostics' },
    { name: isTe ? 'నిల్వలు & ఖర్చులు (₹)' : 'Inventory & Expenses', path: '/inventory', icon: Package, desc: isTe ? 'విత్తనాలు, ఎరువులు, పరికరాలు & ఖర్చులు' : 'Seeds, fertilizers & expenses in ₹ INR' },
    { name: isTe ? 'హెచ్చరికలు' : 'Alerts', path: '/alerts', icon: Bell, badge: activeAlertsCount, desc: isTe ? 'తేమ లోపం మరియు క్లిష్టమైన హెచ్చరికలు' : 'Field alarms & sensor anomalies' },
    { name: isTe ? 'హార్డ్‌వేర్ & ESP32' : 'Data Sources', path: '/data-sources', icon: Database, desc: isTe ? 'COM7 సీరియల్ & లైవ్ టెలిమెట్రీ' : 'USB Serial COM7 & ESP32 connection' },
    { name: isTe ? 'అమరికలు' : 'Settings', path: '/settings', icon: Settings, desc: isTe ? 'భాష, యూనిట్లు & AI మోడల్ సెట్టింగ్స్' : 'AI keys, language & unit options' },
  ];

  // Check if current route is inside the "More" menu
  const isCurrentRouteInMore = mobileMoreItems.some(item => location.pathname === item.path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-glow-emerald">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-white">SmartFarm AI</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
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
      
      {/* Desktop Sidebar (Preserved exactly for md: and desktop) */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 flex-col shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full bg-slate-50 relative">
        
        {/* Responsive Header */}
        <header className="min-h-14 sm:h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-2xs z-20">
          
          {/* Left: Brand & Farm Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Brand Icon */}
            <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Sprout className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-none">
                  {farmLocation?.name || 'Green Valley Farm'}
                </h2>
                {operatingMode === 'live_hardware' && (
                  <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full font-mono font-bold border shrink-0 ${
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
                    <span className="hidden sm:inline">
                      {hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale 
                        ? `ESP32 (${hardwareData?.port || 'LIVE'})` 
                        : (hardwareData?.isStale ? `STALE` : (hardwareData?.connectionStatus === 'waiting_data' ? 'USB WAITING' : 'USB OFFLINE'))}
                    </span>
                    <span className="sm:hidden">
                      {hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </span>
                )}
                {operatingMode === 'simulation' && (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono font-bold border border-purple-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    SIM
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate hidden sm:inline">
                {farmLocation?.isLive ? `${farmLocation.displayLocation} • Field 1` : 'Field 1 • 1.00 Acre (4 Zones)'}
              </span>
            </div>
          </div>

          {/* Right: Controls & Language */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs shrink-0">
            
            {/* Water Loss Metric (Desktop only) */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              <span>Water Loss:</span>
              <strong className="font-mono font-bold text-blue-700">{faoEt0} mm/day</strong>
            </div>

            {/* Crop Health Score (Desktop only) */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Crop Health:</span>
              <strong className="font-mono font-bold text-emerald-700">{globalGap.ipmScore}%</strong>
            </div>

            {/* Unit Toggle Button */}
            <button
              onClick={toggleUnitSystem}
              title={`Switch Unit System (Currently: ${unitSystem === 'metric' ? 'Metric (°C)' : 'Imperial (°F)'})`}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] sm:text-xs font-bold transition-all border border-slate-300/70 touch-target-min cursor-pointer active:scale-95"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold">{unitSystem === 'metric' ? '°C' : '°F'}</span>
            </button>

            {/* Language Selector (Touch Friendly) */}
            <div className="relative flex items-center">
              <label htmlFor="lang-select" className="sr-only">Select Language</label>
              <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none" />
              <select
                id="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-6 sm:pl-7 pr-2 sm:pr-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] sm:text-xs font-bold border border-slate-300/70 focus:outline-none cursor-pointer touch-target-min"
              >
                <option value="en">EN</option>
                <option value="te">తెలుగు</option>
              </select>
            </div>

            {/* Alerts Pill Icon on Mobile Header */}
            {activeAlertsCount > 0 && (
              <NavLink
                to="/alerts"
                className="relative md:hidden p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 touch-target-min flex items-center justify-center"
                title={`${activeAlertsCount} active farm alerts`}
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              </NavLink>
            )}

            {/* Export CSV Button (Tablet & Desktop) */}
            <button
              onClick={downloadAuditCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer touch-target-min"
              title="Download Farm Report in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Export CSV</span>
            </button>
          </div>
        </header>
        
        {/* Page Content Body (with pb-24 on mobile so bottom bar never obstructs content) */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 lg:p-8 bg-slate-50/70 w-full pb-24 md:pb-6">
          <Outlet />
        </div>

        {/* ======================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Compact & Touch Friendly)   */}
        {/* ======================================================== */}
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg safe-area-bottom"
        >
          <div className="grid grid-cols-5 h-14">
            
            {/* 4 Primary Navigation Tabs */}
            {mobileBottomTabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-all touch-target-min select-none relative ${
                    isActive 
                      ? 'text-emerald-700 font-black' 
                      : 'text-slate-500 hover:text-slate-800 font-semibold'
                  }`}
                >
                  {/* Active Top Accent Bar */}
                  {isActive && (
                    <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-emerald-600" />
                  )}
                  <tab.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] tracking-tight leading-tight truncate px-1">
                    {tab.name}
                  </span>
                </NavLink>
              );
            })}

            {/* 5th Tab: "More" Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all touch-target-min select-none relative cursor-pointer ${
                isMoreMenuOpen || isCurrentRouteInMore 
                  ? 'text-emerald-700 font-black' 
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              {(isMoreMenuOpen || isCurrentRouteInMore) && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-emerald-600" />
              )}
              <div className="relative">
                <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreMenuOpen || isCurrentRouteInMore ? 'scale-110 text-emerald-600' : 'text-slate-500'}`} />
                {activeAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-tight truncate px-1">
                {isTe ? 'మరిన్ని' : 'More'}
              </span>
            </button>

          </div>
        </nav>

        {/* ======================================================== */}
        {/* MOBILE "MORE" SLIDE-UP DRAWER (Bottom Sheet)             */}
        {/* ======================================================== */}
        {isMoreMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            
            {/* Backdrop Blur */}
            <div 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsMoreMenuOpen(false)}
            />

            {/* Slide-Up Panel */}
            <div className="relative bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-5 pt-4 max-h-[82vh] overflow-y-auto animate-slideUp safe-area-bottom">
              
              {/* Drag Pill Handle */}
              <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {isTe ? 'మరిన్ని ఫీచర్లు & విభాగాలు' : 'More Farm Tools & Sections'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isTe ? 'అన్ని అదనపు నిర్వహణ సాధనాలు' : 'Complete smart agriculture toolkit'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-target-min flex items-center justify-center cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="py-2 space-y-1">
                {mobileMoreItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all touch-target-min ${
                        isActive
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isActive 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{item.name}</span>
                          {item.badge > 0 && (
                            <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </NavLink>
                  );
                })}
              </div>

              {/* Quick Action: Export CSV on Mobile */}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    downloadAuditCSV();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm touch-target-min"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{isTe ? 'ఫార్మ్ రిపోర్ట్ డౌన్‌లోడ్ (CSV)' : 'Download Farm CSV Report'}</span>
                </button>
              </div>

              {/* Quick Gateway Status Pill in Drawer */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  {isTe ? 'సెన్సార్ గేట్‌వే:' : 'Sensor Gateway:'}
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {operatingMode === 'live_hardware' 
                    ? (hardwareData?.connectionStatus === 'connected' ? `COM7 Connected` : 'USB Disconnected') 
                    : 'Simulation Active'}
                </span>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
