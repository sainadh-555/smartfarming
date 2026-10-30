/**
 * SmartFarm AI™ — Hybrid AI Chat Service
 * Supports:
 * 1. Built-in Smart Agronomist (100% Free, Zero Setup, Offline, Dynamic Farm Rules)
 * 2. Groq Cloud API (Free API Key from console.groq.com: Llama 3.3 70B, Llama 3.1 8B, Mixtral)
 * 3. Google Gemini API (Free API Key from Google AI Studio: gemini-1.5-flash / gemini-2.0-flash)
 * 4. OpenAI API (GPT-4o / GPT-4o-mini / GPT-3.5)
 */

export const getAIConfig = () => {
  // Check URL hash/query on page load for one-click direct activation
  if (typeof window !== 'undefined') {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
      const searchParams = new URLSearchParams(window.location.search);
      const urlGroqKey = hashParams.get('groqKey') || searchParams.get('groqKey');
      if (urlGroqKey && urlGroqKey.startsWith('gsk_')) {
        localStorage.setItem('smartfarm_groq_key', urlGroqKey.trim());
        localStorage.setItem('smartfarm_ai_provider', 'groq');
        // Clean URL to prevent key staying in browser history
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // ignore
    }
  }

  const envGroqKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || '';
  const envGeminiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const envOpenAIKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY) || '';

  const savedProvider = localStorage.getItem('smartfarm_ai_provider');
  const storedGroq = localStorage.getItem('smartfarm_groq_key');
  const groqKey = (storedGroq !== null && storedGroq !== '') ? storedGroq.trim() : (envGroqKey ? envGroqKey.trim() : '');

  let provider = savedProvider;
  if (!provider || provider === 'builtin') {
    provider = groqKey ? 'groq' : 'builtin';
  }

  return {
    provider: provider, // 'builtin' | 'groq' | 'gemini' | 'openai'
    groqKey: groqKey,
    groqModel: localStorage.getItem('smartfarm_groq_model') || 'qwen/qwen3.8-27b',
    geminiKey: localStorage.getItem('smartfarm_gemini_key') || envGeminiKey,
    geminiModel: localStorage.getItem('smartfarm_gemini_model') || 'gemini-1.5-flash',
    openaiKey: localStorage.getItem('smartfarm_openai_key') || envOpenAIKey,
    model: localStorage.getItem('smartfarm_gemini_model') || 'gemini-1.5-flash'
  };
};

