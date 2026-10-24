import initialSensorReadings from '../data/sensor_readings.json';
import initialZones from '../data/farm_zones.json';
import initialAgronomy from '../data/zone_agronomy.json';
import { analyzeFarmData } from '../ai/farmDecisionEngine';

class MockApiService {
  constructor() {
    this.sensorData = { ...initialSensorReadings };
    this.zones = [...initialZones];
    this.agronomyData = JSON.parse(JSON.stringify(initialAgronomy));
    this.alerts = [];
    this.history = [];
    this.isSimulationRunning = false;
    this.simulationInterval = null;
    this.subscribers = new Set();
    
    // Selectable Data Mode: 'simulation' | 'usb_hardware' | 'cloud_backend'
    this.dataMode = localStorage.getItem('smartfarm_data_mode') || 'simulation';

    // Local USB Serial Bridge Integration (http://127.0.0.1:5000)
    this.bridgeUrl = localStorage.getItem('smartfarm_bridge_url') || 'http://127.0.0.1:5000';
    this.usbStatus = 'disconnected'; // 'waiting_data' | 'connected' | 'stale' | 'disconnected'
    this.usbPort = null;
    this.usbLastSync = null;
    this.usbLastSyncEpoch = 0;
    this.usbRawReadings = null;
    this.usbError = null;
    this.usbPollingInterval = null;

    // Production Render Cloud Backend Integration
    this.backendUrl = localStorage.getItem('smartfarm_backend_url') || 'https://smartfarming-e3b2.onrender.com';
    this.cloudStatus = 'disconnected'; // 'connected' | 'disconnected'
    this.lastCloudSync = null;
    this.cloudPollingInterval = null;

    // Initialize based on saved mode
    if (this.dataMode === 'usb_hardware') {
      this.startUsbPolling();
    } else if (this.dataMode === 'cloud_backend') {
      this.startCloudPolling();
    }
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
      const agronomy = this.agronomyData[zone.zoneId] || null;

      // In Live USB Hardware mode: Zone A is the primary hardware node connected to the ESP32.
      // Other zones are clearly identified as unmonitored to avoid claiming independent readings from 1 ESP32.
      const isZoneAMonitoredUsb = zone.zoneId === 'ZONE-A' && this.dataMode === 'usb_hardware';
      const isAuxiliaryInUsbMode = zone.zoneId !== 'ZONE-A' && this.dataMode === 'usb_hardware';
      const isCloudMode = this.dataMode === 'cloud_backend';

      return {
        ...zone,
        sensorData: sensorReading,
        analysis,
        agronomy,
        isLiveHardware: isCloudMode 
          ? (this.cloudStatus === 'connected')
          : (isZoneAMonitoredUsb && this.usbStatus === 'connected'),
        hardwareStatus: isCloudMode
          ? this.cloudStatus
          : (isZoneAMonitoredUsb ? this.usbStatus : (isAuxiliaryInUsbMode ? 'unmonitored' : 'simulated')),
        hardwareNodeId: isZoneAMonitoredUsb ? 'ESP32-DEV-USB' : (isCloudMode ? `ESP32-CLOUD-${zone.zoneId}` : null),
        hardwarePort: isZoneAMonitoredUsb ? this.usbPort : null
      };
    });

    const isConnected = this.dataMode === 'cloud_backend' 
      ? (this.cloudStatus === 'connected')
      : (this.dataMode === 'usb_hardware' && this.usbStatus === 'connected');

    const lastSyncTime = this.dataMode === 'cloud_backend' ? this.lastCloudSync : this.usbLastSync;

    return {
      zones: enrichedZones,
      alerts: this.alerts,
      history: this.history,
      isSimulationRunning: this.isSimulationRunning,
      // Telemetry Data Mode
      dataMode: this.dataMode,
      // USB Hardware State
      bridgeUrl: this.bridgeUrl,
      usbStatus: this.usbStatus,
      usbPort: this.usbPort,
      usbLastSync: this.usbLastSync,
      usbLastSyncEpoch: this.usbLastSyncEpoch,
      usbRawReadings: this.usbRawReadings,
      usbError: this.usbError,
      // Cloud Backend State
      backendUrl: this.backendUrl,
      cloudStatus: this.cloudStatus,
      lastCloudSync: this.lastCloudSync,
      // General Hardware sync aliases
      isLiveHardware: isConnected,
      lastHardwareSync: lastSyncTime
    };
  }

  // ==========================================
  // DATA MODE MANAGEMENT
  // ==========================================

  setDataMode(mode) {
    if (mode !== 'simulation' && mode !== 'usb_hardware' && mode !== 'cloud_backend') return;
    this.dataMode = mode;
    localStorage.setItem('smartfarm_data_mode', mode);

    // Stop all active pollers / simulation
    this.stopSimulation();
    this.stopUsbPolling();
    this.stopCloudPolling();

    if (mode === 'usb_hardware') {
      this.startUsbPolling();
    } else if (mode === 'cloud_backend') {
      this.startCloudPolling();
    } else if (mode === 'simulation') {
      this.usbStatus = 'disconnected';
      this.cloudStatus = 'disconnected';
    }

    this.notify();
  }

  // ==========================================
  // RENDER CLOUD BACKEND POLLING (every 4s)
  // ==========================================

  setBackendUrl(url) {
    this.backendUrl = url ? url.trim().replace(/\/+$/, '') : 'https://smartfarming-e3b2.onrender.com';
    localStorage.setItem('smartfarm_backend_url', this.backendUrl);
    if (this.dataMode === 'cloud_backend') {
      this.startCloudPolling();
    }
    this.notify();
  }

  async testBackendConnection(candidateUrl) {
    const target = candidateUrl ? candidateUrl.trim().replace(/\/+$/, '') : this.backendUrl;
    if (!target) return { success: false, error: 'No backend URL provided' };

    try {
      const response = await fetch(`${target}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      return { 
        success: false, 
        error: err.name === 'TimeoutError'
          ? 'Connection timed out (Render free tier may be waking up, wait 30s)'
          : (err.message || 'Connection failed')
      };
    }
  }

  startCloudPolling() {
    this.stopCloudPolling();
    this.fetchLiveCloudData();
    this.cloudPollingInterval = setInterval(() => {
      this.fetchLiveCloudData();
    }, 4000);
  }

  stopCloudPolling() {
    if (this.cloudPollingInterval) {
      clearInterval(this.cloudPollingInterval);
      this.cloudPollingInterval = null;
    }
  }

  async fetchLiveCloudData() {
    if (this.dataMode !== 'cloud_backend' || !this.backendUrl) return;

    try {
      const response = await fetch(`${this.backendUrl}/api/sensor-data`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        this.cloudStatus = 'disconnected';
        this.notify();
        return;
      }

      const data = await response.json();
      if (data && data.zones) {
        let updated = false;

        Object.keys(data.zones).forEach(zoneId => {
          const liveZone = data.zones[zoneId];
          if (this.sensorData[zoneId] && liveZone) {
            this.sensorData[zoneId] = {
              ...this.sensorData[zoneId],
              soilMoisture: liveZone.soilMoisture !== undefined ? liveZone.soilMoisture : this.sensorData[zoneId].soilMoisture,
              soilTemperature: liveZone.soilTemperature || this.sensorData[zoneId].soilTemperature,
              airTemperature: liveZone.airTemperature !== undefined ? liveZone.airTemperature : this.sensorData[zoneId].airTemperature,
              humidity: liveZone.humidity !== undefined ? liveZone.humidity : this.sensorData[zoneId].humidity,
              lightIntensity: liveZone.lightIntensity || this.sensorData[zoneId].lightIntensity,
              soilPH: liveZone.soilPH || this.sensorData[zoneId].soilPH,
              rainfall: liveZone.rainfall || 0,
              timestamp: liveZone.lastUpdated || new Date().toISOString()
            };
            updated = true;
          }
        });

        if (updated) {
          this.cloudStatus = 'connected';
          this.lastCloudSync = new Date().toLocaleTimeString();
          this.checkAlerts('ZONE-A');
          this.notify();
        }
      }
    } catch {
      this.cloudStatus = 'disconnected';
      this.notify();
    }
  }

  // ==========================================
  // USB SERIAL BRIDGE POLLING (every 3s)
  // ==========================================

  setBridgeUrl(url) {
    this.bridgeUrl = url ? url.trim().replace(/\/+$/, '') : 'http://127.0.0.1:5000';
    localStorage.setItem('smartfarm_bridge_url', this.bridgeUrl);
    if (this.dataMode === 'usb_hardware') {
      this.startUsbPolling();
    }
    this.notify();
  }

  async testBridgeConnection(candidateUrl) {
    const target = candidateUrl ? candidateUrl.trim().replace(/\/+$/, '') : this.bridgeUrl;
    if (!target) return { success: false, error: 'No bridge URL provided' };

    try {
      const response = await fetch(`${target}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      return { 
        success: false, 
        error: err.name === 'TimeoutError' 
          ? 'Connection timed out (bridge not responding)' 
          : 'Cannot connect to bridge. Is "python bridge/serial_bridge.py" running?' 
      };
    }
  }

  startUsbPolling() {
    this.stopUsbPolling();
    this.fetchLiveUsbData();
    this.usbPollingInterval = setInterval(() => {
      this.fetchLiveUsbData();
    }, 3000);
  }

  stopUsbPolling() {
    if (this.usbPollingInterval) {
      clearInterval(this.usbPollingInterval);
      this.usbPollingInterval = null;
    }
  }

  async fetchLiveUsbData() {
    if (this.dataMode !== 'usb_hardware') return;

    try {
      const response = await fetch(`${this.bridgeUrl}/api/readings`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2800)
      });

      if (!response.ok) {
        this.usbStatus = 'disconnected';
        this.usbError = `Bridge returned HTTP ${response.status}`;
        this.notify();
        return;
      }

      const payload = await response.json();

      this.usbPort = payload.port || this.usbPort;
      this.usbStatus = payload.status || 'disconnected';
      this.usbError = payload.last_error || null;

      if (payload.readings) {
        const r = payload.readings;
        this.usbRawReadings = r;
        this.usbLastSync = payload.last_updated 
          ? new Date(payload.last_updated).toLocaleTimeString() 
          : new Date().toLocaleTimeString();
        this.usbLastSyncEpoch = Date.now();

        // Update Zone A with real hardware telemetry
        this.sensorData['ZONE-A'] = {
          ...this.sensorData['ZONE-A'],
          deviceId: 'ESP32-DEV-USB',
          zoneId: 'ZONE-A',
          timestamp: payload.last_updated || new Date().toISOString(),
          soilMoisture: r.soil_moisture,
          airTemperature: r.temperature,
          humidity: r.humidity,
          soilTemperature: r.temperature !== null ? Math.round((r.temperature - 1.5) * 10) / 10 : null,
          lightIntensity: r.light_lux !== null ? r.light_lux : 650,
          soilRaw: r.soil_raw,
          lightRaw: r.light_raw,
          dhtOk: r.dht_ok
        };

        this.checkAlerts('ZONE-A');
      } else if (payload.status === 'waiting_data') {
        this.usbStatus = 'waiting_data';
        this.usbRawReadings = null;
      }

      this.notify();
    } catch {
      this.usbStatus = 'disconnected';
      this.usbError = 'Bridge offline at ' + this.bridgeUrl + ' (Verify python script is running)';
      this.notify();
    }
  }

  // ==========================================
  // CLUSTER ALERTS & SIMULATION CONTROLS
  // ==========================================

  checkAlerts(zoneId) {
    const reading = this.sensorData[zoneId];
    const zone = this.zones.find(z => z.zoneId === zoneId);
    if (!zone || !reading) return;
    const analysis = analyzeFarmData({ ...reading, cropType: zone.cropType });
    
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
      Object.keys(this.sensorData).forEach(zoneId => {
        if (zoneId === 'ZONE-A' && this.dataMode === 'usb_hardware') return;
        if (this.dataMode === 'cloud_backend') return;

        const data = this.sensorData[zoneId];
        const moistureChange = (Math.random() * 1.0) - 0.6;
        const tempChange = (Math.random() * 0.4) - 0.15;
        
        data.soilMoisture = Math.max(0, Math.min(100, (data.soilMoisture || 30) + moistureChange));
        data.airTemperature = Math.max(10, Math.min(50, (data.airTemperature || 28) + tempChange));
        data.humidity = Math.max(0, Math.min(100, (data.humidity || 55) + ((Math.random() * 2) - 1)));
        data.timestamp = new Date().toISOString();
        this.checkAlerts(zoneId);
      });
      this.notify();
    }, 5000);
    this.notify();
  }

  stopSimulation() {
    this.isSimulationRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.notify();
  }

  async simulateAction(action, zoneId = 'ZONE-A') {
    const data = this.sensorData[zoneId];
    if (!data) return;

    if (action === 'IRRIGATE') {
      data.soilMoisture = Math.min(100, (data.soilMoisture || 20) + 40);
      data.soilTemperature = Math.max(15, (data.soilTemperature || 25) - 2);
      data.plantHealthScore = Math.min(100, (data.plantHealthScore || 70) + 5);
      
      this.alerts.unshift({
        id: Date.now().toString(),
        zoneId,
        zoneName: this.zones.find(z => z.zoneId === zoneId)?.name || zoneId,
        timestamp: new Date().toISOString(),
        severity: 'Information',
        message: `Irrigation applied to ${zoneId}. Soil moisture increased.`,
        resolved: false
      });

      // Forward to Render backend if in cloud mode
      if (this.dataMode === 'cloud_backend' && this.backendUrl) {
        try {
          fetch(`${this.backendUrl}/api/irrigate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zoneId, action: 'IRRIGATE' })
          }).catch(() => {});
        } catch {}
      }
    } else if (action === 'RAINFALL') {
      Object.keys(this.sensorData).forEach(zid => {
        if (zid === 'ZONE-A' && this.dataMode === 'usb_hardware') return;
        this.sensorData[zid].rainfall = (this.sensorData[zid].rainfall || 0) + 15;
        this.sensorData[zid].soilMoisture = Math.min(100, (this.sensorData[zid].soilMoisture || 30) + 30);
        this.sensorData[zid].humidity = Math.min(100, (this.sensorData[zid].humidity || 50) + 15);
        this.sensorData[zid].airTemperature = Math.max(15, (this.sensorData[zid].airTemperature || 28) - 3);
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
    }
    
    this.checkAlerts(zoneId);
    this.notify();
  }

  logPesticideSpray(zoneId, spray) {
    const zoneAgronomy = this.agronomyData[zoneId];
    if (!zoneAgronomy) return;

    const newTreatment = {
      id: `PST-${Date.now()}`,
      date: spray.date || new Date().toISOString().split('T')[0],
      pesticideName: spray.pesticideName,
      type: spray.type || 'Bio-Pesticide',
      targetPest: spray.targetPest || 'General Prevention',
      dosage: spray.dosage,
      carrierVolume: spray.carrierVolume || '50 Liters Water',
      method: spray.method || 'Foliar Spray',
      operator: spray.operator || 'Farm Operator (You)',
      status: 'Applied',
      effectiveness: 'Target suppression verified'
    };

    zoneAgronomy.pesticideUsage.treatments.unshift(newTreatment);
    zoneAgronomy.pesticideUsage.totalApplications = (zoneAgronomy.pesticideUsage.totalApplications || 0) + 1;
    zoneAgronomy.pesticideUsage.lastAppliedDate = newTreatment.date;

    this.alerts.unshift({
      id: Date.now().toString(),
      zoneId,
      zoneName: zoneAgronomy.name,
      timestamp: new Date().toISOString(),
      severity: 'Information',
      message: `Pesticide applied to ${zoneAgronomy.name} (${zoneAgronomy.crop.name}): ${spray.pesticideName} (${spray.dosage}) for ${spray.targetPest}.`,
      resolved: false
    });

    this.notify();
    return newTreatment;
  }
}

export const apiService = new MockApiService();
