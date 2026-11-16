import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Crosshair, 
  Layers, 
  MapPin, 
  Navigation, 
  RotateCcw, 
  Radio, 
  Maximize2,
  ShieldCheck,
  Droplets,
  Thermometer
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

// Self-contained high-contrast SVG Pin for Live GPS with radar pulse
const createLiveGpsIcon = () => {
  return L.divIcon({
    className: 'agrinex-gps-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px;">
        <div style="position: absolute; inset: -10px; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 36px; height: 36px; background: #059669; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; color: white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22]
  });
};

// Self-contained Icon for Field Plots
const createPlotIcon = (letter, crop, status) => {
  const bg = status === 'Critical' ? '#e11d48' : (status === 'Attention' ? '#d97706' : '#059669');
  return L.divIcon({
    className: 'agrinex-plot-pin',
    html: `
      <div style="background: ${bg}; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; font-family: monospace; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.25); white-space: nowrap; display: flex; align-items: center; gap: 4px;">
        <span>Plot ${letter}</span>
        <span style="opacity: 0.8; font-weight: normal; font-size: 10px;">(${crop})</span>
      </div>
    `,
    iconSize: [100, 26],
    iconAnchor: [50, 13],
    popupAnchor: [0, -15]
  });
};

export default function LiveFarmLeafletMap({ onSelectZone }) {
  const { 
    gpsStatus, 
    gpsData, 
    startLiveGPS, 
    stopLiveGPS,
    zones, 
    language 
  } = useFarmData();

  const isTe = language === 'te';
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const plotMarkersRef = useRef([]);
  const streetLayerRef = useRef(null);
  const satLayerRef = useRef(null);

  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [isCentered, setIsCentered] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double init

    const initialLat = gpsData?.latitude || 20.5937;
    const initialLon = gpsData?.longitude || 78.9629;
    const initialZoom = gpsData?.isLive ? 16 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Custom Zoom Control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Street Layer: OpenStreetMap
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Satellite Layer: ESRI World Imagery
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    street.addTo(map);
    streetLayerRef.current = street;
    satLayerRef.current = sat;
    mapInstanceRef.current = map;

    // Invalidate map size after mount so tiles load fully
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle Street / Satellite layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !streetLayerRef.current || !satLayerRef.current) return;

    if (mapLayer === 'satellite') {
      map.removeLayer(streetLayerRef.current);
      satLayerRef.current.addTo(map);
    } else {
      map.removeLayer(satLayerRef.current);
      streetLayerRef.current.addTo(map);
    }
  }, [mapLayer]);

  // Update Live GPS Marker & Accuracy Circle when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = gpsData?.latitude;
    const lon = gpsData?.longitude;

    if (typeof lat === 'number' && typeof lon === 'number' && gpsData?.isLive) {
      const pos = [lat, lon];
      const acc = gpsData.accuracy || 15;

      // Update or create GPS Marker
      if (!markerRef.current) {
        const marker = L.marker(pos, { icon: createLiveGpsIcon() }).addTo(map);
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(pos);
      }

      // Update or create Accuracy Circle
      if (!circleRef.current) {
        const circle = L.circle(pos, {
          radius: acc,
          color: '#059669',
          weight: 1.5,
          fillColor: '#10b981',
          fillOpacity: 0.15
        }).addTo(map);
        circleRef.current = circle;
      } else {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(acc);
      }

      // Popup Content with Live GPS Telemetry
      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 220px; line-height: 1.5;">
          <div style="font-weight: 800; color: #059669; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>🛰️ Live Farm Location</span>
            <span style="font-size: 10px; background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 9999px; border: 1px solid #a7f3d0;">ACTIVE</span>
          </div>
          <div style="display: grid; grid-template-columns: 80px 1fr; gap: 3px; font-size: 11px;">
            <strong style="color: #64748b;">Latitude:</strong>
            <span style="font-family: monospace; font-weight: 700;">${gpsData.formattedLat}</span>
            <strong style="color: #64748b;">Longitude:</strong>
            <span style="font-family: monospace; font-weight: 700;">${gpsData.formattedLon}</span>
            <strong style="color: #64748b;">Location:</strong>
            <span style="font-weight: 600;">${gpsData.locationName}</span>
            <strong style="color: #64748b;">Accuracy:</strong>
            <span style="font-family: monospace;">± ${gpsData.accuracyLabel}</span>
            <strong style="color: #64748b;">Updated:</strong>
            <span style="font-family: monospace;">${gpsData.lastUpdated}</span>
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #64748b;">
            ${gpsData.isApproximate ? 'Estimated via Wi-Fi/network' : 'Precision Hardware GPS'}
          </div>
        </div>
      `;

      markerRef.current.bindPopup(popupContent);

      // Pan to new position smoothly
      map.setView(pos, Math.max(map.getZoom(), 16), { animate: true });

      // Add Quadrant Field Plots around the detected coordinates
      // Place Zones A, B, C, D in 4 quadrants ~50 meters around the user location
      plotMarkersRef.current.forEach(m => map.removeLayer(m));
      plotMarkersRef.current = [];

      const offsets = [
        { dLat: 0.0004, dLon: -0.0004, letter: 'A', name: 'Zone A', crop: 'Tomato' },
        { dLat: 0.0004, dLon: 0.0004, letter: 'B', name: 'Zone B', crop: 'Chili' },
        { dLat: -0.0004, dLon: -0.0004, letter: 'C', name: 'Zone C', crop: 'Paddy' },
        { dLat: -0.0004, dLon: 0.0004, letter: 'D', name: 'Zone D', crop: 'Groundnut' }
      ];

      (zones || []).slice(0, 4).forEach((zone, idx) => {
        const off = offsets[idx] || offsets[0];
        const plotPos = [lat + off.dLat, lon + off.dLon];
        const status = zone.analysis?.plantStatus || 'Healthy';
        const pMarker = L.marker(plotPos, {
          icon: createPlotIcon(off.letter, zone.cropType || off.crop, status)
        }).addTo(map);

        const plotPopup = `
          <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">${zone.name} (${zone.cropType})</div>
            <div style="font-size: 11px; color: #475569;">
              <div>Soil Moisture: <strong>${zone.sensorData?.soilMoisture || 48}%</strong></div>
              <div>Temperature: <strong>${zone.sensorData?.airTemperature || 28}°C</strong></div>
              <div>Health: <strong>${zone.analysis?.overallHealthScore || 85}%</strong></div>
            </div>
            <button id="btn-inspect-${zone.zoneId}" style="margin-top: 6px; width: 100%; background: #059669; color: white; border: none; padding: 4px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 11px;">
              Inspect 3D Twin &rarr;
            </button>
          </div>
        `;
        pMarker.bindPopup(plotPopup);

        pMarker.on('popupopen', () => {
          const btn = document.getElementById(`btn-inspect-${zone.zoneId}`);
          if (btn && onSelectZone) {
            btn.onclick = () => onSelectZone(zone.zoneId);
          }
        });

        plotMarkersRef.current.push(pMarker);
      });

    } else {
      // GPS not active: remove marker & accuracy circle if any
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
      plotMarkersRef.current.forEach(m => map.removeLayer(m));
      plotMarkersRef.current = [];
    }
  }, [gpsData, zones, onSelectZone]);

  // Action: "My Current Location"
  const handleMyCurrentLocation = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gpsData?.isLive && typeof gpsData?.latitude === 'number') {
      map.flyTo([gpsData.latitude, gpsData.longitude], 17, { duration: 1.2 });
      if (markerRef.current) {
        setTimeout(() => markerRef.current?.openPopup(), 1250);
      }
    } else {
      // Start GPS if not already active
      startLiveGPS();
    }
  };

  // Action: "Recenter Map"
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (gpsData?.isLive && typeof gpsData?.latitude === 'number') {
      map.flyTo([gpsData.latitude, gpsData.longitude], 16, { duration: 0.8 });
    } else {
      map.flyTo([20.5937, 78.9629], 5, { duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100">
      
      {/* The Leaflet Map Canvas */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-[400px] sm:h-[480px] z-10"
        style={{ minHeight: '380px' }}
      />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* GPS Live Status Pill */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            gpsStatus === 'GPS ACTIVE' 
              ? 'bg-emerald-500 animate-ping' 
              : gpsStatus === 'REQUESTING PERMISSION'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-slate-400'
          }`} />
          <span className="text-xs font-black text-slate-800 tracking-tight">
            {gpsStatus}
          </span>
          {gpsData?.isLive && (
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
              {gpsData.formattedLat}, {gpsData.formattedLon}
            </span>
          )}
        </div>

        {/* Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80">
          
          {/* "My Current Location" Button */}
          <button
            type="button"
            onClick={handleMyCurrentLocation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            title={isTe ? 'నా ప్రస్తుత స్థానం' : 'My Current Location'}
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'REQUESTING PERMISSION' ? 'animate-spin' : ''}`} />
            <span>{isTe ? 'నా స్థానం' : 'My Current Location'}</span>
          </button>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title={isTe ? 'మ్యాప్ రీసెంటర్' : 'Recenter Map'}
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
          </button>

          {/* Satellite / Street Layer Switcher */}
          <button
            type="button"
            onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mapLayer === 'satellite' 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Satellite Imagery"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="capitalize">{mapLayer === 'street' ? 'Satellite' : 'Street'}</span>
          </button>
        </div>

      </div>

      {/* Bottom Floating Info Pill when GPS is OFF */}
      {!gpsData?.isLive && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-20 pointer-events-auto bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 max-w-sm">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-extrabold text-slate-900">
                {isTe ? 'లైవ్ GPS మ్యాప్ స్థానం' : 'Enable Live GPS on Farm Map'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {isTe
                  ? 'మీ ల్యాప్‌టాప్ లేదా మొబైల్ యొక్క ఖచ్చితమైన స్థానాన్ని మ్యాప్‌పై చూడటానికి క్లిక్ చేయండి.'
                  : 'Detect your device position in real-time and center this map over your agricultural field.'}
              </p>
              <button
                type="button"
                onClick={startLiveGPS}
                className="mt-2 w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                {isTe ? 'లైవ్ GPS ప్రారంభించండి' : 'Enable Live GPS'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
