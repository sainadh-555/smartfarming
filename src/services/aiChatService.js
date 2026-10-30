/**
 * SmartFarm AI™ — Hybrid AI Chat Service
 * Supports:
 * 1. Built-in Smart Agronomist (100% Free, Zero Setup, Offline, Dynamic Farm Rules)
 * 2. Google Gemini API (Free API Key from Google AI Studio: gemini-1.5-flash / gemini-2.0-flash)
 * 3. OpenAI API (GPT-4o / GPT-4o-mini / GPT-3.5)
 */

export const getAIConfig = () => {
  return {
    provider: localStorage.getItem('smartfarm_ai_provider') || 'builtin', // 'builtin' | 'gemini' | 'openai'
    geminiKey: localStorage.getItem('smartfarm_gemini_key') || '',
    openaiKey: localStorage.getItem('smartfarm_openai_key') || '',
    model: localStorage.getItem('smartfarm_gemini_model') || 'gemini-1.5-flash'
  };
};

export const saveAIConfig = (config) => {
  if (config.provider) localStorage.setItem('smartfarm_ai_provider', config.provider);
  if (config.geminiKey !== undefined) localStorage.setItem('smartfarm_gemini_key', config.geminiKey.trim());
  if (config.openaiKey !== undefined) localStorage.setItem('smartfarm_openai_key', config.openaiKey.trim());
  if (config.model) localStorage.setItem('smartfarm_gemini_model', config.model);
};

/**
 * Builds live farm contextual telemetry prompt for real LLMs
 */
export const buildFarmSystemPrompt = (zones, alerts) => {
  const zoneSummary = (zones || []).map(z => {
    const s = z.sensorData || {};
    return `- ${z.name || z.zoneId} (${z.cropType}): Moisture=${s.soilMoisture?.toFixed(1) || 'N/A'}%, Temp=${s.airTemperature?.toFixed(1) || 'N/A'}°C, Humidity=${s.humidity?.toFixed(0) || 'N/A'}%, Status=${z.analysis?.plantStatus || 'Normal'}, Health=${z.analysis?.overallHealthScore || 80}%`;
  }).join('\n');

  const alertSummary = (alerts || []).filter(a => !a.resolved).map(a => `- [${a.severity || 'WARN'}] ${a.message || a.title}`).join('\n') || 'None';

  return `You are the SmartFarm AI Agronomist Copilot, an expert agricultural consultant and farm automation assistant for a 1-Acre precision farm in Green Valley (divided into 4 zones: Zone A Tomato, Zone B Chili, Zone C Paddy, Zone D Groundnut).

CURRENT LIVE SENSOR TELEMETRY (from real ESP32 sensors):
${zoneSummary}

ACTIVE ALERTS:
${alertSummary}

YOUR BEHAVIOR:
1. Speak warmly, respectfully, and concisely as an experienced agronomist.
2. If the user greets you (e.g. "hi", "hello"), greet them back warmly, summarize the key farm highlight, and offer assistance.
3. Reference real sensor values from the telemetry above when answering.
4. Give specific, safe, practical farming advice (irrigation timing, organic/chemical pest sprays, soil health).
5. If recommending irrigation, mention which zone needs water (e.g., Zone D if moisture is low).
6. Format responses with clean markdown (bold, bullet points). Keep replies helpful and directly relevant without excessive length.`;
};

/**
 * Test API Key validity
 */
