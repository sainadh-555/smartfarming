import initialSensorReadings from '../data/sensor_readings.json';
import initialZones from '../data/farm_zones.json';
import { analyzeFarmData } from '../ai/farmDecisionEngine';

class MockApiService {
  constructor() {
    this.sensorData = { ...initialSensorReadings };
    this.zones = [...initialZones];
    this.alerts = [];
    this.history = [];
    this.isSimulationRunning = false;
    this.simulationInterval = null;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    const data = this.getAllData();
    this.subscribers.forEach(cb => cb(data));
  }

  getAllData() {
    const enrichedZones = this.zones.map(zone => {
      const sensorReading = this.sensorData[zone.zoneId];
      const analysis = analyzeFarmData({ ...sensorReading, cropType: zone.cropType });
      return {
        ...zone,
        sensorData: sensorReading,
        analysis
      };
    });

    return {
      zones: enrichedZones,
      alerts: this.alerts,
      history: this.history,
      isSimulationRunning: this.isSimulationRunning
    };
  }

  // Simulated ESP32 POST Endpoint
  postSensorData(data) {
    const { zoneId } = data;
    if (this.sensorData[zoneId]) {
      this.sensorData[zoneId] = { ...this.sensorData[zoneId], ...data, timestamp: new Date().toISOString() };
      this.checkAlerts(zoneId);
      this.notify();
    }
  }

  checkAlerts(zoneId) {
    const reading = this.sensorData[zoneId];
    const zone = this.zones.find(z => z.zoneId === zoneId);
    const analysis = analyzeFarmData({ ...reading, cropType: zone.cropType });
    
    // Simple alert generation logic
    if (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL') {
      const existingAlert = this.alerts.find(a => a.zoneId === zoneId && !a.resolved && a.type === analysis.riskLevel);
      if (!existingAlert) {
        this.alerts.unshift({
          id: Date.now().toString(),
          zoneId,
          zoneName: zone.name,
          timestamp: new Date().toISOString(),
          severity: analysis.riskLevel === 'CRITICAL' ? 'Critical' : 'Warning',
          type: analysis.riskLevel,
          message: analysis.explanation,
          resolved: false
        });
      }
    }
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.notify();
    }
  }

  startSimulation() {
    if (this.isSimulationRunning) return;
    this.isSimulationRunning = true;
    
    this.simulationInterval = setInterval(() => {
      // Slightly mutate data to simulate live sensors
      Object.keys(this.sensorData).forEach(zoneId => {
        const data = this.sensorData[zoneId];
        // Gradual changes
        const moistureChange = (Math.random() * 1.0) - 0.6; // Tend to dry out
        const tempChange = (Math.random() * 0.4) - 0.15; // Tend to warm slightly
        
        data.soilMoisture = Math.max(0, Math.min(100, data.soilMoisture + moistureChange));
        data.airTemperature = Math.max(10, Math.min(50, data.airTemperature + tempChange));
        data.humidity = Math.max(0, Math.min(100, data.humidity + ((Math.random() * 2) - 1)));
        
        data.timestamp = new Date().toISOString();
        this.checkAlerts(zoneId);
      });
      this.notify();
    }, 5000);
    this.notify();
  }

  stopSimulation() {
    this.isSimulationRunning = false;
    clearInterval(this.simulationInterval);
    this.notify();
  }

  simulateAction(action, zoneId = 'ZONE-A') {
    const data = this.sensorData[zoneId];
    if (!data) return;

    if (action === 'IRRIGATE') {
      data.soilMoisture = Math.min(100, data.soilMoisture + 40);
      data.soilTemperature = Math.max(15, data.soilTemperature - 2);
      data.plantHealthScore = Math.min(100, data.plantHealthScore + 5);
      
      this.alerts.unshift({
        id: Date.now().toString(),
        zoneId,
        zoneName: this.zones.find(z => z.zoneId === zoneId).name,
        timestamp: new Date().toISOString(),
        severity: 'Information',
        message: `Irrigation applied to ${zoneId}. Soil moisture increased.`,
        resolved: false
      });
    } else if (action === 'RAINFALL') {
      Object.keys(this.sensorData).forEach(zid => {
        this.sensorData[zid].rainfall += 15;
        this.sensorData[zid].soilMoisture = Math.min(100, this.sensorData[zid].soilMoisture + 30);
        this.sensorData[zid].humidity = Math.min(100, this.sensorData[zid].humidity + 15);
        this.sensorData[zid].airTemperature = Math.max(15, this.sensorData[zid].airTemperature - 3);
      });
      this.alerts.unshift({
        id: Date.now().toString(),
        zoneId: 'ALL',
        zoneName: 'Farm-wide',
        timestamp: new Date().toISOString(),
        severity: 'Information',
        message: `Rainfall detected. Sensor parameters updated.`,
        resolved: false
      });
    } else if (action === 'STRESS') {
      data.soilMoisture = Math.max(0, data.soilMoisture - 20);
      data.airTemperature = Math.min(50, data.airTemperature + 5);
      data.plantHealthScore = Math.max(0, data.plantHealthScore - 15);
    }
    
    this.checkAlerts(zoneId);
    this.notify();
  }
}

export const apiService = new MockApiService();
