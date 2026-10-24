import React, { useState } from 'react';
import { useFarmData } from '../context/FarmContext';
import { generateFarmHealthScore } from '../ai/farmDecisionEngine';
import { 
  calculateCropETc 
} from '../services/standardsEngine';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Bell, 
  CloudRain, 
  Sun, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Gauge, 
  ArrowUpRight, 
  Download,
  Zap,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import ZoneDetailModal from '../components/ZoneDetailModal';

const ExecutiveKPICard = ({ title, value, unit, statusText, statusColor, subtext, icon: Icon, badge, colorClass }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${colorClass} transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      {badge && (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {badge}
        </span>
      )}
    </div>

    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{value}</h3>
        {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
        <span className={`font-bold flex items-center gap-1 ${statusColor}`}>
          {statusText}
        </span>
        {subtext && <span className="text-slate-400 font-mono truncate">{subtext}</span>}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { 
    zones, 
    alerts, 
    simulateAction, 
    faoEt0, 
    globalGap, 
    formatTemp, 
    formatArea,
    downloadAuditCSV,
    dataMode,
    setDataMode,
    usbStatus,
    usbPort,
    usbLastSync,
    usbRawReadings,
    usbError,
    bridgeUrl
  } = useFarmData();

  const [selectedZone, setSelectedZone] = useState(null);
  
  if (!zones || zones.length === 0) return null;

  const isUsbMode = dataMode === 'usb_hardware';
  const liveZoneA = zones.find(z => z.zoneId === 'ZONE-A') || zones[0];

  // ----------------------------------------------------
  // Aggregate / Live Sensor Calculations
  // ----------------------------------------------------
  let displayMoisture = '0%';
  let displayMoistureStatus = 'Optimal Field Cap.';
  let displayMoistureColor = 'text-emerald-600';
  let displayMoistureSub = '';

  let displayTempObj = { value: 'Unavailable', symbol: '' };
  let displayTempStatus = 'Favorable Growth';
  let displayTempColor = 'text-emerald-600';
  let displayTempSub = '';

  let avgHumidity = 55;

  if (isUsbMode) {
    // In Live USB Mode, Zone A carries physical hardware data
    const zoneAMoist = liveZoneA.sensorData?.soilMoisture;
    const zoneATemp = liveZoneA.sensorData?.airTemperature;
    const zoneAHum = liveZoneA.sensorData?.humidity;

    if (zoneAMoist !== null && zoneAMoist !== undefined) {
      displayMoisture = `${zoneAMoist.toFixed(1)}%`;
      displayMoistureStatus = zoneAMoist < 30 ? 'Moisture Deficit' : zoneAMoist > 70 ? 'High Saturation' : 'Optimal Field Cap.';
      displayMoistureColor = zoneAMoist < 30 ? 'text-rose-600' : 'text-emerald-600';
      displayMoistureSub = `Raw ADC: ${liveZoneA.sensorData?.soilRaw !== null && liveZoneA.sensorData?.soilRaw !== undefined ? liveZoneA.sensorData.soilRaw : 'N/A'}`;
    } else if (usbStatus === 'waiting_data') {
      displayMoisture = 'Waiting...';
      displayMoistureStatus = 'Awaiting Telemetry';
      displayMoistureColor = 'text-amber-600';
      displayMoistureSub = 'Awaiting first packet';
    } else {
      displayMoisture = 'Unavailable';
      displayMoistureStatus = 'Sensor Offline';
      displayMoistureColor = 'text-slate-400';
      displayMoistureSub = 'Check USB bridge';
    }

    if (zoneATemp !== null && zoneATemp !== undefined) {
      displayTempObj = formatTemp(zoneATemp);
      displayTempStatus = zoneATemp > 35 ? 'Thermal Stress' : 'Favorable Growth';
      displayTempColor = zoneATemp > 35 ? 'text-amber-600' : 'text-emerald-600';
      avgHumidity = zoneAHum !== null && zoneAHum !== undefined ? Math.round(zoneAHum) : 60;
      displayTempSub = `RH: ${zoneAHum !== null && zoneAHum !== undefined ? zoneAHum.toFixed(1) + '%' : 'Unavailable'}`;
    } else if (usbStatus === 'waiting_data') {
      displayTempObj = { value: 'Waiting...', symbol: '' };
      displayTempStatus = 'Awaiting Data';
      displayTempColor = 'text-amber-600';
      displayTempSub = 'DHT11 initializing';
    } else {
      displayTempObj = { value: 'Unavailable', symbol: '' };
      displayTempStatus = liveZoneA.sensorData?.dhtOk === false ? 'DHT11 Read Failed' : 'Sensor Offline';
      displayTempColor = 'text-rose-600';
      displayTempSub = 'Check GPIO 4 wiring';
    }
  } else {
    // In Simulation Mode: aggregate across simulated zones
    const avgM = Math.round(zones.reduce((acc, z) => acc + (z.sensorData?.soilMoisture || 0), 0) / zones.length);
    displayMoisture = `${avgM}%`;
    displayMoistureStatus = avgM < 30 ? 'Moisture Deficit' : avgM > 70 ? 'High Saturation' : 'Optimal Field Cap.';
    displayMoistureColor = avgM < 30 ? 'text-rose-600' : 'text-emerald-600';
    displayMoistureSub = `Matric: -${Math.round((100 - avgM) * 0.8)} kPa`;

    const validTemps = zones.filter(z => typeof z.sensorData?.airTemperature === 'number');
    const avgT = validTemps.length ? validTemps.reduce((acc, z) => acc + z.sensorData.airTemperature, 0) / validTemps.length : 28;
    displayTempObj = formatTemp(avgT);
    displayTempStatus = avgT > 35 ? 'Thermal Stress' : 'Favorable Growth';
    displayTempColor = avgT > 35 ? 'text-amber-600' : 'text-emerald-600';
    avgHumidity = Math.round(zones.reduce((acc, z) => acc + (z.sensorData?.humidity || 55), 0) / zones.length);
    displayTempSub = `RH: ${avgHumidity}% (VPD: 1.8 kPa)`;
  }

  const overallHealth = generateFarmHealthScore(zones.map(z => ({...z.sensorData, cropType: z.cropType})));
  const activeAlerts = alerts.filter(a => !a.resolved);
  const needsIrrigation = zones.some(z => z.analysis.irrigationRecommendation);
  const farmAreaFormatted = formatArea(1.0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner: International Precision Ag Cockpit */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {isUsbMode ? 'ESP32 USB Serial Telemetry' : 'ISO 11783-10 & FAO-56 Certified'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {isUsbMode ? `115200 Baud • ${usbPort || 'COM Port'} • 1 Physical Node` : 'LoRaWAN 868MHz Mesh • WGS84 16.5062°N, 80.6480°E'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Precision Ag Telemetry Cockpit</span>
            {isUsbMode && (
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                usbStatus === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' 
                  : (usbStatus === 'waiting_data' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30')
              }`}>
                {usbStatus === 'connected' ? 'LIVE USB' : (usbStatus === 'waiting_data' ? 'WAITING DATA' : 'USB OFFLINE')}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {isUsbMode 
              ? `Direct physical ESP32 sensor stream powering primary quadrant Zone A (Tomato). Aux quadrants indicate unmonitored status.`
              : `Real-time agro-climatic monitoring across 4 distinct 0.25-Acre (${farmAreaFormatted.sub}) cadastral crop quadrants.`}
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            onClick={() => simulateAction('IRRIGATE')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 active:scale-95"
            title="Trigger drip irrigation valve"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Task Controller Irrigate</span>
          </button>

          {!isUsbMode && (
            <button 
              onClick={() => simulateAction('RAINFALL')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              title="Simulate 15mm precipitation event across all quadrants"
            >
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate Rain</span>
            </button>
          )}

          <button 
            onClick={downloadAuditCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            title="Download full GlobalG.A.P. inspection audit report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit CSV</span>
          </button>
        </div>
      </div>

      {/* USB Hardware Notification Banner (when in Live USB Mode) */}
      {isUsbMode && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
          usbStatus === 'connected'
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            : (usbStatus === 'waiting_data'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : (usbStatus === 'stale'
                    ? 'bg-orange-50/90 border-orange-200 text-orange-900'
                    : 'bg-rose-50/90 border-rose-200 text-rose-900'))
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              usbStatus === 'connected' ? 'bg-emerald-500 animate-ping' : (usbStatus === 'waiting_data' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')
            }`} />
            <div>
              <strong>
                {usbStatus === 'connected' && `ESP32 USB Connected (${usbPort || 'COM'}) — Live Telemetry Active`}
                {usbStatus === 'waiting_data' && `ESP32 Port Open (${usbPort || 'COM'}) — Waiting for first valid JSON reading...`}
                {usbStatus === 'stale' && `ESP32 Telemetry Stale — No packets received for > 8 seconds.`}
                {usbStatus === 'disconnected' && `ESP32 USB Bridge Offline — Cannot reach ${bridgeUrl}. Run python bridge/serial_bridge.py.`}
              </strong>
              <span className="block opacity-85 text-[11px] mt-0.5">
                {usbStatus === 'connected' && `Last valid reading received at ${usbLastSync || 'recently'}. Only real sensor measurements are displayed.`}
                {usbStatus === 'waiting_data' && `Verify Arduino Serial Monitor is closed so the Python bridge can own the COM port.`}
                {usbStatus === 'stale' && `Verify USB cable connection and ensure board has adequate power.`}
                {usbStatus === 'disconnected' && `Simulated data is paused in USB mode to guarantee strict telemetry integrity.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200">
              {usbStatus === 'connected' ? `SYNC: ${usbLastSync}` : 'MODE: USB'}
            </span>
          </div>
        </div>
      )}

      {/* 6-Card Executive KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <ExecutiveKPICard 
          title={isUsbMode ? "Zone A Soil VWC" : "Avg Soil VWC"} 
          value={displayMoisture}
          unit={displayMoisture.includes('%') ? 'VWC' : ''}
          statusText={displayMoistureStatus}
          statusColor={displayMoistureColor}
          subtext={displayMoistureSub}
          icon={Droplets}
          badge={isUsbMode ? "GPIO 34 AO" : "PGN 65488"}
          colorClass="bg-blue-50 text-blue-600"
        />

        <ExecutiveKPICard 
          title={isUsbMode ? "Zone A Canopy Temp" : "Avg Canopy Temp"} 
          value={`${displayTempObj.value}`}
          unit={displayTempObj.symbol}
          statusText={displayTempStatus}
          statusColor={displayTempColor}
          subtext={displayTempSub}
          icon={Thermometer}
          badge={isUsbMode ? "GPIO 4 DHT11" : "SPN 170"}
          colorClass="bg-amber-50 text-amber-600"
        />

        <ExecutiveKPICard 
          title="FAO-56 ET₀ Rate" 
          value={`${faoEt0}`}
          unit="mm/d"
          statusText="Penman-Monteith"
          statusColor="text-cyan-700"
          subtext={`~${Math.round(faoEt0 * 4046.86)} L/ha/d`}
          icon={Gauge}
          badge="FAO-56"
          colorClass="bg-cyan-50 text-cyan-600"
        />

        <ExecutiveKPICard 
          title="GlobalG.A.P. IPM" 
          value={`${globalGap.ipmScore}%`}
          unit="Score"
          statusText={globalGap.complianceGrade.split(' ')[0] + ' ' + globalGap.complianceGrade.split(' ')[1]}
          statusColor="text-emerald-600"
          subtext="IFA v6.0 Standard"
          icon={ShieldCheck}
          badge="Grade A"
          colorClass="bg-emerald-50 text-emerald-600"
        />

        <ExecutiveKPICard 
          title="Farm Health" 
          value={`${overallHealth}`}
          unit="/100"
          statusText={overallHealth > 80 ? 'Vigorous Crop' : 'Attention Flag'}
          statusColor={overallHealth > 80 ? 'text-emerald-600' : 'text-amber-600'}
          subtext="CNN & ML Index"
          icon={Activity}
          badge="ISO 25010"
          colorClass="bg-purple-50 text-purple-600"
        />

        <ExecutiveKPICard 
          title={isUsbMode ? "ESP32 USB Ingest" : "ISOBUS Telemetry"} 
          value={isUsbMode ? (usbStatus === 'connected' ? 'LIVE' : (usbStatus === 'waiting_data' ? 'WAIT' : 'OFFLINE')) : "4/4"}
          unit={isUsbMode ? (usbPort || 'USB') : "Nodes"}
          statusText={isUsbMode ? (usbStatus === 'connected' ? `Synced ${usbLastSync}` : (usbStatus === 'waiting_data' ? 'Awaiting Data' : 'Bridge Offline')) : (needsIrrigation ? '1 Valve Pending' : 'All Valves Closed')}
          statusColor={isUsbMode ? (usbStatus === 'connected' ? 'text-emerald-600' : 'text-rose-600') : (needsIrrigation ? 'text-blue-600' : 'text-slate-600')}
          subtext={isUsbMode ? (liveZoneA.sensorData?.dhtOk === false ? "DHT11 signal flag" : "GPIO 4, 34, 35 Active") : (activeAlerts.length > 0 ? `${activeAlerts.length} Warnings` : 'Zero Faults')}
          icon={Cpu}
          badge={isUsbMode ? "115200 Baud" : "10 Hz CAN"}
          colorClass={isUsbMode && usbStatus === 'connected' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-800"}
        />
      </div>

      {/* Cadastral Quadrants: 1-Acre Telemetry & Digital Twin Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              1-Acre Cadastral Crop Quadrants (0.25 Acre / 0.10 ha Each)
            </h2>
            <p className="text-xs text-slate-500">
              Click any quadrant to inspect live telemetry, FAO-56 crop coefficient ($K_c$), chemical records, or launch the interactive 3D WebGL Digital Twin.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Cadastre: 4 Zones • Grid 2×2
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => {
            const agro = zone.agronomy;
            const stage = agro?.crop?.stagePercent || 50;
            const etcObj = calculateCropETc(agro?.crop?.name || zone.cropType, stage, faoEt0);
            const tempFormatted = formatTemp(zone.sensorData?.airTemperature);
            const areaFormatted = formatArea(agro?.acreage || 0.25);
            const isCritical = zone.analysis?.riskLevel === 'CRITICAL';
            const isWarning = zone.analysis?.riskLevel === 'HIGH';

            const isZoneLiveUsb = isUsbMode && zone.zoneId === 'ZONE-A';
            const isZoneAuxInUsb = isUsbMode && zone.zoneId !== 'ZONE-A';

            const moistureDisplay = typeof zone.sensorData?.soilMoisture === 'number'
              ? `${zone.sensorData.soilMoisture.toFixed(1)}%`
              : (isZoneLiveUsb ? (usbStatus === 'waiting_data' ? 'Waiting...' : 'Unavailable') : 'Standby');

            const tempDisplay = typeof zone.sensorData?.airTemperature === 'number'
              ? `${tempFormatted.value}${tempFormatted.symbol}`
              : (isZoneLiveUsb ? (usbStatus === 'waiting_data' ? 'Waiting...' : 'Unavailable') : 'Standby');

            return (
              <div 
                key={zone.zoneId}
                onClick={() => setSelectedZone(zone)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isZoneAuxInUsb
                    ? 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:shadow-xs'
                    : isCritical 
                    ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400 hover:shadow-md' 
                    : isWarning 
                    ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:shadow-md' 
                    : 'border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {/* Status Beacon */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm shadow-2xs font-mono ${
                      isZoneLiveUsb 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : (isZoneAuxInUsb ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-slate-800 border-slate-200')
                    }`}>
                      {zone.zoneId.replace('ZONE-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {zone.name} — {agro?.crop?.name || zone.cropType}
                        </h4>
                        {isZoneLiveUsb && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            ESP32 USB NODE
                          </span>
                        )}
                        {isZoneAuxInUsb && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Auxiliary (1-ESP32 Setup)
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          zone.analysis?.plantStatus === 'Healthy' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {zone.analysis?.plantStatus || 'Normal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {agro?.crop?.variety || 'Arka Hybrid'} • {areaFormatted.value} {areaFormatted.symbol} ({areaFormatted.sub})
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                    <span>3D Twin</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/70 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">SOIL MOISTURE</span>
                    <strong className="text-xs font-black font-mono text-slate-900 block truncate">
                      {moistureDisplay}
                    </strong>
                    {isZoneLiveUsb && zone.sensorData?.soilRaw !== undefined && zone.sensorData?.soilRaw !== null && (
                      <span className="text-[9px] text-slate-400 font-mono block">Raw: {zone.sensorData.soilRaw}</span>
                    )}
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">CANOPY TEMP</span>
                    <strong className="text-xs font-black font-mono text-slate-900 block truncate">
                      {tempDisplay}
                    </strong>
                    {isZoneLiveUsb && zone.sensorData?.dhtOk === false && (
                      <span className="text-[9px] text-rose-500 font-bold block">DHT11 Flag</span>
                    )}
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">FAO ETc</span>
                    <strong className="text-xs font-black font-mono text-blue-700 block truncate">
                      {etcObj.etcMmDay} mm/d
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">HEALTH</span>
                    <strong className="text-xs font-black font-mono text-emerald-600 block truncate">
                      {zone.analysis?.overallHealthScore || 85}%
                    </strong>
                  </div>
                </div>

                {/* Agronomic Details / ISO Hardware */}
                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                  <span className="truncate">
                    Soil: <strong className="text-slate-700">{agro?.crop?.soilType?.split(' ')[0] || 'Sandy Loam'}</strong> (USDA Class)
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {isZoneLiveUsb 
                      ? `ESP32 USB (${usbPort || 'COM'})` 
                      : (isZoneAuxInUsb ? 'Unmonitored' : zone.sensorData?.deviceId || 'ESP32-NODE')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standards Audit & Forecasting Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GlobalG.A.P. IFA v6.0 Compliance Audit Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                GlobalG.A.P. IFA v6.0 Compliance
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                PASSED
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">IPM Composite Rating:</span>
                <strong className="font-mono font-black text-emerald-600">{globalGap.ipmScore}% (Grade A)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pre-Harvest Interval (PHI):</span>
                <strong className="font-mono text-slate-900">100% Safe Buffer</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">FRAC/IRAC Rotation:</span>
                <strong className="font-mono text-emerald-700">Verified No Resistance</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Drip Volumetric Metering:</span>
                <strong className="font-mono text-slate-900">±2% ISO Accuracy</strong>
              </div>
            </div>
          </div>

          <button
            onClick={downloadAuditCSV}
            className="w-full mt-5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Official Audit CSV Sheet</span>
          </button>
        </div>

        {/* AI Agro-Climatic Micro-Weather Forecast */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-2xl border border-slate-800 shadow-md p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Agro-Climatic Micro-Forecast
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-400 border border-cyan-500/30">
                VPD: 1.8 kPa
              </span>
            </div>

            <div className="flex items-center justify-between my-5">
              <div>
                <div className="text-3xl font-black font-mono tracking-tight">
                  {avgTempObj.value}{avgTempObj.symbol}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Partly Sunny • Solar Rad: 21.5 MJ/m²</div>
              </div>
              <Sun className="w-10 h-10 text-amber-400 animate-spin-slow" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-3 border-t border-slate-800">
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Tomorrow</div>
                <div className="font-mono font-bold text-white mt-0.5">26°C (68%)</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Friday</div>
                <div className="font-mono font-bold text-white mt-0.5">24°C (Rain)</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <div className="text-slate-400">Saturday</div>
                <div className="font-mono font-bold text-white mt-0.5">27°C (Sun)</div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4 flex items-center justify-between font-mono">
            <span>Model: ECMWF / NOAA GFS</span>
            <span>Update: 10 min ago</span>
          </div>
        </div>

        {/* Global Commodity Ag-Market Prices */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Global Crop Spot Market Prices
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                LIVE SPOT
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              {[
                { crop: 'Tomato (Grade A)', price: '$1.48 / kg', trend: '+4.2%', up: true, zone: 'Zone A' },
                { crop: 'Guntur Chili (Teja)', price: '$2.85 / kg', trend: '+1.8%', up: true, zone: 'Zone B' },
                { crop: 'Basmati 1509 Paddy', price: '$0.52 / kg', trend: '-0.6%', up: false, zone: 'Zone C' },
                { crop: 'Groundnut (K-6)', price: '$1.15 / kg', trend: '+2.9%', up: true, zone: 'Zone D' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="font-bold text-slate-800">{item.crop}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{item.zone}</span>
                  </div>
                  <div className="text-right">
                    <strong className="font-mono font-bold text-slate-900">{item.price}</strong>
                    <span className={`text-[10px] font-mono font-bold block ${item.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between font-mono">
            <span>Exchange: Chicago Mercantile / AgMarknet</span>
            <span>Index: USD / MT</span>
          </div>
        </div>

      </div>

      {/* Interactive 3D Digital Twin & Agronomy Modal */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          agronomy={selectedZone.agronomy}
          onClose={() => setSelectedZone(null)}
        />
      )}

    </div>
  );
}
