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
    
    // Start with a demo check
    apiService.checkAlerts('ZONE-A');
    apiService.checkAlerts('ZONE-B');
    apiService.notify();

    return () => unsubscribe();
  }, []);

  // Compute dynamic FAO-56 Reference Evapotranspiration
  const faoEt0 = useMemo(() => {
    if (!data.zones || data.zones.length === 0) return 4.5;
    const avgTemp = data.zones.reduce((acc, z) => acc + (z.sensorData?.airTemperature || 28), 0) / data.zones.length;
    const avgHumidity = data.zones.reduce((acc, z) => acc + (z.sensorData?.humidity || 65), 0) / data.zones.length;
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
    startSimulation: () => apiService.startSimulation(),
    stopSimulation: () => apiService.stopSimulation(),
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