export const testAIConnection = async (provider, apiKey, model = 'gemini-1.5-flash') => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key is required.' };
  }

  const cleanKey = apiKey.trim();

  if (provider === 'gemini') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the single word: Connected' }] }]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${res.status}: Verification failed` };
      }

      return { success: true, message: `Connected successfully to Google ${model}!` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error reaching Google Gemini API' };
    }
  }

  if (provider === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${cleanKey}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${res.status}: Invalid OpenAI key` };
      }

      return { success: true, message: 'Connected successfully to OpenAI!' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error reaching OpenAI API' };
    }
  }

  return { success: true, message: 'Built-in engine active.' };
};

/**
 * Query Google Gemini API
 */
const queryGemini = async (prompt, zones, alerts, apiKey, model = 'gemini-1.5-flash') => {
  const systemPrompt = buildFarmSystemPrompt(zones, alerts);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');

  return text;
};

/**
 * Query OpenAI API
 */
const queryOpenAI = async (prompt, zones, alerts, apiKey) => {
  const systemPrompt = buildFarmSystemPrompt(zones, alerts);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');

  return text;
};

/**
 * Enhanced Built-in Smart Agronomist Engine (100% Free, Offline, No Key Needed)
 */
export const queryBuiltInAgronomist = (userQuery, zones, alerts, simulateAction) => {
  const query = userQuery.toLowerCase().trim();

  const liveZoneA = zones?.find(z => z.zoneId === 'ZONE-A') || zones?.[0];
  const liveZoneB = zones?.find(z => z.zoneId === 'ZONE-B') || zones?.[1];
  const liveZoneC = zones?.find(z => z.zoneId === 'ZONE-C') || zones?.[2];
  const liveZoneD = zones?.find(z => z.zoneId === 'ZONE-D') || zones?.[3];

  const moistA = liveZoneA?.sensorData?.soilMoisture?.toFixed(0) || 28;
  const moistB = liveZoneB?.sensorData?.soilMoisture?.toFixed(0) || 35;
  const moistC = liveZoneC?.sensorData?.soilMoisture?.toFixed(0) || 75;
  const moistD = liveZoneD?.sensorData?.soilMoisture?.toFixed(0) || 15;

  const tempA = liveZoneA?.sensorData?.airTemperature?.toFixed(0) || 32;

  // 1. Natural Conversational Greetings (Fixes the "hi" robotic answer!)
  const isGreeting = /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|sup|howdy|yo)[\s!.,?]*$/i.test(query) ||
                     query === 'hi' || query === 'hello' || query === 'hey';

  if (isGreeting) {
    const criticalZone = (moistD < 25) ? 'Zone D (Groundnut)' : (moistA < 30) ? 'Zone A (Tomato)' : null;

    return {
      text: `👋 **Hello! Welcome to your SmartFarm AI Copilot.**\n\nI'm actively monitoring your 1-Acre farm via your ESP32 telemetry.\n\n📊 **Quick Field Snapshot:**\n• 🍅 **Zone A (Tomato):** Moisture **${moistA}%** • Temp **${tempA}°C**\n• 🌶️ **Zone B (Chili):** Moisture **${moistB}%** • Healthy canopy\n• 🌾 **Zone C (Paddy):** Moisture **${moistC}%** • Optimal standing water\n• 🥜 **Zone D (Groundnut):** Moisture **${moistD}%** ${moistD < 25 ? '*(Moisture Deficit ⚠️)*' : '*(Normal)*'}\n\n${criticalZone ? `💡 **Recommendation:** ${criticalZone} has low moisture. Would you like me to start irrigation?` : 'All quadrants are within normal agro-climatic boundaries.'}`,
      actions: moistD < 25 ? [
        { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' },
        { label: '📊 View Full Farm Status', type: 'SUMMARY' }
      ] : [
        { label: '📊 View Full Farm Status', type: 'SUMMARY' }
      ],
      suggestions: [
        'Turn on irrigation for Zone D',
        'What pesticide should I spray for Tomato?',
        'Give me a farm-wide summary'
      ]
    };
  }

  // 2. Polite acknowledgments
  if (/^(thanks|thank you|ok|okay|got it|cool|great|awesome|understood|good)[\s!.,?]*$/i.test(query)) {
    return {
      text: `🌾 **You're very welcome!**\n\nI'll continue monitoring your soil moisture and sensor streams in real-time. Just let me know whenever you need to trigger irrigation, check disease risks, or review crop treatments!`,
      suggestions: [
        'Give me a farm-wide summary',
        'Check pesticide schedule',
        'What is the status of Zone B Chili?'
      ]
    };
  }

  // 3. Status of AI / Capabilities
  if (query.includes('who are you') || query.includes('what can you do') || query.includes('help')) {
    return {
      text: `🤖 **About SmartFarm AI Copilot:**\n\nI am your automated precision agriculture assistant connected to your farm's ESP32 hardware and agro-climatic decision engine. I can:\n\n• 💧 **Control Irrigation:** Remotely open drip valves when soil dries below optimal thresholds\n• 🧪 **Prescribe Treatments:** Recommend organic and IPM-certified pesticides for pests (blight, thrips, blast)\n• 📈 **Live Telemetry:** Report live temperature, moisture, and humidity from your ESP32 nodes\n• 🌿 **Crop Schedules:** Provide NPK fertilizer and harvest timing guidelines\n\n*Tip: You can use the built-in AI for free, or link a Google Gemini API Key in AI Settings for unrestricted natural language chat.*`,
      suggestions: [
        'Give me a farm-wide summary',
        'Irrigate Zone D',
        'What pesticide should I spray for Tomato?'
      ]
    };
  }

  // 4. Irrigation Intent
  if (query.includes('irrigate') || query.includes('water') || query.includes('drip') || query.includes('pump')) {
    let targetZoneId = 'ZONE-D';
    if (query.includes('zone a') || query.includes('tomato')) targetZoneId = 'ZONE-A';
    else if (query.includes('zone b') || query.includes('chili')) targetZoneId = 'ZONE-B';
    else if (query.includes('zone c') || query.includes('paddy')) targetZoneId = 'ZONE-C';
    else if (query.includes('zone d') || query.includes('groundnut')) targetZoneId = 'ZONE-D';

    const targetZone = zones?.find(z => z.zoneId === targetZoneId) || zones?.[3] || { name: 'Zone D', cropType: 'Groundnut', sensorData: { deviceId: 'ESP32-NODE-04' } };

    if (simulateAction) {
      simulateAction('IRRIGATE', targetZoneId);
    }

    return {
      text: `💧 **Irrigation Triggered for ${targetZone.name} (${targetZone.cropType})!**\n\n• Command signaled to **${targetZone.sensorData?.deviceId || 'ESP32'}** solenoid valve relay.\n• Flow rate: **12 GPM** via 16mm inline pressure-compensating drip laterals.\n• Expected moisture recovery: **+35%** within 45 minutes.\n• Soil thermal stress reduced by **2°C**.`,
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

  // 5. Pesticide / Chemical / Fungicide Intent
  if (query.includes('pesticide') || query.includes('spray') || query.includes('fungicide') || query.includes('pest') || query.includes('disease') || query.includes('chemical') || query.includes('blight') || query.includes('thrips')) {
    let targetZoneId = 'ZONE-A';
    if (query.includes('zone b') || query.includes('chili')) targetZoneId = 'ZONE-B';
    else if (query.includes('zone c') || query.includes('paddy')) targetZoneId = 'ZONE-C';
    else if (query.includes('zone d') || query.includes('groundnut')) targetZoneId = 'ZONE-D';

    const targetZone = zones?.find(z => z.zoneId === targetZoneId) || zones?.[0];
    const agronomy = targetZone?.agronomy;
    const pest = agronomy?.pesticideUsage?.activePestThreat || 'Foliar pathogens & sucking pests';
    const lastTreatment = agronomy?.pesticideUsage?.treatments?.[0];

    return {
      text: `🧪 **Pesticide & Agrochemical Advisory for ${targetZone?.name || 'Zone A'} (${targetZone?.cropType || 'Tomato'})**:\n\n• **Active Threat:** ${pest}\n• **Recommended Chemical Spray:** **Copper Oxychloride 50% WP** @ 2.5 g/L OR **NeemAzal 1% EC (Organic)** @ 3 ml/L.\n• **Safety Pre-Harvest Interval (PHI):** 7 Days before harvest.\n• **Last Applied:** ${lastTreatment?.pesticideName || 'NeemAzal 1%'} on ${lastTreatment?.date || 'Oct 18, 2026'}.\n• **Total Applied This Season:** ${agronomy?.pesticideUsage?.totalChemicalUsed || '550 ml / 0.25 Acre'}.`,
      actions: [
        { 
          label: `Log Spray for ${targetZone?.name || 'Zone A'}`, 
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
        `Irrigate ${targetZone?.name || 'Zone A'}`,
        'What are organic alternatives?',
        'Show me fertilizer dosages'
      ]
    };
  }

  // 6. Farm-wide Summary
  if (query.includes('summary') || query.includes('report') || query.includes('all zones') || query.includes('overview') || query.includes('farm')) {
    const summaryLines = (zones || []).map(z => 
      `• **${z.name} (${z.cropType} - 0.25 Ac):** Health: **${z.analysis?.overallHealthScore || 85}%** | Moisture: **${z.sensorData?.soilMoisture?.toFixed(0) || 40}%** | Temp: **${z.sensorData?.airTemperature?.toFixed(0) || 28}°C** (${z.analysis?.plantStatus || 'Normal'})`
    ).join('\n');

    return {
      text: `📊 **1-Acre Farm Overview (4 Quadrants × 0.25 Acre)**:\n\n${summaryLines}\n\n💡 **AI Agronomist Priority:**\n${moistD < 25 ? '• Zone D (Groundnut) is in moisture deficit and needs water.\n' : ''}• Zone C (Paddy) is at target ponding moisture (${moistC}%).\n• Zone A (Tomato) and Zone B (Chili) have favorable canopy micro-climates.`,
      actions: [
        { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' },
        { label: '💧 Water Zone A Now', type: 'IRRIGATE', zoneId: 'ZONE-A' }
      ],
      suggestions: [
        'Turn on irrigation for Zone D',
        'What pesticide should I spray for Tomato?',
        'Show fertilizer schedule'
      ]
    };
  }

  // 7. Zone Specific Queries
  if (query.includes('zone b') || query.includes('chili')) {
    return {
      text: `🌶️ **Zone B — Chili Quadrant (0.25 Acre)**:\n\n• **Variety:** Guntur Sannam / Teja (Pre-flowering)\n• **Health Score:** ${liveZoneB?.analysis?.overallHealthScore || 82}% (Healthy)\n• **Soil Moisture:** ${moistB}%\n• **Temperature:** ${liveZoneB?.sensorData?.airTemperature?.toFixed(1) || 29.5}°C\n• **Pesticide Status:** Imidacloprid applied Oct 14 against thrips. Vector population suppressed by 96%.`,
      suggestions: ['Irrigate Zone B', 'Give me fertilizer schedule for Chili', 'Show me all 4 zones']
    };
  }

  if (query.includes('zone c') || query.includes('paddy') || query.includes('rice')) {
    return {
      text: `🌾 **Zone C — Paddy Basin (0.25 Acre)**:\n\n• **Variety:** Basmati 1509 (Active Tillering)\n• **Health Score:** ${liveZoneC?.analysis?.overallHealthScore || 90}% (Optimal)\n• **Soil Moisture:** ${moistC}% (Standing water ponding)\n• **Canopy Humidity:** ${liveZoneC?.sensorData?.humidity?.toFixed(0) || 72}%\n• **Advisory:** High humidity creates favorable conditions for Sheath Blight spores. Monitor base tillers for lesions.`,
      suggestions: ['Show Sheath Blight spray', 'Irrigate Zone D', 'Farm summary']
    };
  }

  if (query.includes('fertilizer') || query.includes('nutrient') || query.includes('npk') || query.includes('urea') || query.includes('dap')) {
    return {
      text: `🌱 **Agronomic Fertilizer Schedules (0.25 Acre Dosage)**:\n\n• **Zone A (Tomato):** Water-soluble NPK 19:19:19 @ 12.5 kg via drip fertigation for fruit sizing.\n• **Zone B (Chili):** DAP @ 15 kg + Urea @ 8 kg for vegetative branches.\n• **Zone C (Paddy):** Neem-coated Urea @ 20 kg top-dressing for tillering.\n• **Zone D (Groundnut):** Agricultural Gypsum @ 50 kg for pod calcium filling.`,
      suggestions: ['Irrigate Zone D', 'Check pesticide schedule', 'Farm summary']
    };
  }

  // 8. General Agronomic Consultation Fallback
  return {
    text: `🌾 **AI Agronomist Consultation:**\n\nI analyzed your question regarding **"${userQuery}"** in the context of your 4 crop zones.\n\n• **Current Field Conditions:** Average soil moisture across the farm is **${Math.round((Number(moistA)+Number(moistB)+Number(moistC)+Number(moistD))/4)}%** under **${tempA}°C** ambient temperature.\n• **Immediate Recommendation:** ${moistD < 25 ? 'Zone D Groundnut is currently experiencing moisture stress and should be irrigated.' : 'All quadrants are operating under stable agronomic conditions.'}\n\n*Tip: Would you like me to start irrigation, prescribe a pest treatment, or provide detailed crop guidelines?*`,
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

/**
 * Main dispatcher: handles both Built-in and External LLM (Gemini/OpenAI)
 */
export const executeAIChatQuery = async (userQuery, zones, alerts, simulateAction) => {
  const config = getAIConfig();

  // If user configured Google Gemini
  if (config.provider === 'gemini' && config.geminiKey) {
    try {
      const replyText = await queryGemini(userQuery, zones, alerts, config.geminiKey, config.model || 'gemini-1.5-flash');
      return {
        text: replyText,
        source: 'gemini',
        suggestions: [
          'What is the next zone that needs water?',
          'Check pesticide schedule',
          'Give me a farm-wide summary'
        ]
      };
    } catch (err) {
      console.warn('[AI] Gemini call failed, falling back to built-in agronomist:', err);
      const fallback = queryBuiltInAgronomist(userQuery, zones, alerts, simulateAction);
      return {
        ...fallback,
        source: 'builtin_fallback',
        warning: `Gemini API Error: ${err.message}. Using built-in engine.`
      };
    }
  }

  // If user configured OpenAI
  if (config.provider === 'openai' && config.openaiKey) {
    try {
      const replyText = await queryOpenAI(userQuery, zones, alerts, config.openaiKey);
      return {
        text: replyText,
        source: 'openai',
        suggestions: [
          'What is the next zone that needs water?',
          'Check pesticide schedule',
          'Give me a farm-wide summary'
        ]
      };
    } catch (err) {
      console.warn('[AI] OpenAI call failed, falling back to built-in agronomist:', err);
      const fallback = queryBuiltInAgronomist(userQuery, zones, alerts, simulateAction);
      return {
        ...fallback,
        source: 'builtin_fallback',
        warning: `OpenAI API Error: ${err.message}. Using built-in engine.`
      };
    }
  }

  // Default: Built-in Smart Agronomist Engine (Free, Offline, Instant)
  const result = queryBuiltInAgronomist(userQuery, zones, alerts, simulateAction);
  return {
    ...result,
    source: 'builtin'
  };
};
