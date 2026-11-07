import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Droplets, 
  Thermometer, 
  Sun,
  AlertCircle
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';
import { executeAIChatQuery, getAIConfig } from '../../services/aiChatService';

export default function MobileFarmAI() {
  const { 
    zones, 
    alerts, 
    hardwareData, 
    simulationData, 
    operatingMode, 
    history, 
    language,
    backendUrl 
  } = useFarmData();

  const isTe = language === 'te';
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Suggested Prompts
  const suggestedPrompts = useMemo(() => {
    if (isTe) {
      return [
        'ఈ రోజు టమాటా పంటకు నీరు పెట్టాలా?',
        'మట్టి తేమ శాతం ప్రకారం సిఫార్సు ఏమిటి?',
        'ప్రస్తుత ఉష్ణోగ్రతకు తెగుళ్ల ముప్పు ఉందా?',
        'మిరప పంటకు ఎరువుల మోతాదు ఎంత?'
      ];
    }
    return [
      'Should I irrigate Zone A today?',
      'Analyze current soil moisture and light',
      'Are current temperatures causing crop stress?',
      'Fertilizer plan for active crops'
    ];
  }, [isTe]);

  // Load chat messages from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('smartfarm_farm_ai_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe
          ? 'నమస్కారం! నేను మీ **Farm AI** అసిస్టెంట్‌ని. మీ పొలం మట్టి తేమ, ఉష్ణోగ్రత, నీటి పారుదల లేదా పంట సంరక్షణ గురించి ఏదైనా అడగండి.'
          : 'Hello! I am **Farm AI**, your intelligent agricultural assistant. How can I help with your soil moisture, irrigation, or crop health today?'
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Save conversation
  useEffect(() => {
    try {
      localStorage.setItem('smartfarm_farm_ai_chat', JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending) return;

    setInputMessage('');

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const liveContext = {
        zones,
        alerts,
        hardwareData,
        simulationData,
        operatingMode,
        history,
        language
      };

      const response = await executeAIChatQuery(query, liveContext, backendUrl);
      
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        model: response.model || 'Agricultural AI'
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe 
          ? 'క్షమించండి, సమాధానం రూపొందించడంలో సమస్య ఎదురైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.' 
          : 'Sorry, I encountered an error answering your question. Please try again.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('smartfarm_farm_ai_chat');
    setMessages([
      {
        id: 'msg-welcome-reset',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe
          ? 'చర్చ చరిత్ర క్లియర్ చేయబడింది. కొత్త ప్రశ్న అడగండి.'
          : 'Chat history cleared. How can I assist your farm today?'
      }
    ]);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Live farm context summary
  const activeM = operatingMode === 'live_hardware' ? hardwareData?.soilMoisture : 45.0;
  const activeT = operatingMode === 'live_hardware' ? hardwareData?.temperature : 28.5;

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm max-w-lg mx-auto">
      
      {/* ======================================================== */}
      {/* 1. COMPACT FARM AI HEADER                                */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-slate-900">Farm AI</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500">
              {isTe ? 'తెలివైన వ్యవసాయ సహాయకుడు' : 'Intelligent Agronomist'}
            </p>
          </div>
        </div>

        {/* Clear chat action */}
        <button
          type="button"
          onClick={handleClearHistory}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer touch-target-min"
          title="Clear Conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      {/* Live Telemetry Context Strip */}
      <div className="bg-emerald-50/80 border-b border-emerald-100 px-3 py-1.5 flex items-center justify-between text-[10px] text-emerald-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold flex items-center gap-1">
            <Droplets className="w-3 h-3 text-emerald-700" />
            {typeof activeM === 'number' ? `${activeM}%` : 'N/A'}
          </span>
          <span>•</span>
          <span className="font-bold flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-amber-700" />
            {typeof activeT === 'number' ? `${activeT}°C` : 'N/A'}
          </span>
        </div>
        <span className="font-semibold text-emerald-700">
          {operatingMode === 'live_hardware' ? 'ESP32 Live Telemetry' : 'Simulation Engine'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 2. SCROLLABLE MESSAGE HISTORY                            */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs relative group ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-xs font-medium'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                {/* Message Text with simple line formatting */}
                <div className="whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Footer: timestamp + copy */}
                <div className={`mt-1.5 flex items-center justify-between gap-2 text-[9px] ${
                  isUser ? 'text-emerald-100' : 'text-slate-400'
                }`}>
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isSending && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2 pl-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>{isTe ? 'Farm AI విశ్లేషిస్తోంది...' : 'Farm AI is analyzing your field...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ======================================================== */}
      {/* 3. SUGGESTED QUESTIONS CHIPS (HORIZONTAL SCROLL)         */}
      {/* ======================================================== */}
      <div className="px-3 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0 bg-white/70 border-t border-slate-100">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(p)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-emerald-500 whitespace-nowrap shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 4. FIXED MESSAGE COMPOSER                                */}
      {/* ======================================================== */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white border-t border-slate-200/90 p-2.5 flex items-center gap-2 shrink-0 safe-area-bottom"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isTe ? 'Farm AI ని ఏదైనా అడగండి...' : 'Ask Farm AI about crops, irrigation...'}
          disabled={isSending}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim() || isSending}
          className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-90 cursor-pointer touch-target-min"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}

