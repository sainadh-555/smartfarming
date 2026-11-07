import React, { useState, useEffect, useRef } from 'react';
import { useFarmData } from '../context/FarmContext';
import {
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Settings,
  X,
  Key,
  ShieldCheck,
  Activity,
  Bot
} from 'lucide-react';
import {
  executeAIChatQuery,
  getAIConfig,
  saveAIConfig
} from '../services/aiChatService';

export default function AIAgronomistChat() {
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
  const textareaRef = useRef(null);

  // Suggested Prompts as requested by Section 5
  const suggestedPrompts = useMemoSuggestedPrompts(isTe);

  // Load conversation history from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('smartfarm_farm_ai_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe
          ? 'నమస్కారం! నేను మీ **Farm AI** సహాయకుడిని. మీ మట్టి తేమ, ఉష్ణోగ్రత, నీటి పారుదల లేదా వాతావరణం గురించి ఏవైనా సందేహాలుంటే నన్ను అడగండి.'
          : 'Hello! I am **Farm AI**, your intelligent agricultural assistant. How can I help you with your soil moisture, irrigation, weather, or crop health today?'
      }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [tempGroqKey, setTempGroqKey] = useState(aiConfig.groqKey || '');

  // Persist conversation to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smartfarm_farm_ai_chat', JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) {
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setIsTyping(true);

    try {
      const response = await executeAIChatQuery({
        query,
        zones,
        alerts,
        hardwareData,
        simulationData,
        operatingMode,
        history,
        language: isTe ? 'te' : 'en',
        backendUrl,
        conversationHistory: messages
      });

      const aiMessage = {
        id: `ai-${Date.now() + 1}`,
        sender: 'ai',
        timestamp: response.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        source: response.source,
        model: response.model
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        isError: true,
        retryQuery: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe
          ? `లోపం ఏర్పడింది (${err.message || 'సర్వీస్ అందుబాటులో లేదు'}). దయచేసి మళ్లీ ప్రయత్నించండి.`
          : `I encountered an error processing your farm data (${err.message || 'Service unavailable'}). Please try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = (queryToRetry) => {
    if (queryToRetry) {
      handleSendMessage(queryToRetry);
    }
  };

  // Handle keyboard submission (Enter to send, Shift+Enter for multiline newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy response text
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear conversation
  const handleClearChat = () => {
    const reset = [
      {
        id: 'msg-welcome-reset',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isTe
          ? 'సంభాషణ క్లియర్ చేయబడింది. నేను మీ **Farm AI** సహాయకుడిని. మీకు ఎలాంటి వ్యవసాయ సహాయం కావాలి?'
          : 'Conversation cleared. I am **Farm AI**. How can I assist you with your farm conditions today?'
      }
    ];
    setMessages(reset);
    localStorage.removeItem('smartfarm_farm_ai_chat');
  };

  // Save Groq key
  const handleSaveConfig = () => {
    const newConfig = {
      ...aiConfig,
      provider: tempGroqKey ? 'groq' : 'farm_ai',
      groqKey: tempGroqKey
    };
    saveAIConfig(newConfig);
    setAiConfig(newConfig);
    setIsConfigOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[640px] max-w-5xl mx-auto relative transition-all">
      
      {/* ======================================================== */}
      {/* 1. PROFESSIONAL CHAT HEADER                              */}
      {/* ======================================================== */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Farm AI</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                {isTe ? 'వ్యవసాయ సహాయకుడు' : 'Agricultural Assistant'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {isTe 
                ? 'లైవ్ సెన్సార్ డేటా మరియు వ్యవసాయ విశ్లేషణలతో అనుసంధానించబడింది' 
                : 'Connected to live ESP32 sensors & agricultural decision models'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title={isTe ? 'సంభాషణను క్లియర్ చేయండి' : 'Clear conversation'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title={isTe ? 'AI అమరికలు' : 'AI Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CHAT MESSAGES CONTAINER (Scrollable)                   */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
            >
              <div 
                className={`group relative text-xs leading-relaxed max-w-[90%] sm:max-w-[80%] ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3.5 shadow-xs'
                }`}
              >
                {/* Formatted Message Text */}
                <div className="whitespace-pre-wrap font-sans">
                  {renderFormattedContent(msg.text, isUser)}
                </div>

                {/* Retry action for failed requests */}
                {msg.isError && msg.retryQuery && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleRetry(msg.retryQuery)}
                      disabled={isTyping}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isTe ? 'మళ్లీ ప్రయత్నించండి' : 'Retry Question'}</span>
                    </button>
                  </div>
                )}

                {/* Footer: Timestamp, Model source, and Copy Button */}
                <div className={`mt-2 flex items-center justify-between text-[10px] ${isUser ? 'text-slate-400' : 'text-slate-400'} pt-1 border-t ${isUser ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className="flex items-center gap-1.5">
                    <span>{msg.timestamp}</span>
                    {msg.model && (
                      <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        {msg.model}
                      </span>
                    )}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-slate-700 cursor-pointer flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 text-[10px] font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-slate-400 font-medium ml-1.5">
                {isTe ? 'Farm AI విశ్లేషిస్తోంది...' : 'Farm AI analyzing...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ======================================================== */}
      {/* 3. SUGGESTED PROMPTS & INPUT AREA                        */}
      {/* ======================================================== */}
      <div className="border-t border-slate-200/90 bg-white p-3 sm:p-4 space-y-2.5">
        
        {/* Suggested Prompts Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {suggestedPrompts.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(promptText)}
              disabled={isTyping}
              className="text-[11px] font-semibold text-slate-600 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="relative flex items-center gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isTe ? 'Farm AI ని ఏదైనా అడగండి... (ఉదా: ఇప్పుడు నీరు పెట్టాలా?)' : 'Ask Farm AI anything... (Press Enter to send, Shift+Enter for new line)'}
            className="flex-1 resize-none bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none max-h-32 leading-relaxed"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95 shadow-xs"
            title={isTe ? 'పంపండి' : 'Send'}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 text-center font-medium">
          {isTe 
            ? 'Farm AI మీ పొలం సెన్సార్లు మరియు నిర్ణయ సూత్రాల ఆధారంగా సలహాలు అందిస్తుంది.' 
            : 'Farm AI provides agronomic guidance based on your live sensors and crop decision models.'}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: AI MODEL CONFIGURATION (Optional Cloud Key)    */}
      {/* ======================================================== */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">AI Model Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Farm AI works 100% offline using your local crop decision engine. You can also optionally connect a cloud LLM API key (e.g. Groq) for enhanced conversational responses:
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Groq API Key (Optional)</label>
                <input
                  type="password"
                  value={tempGroqKey}
                  onChange={(e) => setTempGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Hook to provide suggested prompts
function useMemoSuggestedPrompts(isTe) {
  if (isTe) {
    return [
      'నా పూర్తి పొలం పరిస్థితిని విశ్లేషించండి',
      'ఈ రోజు నీరు పెట్టాలా?',
      'తాజా సెన్సార్ రీడింగ్‌లను వివరించండి',
      'మట్టి తేమ ధోరణిని విశ్లేషించండి',
      'నేటి వాతావరణం నా పంటలపై ఎలా ప్రభావం చూపుతుంది?',
      'తాజా మొక్కల వ్యాధి నిర్ధారణను వివరించండి',
      'నీటిని ఎలా ఆదా చేయవచ్చు?',
      'పంట ఆరోగ్య అంచనాను వివరించండి'
    ];
  }
  return [
    'Analyze my complete farm condition.',
    'Should I irrigate today?',
    'Explain my latest sensor readings.',
    'Analyze my soil moisture trends.',
    'How does today\'s weather affect my crops?',
    'Explain my latest plant diagnosis.',
    'How can I save water?',
    'Explain my crop health prediction.'
  ];
}

// Helper to format bold tokens cleanly
function renderFormattedContent(text, isUser) {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="h-1.5" />;
    }

    // Bold formatting parser
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const parsedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className={isUser ? 'font-black text-white' : 'font-extrabold text-slate-900'}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <div key={idx} className="leading-relaxed">
        {parsedLine}
      </div>
    );
  });
}
