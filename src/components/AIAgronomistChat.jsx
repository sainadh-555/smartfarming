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
  X
} from 'lucide-react';

export default function AIAgronomistChat() {
  const { zones, simulateAction, logPesticideSpray } = useFarmData();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const messagesEndRef = useRef(null);

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
        text: `🌾 **Hello Farm Manager!** I am your **SmartFarm AI Agronomist Copilot**. I continuously monitor your 1-Acre quadrants via real-time ESP32 sensor streams.\n\n⚠️ **Proactive Notification:**\n• **${criticalZone?.name || 'Zone D'} (${criticalZone?.cropType || 'Groundnut'}):** Moisture is at a critical deficit (**${criticalZone?.sensorData?.soilMoisture?.toFixed(0) || 15}%**) under elevated temperature (**${criticalZone?.sensorData?.airTemperature?.toFixed(0) || 38}°C**).\n• **${attentionZone?.name || 'Zone A'} (${attentionZone?.cropType || 'Tomato'}):** Moderate moisture deficit (**${attentionZone?.sensorData?.soilMoisture?.toFixed(0) || 28}%**).\n\nWould you like me to activate automated drip irrigation or advise on disease prevention?`,
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

  // AI Response Generator based on farmer queries
  const generateAIResponse = (userQuery) => {
    const query = userQuery.toLowerCase().trim();

    // 1. Irrigation Intent
    if (query.includes('irrigate') || query.includes('water') || query.includes('drip') || query.includes('pump')) {
      let targetZoneId = 'ZONE-D';
      if (query.includes('zone a') || query.includes('tomato')) targetZoneId = 'ZONE-A';
      else if (query.includes('zone b') || query.includes('chili')) targetZoneId = 'ZONE-B';
      else if (query.includes('zone c') || query.includes('paddy')) targetZoneId = 'ZONE-C';
      else if (query.includes('zone d') || query.includes('groundnut')) targetZoneId = 'ZONE-D';

      const targetZone = zones.find(z => z.zoneId === targetZoneId) || zones[3];

      // Execute simulation
      simulateAction('IRRIGATE', targetZoneId);

      return {
        text: `💧 **Irrigation Executed for ${targetZone.name} (${targetZone.cropType})!**\n\n• Command sent to **${targetZone.sensorData.deviceId}** solenoid valve relay.\n• Applied **400 Gallons** via 16mm inline drip laterals.\n• Expected soil moisture increase: **+40%**.\n• Soil temperature cooled by **2°C** to relieve thermal root stress.`,
        actions: [
          { label: `Check ${targetZone.name} Moisture`, type: 'CHECK', zoneId: targetZoneId }
        ],
        suggestions: [
          'What is the next zone that needs water?',
          'Check pesticide schedule',
          'Give me a farm-wide summary'
        ]
      };
    }

    // 2. Pesticide / Chemical / Fungicide Intent
    if (query.includes('pesticide') || query.includes('spray') || query.includes('fungicide') || query.includes('pest') || query.includes('disease') || query.includes('chemical') || query.includes('blight') || query.includes('thrips')) {
      let targetZoneId = 'ZONE-A';
      if (query.includes('zone b') || query.includes('chili')) targetZoneId = 'ZONE-B';
      else if (query.includes('zone c') || query.includes('paddy')) targetZoneId = 'ZONE-C';
      else if (query.includes('zone d') || query.includes('groundnut')) targetZoneId = 'ZONE-D';

      const targetZone = zones.find(z => z.zoneId === targetZoneId) || zones[0];
      const agronomy = targetZone.agronomy;
      const pest = agronomy?.pesticideUsage?.activePestThreat || 'Foliar pathogens & insects';
      const lastTreatment = agronomy?.pesticideUsage?.treatments?.[0];

      return {
        text: `🧪 **Pesticide & Agrochemical Advisory for ${targetZone.name} (${targetZone.cropType})**:\n\n• **Active Target Threat:** ${pest}\n• **Recommended Chemical Spray:** **Copper Oxychloride 50% WP** @ 2.5 g/L OR **NeemAzal 1% EC (Organic)** @ 3 ml/L.\n• **Safety Pre-Harvest Interval (PHI):** 7 Days before harvest.\n• **Last Applied:** ${lastTreatment?.pesticideName || 'NeemAzal 1%'} on ${lastTreatment?.date || 'Oct 18, 2026'}.\n• **Total Applied This Season:** ${agronomy?.pesticideUsage?.totalChemicalUsed || '550 ml / 0.25 Acre'}.`,
        actions: [
          { 
            label: `Log 250ml Spray for ${targetZone.name}`, 
            type: 'LOG_SPRAY', 
            zoneId: targetZoneId,
            details: {
              pesticideName: 'NeemAzal-T/S (Azadirachtin 1% EC)',
              dosage: '250 ml / 0.25 acre',
              targetPest: pest
            }
          }
        ],
        suggestions: [
          `Irrigate ${targetZone.name}`,
          'What are organic alternatives?',
          'Show me fertilizer dosages'
        ]
      };
    }

    // 3. Farm-wide Summary / Health Report
    if (query.includes('summary') || query.includes('report') || query.includes('all zones') || query.includes('overview') || query.includes('farm')) {
      const summaryLines = zones.map(z => 
        `• **${z.name} (${z.cropType} - 0.25 Ac):** Health: **${z.analysis.overallHealthScore}%** | Moisture: **${z.sensorData.soilMoisture.toFixed(0)}%** | Temp: **${z.sensorData.airTemperature.toFixed(0)}°C** (${z.analysis.plantStatus})`
      ).join('\n');

      return {
        text: `📊 **1-Acre Farm Overview (4 Quadrants × 0.25 Acre)**:\n\n${summaryLines}\n\n💡 **AI Priority Recommendation:**\nZone D Groundnut requires immediate moisture intervention. Zone C Paddy is thriving under optimal flood conditions. Zone A Tomato has mild aphid risk.`,
        actions: [
          { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' },
          { label: '💧 Water Zone A Now', type: 'IRRIGATE', zoneId: 'ZONE-A' }
        ],
        suggestions: [
          'Irrigate Zone D',
          'What pesticide should I spray for Tomato?',
          'Why is Paddy moisture 75%?'
        ]
      };
    }

    // 4. Specific Crop / Zone queries
    if (query.includes('zone b') || query.includes('chili')) {
      const zb = zones.find(z => z.zoneId === 'ZONE-B');
      return {
        text: `🌶️ **Zone B — Chili Quadrant (0.25 Acre)**:\n\n• **Variety:** Guntur Sannam / Teja (Pre-flowering)\n• **Health Score:** ${zb?.analysis?.overallHealthScore || 82}% (Healthy)\n• **Soil Moisture:** ${zb?.sensorData?.soilMoisture?.toFixed(1) || 35.0}%\n• **Temperature:** ${zb?.sensorData?.airTemperature?.toFixed(1) || 29.5}°C\n• **Pesticide Status:** Imidacloprid applied on Oct 14 against thrips. Vector population suppressed by 96%.`,
        suggestions: ['Irrigate Zone B', 'Give me fertilizer schedule for Chili', 'Show me all 4 zones']
      };
    }

    if (query.includes('zone c') || query.includes('paddy') || query.includes('rice')) {
      const zc = zones.find(z => z.zoneId === 'ZONE-C');
      return {
        text: `🌾 **Zone C — Paddy Basin (0.25 Acre)**:\n\n• **Variety:** Basmati 1509 (Active Tillering)\n• **Health Score:** ${zc?.analysis?.overallHealthScore || 90}% (Optimal)\n• **Soil Moisture:** ${zc?.sensorData?.soilMoisture?.toFixed(1) || 75.0}% (Standing water ponding)\n• **Canopy Humidity:** ${zc?.sensorData?.humidity?.toFixed(0) || 72}%\n• **Advisory:** High humidity creates favorable conditions for Sheath Blight spores. Monitor base tillers for lesions.`,
        suggestions: ['Show Sheath Blight spray', 'Irrigate Zone D', 'Farm summary']
      };
    }

    if (query.includes('fertilizer') || query.includes('nutrient') || query.includes('npk') || query.includes('urea') || query.includes('dap')) {
      return {
        text: `🌱 **Agronomic Fertilizer Schedules (0.25 Acre Dosage)**:\n\n• **Zone A (Tomato):** Water-soluble NPK 19:19:19 @ 12.5 kg via drip fertigation for fruit sizing.\n• **Zone B (Chili):** DAP @ 15 kg + Urea @ 8 kg for vegetative branches.\n• **Zone C (Paddy):** Neem-coated Urea @ 20 kg top-dressing for tillering.\n• **Zone D (Groundnut):** Agricultural Gypsum @ 50 kg for pod calcium filling.`,
        suggestions: ['Irrigate Zone D', 'Check pesticide schedule', 'Farm summary']
      };
    }

    // Default Fallback Response
    return {
      text: `🤖 **AI Agronomist Analysis:**\nI reviewed your question regarding: "*${userQuery}*".\n\nBased on your 1-Acre farm telemetry, the primary limiting factor right now is **soil moisture deficit in Zone D (15%) and Zone A (28%)**. Would you like me to trigger drip irrigation or provide pesticide/fertilizer guidelines?`,
      actions: [
        { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' },
        { label: '📊 View Full Farm Status', type: 'SUMMARY' }
      ],
      suggestions: [
        'Turn on irrigation for Zone D',
        'What pesticide should I spray for Tomato?',
        'Give me a farm-wide summary'
      ]
    };
  };

  // Handle User Message Submission
  const handleSendMessage = (textToSend = null) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // AI typing delay simulation
    setTimeout(() => {
      const aiReply = generateAIResponse(text);
      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: aiReply.text,
        actions: aiReply.actions,
        suggestions: aiReply.suggestions
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      playNotificationSound();
    }, 750);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col h-[650px] animate-fadeIn">
      
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
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm tracking-tight">SmartFarm AI Agronomist Copilot</h3>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-bold">
                GPT-Agri Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Live link with ESP32 sensors & 1-Acre crop decision engine
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5">
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
                  {/* Formatted rich text */}
                  <div className="font-medium space-y-1">
                    {renderFormattedMessage(msg.text, isAI)}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-[10px] mt-2 text-right ${isAI ? 'text-slate-400' : 'text-emerald-200'}`}>
                    {msg.timestamp}
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
              <span className="text-xs text-slate-400 ml-1">AI Copilot analyzing telemetry...</span>
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
            placeholder="Ask AI Copilot (e.g. 'Irrigate Zone D', 'What pesticide for Tomato?')..."
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
          <span>Supported: Voice/Text queries, remote irrigation commands, pesticide logging</span>
          <span>Powered by SmartFarm Decision Engine</span>
        </div>
      </div>
    </div>
  );
}
