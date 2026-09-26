import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Map, Sprout, Brain, BarChart3, Bell, Database, Settings, Menu, X, Package } from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Layout() {
  const { isSimulationRunning, startSimulation, stopSimulation, alerts } = useFarmData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Farm Map', path: '/map', icon: Map },
    { name: 'Plant Vision', path: '/vision', icon: Sprout },
    { name: 'AI Insights', path: '/insights', icon: Brain },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: activeAlertsCount },
    { name: 'Data Sources', path: '/data-sources', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-nature-600">
            <Sprout className="w-8 h-8 shrink-0" />
            <div>
              <h1 className="text-xl font-bold leading-tight">SmartFarm AI</h1>
              <p className="text-xs text-gray-500">AI-Powered Intelligence</p>
            </div>
          </div>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-nature-50 text-nature-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.name}
            {item.badge > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">System Status</p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${isSimulationRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-medium text-gray-700">
              {isSimulationRunning ? 'Live (Simulated)' : 'Offline / Standby'}
            </span>
          </div>
          {isSimulationRunning ? (
            <button 
              onClick={stopSimulation}
              className="w-full py-1.5 px-3 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Stop Demo
            </button>
          ) : (
            <button 
              onClick={startSimulation}
              className="w-full py-1.5 px-3 bg-nature-600 rounded text-sm font-medium text-white hover:bg-nature-700 shadow-sm"
            >
              Start Demo
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-white w-64 border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">Farm: Green Valley</h2>
              {isSimulationRunning && (
                <span className="hidden sm:inline-block bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                  Prototype Data
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-500">
            <span className="hidden sm:inline">Last Update: {new Date().toLocaleTimeString()}</span>
            <div className="w-8 h-8 shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
              FM
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
