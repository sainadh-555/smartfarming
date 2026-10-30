import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { 
  calculateFAO56_ET0, 
  evaluateGlobalGapCompliance, 
  generateAuditCSV, 
  UnitConverters, 
  I18N_DICTIONARY 
} from '../services/standardsEngine';

const FarmContext = createContext();

export const useFarmData = () => useContext(FarmContext);

export const FarmProvider = ({ children }) => {
  const [data, setData] = useState(apiService.getAllData());
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('smartfarm_unit_system') || 'metric');
  const [language, setLanguage] = useState(() => localStorage.getItem('smartfarm_language') || 'en');

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
  const t = (key) => {
    const dict = I18N_DICTIONARY[language] || I18N_DICTIONARY.en;
    return dict[key] || I18N_DICTIONARY.en[key] || key;
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
    faoEt0,
    globalGap,
    downloadAuditCSV,
    formatTemp,
    formatDepth,
    formatVolume,
    formatArea,
    formatPressure,
    // Hybrid Mode Controls
    setOperatingMode: (mode) => apiService.setOperatingMode(mode),
    startRealSimulation: () => apiService.startRealSimulation(),
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
