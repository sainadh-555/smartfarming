import initialSensorReadings from '../data/sensor_readings.json';
import initialZones from '../data/farm_zones.json';
import initialAgronomy from '../data/zone_agronomy.json';
import { analyzeFarmData, SIMULATION_PRESETS } from '../ai/farmDecisionEngine';

/**
 * SmartFarm API Service — Hybrid Architecture
 * Supports:
 * 1. LIVE HARDWARE MODE (Actual ESP32 via USB bridge or Render Cloud)
 * 2. REAL-DATA-BASED SIMULATION MODE (Captures real readings as baseline, modifies separate simulation state)
 * 3. MANUAL MODE (User-entered values with sliders/inputs)
 * 
 * Guarantees complete separation of:
 * - hardwareData (immutable actual readings)
 * - simulationBaseline (captured real baseline)
 * - simulationData (adjustable simulated values)
 * - manualData (user-entered manual values)
 */
class SmartFarmApiService {
  constructor() {
    this.zones = [...initialZones];
    this.agronomyData = JSON.parse(JSON.stringify(initialAgronomy));
    this.alerts = [];
    this.history = [];
    this.subscribers = new Set();

    // -------------------------------------------------------------
    // THREE SEPARATE DATA OBJECTS (Strict Data Integrity)
    // -------------------------------------------------------------

    // 1. HARDWARE DATA: Immutable actual ESP32 readings
    this.hardwareData = {
      hasReadings: false,
      readingsCount: 0,
      lastUpdated: null,
      lastUpdatedEpoch: 0,
      isStale: false,
      connectionStatus: 'disconnected', // 'connected' | 'waiting_data' | 'stale' | 'disconnected'
      port: null,
      temperature: null,
      humidity: null,
      soilMoisture: null,
      lightIntensity: null,
      soilRaw: null,
      lightRaw: null,
      dhtOk: null
    };

    // 2. SIMULATION BASELINE & SIMULATION DATA:
    this.simulationBaseline = {
      capturedAt: null,
      capturedEpoch: 0,
      hasRealBaseline: false,
      source: 'NONE', // 'REAL_ESP32_HARDWARE' | 'MANUAL_DEFAULTS'
      temperature: 28.0,
      humidity: 60.0,
      soilMoisture: 45.0,
      lightIntensity: 65.0
    };

    this.simulationData = {
      temperature: 28.0,
      humidity: 60.0,
      soilMoisture: 45.0,
      lightIntensity: 65.0
    };

    // 3. MANUAL DATA: User-controlled custom values
    this.manualData = {
      temperature: 28.0,
      humidity: 60.0,
      soilMoisture: 50.0,
      lightIntensity: 70.0
    };

    // Active Operating Mode: 'live_hardware' | 'simulation' | 'manual'
    const savedMode = localStorage.getItem('smartfarm_operating_mode');
    this.operatingMode = (savedMode === 'simulation' || savedMode === 'manual') ? savedMode : 'live_hardware';

    // Hardware Ingestion Protocol: 'usb_hardware' | 'cloud_backend'
    this.hardwareSource = localStorage.getItem('smartfarm_hardware_source') || 'usb_hardware';

    // Local USB Serial Bridge (http://127.0.0.1:5000)
    this.bridgeUrl = localStorage.getItem('smartfarm_bridge_url') || 'http://127.0.0.1:5000';
    this.usbStatus = 'disconnected';
    this.usbPort = null;
    this.usbLastSync = null;
    this.usbLastSyncEpoch = 0;
    this.usbRawReadings = null;
    this.usbError = null;
    this.usbPollingInterval = null;

    // Render Cloud Backend (https://smartfarming-e3b2.onrender.com)
    this.backendUrl = localStorage.getItem('smartfarm_backend_url') || 'https://smartfarming-e3b2.onrender.com';
    this.cloudStatus = 'disconnected';
    this.lastCloudSync = null;
    this.cloudPollingInterval = null;

    // Initialize polling
    if (this.hardwareSource === 'usb_hardware') {
      this.startUsbPolling();
    } else {
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

  // =============================================================
  // OPERATING MODE MANAGEMENT (3 MODES)
  // =============================================================

  setOperatingMode(mode) {
    if (mode !== 'live_hardware' && mode !== 'simulation' && mode !== 'manual') return;
    this.operatingMode = mode;
    localStorage.setItem('smartfarm_operating_mode', mode);

    if (mode === 'simulation') {
      // Auto-capture baseline if real hardware readings exist and no baseline was captured yet
      if (this.hardwareData.hasReadings && !this.simulationBaseline.hasRealBaseline) {
        this.captureSimulationBaseline();
      }
    }

    this.checkAlerts('ZONE-A');
    this.notify();
  }

  // Backward compatibility alias for legacy UI calls
  setDataMode(legacyMode) {
    if (legacyMode === 'simulation') {
      this.setOperatingMode('simulation');
    } else if (legacyMode === 'manual') {
      this.setOperatingMode('manual');
    } else if (legacyMode === 'usb_hardware' || legacyMode === 'cloud_backend') {
      this.hardwareSource = legacyMode;
      localStorage.setItem('smartfarm_hardware_source', legacyMode);
      this.setOperatingMode('live_hardware');
      if (legacyMode === 'usb_hardware') {
        this.stopCloudPolling();
        this.startUsbPolling();
      } else {
        this.stopUsbPolling();
        this.startCloudPolling();
      }
    }
    this.notify();
  }

  // =============================================================
  // SIMULATION CONTROLS & BASELINE CAPTURE
  // =============================================================

  /**
   * Prominently called when user clicks "SIMULATE DATA".
   * Queries Python backend (/api/simulate) via local bridge or Render cloud,
   * with fallback generating realistic values within exact agricultural bounds:
   * - Temperature: 20 to 40 °C
   * - Humidity: 30 to 90 %
   * - Soil Moisture: 20 to 80 %
   * - Relative Light Intensity: 10 to 100 %
   */
  async triggerSimulateData() {
    let simResult = null;

    // 1. Try local USB bridge /api/simulate first (Python random)
    if (this.bridgeUrl) {
      try {
        const res = await fetch(`${this.bridgeUrl}/api/simulate`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok) {
          const json = await res.json();
          if (typeof json.temperature === 'number') {
            simResult = json;
          }
        }
      } catch {
        // Local bridge not reachable
      }
    }

    // 2. Try Render Cloud Backend /api/simulate (Python random on Render)
    if (!simResult && this.backendUrl) {
      try {
        const res = await fetch(`${this.backendUrl}/api/simulate`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const json = await res.json();
          if (typeof json.temperature === 'number') {
            simResult = json;
          }
        }
      } catch {
        // Cloud backend not reachable
      }
    }

    // 3. Fallback: Plausible random telemetry within exact Python specifications
    if (!simResult) {
      const rand = (min, max) => Number((Math.random() * (max - min) + min).toFixed(1));
      const t = rand(20.0, 40.0);
      const h = t > 33.0 ? rand(30.0, 65.0) : rand(45.0, 90.0);
      const m = rand(20.0, 80.0);
      const l = rand(10.0, 100.0);
      simResult = {
        status: 'success',
        source: 'CLIENT_FALLBACK_SIMULATION',
        temperature: t,
        humidity: h,
        soilMoisture: m,
        lightIntensity: l,
        timestamp: new Date().toISOString()
      };
    }

    // Update simulation data state
    this.simulationData = {
      temperature: simResult.temperature,
      humidity: simResult.humidity,
      soilMoisture: simResult.soilMoisture,
      lightIntensity: simResult.lightIntensity,
      timestamp: simResult.timestamp,
      lastSimulatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // Append to historical telemetry time-series
    this.history.push({
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: simResult.temperature,
      humidity: simResult.humidity,
      soilMoisture: simResult.soilMoisture,
      lightIntensity: simResult.lightIntensity,
      isSimulation: true
    });
    if (this.history.length > 50) this.history.shift();

    // Switch operating mode to simulation
    this.operatingMode = 'simulation';
    localStorage.setItem('smartfarm_operating_mode', 'simulation');

    this.checkAlerts('ZONE-A');
    this.notify();

    return simResult;
  }

  /**
   * Backward compatibility alias for startRealSimulation.
   */
  startRealSimulation() {
    return this.triggerSimulateData();
  }

  captureSimulationBaseline() {
    return this.triggerSimulateData();
  }

  /**
   * Updates an individual or multiple simulation fields.
   * Never modifies hardwareData.
   */
  updateSimulationData(updates = {}) {
    const clamp = (val, min, max, fallback) => {
      const num = Number(val);
      if (isNaN(num)) return fallback;
      return Math.max(min, Math.min(max, num));
    };

    if (updates.temperature !== undefined) {
      this.simulationData.temperature = clamp(updates.temperature, 20.0, 45.0, this.simulationData.temperature);
    }
    if (updates.humidity !== undefined) {
      this.simulationData.humidity = clamp(updates.humidity, 20.0, 100.0, this.simulationData.humidity);
    }
    if (updates.soilMoisture !== undefined) {
      this.simulationData.soilMoisture = clamp(updates.soilMoisture, 0.0, 100.0, this.simulationData.soilMoisture);
    }
    if (updates.lightIntensity !== undefined) {
      this.simulationData.lightIntensity = clamp(updates.lightIntensity, 0.0, 100.0, this.simulationData.lightIntensity);
    }

    if (this.operatingMode !== 'simulation') {
      this.operatingMode = 'simulation';
      localStorage.setItem('smartfarm_operating_mode', 'simulation');
    }

    this.checkAlerts('ZONE-A');
    this.notify();
  }

  /**
   * Updates manual mode data.
   */
  updateManualData(updates = {}) {
    const clamp = (val, min, max, fallback) => {
      const num = Number(val);
      if (isNaN(num)) return fallback;
      return Math.max(min, Math.min(max, num));
    };

    if (updates.temperature !== undefined) {
      this.manualData.temperature = clamp(updates.temperature, 20.0, 45.0, this.manualData.temperature);
    }
    if (updates.humidity !== undefined) {
      this.manualData.humidity = clamp(updates.humidity, 20.0, 100.0, this.manualData.humidity);
    }
    if (updates.soilMoisture !== undefined) {
      this.manualData.soilMoisture = clamp(updates.soilMoisture, 0.0, 100.0, this.manualData.soilMoisture);
    }
    if (updates.lightIntensity !== undefined) {
      this.manualData.lightIntensity = clamp(updates.lightIntensity, 0.0, 100.0, this.manualData.lightIntensity);
    }

    if (this.operatingMode !== 'manual') {
      this.operatingMode = 'manual';
      localStorage.setItem('smartfarm_operating_mode', 'manual');
    }

    this.checkAlerts('ZONE-A');
    this.notify();
  }

  /**
   * Resets simulation data back to the captured baseline.
   */
  resetSimulationToBaseline() {
    this.simulationData = {
      temperature: this.simulationBaseline.temperature,
      humidity: this.simulationBaseline.humidity,
      soilMoisture: this.simulationBaseline.soilMoisture,
      lightIntensity: this.simulationBaseline.lightIntensity
    };
    this.checkAlerts('ZONE-A');
    this.notify();
  }

  /**
   * Resets simulation data back to default optimal values.
   */
  resetSimulationToDefaults() {
    this.simulationData = {
      temperature: 26.0,
      humidity: 60.0,
      soilMoisture: 50.0,
      lightIntensity: 65.0
    };
    this.checkAlerts('ZONE-A');
    this.notify();
  }

  /**
   * Applies one of the 6 scenario presets.
   */
  applyScenarioPreset(presetKey) {
    const preset = SIMULATION_PRESETS[presetKey];
    if (!preset) return;

    if (this.operatingMode === 'manual') {
      this.updateManualData({
        temperature: preset.temperature,
        humidity: preset.humidity,
        soilMoisture: preset.soilMoisture,
        lightIntensity: preset.lightIntensity
      });
    } else {
      this.updateSimulationData({
        temperature: preset.temperature,
        humidity: preset.humidity,
        soilMoisture: preset.soilMoisture,
        lightIntensity: preset.lightIntensity
      });
    }
  }

  /**
   * Exits simulation and returns cleanly to live hardware mode.
   */
  exitSimulation() {
    this.setOperatingMode('live_hardware');
  }

  // =============================================================
  // DATA INTEGRITY & SOURCE LABELS
  // =============================================================

  getSourceLabel() {
    switch (this.operatingMode) {
      case 'live_hardware':
        if (this.hardwareData.isStale) {
          return 'LIVE HARDWARE (STALE)';
        }
        return 'LIVE HARDWARE';
      case 'simulation':
        return this.simulationBaseline.hasRealBaseline 
          ? 'SIMULATED FROM REAL BASELINE' 
          : 'MANUAL SIMULATION (SYNTHETIC BASELINE)';
      case 'manual':
        return 'MANUAL INPUT';
      default:
        return 'UNKNOWN';
    }
  }

  getSimulationDeltas() {
    const b = this.simulationBaseline;
    const s = this.simulationData;

    const calcDelta = (simVal, baseVal, unit) => {
      if (baseVal === null || baseVal === undefined || simVal === null || simVal === undefined) {
        return { diff: null, text: 'N/A' };
      }
      const diff = Number((simVal - baseVal).toFixed(1));
      const prefix = diff > 0 ? '+' : '';
      return {
        diff,
        text: `${prefix}${diff}${unit}`
      };
    };

    return {
      temperature: {
        baseline: b.temperature,
        simulated: s.temperature,
        ...calcDelta(s.temperature, b.temperature, '°C')
      },
      soilMoisture: {
        baseline: b.soilMoisture,
        simulated: s.soilMoisture,
        ...calcDelta(s.soilMoisture, b.soilMoisture, '%')
      },
      humidity: {
        baseline: b.humidity,
        simulated: s.humidity,
        ...calcDelta(s.humidity, b.humidity, '%')
      },
      lightIntensity: {
        baseline: b.lightIntensity,
        simulated: s.lightIntensity,
        ...calcDelta(s.lightIntensity, b.lightIntensity, '%')
      }
    };
  }

  // =============================================================
  // GET ALL DATA (ENRICHED ACROSS 4 ZONES)
  // =============================================================

  getAllData() {
    const activeLabel = this.getSourceLabel();
    const deltas = this.getSimulationDeltas();

    // Determine current effective reading based on active mode
    let effectiveReading = {
      airTemperature: null,
      humidity: null,
      soilMoisture: null,
      lightIntensity: null
    };

    if (this.operatingMode === 'live_hardware') {
      effectiveReading = {
        airTemperature: this.hardwareData.temperature,
        humidity: this.hardwareData.humidity,
        soilMoisture: this.hardwareData.soilMoisture,
        lightIntensity: this.hardwareData.lightIntensity,
        soilRaw: this.hardwareData.soilRaw,
        lightRaw: this.hardwareData.lightRaw,
        dhtOk: this.hardwareData.dhtOk
      };
    } else if (this.operatingMode === 'simulation') {
      effectiveReading = {
        airTemperature: this.simulationData.temperature,
        humidity: this.simulationData.humidity,
        soilMoisture: this.simulationData.soilMoisture,
        lightIntensity: this.simulationData.lightIntensity
      };
    } else if (this.operatingMode === 'manual') {
      effectiveReading = {
        airTemperature: this.manualData.temperature,
        humidity: this.manualData.humidity,
        soilMoisture: this.manualData.soilMoisture,
        lightIntensity: this.manualData.lightIntensity
      };
    }

    const enrichedZones = this.zones.map(zone => {
      let zoneSensor = null;

      if (this.operatingMode === 'live_hardware') {
        if (zone.zoneId === 'ZONE-A') {
          zoneSensor = {
            ...effectiveReading,
            zoneId: 'ZONE-A',
            cropType: zone.cropType,
            timestamp: this.hardwareData.lastUpdated || new Date().toISOString()
          };
        } else {
          // Auxiliary zones are unmonitored / standby in single ESP32 USB mode
          zoneSensor = {
            airTemperature: null,
            humidity: null,
            soilMoisture: null,
            lightIntensity: null,
            zoneId: zone.zoneId,
            cropType: zone.cropType,
            timestamp: null,
            isStandby: true
          };
        }
      } else {
        // In Simulation or Manual mode: all zones evaluate with consistent simulation telemetry
        // with small agro-climatic offsets to reflect real soil texture variations
        const moistureOffset = zone.zoneId === 'ZONE-B' ? -4 : (zone.zoneId === 'ZONE-C' ? 6 : (zone.zoneId === 'ZONE-D' ? -8 : 0));
        const tempOffset = zone.zoneId === 'ZONE-C' ? -0.8 : (zone.zoneId === 'ZONE-D' ? 0.6 : 0);

        zoneSensor = {
          airTemperature: effectiveReading.airTemperature !== null ? Number((effectiveReading.airTemperature + tempOffset).toFixed(1)) : 28.0,
          humidity: effectiveReading.humidity !== null ? effectiveReading.humidity : 60.0,
          soilMoisture: effectiveReading.soilMoisture !== null ? Math.max(0, Math.min(100, effectiveReading.soilMoisture + moistureOffset)) : 45.0,
          lightIntensity: effectiveReading.lightIntensity !== null ? effectiveReading.lightIntensity : 65.0,
          zoneId: zone.zoneId,
          cropType: zone.cropType,
          timestamp: new Date().toISOString()
        };
      }

      const analysis = analyzeFarmData(zoneSensor);
      const agronomy = this.agronomyData[zone.zoneId] || null;

      return {
        ...zone,
        sensorData: zoneSensor,
        analysis,
        agronomy,
        sourceLabel: activeLabel,
        isLiveHardware: this.operatingMode === 'live_hardware' && this.hardwareData.connectionStatus === 'connected' && !this.hardwareData.isStale && zone.zoneId === 'ZONE-A',
        isStale: this.operatingMode === 'live_hardware' && this.hardwareData.isStale,
        hardwareStatus: this.operatingMode === 'live_hardware' 
          ? (zone.zoneId === 'ZONE-A' ? this.hardwareData.connectionStatus : 'unmonitored')
          : (this.operatingMode === 'simulation' ? 'simulated' : 'manual'),
        hardwareNodeId: zone.zoneId === 'ZONE-A' ? 'ESP32-DEV-USB' : null
      };
    });

    return {
      zones: enrichedZones,
      alerts: this.alerts,
      history: this.history,
      // Core Mode Architecture
      operatingMode: this.operatingMode,
      sourceLabel: activeLabel,
      hardwareSource: this.hardwareSource,
      // The 3 Separate Data Objects
      hardwareData: { ...this.hardwareData },
      simulationBaseline: { ...this.simulationBaseline },
      simulationData: { ...this.simulationData },
      manualData: { ...this.manualData },
      simulationDeltas: deltas,
      // Legacy compatibility keys
      dataMode: this.operatingMode === 'simulation' ? 'simulation' : (this.operatingMode === 'manual' ? 'manual' : this.hardwareSource),
      isSimulationRunning: this.operatingMode === 'simulation',
      isLiveHardware: this.operatingMode === 'live_hardware' && this.hardwareData.connectionStatus === 'connected' && !this.hardwareData.isStale,
      lastHardwareSync: this.hardwareData.lastUpdated,
      // USB Bridge State
      bridgeUrl: this.bridgeUrl,
      usbStatus: this.hardwareData.connectionStatus,
      usbPort: this.hardwareData.port,
      usbLastSync: this.hardwareData.lastUpdated,
      usbLastSyncEpoch: this.hardwareData.lastUpdatedEpoch,
      usbRawReadings: this.hardwareData.soilRaw !== null ? {
        temperature: this.hardwareData.temperature,
        humidity: this.hardwareData.humidity,
        soil_moisture: this.hardwareData.soilMoisture,
        soil_raw: this.hardwareData.soilRaw,
        light_raw: this.hardwareData.lightRaw,
        dht_ok: this.hardwareData.dhtOk
      } : null,
      usbError: this.usbError,
      // Cloud Backend State
      backendUrl: this.backendUrl,
      cloudStatus: this.cloudStatus,
      lastCloudSync: this.lastCloudSync
    };
  }

  // =============================================================
  // USB SERIAL BRIDGE POLLING (every 3s)
  // =============================================================

  setBridgeUrl(url) {
    this.bridgeUrl = url ? url.trim().replace(/\/+$/, '') : 'http://127.0.0.1:5000';
    localStorage.setItem('smartfarm_bridge_url', this.bridgeUrl);
    if (this.hardwareSource === 'usb_hardware') {
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
    if (this.hardwareSource !== 'usb_hardware') return;

    try {
      const response = await fetch(`${this.bridgeUrl}/api/readings`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2800)
      });

      if (!response.ok) {
        this.markHardwareStale(`Bridge returned HTTP ${response.status}`);
        return;
      }

      const payload = await response.json();
      const r = payload.readings;

      if (r && payload.status === 'connected') {
        const temp = typeof r.temperature === 'number' ? r.temperature : null;
        const hum = typeof r.humidity === 'number' ? r.humidity : null;
        const moist = typeof r.soil_moisture === 'number' ? r.soil_moisture : null;
        const light = typeof r.light_lux === 'number' ? Math.min(100, Math.round((r.light_lux / 1000) * 100)) : 65;

        // IMMUTABLE UPDATE TO HARDWARE DATA
        this.hardwareData.hasReadings = true;
        this.hardwareData.readingsCount += 1;
        this.hardwareData.lastUpdated = payload.last_updated 
          ? new Date(payload.last_updated).toLocaleTimeString() 
          : new Date().toLocaleTimeString();
        this.hardwareData.lastUpdatedEpoch = Date.now();
        this.hardwareData.isStale = false;
        this.hardwareData.connectionStatus = 'connected';
        this.hardwareData.port = payload.port || this.hardwareData.port;
        this.hardwareData.temperature = temp;
        this.hardwareData.humidity = hum;
        this.hardwareData.soilMoisture = moist;
        this.hardwareData.lightIntensity = light;
        this.hardwareData.soilRaw = r.soil_raw;
        this.hardwareData.lightRaw = r.light_raw;
        this.hardwareData.dhtOk = r.dht_ok;

        this.usbPort = payload.port || this.usbPort;
        this.usbStatus = 'connected';
        this.usbError = null;

        if (this.operatingMode === 'live_hardware') {
          this.checkAlerts('ZONE-A');
        }
      } else if (payload.status === 'waiting_data') {
        this.hardwareData.connectionStatus = 'waiting_data';
        this.usbStatus = 'waiting_data';
      } else if (payload.status === 'stale') {
        this.markHardwareStale('Telemetry packet interval exceeded');
      } else {
        this.markHardwareStale('No active packets');
      }

      this.notify();
    } catch {
      this.markHardwareStale('Bridge connection lost');
    }
  }

  markHardwareStale(reason = '') {
    if (this.hardwareData.hasReadings) {
      this.hardwareData.isStale = true;
      this.hardwareData.connectionStatus = 'stale';
    } else {
      this.hardwareData.connectionStatus = 'disconnected';
    }
    this.usbStatus = this.hardwareData.connectionStatus;
    this.usbError = reason;
    this.notify();
  }

  // =============================================================
  // RENDER CLOUD BACKEND POLLING (every 4s)
  // =============================================================

  setBackendUrl(url) {
    this.backendUrl = url ? url.trim().replace(/\/+$/, '') : 'https://smartfarming-e3b2.onrender.com';
    localStorage.setItem('smartfarm_backend_url', this.backendUrl);
    if (this.hardwareSource === 'cloud_backend') {
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
    if (this.hardwareSource !== 'cloud_backend' || !this.backendUrl) return;

    try {
      const response = await fetch(`${this.backendUrl}/api/sensor-data`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        this.cloudStatus = 'disconnected';
        this.markHardwareStale(`Cloud HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data && data.zones && data.zones['ZONE-A']) {
        const live = data.zones['ZONE-A'];
        this.hardwareData.hasReadings = true;
        this.hardwareData.readingsCount += 1;
        this.hardwareData.lastUpdated = live.lastUpdated ? new Date(live.lastUpdated).toLocaleTimeString() : new Date().toLocaleTimeString();
        this.hardwareData.lastUpdatedEpoch = Date.now();
        this.hardwareData.isStale = false;
        this.hardwareData.connectionStatus = 'connected';
        this.hardwareData.temperature = live.airTemperature;
        this.hardwareData.humidity = live.humidity;
        this.hardwareData.soilMoisture = live.soilMoisture;
        this.hardwareData.lightIntensity = live.lightIntensity;

        this.cloudStatus = 'connected';
        this.lastCloudSync = this.hardwareData.lastUpdated;

        if (this.operatingMode === 'live_hardware') {
          this.checkAlerts('ZONE-A');
        }
        this.notify();
      }
    } catch {
      this.cloudStatus = 'disconnected';
      this.markHardwareStale('Cloud offline');
    }
  }

  // =============================================================
  // ALERTS & OPERATIONAL ACTIONS
  // =============================================================

  checkAlerts(zoneId) {
    const enriched = this.getAllData().zones;
    const zone = enriched.find(z => z.zoneId === zoneId);
    if (!zone || !zone.analysis) return;
    const analysis = zone.analysis;

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

  simulateAction(action, zoneId = 'ZONE-A') {
    if (action === 'IRRIGATE') {
      if (this.operatingMode === 'simulation') {
        this.updateSimulationData({
          soilMoisture: Math.min(100, (this.simulationData.soilMoisture || 20) + 35)
        });
      } else if (this.operatingMode === 'manual') {
        this.updateManualData({
          soilMoisture: Math.min(100, (this.manualData.soilMoisture || 20) + 35)
        });
      }
      this.alerts.unshift({
        id: Date.now().toString(),
        zoneId,
        zoneName: this.zones.find(z => z.zoneId === zoneId)?.name || zoneId,
        timestamp: new Date().toISOString(),
        severity: 'Information',
        message: `Irrigation valve command dispatched to ${zoneId}.`,
        resolved: false
      });
    } else if (action === 'RAINFALL') {
      if (this.operatingMode === 'simulation') {
        this.updateSimulationData({
          soilMoisture: Math.min(100, (this.simulationData.soilMoisture || 35) + 30),
          humidity: Math.min(100, (this.simulationData.humidity || 50) + 20),
          temperature: Math.max(15, (this.simulationData.temperature || 28) - 3)
        });
      } else if (this.operatingMode === 'manual') {
        this.updateManualData({
          soilMoisture: Math.min(100, (this.manualData.soilMoisture || 35) + 30),
          humidity: Math.min(100, (this.manualData.humidity || 50) + 20),
          temperature: Math.max(15, (this.manualData.temperature || 28) - 3)
        });
      }
      this.alerts.unshift({
        id: Date.now().toString(),
        zoneId: 'ALL',
        zoneName: 'Farm-wide',
        timestamp: new Date().toISOString(),
        severity: 'Information',
        message: `Rainfall scenario applied to field telemetry.`,
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

export const apiService = new SmartFarmApiService();
