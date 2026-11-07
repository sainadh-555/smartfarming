import initialSensorReadings from '../data/sensor_readings.json';
import initialZones from '../data/farm_zones.json';
import initialAgronomy from '../data/zone_agronomy.json';
import { analyzeFarmData, SIMULATION_PRESETS } from '../ai/farmDecisionEngine';

export const CROPS_CATALOG = [
  { id: 'Tomato', name: 'Tomato', nameTe: 'టమోటా', variety: 'Arka Rakshak F1', soilType: 'Red Sandy Loam', durationDays: 120, waterDemand: '4-6 mm/day', optimalTemp: '20-30°C' },
  { id: 'Chili', name: 'Chili', nameTe: 'మిర్చి', variety: 'Guntur Sannam', soilType: 'Black Cotton Soil', durationDays: 150, waterDemand: '3-5 mm/day', optimalTemp: '22-32°C' },
  { id: 'Paddy', name: 'Paddy (Rice)', nameTe: 'వరి', variety: 'BPT 5204 (Sona Masoori)', soilType: 'Clayey Loam', durationDays: 135, waterDemand: '8-10 mm/day', optimalTemp: '24-34°C' },
  { id: 'Groundnut', name: 'Groundnut', nameTe: 'వేరుశనగ', variety: 'Kadiri 6', soilType: 'Sandy Loam', durationDays: 110, waterDemand: '3-4 mm/day', optimalTemp: '22-30°C' },
  { id: 'Corn', name: 'Corn (Maize)', nameTe: 'మొక్కజొన్న', variety: 'DHM 117', soilType: 'Well-drained Loam', durationDays: 105, waterDemand: '4-5 mm/day', optimalTemp: '20-32°C' },
  { id: 'Cotton', name: 'Cotton', nameTe: 'ప్రత్తి', variety: 'Bt Cotton Hybrid', soilType: 'Deep Black Soil', durationDays: 160, waterDemand: '4-6 mm/day', optimalTemp: '24-35°C' },
  { id: 'Wheat', name: 'Wheat', nameTe: 'గోధుమ', variety: 'Sharbati HD-2967', soilType: 'Fertile Loam', durationDays: 120, waterDemand: '3-5 mm/day', optimalTemp: '18-25°C' },
  { id: 'Sunflower', name: 'Sunflower', nameTe: 'పొద్దుతిరుగుడు', variety: 'KBSH-44', soilType: 'Sandy Clay Loam', durationDays: 95, waterDemand: '3-4 mm/day', optimalTemp: '22-30°C' },
  { id: 'Sugarcane', name: 'Sugarcane', nameTe: 'చెరకు', variety: 'Co 86032', soilType: 'Rich Loam', durationDays: 360, waterDemand: '7-10 mm/day', optimalTemp: '25-35°C' },
  { id: 'Potato', name: 'Potato', nameTe: 'బంగాళాదుంప', variety: 'Kufri Jyoti', soilType: 'Sandy Loam', durationDays: 90, waterDemand: '4-5 mm/day', optimalTemp: '16-24°C' },
  { id: 'Bell Pepper', name: 'Bell Pepper (Capsicum)', nameTe: 'క్యాప్సికం', variety: 'Indra Hybrid', soilType: 'Loamy Soil', durationDays: 100, waterDemand: '4-6 mm/day', optimalTemp: '20-28°C' },
  { id: 'Soybean', name: 'Soybean', nameTe: 'సోయాబీన్', variety: 'JS 335', soilType: 'Clay Loam', durationDays: 100, waterDemand: '4-5 mm/day', optimalTemp: '22-30°C' },
  { id: 'Custom', name: 'Other / Custom Crop', nameTe: 'ఇతర / అనుకూల పంట', variety: 'Farmer Selected Variety', soilType: 'Field Soil', durationDays: 120, waterDemand: 'Variable', optimalTemp: '20-30°C' }
];

