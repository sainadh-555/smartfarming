import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Brain, 
  BarChart3, 
  MoreHorizontal, 
  Sprout, 
  Package, 
  Bell, 
  Database, 
  Settings, 
  ChevronRight, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';

export default function MobileNavBar() {
  const location = useLocation();
  const { language, alerts, downloadAuditCSV } = useFarmData();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isTe = language === 'te';
  const activeAlertsCount = (alerts || []).filter(a => !a.resolved).length;

  // The 5 fixed bottom navigation destinations per Section 2
  const navTabs = [
    { name: isTe ? 'హోమ్' : 'Home', path: '/', icon: LayoutDashboard },
    { name: isTe ? 'పటం' : 'Farm Map', path: '/map', icon: Map },
    { name: isTe ? 'Farm AI' : 'Farm AI', path: '/insights', icon: Brain },
    { name: isTe ? 'గణాంకాలు' : 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  // Secondary items located inside the "More" bottom sheet
  const moreItems = [
    { 
      name: isTe ? 'తెగుళ్ల గుర్తింపు (Plant Vision)' : 'Plant Vision', 
      path: '/vision', 
      icon: Sprout, 
      desc: isTe ? 'కెమెరా ద్వారా పంట వ్యాధి గుర్తింపు' : 'AI crop disease detection & health audit' 
    },
    { 
      name: isTe ? 'నిల్వలు & ఖర్చులు (₹)' : 'Inventory & Expenses', 
      path: '/inventory', 
      icon: Package, 
      desc: isTe ? 'విత్తనాలు, ఎరువులు & ఖర్చుల ట్రాకింగ్ (₹ INR)' : 'Stock management & input expenses in ₹ INR' 
    },
    { 
      name: isTe ? 'హెచ్చరికలు' : 'Alerts', 
      path: '/alerts', 
      icon: Bell, 
      badge: activeAlertsCount,
      desc: isTe ? 'తేమ లోపం మరియు క్రమరాహిత్యాల హెచ్చరికలు' : 'Field alarms & sensor anomalies' 
    },
    { 
      name: isTe ? 'డేటా మూలాలు & హార్డ్‌వేర్' : 'Data Sources & ESP32', 
      path: '/data-sources', 
      icon: Database, 
      desc: isTe ? 'USB Serial, Bluetooth LE & క్లౌడ్ సింక్' : 'USB Serial, Bluetooth LE & Cloud Sync' 
    },
    { 
      name: isTe ? 'అమరికలు' : 'Settings', 
      path: '/settings', 
      icon: Settings, 
      desc: isTe ? 'భాష, యూనిట్లు, పంట సమాచారం & AI కీస్' : 'Language, farm units & AI configurations' 
    },
  ];

  const isMoreActive = moreItems.some(item => location.pathname === item.path);

  return (
    <>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg safe-area-bottom select-none"
      >
        <div className="grid grid-cols-5 h-14">
          
          {/* 4 Primary Tabs */}
          {navTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all touch-target-min relative cursor-pointer ${
                  isActive 
                    ? 'text-emerald-700 font-black' 
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-emerald-600 shadow-xs" />
                )}
                <tab.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-600' : 'text-slate-500'}`} />
                <span className="text-[10px] tracking-tight leading-tight truncate px-0.5">
                  {tab.name}
                </span>
              </NavLink>
            );
          })}

          {/* 5th Destination: "More" Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all touch-target-min relative cursor-pointer ${
              isMoreOpen || isMoreActive
                ? 'text-emerald-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            {(isMoreOpen || isMoreActive) && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-emerald-600 shadow-xs" />
            )}
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreOpen || isMoreActive ? 'scale-110 text-emerald-600' : 'text-slate-500'}`} />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-tight truncate px-0.5">
              {isTe ? 'మరిన్ని' : 'More'}
            </span>
          </button>

        </div>
      </nav>

      {/* Slide-Up Bottom Sheet for "More" Menu */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Slide-Up Container */}
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-5 pt-4 max-h-[82vh] overflow-y-auto animate-slideUp safe-area-bottom">
            
            {/* Drag Pill Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-4" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isTe ? 'మరిన్ని విభాగాలు' : 'More Farm Sections'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTe ? 'అదనపు వ్యవసాయ నిర్వహణ సాధనాలు' : 'Precision agricultural management tools'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-target-min flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="py-2.5 space-y-1">
              {moreItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all touch-target-min cursor-pointer active:scale-98 ${
                      isActive
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
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
                          <span className="bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full text-[10px]">
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

            {/* Quick Action: Export CSV Report */}
            <div className="pt-3 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  downloadAuditCSV();
                  setIsMoreOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs touch-target-min cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isTe ? 'పొలం నివేదిక డౌన్‌లోడ్ (CSV)' : 'Export Farm Audit Report (CSV)'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

