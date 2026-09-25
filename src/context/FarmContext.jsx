import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

const FarmContext = createContext();

export const useFarmData = () => useContext(FarmContext);

export const FarmProvider = ({ children }) => {
  const [data, setData] = useState(apiService.getAllData());

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

  const value = {
    ...data,
    startSimulation: () => apiService.startSimulation(),
    stopSimulation: () => apiService.stopSimulation(),
    simulateAction: (action, zoneId) => apiService.simulateAction(action, zoneId),
    resolveAlert: (id) => apiService.resolveAlert(id)
  };

  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
};