/**
 * SmartFarm API Service — Hybrid Architecture
 * Supports:
 * 1. LIVE HARDWARE MODE (Actual ESP32 via USB bridge, Web Serial, or Render Cloud)
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
    let loadedZones = initialZones;
    let loadedAgronomy = initialAgronomy;
    try {
      const savedZones = localStorage.getItem('smartfarm_custom_zones');
      if (savedZones) loadedZones = JSON.parse(savedZones);
      const savedAgro = localStorage.getItem('smartfarm_custom_agronomy');
      if (savedAgro) loadedAgronomy = JSON.parse(savedAgro);
    } catch (e) {
      console.warn('Error reading stored custom zones:', e);
    }

    this.zones = [...loadedZones];
    this.agronomyData = JSON.parse(JSON.stringify(loadedAgronomy));
    this.alerts = [];
    this.history = [];
    this.subscribers = new Set();
    
    // Direct Web Serial API State
    this.webSerialPort = null;
    this.webSerialReader = null;
    this.webSerialConnected = false;

    // Direct Web Bluetooth LE (BLE) State
    this.bleDevice = null;
    this.bleServer = null;
    this.bleCharacteristic = null;
    this.bleConnected = false;
    this.bleConnecting = false;
    this.bleError = null;

    // Buffer helpers for streaming packets
    this._kvBuffer = {};
    this.serialBuffer = '';

    // Listen for physical USB unplug if supported
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        navigator.serial.addEventListener('disconnect', (event) => {
          if (this.webSerialPort && event.port === this.webSerialPort) {
            this.handleHardwareDisconnected('USB Serial device unplugged');
          }
        });
      } catch {}
    }

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

    // Detect execution environment:
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname === '[::1]'
    );

    // Active Operating Mode: 'live_hardware' | 'simulation' | 'manual'
    const savedMode = localStorage.getItem('smartfarm_operating_mode');
    this.operatingMode = (savedMode === 'simulation' || savedMode === 'manual') ? savedMode : 'live_hardware';

    // Hardware Ingestion Protocol: 'usb_hardware' | 'cloud_backend'
    // On HTTPS (such as GitHub Pages) or remote mobile devices, default to 'cloud_backend'
    // to avoid browser Mixed Content errors (http://127.0.0.1:5000 is blocked on https).
    const savedSource = localStorage.getItem('smartfarm_hardware_source');
    if (!savedSource) {
      this.hardwareSource = (isHttps || !isLocalhost) ? 'cloud_backend' : 'usb_hardware';
    } else {
      this.hardwareSource = savedSource;
    }

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

    // Freshness Watchdog (8 seconds threshold per Issue 2)
    // If connected hardware stops transmitting for > 8s, mark disconnected and set values to null (N/A)
    this.watchdogInterval = setInterval(() => {
      if (this.operatingMode === 'live_hardware' && this.hardwareData.hasReadings) {
        const secondsSinceLast = (Date.now() - (this.hardwareData.lastUpdatedEpoch || 0)) / 1000;
        if (secondsSinceLast > 8.0 && this.hardwareData.connectionStatus === 'connected') {
          this.hardwareData.isStale = true;
          this.hardwareData.connectionStatus = 'disconnected';
          this.hardwareData.temperature = null;
          this.hardwareData.humidity = null;
          this.hardwareData.soilMoisture = null;
          this.hardwareData.lightIntensity = null;
          this.hardwareData.soilRaw = null;
          this.hardwareData.lightRaw = null;
          this.usbStatus = 'disconnected';
          this.usbError = 'Hardware telemetry timed out (> 8s without new packets)';
          this.notify();
        }
      }
    }, 2000);
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
      const isLiveHardwareActive = this.hardwareData.connectionStatus === 'connected' && !this.hardwareData.isStale;
      effectiveReading = {
        airTemperature: isLiveHardwareActive ? this.hardwareData.temperature : null,
        humidity: isLiveHardwareActive ? this.hardwareData.humidity : null,
        soilMoisture: isLiveHardwareActive ? this.hardwareData.soilMoisture : null,
        lightIntensity: isLiveHardwareActive ? this.hardwareData.lightIntensity : null,
        soilRaw: isLiveHardwareActive ? this.hardwareData.soilRaw : null,
        lightRaw: isLiveHardwareActive ? this.hardwareData.lightRaw : null,
        dhtOk: isLiveHardwareActive ? this.hardwareData.dhtOk : null
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
      usbRawReadings: (this.hardwareData.temperature !== null || this.hardwareData.soilMoisture !== null) ? {
        temperature: this.hardwareData.temperature,
        humidity: this.hardwareData.humidity,
        soil_moisture: this.hardwareData.soilMoisture,
        soil_raw: this.hardwareData.soilRaw,
        light_raw: this.hardwareData.lightRaw,
        light_lux: this.hardwareData.lightIntensity !== null ? Math.round(this.hardwareData.lightIntensity * 10) : null,
        light_intensity: this.hardwareData.lightIntensity,
        dht_ok: this.hardwareData.dhtOk
      } : null,
      usbError: this.usbError,
      // Bluetooth LE State
      bleConnected: this.bleConnected,
      bleConnecting: this.bleConnecting,
      bleError: this.bleError,
      bleDeviceName: this.bleDevice ? (this.bleDevice.name || 'ESP32-BLE') : null,
      isWebBluetoothSupported: this.isWebBluetoothSupported(),
      isWebSerialSupported: this.isWebSerialSupported(),
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
        // Fallback to cloud if bridge is unreachable or returned error
        await this.fetchLiveCloudData(true);
        return;
      }

      const payload = await response.json();
      const r = payload.readings;

      if (r && payload.status === 'connected') {
        const temp = typeof r.temperature === 'number' ? r.temperature : null;
        const hum = typeof r.humidity === 'number' ? r.humidity : null;
        const moist = typeof r.soil_moisture === 'number' ? r.soil_moisture : null;
        let light = null;
        if (typeof r.light_intensity === 'number') {
          light = r.light_intensity;
        } else if (typeof r.lightIntensity === 'number') {
          light = r.lightIntensity;
        } else if (typeof r.light_raw === 'number') {
          const calc = ((r.light_raw - 3900) / (300 - 3900)) * 100;
          light = Math.max(0, Math.min(100, Math.round(calc * 10) / 10));
        }

        this.ingestRealHardwareReading({
          temperature: temp,
          humidity: hum,
          soilMoisture: moist,
          lightIntensity: light,
          soilRaw: r.soil_raw,
          lightRaw: r.light_raw,
          port: payload.port || this.hardwareData.port || 'COM7',
          lastUpdated: payload.last_updated
        });

        this.usbPort = payload.port || this.usbPort || 'COM7';
        this.usbStatus = 'connected';
        this.usbError = null;
        this.notify();
      } else if (payload.status === 'waiting_data') {
        this.hardwareData.connectionStatus = 'waiting_data';
        this.usbStatus = 'waiting_data';
        this.notify();
      } else if (payload.status === 'stale') {
        await this.fetchLiveCloudData(true);
      } else {
        await this.fetchLiveCloudData(true);
      }
    } catch {
      // Local bridge failed (e.g. Mixed Content block on GitHub Pages HTTPS or bridge not started)
      await this.fetchLiveCloudData(true);
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

  async analyzePlantImage(imageFileOrBase64, language = 'en') {
    const target = this.backendUrl || 'https://smartfarming-e3b2.onrender.com';
    try {
      let response;
      if (typeof imageFileOrBase64 === 'string') {
        response = await fetch(`${target}/api/plant/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageFileOrBase64, language }),
          signal: AbortSignal.timeout(20000)
        });
      } else if (imageFileOrBase64 instanceof File || imageFileOrBase64 instanceof Blob) {
        const formData = new FormData();
        formData.append('file', imageFileOrBase64);
        formData.append('language', language);
        response = await fetch(`${target}/api/plant/analyze`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(20000)
        });
      } else {
        throw new Error('Unsupported image input type');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[ApiService] Backend plant vision request failed:', err.message);
      throw err;
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

  async fetchLiveCloudData(isFallback = false) {
    if (!this.backendUrl) return;
    if (!isFallback && this.hardwareSource !== 'cloud_backend') return;

    try {
      const response = await fetch(`${this.backendUrl}/api/sensor-data`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        this.cloudStatus = 'disconnected';
        if (!isFallback) this.markHardwareStale(`Cloud HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data && data.zones && data.zones['ZONE-A']) {
        const live = data.zones['ZONE-A'];
        const lastUpdatedDate = live.lastUpdated ? new Date(live.lastUpdated) : null;
        const secondsOld = lastUpdatedDate ? (Date.now() - lastUpdatedDate.getTime()) / 1000 : 999999;
        const isFresh = Boolean(live.isLiveHardware) && secondsOld <= 8.0;

        if (isFresh && (typeof live.airTemperature === 'number' || typeof live.soilMoisture === 'number' || typeof live.lightIntensity === 'number')) {
          const cloudLight = typeof live.lightIntensity === 'number' 
            ? live.lightIntensity 
            : (typeof live.light_intensity === 'number' ? live.light_intensity : null);

          this.ingestRealHardwareReading({
            temperature: typeof live.airTemperature === 'number' ? live.airTemperature : null,
            humidity: typeof live.humidity === 'number' ? live.humidity : null,
            soilMoisture: typeof live.soilMoisture === 'number' ? live.soilMoisture : null,
            lightIntensity: cloudLight,
            soilRaw: live.soil_raw,
            lightRaw: live.light_raw,
            port: `Render Cloud (${live.deviceId || 'ESP32'})`,
            lastUpdated: live.lastUpdated
          });

          this.cloudStatus = 'connected';
          this.lastCloudSync = this.hardwareData.lastUpdated;
          this.usbPort = `Render Cloud (${live.deviceId || 'ESP32'})`;
          this.usbStatus = 'connected';
          this.usbError = null;
        } else {
          this.cloudStatus = 'connected';
          if (!isFallback || this.hardwareSource === 'cloud_backend') {
            this.markHardwareStale(live.isLiveHardware ? 'Hardware telemetry stale (> 8s)' : 'Hardware disconnected');
          }
          this.notify();
        }
      }
    } catch {
      this.cloudStatus = 'disconnected';
      if (!isFallback) {
        this.markHardwareStale('Cloud offline');
      }
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

  // =============================================================
  // HARDWARE DATA INGESTION & DISCONNECTION (UNIFIED ACROSS SOURCES)
  // =============================================================

  handleHardwareDisconnected(reason = '') {
    this.webSerialConnected = false;
    this.bleConnected = false;
    this.bleConnecting = false;
    this.hardwareData.connectionStatus = 'disconnected';
    this.hardwareData.isStale = true;
    this.hardwareData.port = null;
    this.hardwareData.temperature = null;
    this.hardwareData.humidity = null;
    this.hardwareData.soilMoisture = null;
    this.hardwareData.lightIntensity = null;
    this.hardwareData.soilRaw = null;
    this.hardwareData.lightRaw = null;
    this.usbStatus = 'disconnected';
    this.usbPort = null;
    this.usbError = reason;
    this.notify();
  }

  ingestRealHardwareReading(r = {}) {
    // 1. Data Validation: Sanitize and reject out-of-range sensor values
    const sanitizeNum = (val, min, max) => {
      if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) return null;
      const num = Number(val);
      if (isNaN(num)) return null;
      if (num < min || num > max) return null; // Reject physical sensor overflow / glitches
      return Number(num.toFixed(1));
    };

    const rawTemp = r.temperature !== undefined ? r.temperature : r.airTemperature;
    const rawHum = r.humidity;
    
    // Soil moisture resolution: accept calibrated percentage or calculate from raw ADC
    const rawMoist = r.soil_moisture !== undefined ? r.soil_moisture : r.soilMoisture;
    let moist = null;
    if (rawMoist !== null && rawMoist !== undefined && rawMoist !== '' && !isNaN(Number(rawMoist))) {
      const num = Number(rawMoist);
      if (num >= 0.0 && num <= 100.0) {
        moist = Number(num.toFixed(1));
      } else if (num > 100.0 && num <= 4095.0) {
        // Raw ADC value passed; calibrate: 3500 dry -> 0%, 1300 wet -> 100%
        const calc = ((3500 - num) / (3500 - 1300)) * 100;
        moist = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
      }
    } else if (typeof r.soil_raw === 'number' || typeof r.soilRaw === 'number') {
      const sRaw = typeof r.soil_raw === 'number' ? r.soil_raw : r.soilRaw;
      if (sRaw >= 0 && sRaw <= 4095) {
        const calc = ((3500 - sRaw) / (3500 - 1300)) * 100;
        moist = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
      }
    }

    // Light intensity resolution: accept calibrated percentage or calculate from raw ADC (0-4095)
    // Formula: light_percentage = ((raw - dark_ref) / (bright_ref - dark_ref)) * 100
    // Dark: 3900 ADC, Bright: 300 ADC (inverted response handled seamlessly)
    const rawLight = (
      r.light_intensity !== undefined 
        ? r.light_intensity 
        : (r.lightIntensity !== undefined 
          ? r.lightIntensity 
          : (r.light_percent !== undefined ? r.light_percent : null))
    );

    let light = null;
    if (rawLight !== null && rawLight !== undefined && rawLight !== '' && !isNaN(Number(rawLight))) {
      const num = Number(rawLight);
      if (num >= 0.0 && num <= 100.0) {
        light = Number(num.toFixed(1));
      } else if (num > 100.0 && num <= 4095.0) {
        // Raw ADC or lux sent as light; calibrate using standard dark/bright constants
        const calc = ((num - 3900) / (300 - 3900)) * 100;
        light = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
      }
    } else if (typeof r.light_raw === 'number' || typeof r.lightRaw === 'number') {
      const lRaw = typeof r.light_raw === 'number' ? r.light_raw : r.lightRaw;
      if (lRaw >= 0 && lRaw <= 4095) {
        const calc = ((lRaw - 3900) / (300 - 3900)) * 100;
        light = Number(Math.max(0, Math.min(100, calc)).toFixed(1));
      }
    }

    const temp = sanitizeNum(rawTemp, -15.0, 70.0);
    const hum = sanitizeNum(rawHum, 0.0, 100.0);

    // If DHT11 failed (NaN, null, or out of range), keep null and flag dhtOk = false
    const dhtOk = (temp !== null && hum !== null);

    this.hardwareData.hasReadings = true;
    this.hardwareData.readingsCount += 1;
    this.hardwareData.lastUpdated = r.lastUpdated 
      ? new Date(r.lastUpdated).toLocaleTimeString() 
      : new Date().toLocaleTimeString();
    this.hardwareData.lastUpdatedEpoch = Date.now();
    this.hardwareData.isStale = false;
    this.hardwareData.connectionStatus = 'connected';
    if (r.port) this.hardwareData.port = r.port;
    this.hardwareData.temperature = temp;
    this.hardwareData.humidity = hum;
    this.hardwareData.soilMoisture = moist;
    this.hardwareData.lightIntensity = light;
    this.hardwareData.soilRaw = typeof r.soil_raw === 'number' ? r.soil_raw : (typeof r.soilRaw === 'number' ? r.soilRaw : null);
    this.hardwareData.lightRaw = typeof r.light_raw === 'number' ? r.light_raw : (typeof r.lightRaw === 'number' ? r.lightRaw : null);
    this.hardwareData.dhtOk = dhtOk;

    // Only record valid hardware readings in real history
    if (temp !== null || moist !== null || light !== null) {
      this.history.push({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature: this.hardwareData.temperature,
        humidity: this.hardwareData.humidity,
        soilMoisture: this.hardwareData.soilMoisture,
        lightIntensity: this.hardwareData.lightIntensity,
        isSimulation: false,
        source: 'hardware'
      });
      if (this.history.length > 100) this.history.shift();
    }

    if (this.operatingMode === 'live_hardware') {
      this.checkAlerts('ZONE-A');
    }
    this.notify();
  }

  parseAndIngestTelemetryLine(line, portName = 'ESP32') {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // 1. JSON Format: {"temperature":30.5,"humidity":74.8,"soil_raw":2500,"light_raw":1033,"soil_moisture":35.7,"light_intensity":85.0}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const data = JSON.parse(trimmed);
        if (typeof data === 'object' && data !== null) {
          this.ingestRealHardwareReading({
            ...data,
            port: portName
          });

          // Forward to Render Cloud backend so remote mobile devices see the live data
          if (this.backendUrl && (typeof data.temperature === 'number' || typeof data.soil_moisture === 'number' || typeof data.light_intensity === 'number')) {
            const moist = typeof data.soil_moisture === 'number' ? data.soil_moisture : (typeof data.soilMoisture === 'number' ? data.soilMoisture : null);
            const light = typeof data.light_intensity === 'number' ? data.light_intensity : (typeof data.lightIntensity === 'number' ? data.lightIntensity : null);
            fetch(`${this.backendUrl}/api/sensor-data`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: portName.includes('BLE') ? 'ESP32-BLE' : 'ESP32-DEV-USB',
                farmId: 'FARM-001',
                zoneId: 'ZONE-A',
                airTemperature: data.temperature,
                humidity: data.humidity,
                soilMoisture: moist,
                lightIntensity: light,
                soil_raw: data.soil_raw,
                light_raw: data.light_raw
              })
            }).catch(() => {});
          }
          return;
        }
      } catch {
        // Malformed JSON: gracefully ignore per Issue 4 Condition 7
        return;
      }
    }

    // 2. Key-Value format (e.g. Temperature: 30.50)
    this.processKeyValueLine(trimmed, portName);
  }

  processKeyValueLine(line, portName) {
    if (!this._kvBuffer) this._kvBuffer = {};
    const kv = this._kvBuffer;

    const tempMatch = line.match(/temperature\s*[:=]\s*([0-9.]+)/i);
    if (tempMatch) kv.temperature = parseFloat(tempMatch[1]);

    const humMatch = line.match(/humidity\s*[:=]\s*([0-9.]+)/i);
    if (humMatch) kv.humidity = parseFloat(humMatch[1]);

    const soilRawMatch = line.match(/soil\s+raw\s*[:=]\s*([0-9.]+)/i);
    if (soilRawMatch) {
      kv.soil_raw = parseInt(soilRawMatch[1], 10);
    } else {
      const soilMatch = line.match(/soil(?:\s+moisture)?\s*[:=]\s*([0-9.]+)/i);
      if (soilMatch) kv.soil_moisture = parseFloat(soilMatch[1]);
    }

    const lightRawMatch = line.match(/light\s+raw\s*[:=]\s*([0-9.]+)/i);
    if (lightRawMatch) {
      kv.light_raw = parseInt(lightRawMatch[1], 10);
    } else {
      const lightMatch = line.match(/light(?:\s+intensity|\s+percent|\s*%)?\s*[:=]\s*([0-9.]+)/i);
      if (lightMatch) kv.light_intensity = parseFloat(lightMatch[1]);
    }

    const isDelimiter = line.includes('---') || line.includes('===');
    const hasAll = (
      kv.temperature !== undefined &&
      kv.humidity !== undefined &&
      (kv.soil_raw !== undefined || kv.soil_moisture !== undefined) &&
      (kv.light_raw !== undefined || kv.light_intensity !== undefined)
    );

    if (isDelimiter || hasAll) {
      let moist = null;
      if (typeof kv.soil_moisture === 'number') {
        moist = kv.soil_moisture;
      } else if (typeof kv.soil_raw === 'number') {
        const calc = ((3500 - kv.soil_raw) / (3500 - 1300)) * 100;
        moist = Math.max(0, Math.min(100, Math.round(calc * 10) / 10));
      }
      
      let lightInt = null;
      if (typeof kv.light_intensity === 'number') {
        lightInt = Math.max(0, Math.min(100, kv.light_intensity));
      } else if (typeof kv.light_raw === 'number') {
        const calc = ((kv.light_raw - 3900) / (300 - 3900)) * 100;
        lightInt = Math.max(0, Math.min(100, Math.round(calc * 10) / 10));
      }

      this.ingestRealHardwareReading({
        temperature: kv.temperature,
        humidity: kv.humidity,
        soilMoisture: moist,
        soilRaw: kv.soil_raw,
        lightIntensity: lightInt,
        lightRaw: kv.light_raw,
        port: portName
      });

      if (this.backendUrl && (kv.temperature !== undefined || moist !== null || lightInt !== null)) {
        fetch(`${this.backendUrl}/api/sensor-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: portName.includes('BLE') ? 'ESP32-BLE' : 'ESP32-DEV-USB',
            farmId: 'FARM-001',
            zoneId: 'ZONE-A',
            airTemperature: kv.temperature,
            humidity: kv.humidity,
            soilMoisture: moist,
            lightIntensity: lightInt,
            soil_raw: kv.soil_raw,
            light_raw: kv.light_raw
          })
        }).catch(() => {});
      }
      this._kvBuffer = {};
    }
  }

  // =============================================================
  // WEB SERIAL API (DIRECT BROWSER-TO-ESP32 VIA CHROME/EDGE)
  // =============================================================

  isWebSerialSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async connectWebSerial() {
    if (!this.isWebSerialSupported()) {
      throw new Error('Web Serial is not supported in this browser. Please use desktop Google Chrome or Microsoft Edge.');
    }

    if (this.webSerialConnected) {
      await this.disconnectWebSerial();
    }

    try {
      this.webSerialPort = await navigator.serial.requestPort();
      await this.webSerialPort.open({ baudRate: 115200 });
      this.webSerialConnected = true;
      this.operatingMode = 'live_hardware';
      localStorage.setItem('smartfarm_operating_mode', 'live_hardware');
      this.hardwareData.port = 'WebSerial (COM7)';
      this.hardwareData.connectionStatus = 'connected';
      this.hardwareData.isStale = false;
      this.usbPort = 'WebSerial (COM7)';
      this.usbStatus = 'connected';
      this.usbError = null;

      this.readWebSerialStream();
      this.notify();
      return true;
    } catch (err) {
      this.webSerialConnected = false;
      throw err;
    }
  }

  async disconnectWebSerial() {
    this.webSerialConnected = false;
    if (this.webSerialReader) {
      try {
        await this.webSerialReader.cancel();
      } catch {}
      try {
        this.webSerialReader.releaseLock();
      } catch {}
      this.webSerialReader = null;
    }

    if (this.webSerialPort) {
      try {
        await this.webSerialPort.close();
      } catch {}
      this.webSerialPort = null;
    }

    this.handleHardwareDisconnected('Disconnected Web Serial');
  }

  async readWebSerialStream() {
    if (!this.webSerialPort || !this.webSerialPort.readable) return;

    try {
      const textDecoder = new TextDecoderStream();
      this.webSerialPort.readable.pipeTo(textDecoder.writable).catch(() => {});
      const reader = textDecoder.readable.getReader();
      this.webSerialReader = reader;
      let lineBuffer = '';

      while (this.webSerialConnected) {
        const { value, done } = await reader.read();
        if (done) break;
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();

        for (const line of lines) {
          this.parseAndIngestTelemetryLine(line, this.hardwareData.port || 'WebSerial (COM7)');
        }
      }
    } catch (err) {
      if (this.webSerialConnected) {
        console.warn('[WebSerial] Stream terminated:', err);
        this.handleHardwareDisconnected('Serial port closed or disconnected');
      }
    } finally {
      this.webSerialReader = null;
    }
  }

  // =============================================================
  // WEB BLUETOOTH LE (BLE) API
  // =============================================================

  isWebBluetoothSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async connectWebBluetooth() {
    if (!this.isWebBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome on Android, Windows (with Bluetooth LE), macOS, Linux, or ChromeOS. Note: iOS Safari does not support Web Bluetooth.');
    }

    if (this.bleConnected) {
      await this.disconnectWebBluetooth();
    }

    try {
      this.bleConnecting = true;
      this.bleError = null;
      this.notify();

      // Standard Nordic UART Service (NUS) & Custom SmartFarm GATT Service
      const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
      const SMARTFARM_SERVICE = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
      const GENERIC_SERIAL_SERVICE = 0xFFE0;

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          NUS_SERVICE,
          SMARTFARM_SERVICE,
          GENERIC_SERIAL_SERVICE,
          'battery_service',
          'environmental_sensing'
        ]
      });

      this.bleDevice = device;

      device.addEventListener('gattserverdisconnected', () => {
        this.handleHardwareDisconnected(`Bluetooth LE device "${device.name || 'ESP32'}" disconnected.`);
      });

      const server = await device.gatt.connect();
      this.bleServer = server;

      let targetCharacteristic = null;

      // 1. Try Nordic UART TX characteristic
      try {
        const nus = await server.getPrimaryService(NUS_SERVICE);
        targetCharacteristic = await nus.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      } catch {}

      // 2. Try SmartFarm custom service characteristic
      if (!targetCharacteristic) {
        try {
          const custom = await server.getPrimaryService(SMARTFARM_SERVICE);
          targetCharacteristic = await custom.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
        } catch {}
      }

      // 3. Fallback: inspect any notify characteristic
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const chars = await service.getCharacteristics();
              const notifyChar = chars.find(c => c.properties.notify || c.properties.indicate);
              if (notifyChar) {
                targetCharacteristic = notifyChar;
                break;
              }
            } catch {}
          }
        } catch {}
      }

      if (!targetCharacteristic) {
        throw new Error(`Connected to "${device.name || 'ESP32'}", but could not find a BLE notification characteristic. Ensure your ESP32 sketch enables GATT notifications for Nordic UART (UUID 6e400001...) or SmartFarm Service.`);
      }

      this.bleCharacteristic = targetCharacteristic;
      await targetCharacteristic.startNotifications();

      let bleLineBuffer = '';
      targetCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const text = new TextDecoder('utf-8').decode(value);
        bleLineBuffer += text;
        const lines = bleLineBuffer.split('\n');
        bleLineBuffer = lines.pop();

        for (const line of lines) {
          this.parseAndIngestTelemetryLine(line, `BLE: ${device.name || 'ESP32'}`);
        }
      });

      this.bleConnected = true;
      this.bleConnecting = false;
      this.operatingMode = 'live_hardware';
      localStorage.setItem('smartfarm_operating_mode', 'live_hardware');
      this.hardwareData.port = `BLE: ${device.name || 'ESP32'}`;
      this.hardwareData.connectionStatus = 'connected';
      this.hardwareData.isStale = false;
      this.usbStatus = 'connected';
      this.usbPort = `BLE: ${device.name || 'ESP32'}`;
      this.notify();

      return { success: true, deviceName: device.name || 'ESP32-BLE' };
    } catch (err) {
      this.bleConnecting = false;
      this.bleConnected = false;
      this.bleError = err.message || 'BLE Connection failed';
      throw err;
    }
  }

  async disconnectWebBluetooth() {
    if (this.bleCharacteristic) {
      try {
        await this.bleCharacteristic.stopNotifications();
      } catch {}
      this.bleCharacteristic = null;
    }

    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      try {
        this.bleDevice.gatt.disconnect();
      } catch {}
    }

    this.bleServer = null;
    this.bleDevice = null;
    this.bleConnected = false;
    this.bleConnecting = false;
    this.handleHardwareDisconnected('Bluetooth LE disconnected');
  }

  // =============================================================
  // PLOT / ZONE MANAGEMENT (ADD EXTRA PLOT & ANY CROP)
  // =============================================================

  addZone(plotData = {}) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const nextIndex = this.zones.length;
    const nextLetter = letters[nextIndex] || `Z${nextIndex + 1}`;
    const zoneId = `ZONE-${nextLetter}`;
    const cropType = plotData.cropType || 'Tomato';
    const acreage = parseFloat(plotData.acreage) || 0.25;
    const cropConfig = CROPS_CATALOG.find(c => c.id === cropType) || CROPS_CATALOG[0];

    const newZone = {
      zoneId,
      name: plotData.name || `Zone ${nextLetter}`,
      cropType,
      status: 'Healthy',
      coordinates: { x: nextIndex % 2, y: Math.floor(nextIndex / 2) }
    };

    this.agronomyData[zoneId] = {
      zoneId,
      name: newZone.name,
      quadrant: `Plot ${nextLetter} (${cropType})`,
      acreage,
      acreageDisplay: `${acreage} Acre`,
      crop: {
        name: cropType,
        variety: plotData.variety || cropConfig.variety,
        growthStage: 'Vegetative Growth',
        stagePercent: 40,
        daysAfterSowing: 30,
        soilType: plotData.soilType || cropConfig.soilType,
        optimalTempRange: cropConfig.optimalTemp,
        dripLine: 'Drip Lateral 16mm, 2.0 LPH emitters'
      },
      pesticideUsage: {
        totalApplications: 0,
        treatments: []
      }
    };

    this.zones.push(newZone);
    this.saveZonesToStorage();
    this.notify();
    return newZone;
  }

  deleteZone(zoneId) {
    if (zoneId === 'ZONE-A') {
      console.warn('Cannot delete primary hardware monitored Zone A');
      return false;
    }
    this.zones = this.zones.filter(z => z.zoneId !== zoneId);
    delete this.agronomyData[zoneId];
    this.saveZonesToStorage();
    this.notify();
    return true;
  }

  saveZonesToStorage() {
    try {
      localStorage.setItem('smartfarm_custom_zones', JSON.stringify(this.zones));
      localStorage.setItem('smartfarm_custom_agronomy', JSON.stringify(this.agronomyData));
    } catch (e) {
      console.warn('Failed to save zones to storage:', e);
    }
  }
}

export const apiService = new SmartFarmApiService();
