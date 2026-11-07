import React, { useState } from 'react';
import { 
  Cable, 
  Bluetooth, 
  RefreshCw, 
  X, 
  Wifi, 
  ShieldCheck, 
  AlertCircle, 
  Server, 
  Sparkles,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';

export default function MobileConnection() {
  const { 
    operatingMode,
    setOperatingMode,
    hardwareData,
    simulationData,
    usbPort,
    isWebSerialSupported,
    isWebBluetoothSupported,
    connectWebSerial,
    connectWebBluetooth,
    disconnectWebSerial,
    disconnectWebBluetooth,
    bleConnected,
    bleConnecting,
    triggerSimulateData,
    language
  } = useFarmData();

  const isTe = language === 'te';
  const isLive = operatingMode === 'live_hardware';
  const isFresh = hardwareData?.lastUpdatedEpoch ? ((Date.now() - hardwareData.lastUpdatedEpoch) < 8500) : false;
  const hasHardware = isLive && hardwareData?.hasReadings && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale && isFresh;

  const [connectingSerial, setConnectingSerial] = useState(false);
  const [connectingBle, setConnectingBle] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleConnectSerial = async () => {
    setConnectingSerial(true);
    setStatusMessage(null);
    try {
      await connectWebSerial();
      setStatusMessage({ type: 'success', text: isTe ? 'USB Serial ESP32 కనెక్ట్ అయింది!' : 'ESP32 connected via USB Serial!' });
    } catch (err) {
      const msg = err.message || '';
      const isBusy = msg.includes('Permission') || msg.includes('busy') || msg.includes('Access');
      setStatusMessage({
        type: 'error',
        text: isBusy 
          ? (isTe ? 'పోర్ట్ బిజీగా ఉంది! దయచేసి Arduino Serial Monitor మూసివేయండి.' : 'Port is busy! Please close Arduino Serial Monitor.')
          : (err.message || 'Connection failed.')
      });
    } finally {
      setConnectingSerial(false);
    }
  };

  const handleConnectBle = async () => {
    setConnectingBle(true);
    setStatusMessage(null);
    try {
      const res = await connectWebBluetooth();
      setStatusMessage({ 
        type: 'success', 
        text: isTe 
          ? `Bluetooth LE ESP32 (${res.deviceName}) కనెక్ట్ అయింది!` 
          : `Connected to ESP32 (${res.deviceName}) via Bluetooth LE!` 
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Bluetooth LE connection failed.' });
    } finally {
      setConnectingBle(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (bleConnected) {
        await disconnectWebBluetooth();
      } else {
        await disconnectWebSerial();
      }
      setStatusMessage({ type: 'info', text: isTe ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ చేయబడింది.' : 'Hardware disconnected.' });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-4 pb-6 max-w-lg mx-auto">
      
      {/* 1. Gateway Status Overview Card */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isTe ? 'గేట్‌వే కనెక్షన్' : 'Hardware Telemetry Gateway'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${hasHardware ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
              <h2 className="text-sm font-black text-slate-900">
                {hasHardware ? (isTe ? 'లైవ్ హార్డ్‌వేర్ కనెక్ట్ అయింది' : 'ESP32 Connected (Live)') : (isTe ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్' : 'ESP32 Disconnected')}
              </h2>
            </div>
          </div>

          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
            hasHardware 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {hasHardware ? 'LIVE 115200' : 'OFFLINE'}
          </span>
        </div>

        {/* Real-time stats */}
        <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">{isTe ? 'చివరి సమకాలీకరణ' : 'Last Packet:'}</span>
            <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
              {hasHardware ? (hardwareData?.lastUpdated || 'Just now') : 'N/A'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block">{isTe ? 'యాక్టివ్ పోర్ట్' : 'Active Channel:'}</span>
            <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
              {hasHardware ? (usbPort || 'COM7') : 'None'}
            </span>
          </div>
        </div>

        {/* Disconnect Action if active */}
        {hasHardware && (
          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-target-min"
            >
              <X className="w-4 h-4" />
              <span>{isTe ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ చేయండి' : 'Disconnect ESP32 Hardware'}</span>
            </button>
          </div>
        )}
      </section>

      {/* Status feedback message */}
      {statusMessage && (
        <div className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : (statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700')
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* 2. Connection Options: Bluetooth LE & USB Serial */}
      <section className="space-y-3">
        
        {/* Option A: Bluetooth LE (Native mobile friendly) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">Web Bluetooth LE</h3>
                <span className="text-[10px] text-slate-400">Wireless GATT Nordic UART</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Android Chrome
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isTe 
              ? 'మీ ఆండ్రాయిడ్ క్రోమ్ బ్రౌజర్ ద్వారా వైర్‌లెస్ బ్లూటూత్ LE కనెక్షన్‌తో ESP32 కి నేరుగా కనెక్ట్ అవ్వండి.' 
              : 'Direct wireless Bluetooth Low Energy connection from your mobile browser without USB cables.'}
          </p>

          <button
            type="button"
            onClick={handleConnectBle}
            disabled={connectingBle || hasHardware || !isWebBluetoothSupported()}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-target-min"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{connectingBle ? 'Scanning...' : (isTe ? 'బ్లూటూత్ ద్వారా కనెక్ట్ అవ్వండి' : 'Connect via Bluetooth LE')}</span>
          </button>
        </div>

        {/* Option B: USB Serial (OTG Cable) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <Cable className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">USB Serial Cable (115200)</h3>
                <span className="text-[10px] text-slate-400">Direct USB COM Port</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Desktop Chrome
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isTe 
              ? 'USB కేబుల్ ద్వారా డెస్క్‌టాప్ లేదా సపోర్ట్ ఉన్న పరికరాలలో నేరుగా 115200 బాడ్ రేటుతో రీడింగ్స్ చదవండి.' 
              : 'Direct USB COM connection. Supported on Desktop Chrome/Edge and select Android USB-OTG browsers.'}
          </p>

          <button
            type="button"
            onClick={handleConnectSerial}
            disabled={connectingSerial || hasHardware || !isWebSerialSupported()}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 touch-target-min"
          >
            <Cable className="w-4 h-4" />
            <span>{connectingSerial ? 'Connecting...' : (isTe ? 'USB Serial ద్వారా కనెక్ట్ అవ్వండి' : 'Connect via USB Serial')}</span>
          </button>
        </div>

      </section>

      {/* 3. Simulation Fallback */}
      <section className="bg-purple-50/70 rounded-2xl p-4 border border-purple-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs font-extrabold text-purple-950">
              {isTe ? 'పైథాన్ డేటా సిమ్యులేషన్' : 'Python Telemetry Simulation'}
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            TEST MODE
          </span>
        </div>

        <p className="text-xs text-purple-900/80 leading-relaxed">
          {isTe 
            ? 'భౌతిక ESP32 అందుబాటులో లేనప్పుడు వ్యవసాయ ప్రమాణాల ప్రకారం వాస్తవిక రీడింగ్‌లను రూపొందించండి.' 
            : 'Generate realistic agricultural sensor readings within agronomic boundaries when hardware is offline.'}
        </p>

        <button
          type="button"
          onClick={triggerSimulateData}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 touch-target-min cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isTe ? 'సిమ్యులేట్ డేటా రూపొందించండి' : 'Trigger Simulation Cycle'}</span>
        </button>
      </section>

    </div>
  );
}

