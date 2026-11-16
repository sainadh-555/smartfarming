import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { apiService, CROPS_CATALOG } from '../services/apiService';
import { 
  calculateFAO56_ET0, 
  evaluateGlobalGapCompliance, 
  generateAuditCSV, 
  UnitConverters 
} from '../services/standardsEngine';
import { translate } from '../services/i18n';
import { formatINR, formatIndianNumber } from '../services/currencyService';
import {
  DEFAULT_FARM_LOCATION,
  getStoredLocation,
  saveStoredLocation,
  clearStoredLocation
} from '../services/weatherService';
import {
  GPS_STATUS,
  formatGpsCoordinates,
  formatGpsAccuracy,
  reverseGeocodeWithCache,
  isLikelyMobileDevice
} from '../services/gpsService';

const FarmContext = createContext();

export const useFarmData = () => useContext(FarmContext);

export const FarmProvider = ({ children }) => {
  const [data, setData] = useState(apiService.getAllData());
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('smartfarm_unit_system') || 'metric');
  const [language, setLanguage] = useState(() => localStorage.getItem('smartfarm_language') || 'en');
  const [farmLocation, setFarmLocation] = useState(() => getStoredLocation());
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Live Browser-Based GPS Tracking State
  const [gpsStatus, setGpsStatus] = useState(GPS_STATUS.OFF);
  const [gpsError, setGpsError] = useState(null);
  const watchIdRef = useRef(null);

  const [gpsData, setGpsData] = useState(() => {
    const stored = getStoredLocation();
    if (stored?.isLive && typeof stored?.latitude === 'number' && typeof stored?.longitude === 'number') {
      const coords = formatGpsCoordinates(stored.latitude, stored.longitude);
      return {
        latitude: stored.latitude,
        longitude: stored.longitude,
        accuracy: stored.accuracy || null,
        altitude: null,
        heading: null,
        speed: null,
        formattedLat: coords.latStr,
        formattedLon: coords.lonStr,
        locationName: stored.city ? `${stored.city}, ${stored.country || ''}` : coords.displayStr,
        city: stored.city || 'Local Area',
        state: stored.state || '',
        country: stored.country || '',
        lastUpdated: stored.detectedAt ? new Date(stored.detectedAt).toLocaleTimeString() : 'N/A',
        lastUpdatedIso: stored.detectedAt || null,
        accuracyLabel: formatGpsAccuracy(stored.accuracy),
        isLive: true,
        isApproximate: !isLikelyMobileDevice()
      };
    }
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      heading: null,
      speed: null,
      formattedLat: 'N/A',
      formattedLon: 'N/A',
      locationName: 'GPS Off • Click to Enable',
      city: 'N/A',
      state: '',
      country: '',
      lastUpdated: 'N/A',
      lastUpdatedIso: null,
      accuracyLabel: 'N/A',
      isLive: false,
      isApproximate: !isLikelyMobileDevice()
    };
  });

  const startLiveGPS = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus(GPS_STATUS.UNSUPPORTED);
      setGpsError('Browser does not support the Geolocation API.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsStatus(GPS_STATUS.REQUESTING);
    setGpsError(null);
    setIsLocating(true);

    const isMobile = isLikelyMobileDevice();

    const onPositionSuccess = async (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lon = Number(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      const coords = formatGpsCoordinates(lat, lon);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const isoStr = now.toISOString();

      let placeInfo = { city: 'Local Area', state: '', country: '', fullFormatted: coords.displayStr };
      try {
        const geo = await reverseGeocodeWithCache(lat, lon);
        if (geo) placeInfo = geo;
      } catch (err) {
        console.warn('[GPS] Reverse geocode lookup error:', err);
      }

      const updatedGps = {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        altitude: pos.coords.altitude || null,
        heading: pos.coords.heading || null,
        speed: pos.coords.speed || null,
        formattedLat: coords.latStr,
        formattedLon: coords.lonStr,
        locationName: placeInfo.fullFormatted || coords.displayStr,
        city: placeInfo.city || 'Local Area',
        state: placeInfo.state || '',
        country: placeInfo.country || '',
        lastUpdated: timeStr,
        lastUpdatedIso: isoStr,
        accuracyLabel: formatGpsAccuracy(acc),
        isLive: true,
        isApproximate: !isMobile
      };

      setGpsData(updatedGps);
      setGpsStatus(GPS_STATUS.ACTIVE);
      setGpsError(null);
      setIsLocating(false);

      const farmLoc = {
        name: placeInfo.city ? `${placeInfo.city} Precision Farm` : 'Live Precision Farm',
        latitude: lat,
        longitude: lon,
        displayLocation: `${coords.dmsStr} • ${placeInfo.city || 'Live GPS'}`,
        city: placeInfo.city || 'Local Area',
        country: placeInfo.country || '',
        accuracy: acc,
        isLive: true,
        source: 'gps',
        detectedAt: isoStr
      };

      setFarmLocation(farmLoc);
      saveStoredLocation(farmLoc);
    };

    const onPositionError = (err) => {
      setIsLocating(false);
      let msg = 'Unable to determine location. Please verify device location settings.';
      let status = GPS_STATUS.UNAVAILABLE;

      if (err.code === 1) { // PERMISSION_DENIED
        status = GPS_STATUS.DENIED;
        msg = 'Location permission denied by user. Please allow location access in your browser address bar (lock icon) and click Enable Live GPS.';
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        status = GPS_STATUS.UNAVAILABLE;
        msg = 'Location unavailable. The browser could not obtain a satellite or network location fix.';
      } else if (err.code === 3) { // TIMEOUT
        status = GPS_STATUS.UNAVAILABLE;
        msg = 'Location request timed out. Please click Enable Live GPS again.';
      }

      setGpsStatus(status);
      setGpsError(msg);
    };

    try {
      const id = navigator.geolocation.watchPosition(
        onPositionSuccess,
        onPositionError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
      watchIdRef.current = id;
    } catch (e) {
      setIsLocating(false);
      setGpsStatus(GPS_STATUS.UNAVAILABLE);
      setGpsError(e.message || 'Error initializing Geolocation watch.');
    }
  }, []);

  const stopLiveGPS = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus(GPS_STATUS.OFF);
    setGpsError(null);
    setIsLocating(false);
    setGpsData(prev => ({ ...prev, isLive: false }));
  }, []);

  const requestLiveLocation = async () => {
    startLiveGPS();
  };

  const resetLocation = () => {
    stopLiveGPS();
    clearStoredLocation();
    setFarmLocation(DEFAULT_FARM_LOCATION);
    setLocationError(null);
    setGpsStatus(GPS_STATUS.OFF);
    setGpsError(null);
    setGpsData({
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      heading: null,
      speed: null,
      formattedLat: 'N/A',
      formattedLon: 'N/A',
      locationName: 'GPS Off • Click to Enable',
      city: 'N/A',
      state: '',
      country: '',
      lastUpdated: 'N/A',
      lastUpdatedIso: null,
      accuracyLabel: 'N/A',
      isLive: false,
      isApproximate: !isLikelyMobileDevice()
    });
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('smartfarm_unit_system', unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem('smartfarm_language', language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = apiService.subscribe((newData) => {
      setData({ ...newData });
    });
    
    // Start initial check
    apiService.checkAlerts('ZONE-A');
    apiService.notify();

    return () => unsubscribe();
  }, []);

  // Compute dynamic FAO-56 Reference Evapotranspiration
  const faoEt0 = useMemo(() => {
    if (!data.zones || data.zones.length === 0) return 4.5;
    const validTemps = data.zones
      .map(z => z.sensorData?.airTemperature)
      .filter(t => typeof t === 'number' && !isNaN(t));
    const validHums = data.zones
      .map(z => z.sensorData?.humidity)
      .filter(h => typeof h === 'number' && !isNaN(h));

    const avgTemp = validTemps.length > 0 
      ? validTemps.reduce((acc, t) => acc + t, 0) / validTemps.length 
      : 28.0;
    const avgHumidity = validHums.length > 0 
      ? validHums.reduce((acc, h) => acc + h, 0) / validHums.length 
      : 60.0;

    return calculateFAO56_ET0(avgTemp, avgHumidity);
  }, [data.zones]);

  // Compute GlobalG.A.P. Compliance Data
  const globalGap = useMemo(() => {
    return evaluateGlobalGapCompliance(data.zones || [], data.alerts || []);
  }, [data.zones, data.alerts]);

  // Export GlobalG.A.P. Audit CSV file
  const downloadAuditCSV = () => {
    const csvContent = generateAuditCSV(data.zones || []);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GlobalGAP_Audit_Inspection_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // i18n Translation helper
  const t = (key, fallback) => {
    return translate(key, language, fallback);
  };

  // Unit conversion helpers
  const formatTemp = (tempC) => UnitConverters.temp(tempC, unitSystem);
  const formatDepth = (valMm) => UnitConverters.depth(valMm, unitSystem);
  const formatVolume = (valLiters) => UnitConverters.volume(valLiters, unitSystem);
  const formatArea = (acres) => UnitConverters.area(acres, unitSystem);
  const formatPressure = (valBar) => UnitConverters.pressure(valBar, unitSystem);

  const toggleUnitSystem = () => {
    setUnitSystem(prev => (prev === 'metric' ? 'imperial' : 'metric'));
  };

  const value = {
    ...data,
    unitSystem,
    setUnitSystem,
    toggleUnitSystem,
    language,
    setLanguage,
    t,
    // Centralized Indian Currency formatters
    formatINR,
    formatIndianNumber,
    // Agricultural Crop Catalog & Plot Management
    cropsCatalog: CROPS_CATALOG,
    addZone: (plotData) => apiService.addZone(plotData),
    deleteZone: (zoneId) => apiService.deleteZone(zoneId),
    // Direct Web Serial API (Chrome/Edge to ESP32 on COM7)
    connectWebSerial: () => apiService.connectWebSerial(),
    disconnectWebSerial: () => apiService.disconnectWebSerial(),
    isWebSerialSupported: () => apiService.isWebSerialSupported(),
    // Direct Web Bluetooth LE API (BLE GATT to ESP32)
    connectWebBluetooth: () => apiService.connectWebBluetooth(),
    disconnectWebBluetooth: () => apiService.disconnectWebBluetooth(),
    isWebBluetoothSupported: () => apiService.isWebBluetoothSupported(),
    faoEt0,
    globalGap,
    downloadAuditCSV,
    formatTemp,
    formatDepth,
    formatVolume,
    formatArea,
    formatPressure,
    // Live Farm Location & Browser GPS Tracking
    farmLocation,
    setFarmLocation,
    requestLiveLocation,
    resetLocation,
    isLocating,
    locationError,
    gpsStatus,
    gpsData,
    gpsError,
    startLiveGPS,
    stopLiveGPS,
    // Hybrid Mode Controls
    setOperatingMode: (mode) => apiService.setOperatingMode(mode),
    triggerSimulateData: () => apiService.triggerSimulateData(),
    startRealSimulation: () => apiService.triggerSimulateData(),
    captureSimulationBaseline: () => apiService.captureSimulationBaseline(),
    updateSimulationData: (updates) => apiService.updateSimulationData(updates),
    updateManualData: (updates) => apiService.updateManualData(updates),
    resetSimulationToBaseline: () => apiService.resetSimulationToBaseline(),
    resetSimulationToDefaults: () => apiService.resetSimulationToDefaults(),
    applyScenarioPreset: (presetKey) => apiService.applyScenarioPreset(presetKey),
    exitSimulation: () => apiService.exitSimulation(),
    // Legacy compatibility methods
    setDataMode: (mode) => apiService.setDataMode(mode),
    setBridgeUrl: (url) => apiService.setBridgeUrl(url),
    testBridgeConnection: (url) => apiService.testBridgeConnection(url),
    setBackendUrl: (url) => apiService.setBackendUrl(url),
    testBackendConnection: (url) => apiService.testBackendConnection(url),
    startSimulation: () => apiService.startRealSimulation(),
    stopSimulation: () => apiService.exitSimulation(),
    simulateAction: (action, zoneId) => apiService.simulateAction(action, zoneId),
    logPesticideSpray: (zoneId, entry) => apiService.logPesticideSpray(zoneId, entry),
    resolveAlert: (id) => apiService.resolveAlert(id)
  };

  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
};
