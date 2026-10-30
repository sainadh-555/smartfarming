import React, { useState, useEffect, useRef } from 'react';
import { useFarmData } from '../context/FarmContext';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Bell, 
  RefreshCw, 
  ChevronRight,
  Volume2, 
  VolumeX, 
  X,
  Settings,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { 
  executeAIChatQuery, 
  getAIConfig, 
  saveAIConfig, 
  testAIConnection 
} from '../services/aiChatService';

export default function AIAgronomistChat() {
  const { zones, alerts, simulateAction, logPesticideSpray } = useFarmData();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const messagesEndRef = useRef(null);

  // AI Engine Configuration
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState(aiConfig.provider);
  const [tempGroqKey, setTempGroqKey] = useState(aiConfig.groqKey || '');
  const [tempGroqModel, setTempGroqModel] = useState(aiConfig.groqModel || 'llama-3.3-70b-versatile');
  const [tempGeminiKey, setTempGeminiKey] = useState(aiConfig.geminiKey || '');
  const [tempOpenAIKey, setTempOpenAIKey] = useState(aiConfig.openaiKey || '');
  const [tempModel, setTempModel] = useState(aiConfig.model || 'gemini-1.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [testingKey, setTestingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Play a soft notification chime using Web Audio API
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  // Helper to parse bold and italic inline tokens
  const renderInlineTokens = (rawText, isAI) => {
    const tokens = rawText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        return (
          <strong key={idx} className={isAI ? 'font-bold text-slate-900' : 'font-bold text-white'}>
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        return (
          <em key={idx} className={isAI ? 'italic text-purple-700 font-semibold' : 'italic text-emerald-100 font-medium'}>
            {token.slice(1, -1)}
          </em>
        );
      }
      return token;
    });
  };

  // Helper to render markdown lines and bullet points
  const renderFormattedMessage = (text, isAI) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lIdx} className="h-1.5" />;
      }
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
        const bulletContent = trimmed.slice(2);
        return (
          <div key={lIdx} className="flex items-start gap-1.5 my-0.5">
            <span className={isAI ? "text-purple-600 font-bold shrink-0 leading-relaxed select-none" : "text-emerald-200 font-bold shrink-0 leading-relaxed select-none"}>•</span>
            <div className="leading-relaxed flex-1">
              {renderInlineTokens(bulletContent, isAI)}
            </div>
          </div>
        );
      }
      return (
        <div key={lIdx} className="leading-relaxed">
          {renderInlineTokens(line, isAI)}
        </div>
      );
    });
  };

  // Initialize with proactive notification message on component mount
  useEffect(() => {
    const criticalZone = zones.find(z => z.analysis?.riskLevel === 'CRITICAL') || zones[3];
    const attentionZone = zones.find(z => z.analysis?.riskLevel === 'ATTENTION' || z.analysis?.riskLevel === 'HIGH') || zones[0];

    const initialMessages = [
      {
        id: 'msg-init-1',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🌾 **Hello Farm Manager!** I am your **SmartFarm AI Agronomist Copilot**.\n\nI continuously monitor your 1-Acre field and ESP32 telemetry.\n\n⚠️ **Proactive Notification:**\n• **${criticalZone?.name || 'Zone D'} (${criticalZone?.cropType || 'Groundnut'}):** Moisture is at a critical deficit (**${criticalZone?.sensorData?.soilMoisture?.toFixed(0) || 15}%**) under elevated temperature (**${criticalZone?.sensorData?.airTemperature?.toFixed(0) || 38}°C**).\n• **${attentionZone?.name || 'Zone A'} (${attentionZone?.cropType || 'Tomato'}):** Moderate moisture deficit (**${attentionZone?.sensorData?.soilMoisture?.toFixed(0) || 28}%**).\n\nWould you like me to activate automated drip irrigation or provide pesticide/fertilizer guidelines?`,
        actions: [
          { label: `💧 Irrigate ${criticalZone?.name || 'Zone D'} Now`, type: 'IRRIGATE', zoneId: criticalZone?.zoneId || 'ZONE-D' },
          { label: '🧪 Prescribe Pesticide for Zone A', type: 'SPRAY', zoneId: 'ZONE-A' }
        ],
        suggestions: [
          `Turn on irrigation for ${criticalZone?.name || 'Zone D'}`,
          'Show me pesticide plan for Tomato',
          'What is the status of Zone B Chili?',
          'Give me a farm-wide summary'
        ]
      }
    ];

    setMessages(initialMessages);
    playNotificationSound();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle User Input Submission
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await executeAIChatQuery(query, zones, alerts, simulateAction);

      const botMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: aiResponse.text,
        actions: aiResponse.actions || [],
        suggestions: aiResponse.suggestions || [
          'Give me a farm-wide summary',
          'Check pesticide schedule',
          'Turn on irrigation for Zone D'
        ],
        source: aiResponse.source,
        warning: aiResponse.warning
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const fallbackMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🌾 **AI Copilot Response:** Unable to connect to cloud model (${err.message}). Using local agronomist rules.\n\nAll 4 zones are monitored and valves remain operational.`,
        suggestions: ['Give me a farm-wide summary', 'Check pesticide schedule']
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
      playNotificationSound();
    }
  };

  // Handle clicking an action button inside an AI bubble
  const handleExecuteAction = (action) => {
    if (action.type === 'IRRIGATE') {
      simulateAction('IRRIGATE', action.zoneId);
      handleSendMessage(`Executed automated drip irrigation for ${action.zoneId}`);
    } else if (action.type === 'SPRAY' || action.type === 'LOG_SPRAY') {
      const details = action.details || {
        pesticideName: 'Copper Oxychloride 50% WP',
        dosage: '2.5 g / Liter water',
        targetPest: 'Early Leaf Blight'
      };
      logPesticideSpray(action.zoneId, details);
      handleSendMessage(`Logged pesticide spray (${details.pesticideName}) for ${action.zoneId}`);
    } else if (action.type === 'SUMMARY') {
      handleSendMessage('Give me a farm-wide summary');
    } else if (action.type === 'CHECK') {
      handleSendMessage(`What is the current moisture in ${action.zoneId}?`);
    }
  };

  // Test API Key
  const handleTestKey = async () => {
    setTestingKey(true);
    setTestStatus(null);
    let key = '';
    let model = '';
    if (tempProvider === 'groq') {
      key = tempGroqKey;
      model = tempGroqModel;
    } else if (tempProvider === 'gemini') {
      key = tempGeminiKey;
      model = tempModel;
    } else if (tempProvider === 'openai') {
      key = tempOpenAIKey;
    }
    const res = await testAIConnection(tempProvider, key, model);
    setTestStatus(res);
    setTestingKey(false);
  };

  // Save AI Config
  const handleSaveConfig = () => {
    const newConfig = {
      provider: tempProvider,
      groqKey: tempGroqKey,
      groqModel: tempGroqModel,
      geminiKey: tempGeminiKey,
      geminiModel: tempModel,
      openaiKey: tempOpenAIKey,
      model: tempModel
    };
    saveAIConfig(newConfig);
    setAiConfig(newConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsConfigModalOpen(false);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col h-[650px] animate-fadeIn relative">
      
      {/* Top Copilot Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-indigo-950">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm tracking-tight">SmartFarm AI Agronomist Copilot</h3>
              
              {/* Dynamic Engine Badge */}
              {aiConfig.provider === 'groq' && aiConfig.groqKey ? (
                <span className="text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Groq Llama 3.3 Live</span>
                </span>
              ) : aiConfig.provider === 'gemini' && aiConfig.geminiKey ? (
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>Google Gemini Live</span>
                </span>
              ) : aiConfig.provider === 'openai' && aiConfig.openaiKey ? (
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>OpenAI GPT Live</span>
                </span>
              ) : (
                <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>Built-in Farm AI (Free)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Real-time ESP32 sensor link • Conversational crop guidance
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-2">
          {/* AI Settings / Key button */}
          <button
            onClick={() => {
              setTempProvider(aiConfig.provider);
              setTempGroqKey(aiConfig.groqKey || '');
              setTempGroqModel(aiConfig.groqModel || 'llama-3.3-70b-versatile');
              setTempGeminiKey(aiConfig.geminiKey || '');
              setTempOpenAIKey(aiConfig.openaiKey || '');
              setTempModel(aiConfig.model || 'gemini-1.5-flash');
              setTestStatus(null);
              setIsConfigModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all active:scale-95"
            title="Configure AI Model or Provide API Key"
          >
            <Key className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={() => {
              setMessages([]);
              setTimeout(() => {
                handleSendMessage('Give me a farm-wide summary');
              }, 100);
            }}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Reset Conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Proactive Notification Ribbon */}
      {showNotificationBanner && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5 text-amber-900">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <Bell className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Proactive Agronomic Alert:</strong> Zone D (Groundnut) moisture dropped to 15%. Click below to reply or irrigate!
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExecuteAction({ type: 'IRRIGATE', zoneId: 'ZONE-D' })}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-2xs"
            >
              💧 Quick Water Zone D
            </button>
            <button
              onClick={() => setShowNotificationBanner(false)}
              className="text-amber-700 hover:text-amber-950 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Chat Stream Messages Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';

          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                isAI ? 'bg-purple-600' : 'bg-slate-800'
              }`}>
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  isAI 
                    ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs' 
                    : 'bg-emerald-600 text-white rounded-tr-xs'
                }`}>
                  {/* Warning banner if fallback happened */}
                  {msg.warning && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{msg.warning}</span>
                    </div>
                  )}

                  {/* Formatted rich text */}
                  <div className="font-medium space-y-1">
                    {renderFormattedMessage(msg.text, isAI)}
                  </div>

                  {/* Timestamp & Source badge */}
                  <div className={`text-[10px] mt-2 flex items-center justify-between ${isAI ? 'text-slate-400' : 'text-emerald-200'}`}>
                    <span>
                      {isAI && msg.source === 'groq' && '⚡ Powered by Groq (Llama 3.3)'}
                      {isAI && msg.source === 'gemini' && '⚡ Powered by Gemini'}
                      {isAI && msg.source === 'openai' && '⚡ Powered by OpenAI'}
                      {isAI && msg.source === 'builtin' && '🌱 Built-in Farm AI'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Inline Action Triggers inside AI Bubble */}
                {isAI && msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 animate-fadeIn">
                    {msg.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleExecuteAction(act)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions Chips below AI message */}
                {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(sug)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors text-left flex items-center gap-1"
                      >
                        <span>{sug}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 self-start max-w-[85%] animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-xs border border-slate-200 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-400 ml-1">AI Copilot analyzing farm telemetry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }} 
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask AI Copilot (e.g. 'Irrigate Zone D', 'What pesticide for Tomato?', 'How are my crops?')..."
            className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 font-medium px-1">
          <span>Zero API key required for built-in AI • Groq, Gemini & OpenAI supported</span>
          <button 
            type="button" 
            onClick={() => setIsConfigModalOpen(true)}
            className="text-purple-600 hover:text-purple-800 font-semibold underline flex items-center gap-1"
          >
            <span>AI Settings / API Keys</span>
          </button>
        </div>
      </div>

      {/* AI Engine & API Key Configuration Modal */}
      {isConfigModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">AI Model & API Key Configuration</h3>
                  <p className="text-xs text-slate-500">Configure how the SmartFarm AI Copilot responds</p>
                </div>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select AI Engine
              </label>

              {/* 1. Built-in Farm AI */}
              <div
                onClick={() => setTempProvider('builtin')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  tempProvider === 'builtin'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-purple-600 flex items-center justify-center">
                    {tempProvider === 'builtin' && <span className="w-2 h-2 rounded-full bg-purple-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">Built-in Smart Agronomist</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        100% Free • No Key Needed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Instant natural responses, conversational greetings, live ESP32 checks, and drip control with zero setup.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Groq Cloud */}
              <div
                onClick={() => setTempProvider('groq')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  tempProvider === 'groq'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-amber-600 flex items-center justify-center">
                    {tempProvider === 'groq' && <span className="w-2 h-2 rounded-full bg-amber-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        Groq Cloud (Llama 3.3 70B)
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                        Ultra-Fast • Free API Key
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Up to 500 tokens/sec with Meta Llama 3.3 70B or Llama 3.1 8B. Blazing fast precision agronomy.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Google Gemini */}
              <div
                onClick={() => setTempProvider('gemini')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  tempProvider === 'gemini'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    {tempProvider === 'gemini' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">Google Gemini AI</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                        Free API Key Available
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Deep agricultural reasoning and unrestricted language generation using Google Gemini 1.5 / 2.0 Flash.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. OpenAI */}
              <div
                onClick={() => setTempProvider('openai')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  tempProvider === 'openai'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                    {tempProvider === 'openai' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900">OpenAI (GPT-4o / GPT-3.5)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Connect your OpenAI API key for ChatGPT-grade agricultural advisory.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditional Key Input for Groq */}
            {tempProvider === 'groq' && (
              <div className="space-y-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900">
                    Groq Cloud API Key
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Get Free Groq Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempGroqKey}
                    onChange={(e) => setTempGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full pl-3 pr-10 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Model: <strong>{tempGroqModel}</strong></span>
                  <select
                    value={tempGroqModel}
                    onChange={(e) => setTempGroqModel(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Best & Recommended)</option>
                    <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</option>
                    <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                  </select>
                </div>
              </div>
            )}

            {/* Conditional Key Input for Gemini */}
            {tempProvider === 'gemini' && (
              <div className="space-y-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
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
                    <span>Get Free Gemini Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempGeminiKey}
                    onChange={(e) => setTempGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-3 pr-10 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Model: <strong>{tempModel}</strong></span>
                  <select
                    value={tempModel}
                    onChange={(e) => setTempModel(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Recommended)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>
            )}

            {/* Conditional Key Input for OpenAI */}
            {tempProvider === 'openai' && (
              <div className="space-y-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
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

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempOpenAIKey}
                    onChange={(e) => setTempOpenAIKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full pl-3 pr-10 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Test Status Banner */}
            {testStatus && (
              <div className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                testStatus.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testStatus.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{testStatus.message}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{testStatus.error}</span>
                  </>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {tempProvider !== 'builtin' ? (
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || (tempProvider === 'groq' && !tempGroqKey) || (tempProvider === 'gemini' && !tempGeminiKey) || (tempProvider === 'openai' && !tempOpenAIKey)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{testingKey ? 'Verifying...' : 'Test Connection'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  {saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                  <span>{saveSuccess ? 'Saved!' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
