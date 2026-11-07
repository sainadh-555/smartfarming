import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Plus, 
  MapPin, 
  Droplets, 
  Thermometer, 
  Sun, 
  X, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';
import ZoneDetailModal from '../ZoneDetailModal';
import AddPlotModal from '../AddPlotModal';

export default function MobileFarmMap() {
  const { zones, farmLocation, language, operatingMode, hardwareData, simulationData } = useFarmData();
  const isTe = language === 'te';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLayer, setActiveLayer] = useState('satellite'); // 'satellite' | 'moisture' | 'ndvi' | 'topo'
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.zoneId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Zoom & Pan transformation state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // Filtered zones based on search query
  const filteredZones = zones.filter(z => 
    z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    z.zoneId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedZone = zones.find(z => z.zoneId === selectedZoneId) || zones[0];

  // Touch handlers for panning on mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset view to center
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Layer styling helpers
  const getZoneFillColor = (zone) => {
    const moist = zone.sensorData?.soilMoisture || 45;
    if (activeLayer === 'moisture') {
      if (moist < 35) return 'fill-rose-500/50 stroke-rose-600';
      if (moist > 75) return 'fill-sky-500/50 stroke-sky-600';
      return 'fill-emerald-500/50 stroke-emerald-600';
    }
    if (activeLayer === 'ndvi') {
      if (zone.status === 'Healthy') return 'fill-emerald-600/60 stroke-emerald-700';
      if (zone.status === 'Attention') return 'fill-amber-500/60 stroke-amber-600';
      return 'fill-rose-600/60 stroke-rose-700';
    }
    if (activeLayer === 'topo') {
      return 'fill-amber-900/20 stroke-amber-700';
    }
    // Default satellite layer
    return zone.zoneId === selectedZoneId 
      ? 'fill-emerald-500/40 stroke-emerald-500 stroke-[3]' 
      : 'fill-emerald-950/20 stroke-emerald-600/80 stroke-[2]';
  };

  return (
    <div className="relative h-[calc(100vh-7.5rem)] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md flex flex-col select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP FLOATING CONTROLS: SEARCH & LAYER TOGGLE          */}
      {/* ======================================================== */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2">
        
        {/* Search Bar */}
        <div className="flex-1 relative bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/90 overflow-hidden">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={isTe ? 'ప్లాట్లు లేదా పంటను వెతకండి...' : 'Search field plots or crops...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Layer Selector Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`p-2.5 rounded-xl shadow-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 touch-target-min ${
              showLayerMenu 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/90'
            }`}
            title="Map Layers"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Layer Selection Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 space-y-1 z-30 animate-fadeIn">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
                {isTe ? 'పటం పొరలు (Layers)' : 'Map Overlays'}
              </span>
              {[
                { id: 'satellite', name: isTe ? 'శాటిలైట్ సహజ దృశ్యం' : 'Satellite View' },
                { id: 'moisture', name: isTe ? 'మట్టి తేమ హీట్‌మ్యాప్' : 'Moisture Heatmap' },
                { id: 'ndvi', name: isTe ? 'పంట ఆరోగ్యం (NDVI)' : 'Crop Health (NDVI)' },
                { id: 'topo', name: isTe ? 'భూమి ఆకృతి (Topo)' : 'Topographic' },
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => {
                    setActiveLayer(layer.id);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeLayer === layer.id
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{layer.name}</span>
                  {activeLayer === layer.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. INTERACTIVE MAP CANVAS (SVG MULTI-PLOT VECTOR MAP)     */}
      {/* ======================================================== */}
      <div 
        ref={mapContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950"
      >
        
        {/* Visual Map Canvas transformed via Zoom and Pan */}
        <div 
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <svg 
            viewBox="0 0 600 600" 
            className="w-[90vw] max-w-[500px] h-[90vw] max-h-[500px] drop-shadow-2xl"
          >
            {/* Field Boundary Background */}
            <rect 
              x="20" 
              y="20" 
              width="560" 
              height="560" 
              rx="24" 
              className="fill-slate-900/80 stroke-slate-700/60 stroke-[2] stroke-dasharray-4"
            />

            {/* Farm Zones (Quadrants) */}
            {zones.map((zone, idx) => {
              // 4 standard coordinates
              const coords = [
                { x: 30, y: 30, w: 260, h: 260 },   // Top-Left (Zone A)
                { x: 310, y: 30, w: 260, h: 260 },  // Top-Right (Zone B)
                { x: 30, y: 310, w: 260, h: 260 },  // Bottom-Left (Zone C)
                { x: 310, y: 310, w: 260, h: 260 }  // Bottom-Right (Zone D)
              ];
              const c = coords[idx % 4];
              const isSelected = zone.zoneId === selectedZoneId;
              const fillClass = getZoneFillColor(zone);

              return (
                <g 
                  key={zone.zoneId}
                  onClick={() => setSelectedZoneId(zone.zoneId)}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  {/* Zone Polygon Box */}
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    rx="16"
                    className={`${fillClass} transition-all duration-300`}
                  />

                  {/* Crop Icon & Label */}
                  <text
                    x={c.x + 20}
                    y={c.y + 40}
                    className="fill-white font-extrabold text-[15px] select-none tracking-tight"
                  >
                    {zone.name}
                  </text>

                  <text
                    x={c.x + 20}
                    y={c.y + 65}
                    className="fill-emerald-400 font-semibold text-[12px] select-none"
                  >
                    {zone.cropType} • {zone.agronomy?.acreage || 0.25} Ac
                  </text>

                  {/* Real-Time Moisture Badge */}
                  <rect
                    x={c.x + 20}
                    y={c.y + c.h - 55}
                    width="110"
                    height="32"
                    rx="10"
                    className="fill-slate-900/90 stroke-slate-700/80 stroke-1"
                  />
                  <text
                    x={c.x + 32}
                    y={c.y + c.h - 34}
                    className="fill-sky-300 font-mono font-bold text-[12px]"
                  >
                    💧 {zone.sensorData?.soilMoisture !== undefined ? `${zone.sensorData.soilMoisture}%` : 'N/A'}
                  </text>

                  {/* Selection Pulsing Ring */}
                  {isSelected && (
                    <rect
                      x={c.x - 3}
                      y={c.y - 3}
                      width={c.w + 6}
                      height={c.h + 6}
                      rx="19"
                      fill="none"
                      className="stroke-emerald-400 stroke-[3] animate-pulse"
                    />
                  )}
                </g>
              );
            })}

            {/* Farm Center Compass Mark */}
            <circle cx="300" cy="300" r="16" className="fill-slate-800/90 stroke-emerald-500 stroke-2" />
            <circle cx="300" cy="300" r="4" className="fill-emerald-400" />
          </svg>
        </div>

        {/* Center Guide Label */}
        <div className="absolute top-16 left-3 z-10 pointer-events-none">
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/70">
            {farmLocation?.name || 'Green Valley'} • {activeLayer.toUpperCase()}
          </span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. COMPACT FLOATING ACTION BUTTONS (FABs)                */}
      {/* ======================================================== */}
      <div className="absolute right-3 bottom-44 z-20 flex flex-col gap-2">
        
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(prev + 0.3, 2.5))}
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg border border-slate-200/90 flex items-center justify-center cursor-pointer active:scale-90 touch-target-min"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(prev - 0.3, 0.7))}
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg border border-slate-200/90 flex items-center justify-center cursor-pointer active:scale-90 touch-target-min"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Center / GPS Reset Button */}
        <button
          type="button"
          onClick={handleResetView}
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 shadow-lg border border-slate-200/90 flex items-center justify-center cursor-pointer active:scale-90 touch-target-min"
          title="Reset View"
        >
          <Compass className="w-5 h-5 text-emerald-600" />
        </button>

        {/* Add Plot / Draw FAB */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 flex items-center justify-center cursor-pointer active:scale-90 touch-target-min"
          title={isTe ? 'కొత్త ప్లాట్' : 'Add Plot'}
        >
          <Plus className="w-5 h-5" />
        </button>

      </div>

      {/* ======================================================== */}
      {/* 4. EXPANDABLE BOTTOM SHEET FOR SELECTED ZONE             */}
      {/* ======================================================== */}
      {selectedZone && (
        <div className="absolute left-0 right-0 bottom-0 z-30 bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-4 pt-3 animate-slideUp">
          
          {/* Drag Handle Bar */}
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-2" />

          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">{selectedZone.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedZone.cropType}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {selectedZone.agronomy?.acreage || 0.25} {isTe ? 'ఎకరాలు' : 'Acre'} • {selectedZone.status || 'Active'}
              </p>
            </div>

            {/* Inspect Detail Digital Twin Button */}
            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-900 text-white flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer touch-target-min"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isTe ? '3D వివరాలు' : 'Digital Twin'}</span>
            </button>
          </div>

          {/* 3 Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 py-2.5 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'మట్టి తేమ' : 'Moisture'}</span>
              <span className="text-xs font-mono font-black text-slate-900 block mt-0.5">
                {selectedZone.sensorData?.soilMoisture !== undefined ? `${selectedZone.sensorData.soilMoisture}%` : 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'ఉష్ణోగ్రత' : 'Temp'}</span>
              <span className="text-xs font-mono font-black text-slate-900 block mt-0.5">
                {selectedZone.sensorData?.airTemperature !== undefined ? `${selectedZone.sensorData.airTemperature}°C` : 'N/A'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{isTe ? 'సూర్యరశ్మి' : 'Light'}</span>
              <span className="text-xs font-mono font-black text-slate-900 block mt-0.5">
                {selectedZone.sensorData?.lightIntensity !== undefined ? `${selectedZone.sensorData.lightIntensity}%` : 'N/A'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Modal dialogs */}
      {showDetailModal && selectedZone && (
        <ZoneDetailModal
          zoneId={selectedZone.zoneId}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {showAddModal && (
        <AddPlotModal
          onClose={() => setShowAddModal(false)}
        />
      )}

    </div>
  );
}

