import React, { useState } from 'react';
import { 
  Save, 
  Bell, 
  Smartphone, 
  Shield, 
  Wifi, 
  Cpu, 
  Globe, 
  Scale, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  Server, 
  Activity, 
  AlertCircle,
  ExternalLink,
  Cable,
  Terminal,
  RefreshCw,
  Bot,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';
import { getAIConfig, saveAIConfig, testAIConnection } from '../services/aiChatService';

export default function Settings() {
  const { 
    unitSystem, 
    setUnitSystem, 
    language, 
    setLanguage,
    dataMode,
    setDataMode,
    bridgeUrl,
    setBridgeUrl,
    testBridgeConnection,
    usbStatus,
    usbPort,
    usbLastSync,
    backendUrl,
    setBackendUrl,
    testBackendConnection,
    cloudStatus
  } = useFarmData();

  const [inputBridgeUrl, setInputBridgeUrl] = useState(bridgeUrl || 'http://127.0.0.1:5000');
  const [testingBridge, setTestingBridge] = useState(false);
  const [bridgeResult, setBridgeResult] = useState(null);

  const [inputCloudUrl, setInputCloudUrl] = useState(backendUrl || 'https://smartfarming-e3b2.onrender.com');
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudResult, setCloudResult] = useState(null);

  // AI Configuration State
  const initialAI = getAIConfig();
  const [aiProvider, setAiProvider] = useState(initialAI.provider);
  const [groqKey, setGroqKey] = useState(initialAI.groqKey || '');
  const [groqModel, setGroqModel] = useState(initialAI.groqModel || 'llama-3.3-70b-versatile');
  const [geminiKey, setGeminiKey] = useState(initialAI.geminiKey);
  const [openaiKey, setOpenaiKey] = useState(initialAI.openaiKey);
  const [geminiModel, setGeminiModel] = useState(initialAI.model || 'gemini-1.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [testingAIKey, setTestingAIKey] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  const [saved, setSaved] = useState(false);

  const handleTestBridge = async () => {
    setTestingBridge(true);
    setBridgeResult(null);
    const res = await testBridgeConnection(inputBridgeUrl);
    setBridgeResult(res);
    setTestingBridge(false);
  };

  const handleTestCloud = async () => {
    setTestingCloud(true);
    setCloudResult(null);
    const res = await testBackendConnection(inputCloudUrl);
    setCloudResult(res);
    setTestingCloud(false);
  };

  const handleTestAI = async () => {
    setTestingAIKey(true);
    setAiTestResult(null);
    let key = '';
    let model = '';
    if (aiProvider === 'groq') {
      key = groqKey;
      model = groqModel;
    } else if (aiProvider === 'gemini') {
      key = geminiKey;
      model = geminiModel;
    } else if (aiProvider === 'openai') {
      key = openaiKey;
    }
    const res = await testAIConnection(aiProvider, key, model);
    setAiTestResult(res);
    setTestingAIKey(false);
  };

  const handleSave = () => {
    setBridgeUrl(inputBridgeUrl);
    setBackendUrl(inputCloudUrl);
    saveAIConfig({
      provider: aiProvider,
      groqKey: groqKey,
      groqModel: groqModel,
      geminiKey: geminiKey,
      geminiModel: geminiModel,
      openaiKey: openaiKey,
      model: geminiModel
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hardware, AI & System Settings
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              System Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure telemetry sources, ESP32 USB bridge, AI Copilot engine/API keys, and units of measurement.
          </p>
        </div>

        <button 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-95 shrink-0"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          {saved ? 'Preferences Saved!' : 'Save All Preferences'}
        </button>
      </div>

      {/* Selectable Data Mode Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-extrabold text-sm text-slate-900 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          Active Telemetry Source Mode
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Select whether the dashboard should read from physical ESP32 hardware, the cloud backend, or the simulation engine.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div 
            onClick={() => setDataMode('usb_hardware')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'usb_hardware'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-emerald-600" />
                Live USB Hardware
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${usbStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Streams physical measurements from your ESP32 on USB serial via local Python bridge.
            </p>
          </div>

          <div 
            onClick={() => setDataMode('cloud_backend')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'cloud_backend'
                ? 'border-purple-500 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-purple-600" />
                Render Cloud Backend
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${cloudStatus === 'connected' ? 'bg-purple-500 animate-ping' : 'bg-slate-400'}`} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Reads from your live deployed FastAPI web service on Render across all 4 quadrants.
            </p>
          </div>

          <div 
            onClick={() => setDataMode('simulation')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'simulation'
                ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                Simulation Mode
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Simulates realistic agro-climatic dynamics across all 4 zones for testing.
            </p>
          </div>
        </div>
      </div>

      {/* AI Copilot & LLM Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">AI Agronomist Copilot & API Settings</h3>
              <p className="text-xs text-slate-500">Choose between the free built-in farm engine or external LLMs (Groq / Gemini / OpenAI)</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {aiProvider === 'groq' ? 'Groq Llama 3.3' : aiProvider === 'gemini' ? 'Google Gemini' : aiProvider === 'openai' ? 'OpenAI GPT' : 'Built-in (Zero API Key)'}
          </span>
        </div>

        {/* Engine Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div 
            onClick={() => setAiProvider('builtin')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              aiProvider === 'builtin'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900">Built-in Farm AI</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Free</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No API key required. Natural language chat, greetings, farm summaries, and drip triggers.
            </p>
          </div>

          <div 
            onClick={() => setAiProvider('groq')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              aiProvider === 'groq'
                ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Groq Cloud
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">Ultra-Fast</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              500 tokens/sec with Meta Llama 3.3 70B Versatile. Free tier at console.groq.com.
            </p>
          </div>

          <div 
            onClick={() => setAiProvider('gemini')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              aiProvider === 'gemini'
                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900">Google Gemini</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">Free Key</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gemini 1.5 Flash generative AI with live sensor telemetry injected into prompts.
            </p>
          </div>

          <div 
            onClick={() => setAiProvider('openai')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              aiProvider === 'openai'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900">OpenAI (GPT-4o)</span>
              <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.2 rounded">API Key</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Connect OpenAI API key for advanced conversational crop diagnostics.
            </p>
          </div>
        </div>

        {/* Groq Key Config */}
        {aiProvider === 'groq' && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Groq Cloud API Key</span>
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Groq Key (console.groq.com/keys)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full pl-3 pr-10 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestAI}
                disabled={testingAIKey || !groqKey}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingAIKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{testingAIKey ? 'Testing...' : 'Test Key'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">Model:</span>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Best & Recommended)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              </select>
            </div>
          </div>
        )}

        {/* Gemini Key Config */}
        {aiProvider === 'gemini' && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900">
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Key at Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-10 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestAI}
                disabled={testingAIKey || !geminiKey}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingAIKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{testingAIKey ? 'Testing...' : 'Test Key'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">Model:</span>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Recommended)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
          </div>
        )}

        {/* OpenAI Key Config */}
        {aiProvider === 'openai' && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900">
                OpenAI API Key
              </label>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get OpenAI Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full pl-3 pr-10 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestAI}
                disabled={testingAIKey || !openaiKey}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingAIKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{testingAIKey ? 'Testing...' : 'Test Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Test AI Result */}
        {aiTestResult && (
          <div className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            aiTestResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {aiTestResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiTestResult.message}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiTestResult.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* USB Hardware Ingestion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">Physical ESP32 USB-to-HTTP Ingestion</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${usbStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {usbStatus === 'connected' ? `ESP32 Connected (${usbPort})` : 'Bridge Disconnected'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Local Bridge API URL (Loopback Interface)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputBridgeUrl}
                onChange={(e) => setInputBridgeUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000"
                className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleTestBridge}
                disabled={testingBridge || !inputBridgeUrl}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {testingBridge ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>{testingBridge ? 'Testing...' : 'Test Bridge'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Default is <code>http://127.0.0.1:5000</code>. Starts reading live telemetry when <code>python bridge/serial_bridge.py</code> is launched.
            </p>
          </div>

          {/* Test Bridge Result Box */}
          {bridgeResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2.5 animate-fadeIn ${
              bridgeResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {bridgeResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>Bridge Online!</strong> Serial status: <strong>{bridgeResult.data.serial_status}</strong> on port <strong>{bridgeResult.data.port}</strong>.
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <strong>Connection Failed:</strong> {bridgeResult.error}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmed Pinout Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="font-extrabold text-slate-800 block mb-2 uppercase text-[10px] tracking-wider text-slate-500">
              Confirmed Classic ESP32 Hardware Wiring Map
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">DHT11 SENSOR</span>
                <strong className="text-emerald-700 text-xs">GPIO 4</strong>
                <span className="text-[9px] text-slate-500 block">Data Pin</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">SOIL MOISTURE</span>
                <strong className="text-emerald-700 text-xs">GPIO 34</strong>
                <span className="text-[9px] text-slate-500 block">AO (12-bit ADC)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">LDR LIGHT</span>
                <strong className="text-emerald-700 text-xs">GPIO 35</strong>
                <span className="text-[9px] text-slate-500 block">AO (12-bit ADC)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">COMMON GND</span>
                <strong className="text-emerald-700 text-xs">ESP32 GND</strong>
                <span className="text-[9px] text-slate-500 block">Shared Ground</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Backend Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Render Cloud Backend Web Service</h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            cloudStatus === 'connected' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {cloudStatus === 'connected' ? 'Connected' : 'Standby'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Deployed backend at <code>https://smartfarming-e3b2.onrender.com</code>. Ingests ESP32 Wi-Fi telemetry and serves multi-zone data.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={inputCloudUrl}
            onChange={(e) => setInputCloudUrl(e.target.value)}
            placeholder="https://smartfarming-e3b2.onrender.com"
            className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono bg-slate-50"
          />
          <button
            type="button"
            onClick={handleTestCloud}
            disabled={testingCloud || !inputCloudUrl}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            {testingCloud ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            <span>{testingCloud ? 'Testing...' : 'Test Backend'}</span>
          </button>
        </div>

        {cloudResult && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            cloudResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {cloudResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div><strong>Render Backend Online!</strong> Status: {cloudResult.data?.status || 'healthy'}.</div>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div><strong>Connection Failed:</strong> {cloudResult.error}</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Measurement Units & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unit System */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            Units of Measurement (ISO 80000-1)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Choose between Metric SI or Imperial US agricultural units.</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUnitSystem('metric')}
              className={`p-3.5 rounded-xl border-2 text-left font-bold text-xs transition-all ${
                unitSystem === 'metric'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block font-mono text-xs">Metric (SI)</span>
              <span className="text-[10px] text-slate-500 font-normal block mt-1">°C, mm, Hectares, Liters</span>
            </button>

            <button
              onClick={() => setUnitSystem('imperial')}
              className={`p-3.5 rounded-xl border-2 text-left font-bold text-xs transition-all ${
                unitSystem === 'imperial'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block font-mono text-xs">Imperial (US)</span>
              <span className="text-[10px] text-slate-500 font-normal block mt-1">°F, in, Acres, Gallons</span>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Interface Language
          </h3>
          <p className="text-xs text-slate-500 mb-4">Select agricultural vocabulary localization.</p>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          >
            <option value="en">English (Global Agronomy Terminology)</option>
            <option value="es">Español (Agronomía y Agricultura de Precisión)</option>
            <option value="fr">Français (Agriculture de Précision)</option>
            <option value="hi">हिन्दी (स्मार्ट कृषि और मृदा विज्ञान)</option>
            <option value="te">తెలుగు (స్మార్ట్ వ్యవసాయం)</option>
          </select>
        </div>
      </div>

    </div>
  );
}