export const saveAIConfig = (config) => {
  if (config.provider) localStorage.setItem('smartfarm_ai_provider', config.provider);
  if (config.groqKey !== undefined) localStorage.setItem('smartfarm_groq_key', config.groqKey.trim());
  if (config.groqModel) localStorage.setItem('smartfarm_groq_model', config.groqModel);
  if (config.geminiKey !== undefined) localStorage.setItem('smartfarm_gemini_key', config.geminiKey.trim());
  if (config.geminiModel) localStorage.setItem('smartfarm_gemini_model', config.geminiModel);
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
export const testAIConnection = async (provider, apiKey, model) => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key is required.' };
  }

  const cleanKey = apiKey.trim();

  // 1. Groq Cloud Test
  if (provider === 'groq') {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${cleanKey}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${res.status}: Invalid Groq API key` };
      }

      const activeModel = model || 'qwen/qwen3.8-27b';
      return { success: true, message: `Connected successfully to Groq Cloud (${activeModel})!` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error reaching Groq API' };
    }
  }

  // 2. Google Gemini Test
  if (provider === 'gemini') {
    const targetModel = model || 'gemini-1.5-flash';
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;
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

      return { success: true, message: `Connected successfully to Google ${targetModel}!` };
    } catch (err) {
      return { success: false, error: err.message || 'Network error reaching Google Gemini API' };
    }
  }

  // 3. OpenAI Test
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
 * Query Groq Cloud API (Qwen 27B / GPT-OSS 120B / Llama)
 */
const queryGroq = async (prompt, zones, alerts, apiKey, model = 'qwen/qwen3.8-27b') => {
  const systemPrompt = buildFarmSystemPrompt(zones, alerts);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'qwen/qwen3.8-27b',
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
    throw new Error(errorData.error?.message || `Groq API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq API');

  return text;
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

  // 1. Natural Conversational Greetings
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
      text: `🤖 **About SmartFarm AI Copilot:**\n\nI am your automated precision agriculture assistant connected to your farm's ESP32 hardware and agro-climatic decision engine. I can:\n\n• 💧 **Control Irrigation:** Remotely open drip valves when soil dries below optimal thresholds\n• 🧪 **Prescribe Treatments:** Recommend organic and IPM-certified pesticides for pests (blight, thrips, blast)\n• 📈 **Live Telemetry:** Report live temperature, moisture, and humidity from your ESP32 nodes\n• 🌿 **Crop Schedules:** Provide NPK fertilizer and harvest timing guidelines\n\n*Tip: You can use the built-in AI for free, or link a Groq Cloud or Google Gemini API Key in AI Settings for unrestricted natural language chat.*`,
      suggestions: [
        'Give me a farm-wide summary',
        'Irrigate Zone D',
        'Show me pesticide plan for Tomato'
      ]
    };
  }

  // 4. Irrigation Commands
  if (query.includes('irrigate') || query.includes('water') || query.includes('drip')) {
    let targetZone = 'ZONE-D';
    if (query.includes('zone a') || query.includes('tomato')) targetZone = 'ZONE-A';
    else if (query.includes('zone b') || query.includes('chili')) targetZone = 'ZONE-B';
    else if (query.includes('zone c') || query.includes('paddy')) targetZone = 'ZONE-C';

    const z = zones?.find(item => item.zoneId === targetZone) || liveZoneD;

    return {
      text: `💧 **Irrigation Recommendation for ${z?.name || targetZone}:**\n\n• Current soil moisture is **${z?.sensorData?.soilMoisture?.toFixed(1) || '15.0'}%**.\n• Optimal target: **45% – 60%**.\n\nI have prepared the drip valve dispatch command. Click below to execute.`,
      actions: [
        { label: `💧 Confirm Water ${z?.name || targetZone} Now`, type: 'IRRIGATE', zoneId: targetZone }
      ],
      suggestions: [
        'What is the status of Zone B Chili?',
        'Give me a farm-wide summary'
      ]
    };
  }

  // 5. Pesticide & Disease Guidelines
  if (query.includes('pesticide') || query.includes('spray') || query.includes('disease') || query.includes('fungus')) {
    return {
      text: `🧪 **Integrated Pest Management (IPM) Advisory:**\n\n• **Zone A (Tomato):** Watch for *Early Blight (Alternaria solani)*. Recommend: **Neem Oil 0.5% (Bio)** or **Chlorothalonil 75 WP @ 2g/L**.\n• **Zone B (Chili):** Watch for *Chili Thrips*. Recommend: **Spinosad 45 SC @ 0.3ml/L**.\n• **Zone C (Paddy):** Leaf blast prevention. Recommend: **Tricyclazole 75 WP @ 0.6g/L**.\n\nAll recommendations comply with GlobalG.A.P. harvest safety intervals (PHI).`,
      actions: [
        { label: '🧪 Prescribe Bio-Pesticide for Tomato', type: 'SPRAY', zoneId: 'ZONE-A' }
      ],
      suggestions: [
        'Turn on irrigation for Zone D',
        'Give me a farm-wide summary'
      ]
    };
  }

  // 6. Farm-wide Overview
  if (query.includes('summary') || query.includes('status') || query.includes('overview') || query.includes('farm')) {
    return {
      text: `📊 **SmartFarm 1-Acre Telemetry Summary:**\n\n• **Zone A (Tomato, 0.25 Ac):** Moisture **${moistA}%** | Temp **${tempA}°C** (Healthy)\n• **Zone B (Chili, 0.25 Ac):** Moisture **${moistB}%** (Optimal vegetative)\n• **Zone C (Paddy, 0.25 Ac):** Moisture **${moistC}%** (Flooded panicle stage)\n• **Zone D (Groundnut, 0.25 Ac):** Moisture **${moistD}%** ⚠️ (Dry, drip advised)\n\n• **Active Alerts:** ${alerts?.filter(a => !a.resolved).length || 0} alerts pending.`,
      actions: [
        { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' }
      ],
      suggestions: [
        'Show me pesticide plan for Tomato',
        'Turn on irrigation for Zone D'
      ]
    };
  }

  // 7. General Fallback
  return {
    text: `🌾 **AI Agronomist Consultation:**\n\nRegarding: *"__${userQuery}__"*\n\nBased on your 1-Acre telemetry:\n• Primary limiting factor: **Soil moisture deficit in Zone D (${moistD}%)** and **Zone A (${moistA}%)**.\n• Current weather conditions are warm (${tempA}°C), which increases crop water loss.\n\nWould you like me to trigger drip irrigation, review pesticide guidelines, or inspect sensor nodes?`,
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
 * Main AI Query Dispatcher
 * Automatically tries selected provider (Groq, Gemini, OpenAI) and gracefully falls back to built-in.
 */
export const executeAIChatQuery = async (query, zones, alerts, simulateAction) => {
  const config = getAIConfig();

  // 1. Groq Cloud Engine
  if (config.provider === 'groq' && config.groqKey) {
    try {
      const text = await queryGroq(query, zones, alerts, config.groqKey, config.groqModel);
      return {
        text,
        source: 'groq',
        model: config.groqModel || 'qwen/qwen3.8-27b',
        actions: query.toLowerCase().includes('irrigate') ? [
          { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' }
        ] : []
      };
    } catch (err) {
      console.warn('Groq query failed, falling back to built-in:', err);
      const fallback = queryBuiltInAgronomist(query, zones, alerts, simulateAction);
      return {
        ...fallback,
        source: 'builtin',
        warning: `Groq Cloud notice: ${err.message}. Showing response from built-in Farm AI.`
      };
    }
  }

  // 2. Google Gemini Engine
  if (config.provider === 'gemini' && config.geminiKey) {
    try {
      const text = await queryGemini(query, zones, alerts, config.geminiKey, config.geminiModel || config.model);
      return {
        text,
        source: 'gemini',
        model: config.geminiModel || config.model,
        actions: query.toLowerCase().includes('irrigate') ? [
          { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' }
        ] : []
      };
    } catch (err) {
      console.warn('Gemini query failed, falling back to built-in:', err);
      const fallback = queryBuiltInAgronomist(query, zones, alerts, simulateAction);
      return {
        ...fallback,
        source: 'builtin',
        warning: `Google Gemini notice: ${err.message}. Showing response from built-in Farm AI.`
      };
    }
  }

  // 3. OpenAI Engine
  if (config.provider === 'openai' && config.openaiKey) {
    try {
      const text = await queryOpenAI(query, zones, alerts, config.openaiKey);
      return {
        text,
        source: 'openai',
        model: 'gpt-4o-mini',
        actions: query.toLowerCase().includes('irrigate') ? [
          { label: '💧 Water Zone D Now', type: 'IRRIGATE', zoneId: 'ZONE-D' }
        ] : []
      };
    } catch (err) {
      console.warn('OpenAI query failed, falling back to built-in:', err);
      const fallback = queryBuiltInAgronomist(query, zones, alerts, simulateAction);
      return {
        ...fallback,
        source: 'builtin',
        warning: `OpenAI notice: ${err.message}. Showing response from built-in Farm AI.`
      };
    }
  }

  // 4. Default: Built-in Agronomist Engine (100% Free, Offline)
  const result = queryBuiltInAgronomist(query, zones, alerts, simulateAction);
  return {
    ...result,
    source: 'builtin'
  };
};
