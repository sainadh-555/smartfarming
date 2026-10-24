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
    
    // Selectable Data Mode: 'simulation' | 'usb_hardware'
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

    // Cloud Backend (Legacy/Optional, disabled in USB mode)
    this.backendUrl = localStorage.getItem('smartfarm_backend_url') || '';

    // Initialize based on saved mode
    if (this.dataMode === 'usb_hardware') {
      this.startUsbPolling();
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
      const isZoneAMonitored = zone.zoneId === 'ZONE-A' && this.dataMode === 'usb_hardware';
      const isAuxiliaryInUsbMode = zone.zoneId !== 'ZONE-A' && this.dataMode === 'usb_hardware';

      return {
        ...zone,
        sensorData: sensorReading,
        analysis,
        agronomy,
        isLiveHardware: isZoneAMonitored && this.usbStatus === 'connected',
        hardwareStatus: isZoneAMonitored ? this.usbStatus : (isAuxiliaryInUsbMode ? 'unmonitored' : 'simulated'),
        hardwareNodeId: isZoneAMonitored ? 'ESP32-DEV-USB' : null,
        hardwarePort: isZoneAMonitored ? this.usbPort : null
      };
    });

    return {
      zones: enrichedZones,
      alerts: this.alerts,
      history: this.history,
      isSimulationRunning: this.isSimulationRunning,
      // USB Hardware State
      dataMode: this.dataMode,
      bridgeUrl: this.bridgeUrl,
      usbStatus: this.usbStatus,
      usbPort: this.usbPort,
      usbLastSync: this.usbLastSync,
      usbLastSyncEpoch: this.usbLastSyncEpoch,
      usbRawReadings: this.usbRawReadings,
      usbError: this.usbError,
      // Backward-compatibility aliases
      isLiveHardware: this.dataMode === 'usb_hardware' && this.usbStatus === 'connected',
      lastHardwareSync: this.usbLastSync,
      backendUrl: this.backendUrl
    };
  }

  // ==========================================
  // DATA MODE MANAGEMENT (Simulation vs USB)
  // ==========================================

  setDataMode(mode) {
    if (mode !== 'simulation' && mode !== 'usb_hardware') return;
    this.dataMode = mode;
    localStorage.setItem('smartfarm_data_mode', mode);

    if (mode === 'usb_hardware') {
      // Pause simulation to ensure no simulated values taint real hardware data
      this.stopSimulation();
      this.startUsbPolling();
    } else {
      // In simulation mode, stop USB polling
      this.stopUsbPolling();
      this.usbStatus = 'disconnected';
    }

    this.notify();
  }

  // ==========================================
  // USB SERIAL BRIDGE POLLING (every 3 seconds)
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
    // Immediate fetch
    this.fetchLiveUsbData();
    // Poll every 3 seconds (2-5 second requirement)
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
        // Note: Preserve explicit null if DHT11 sensor read failed. NEVER replace with 0!
        this.sensorData['ZONE-A'] = {
          ...this.sensorData['ZONE-A'],
          deviceId: 'ESP32-DEV-USB',
          zoneId: 'ZONE-A',
          timestamp: payload.last_updated || new Date().toISOString(),
          soilMoisture: r.soil_moisture, // null if unavailable, float otherwise
          airTemperature: r.temperature,  // null if DHT failed
          humidity: r.humidity,          // null if DHT failed
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
    } catch (err) {
      // Bridge is offline or USB disconnected
      this.usbStatus = 'disconnected';
      this.usbError = 'Bridge offline at ' + this.bridgeUrl + ' (Verify python script is running)';
      // NEVER fall back silently to simulated data in Live USB mode!
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
      // Mutate simulated data
      Object.keys(this.sensorData).forEach(zoneId => {
        // If Zone A is driven by physical hardware in USB mode, do NOT mutate it!
        if (zoneId === 'ZONE-A' && this.dataMode === 'usb_hardware') return;

        const data = this.sensorData[zoneId];
        const moistureChange = (Math.random() * 1.0) - 0.6; // Tend to dry out
        const tempChange = (Math.random() * 0.4) - 0.15; // Tend to warm slightly
        
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
    } else if (action === 'RAINFALL') {
      Object.keys(this.sensorData).forEach(zid => {
        // In USB mode, do not mutate physical Zone A readings with simulated rain
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
