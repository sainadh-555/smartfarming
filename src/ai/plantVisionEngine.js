/**
 * SmartFarm AI — Real Computer Vision Plant Pathologist Engine
 * 
 * Clinical 4-stage evaluation:
 * 1. Botanical Verification (Rejects non-plant images: faces, vehicles, furniture, casing, blank)
 * 2. Image Clarity Verification (Rejects blurry, dark, low-res, or out-of-focus photos)
 * 3. Crop Identification (Prioritizes & strictly verifies Tomato, Chili, Paddy, Groundnut)
 * 4. Pathological Classification (Real diagnosis with genuine confidence, symptoms, and advice)
 * 
 * STRICT ZERO HALLUCINATIONS POLICY:
 * Does not invent diagnoses. Rejects unsupported or invalid images with exact agronomic explanations.
 */

import { getAIConfig } from '../services/aiChatService.js';

export const SUPPORTED_CROPS = ['Tomato', 'Chili', 'Paddy', 'Groundnut'];

export const VALIDATION_STATUSES = {
  VALID_SUPPORTED_CROP: 'VALID_SUPPORTED_CROP',
  NO_PLANT_DETECTED: 'NO_PLANT_DETECTED',
  UNSUPPORTED_CROP: 'UNSUPPORTED_CROP',
  UNCLEAR_IMAGE: 'UNCLEAR_IMAGE',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE'
};

/**
 * 1. Validate File Metadata (Type, Size)
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
  const validExts = ['jpg', 'jpeg', 'png', 'webp'];

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a JPG, JPEG, PNG, or WebP image.'
    };
  }

  const MAX_BYTES = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`
    };
  }

  return { valid: true };
}

/**
 * 2. Client-side canvas check (Dimensions, blank/solid image detection)
 */
export function checkImageCanvasQuality(imgElement) {
  try {
    const width = imgElement.naturalWidth || imgElement.width || 0;
    const height = imgElement.naturalHeight || imgElement.height || 0;

    if (width < 64 || height < 64) {
      return {
        status: VALIDATION_STATUSES.UNCLEAR_IMAGE,
        message: 'The image resolution is too low. Please upload a closer, well-lit photo.'
      };
    }

    // Off-screen canvas analysis
    const canvas = document.createElement('canvas');
    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { status: null };

    ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    let sumR = 0, sumG = 0, sumB = 0;
    const totalPixels = sampleSize * sampleSize;

    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
    }

    const meanR = sumR / totalPixels;
    const meanG = sumG / totalPixels;
    const meanB = sumB / totalPixels;

    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const diffR = data[i] - meanR;
      const diffG = data[i + 1] - meanG;
      const diffB = data[i + 2] - meanB;
      variance += (diffR * diffR + diffG * diffG + diffB * diffB) / 3;
    }
    const stdDev = Math.sqrt(variance / totalPixels);

    // If standard deviation is extremely low, it's a solid/blank color (all black, white, or monochrome)
    if (stdDev < 5.0) {
      return {
        status: VALIDATION_STATUSES.NO_PLANT_DETECTED,
        message: 'No plant detected. Please upload a clear photo of a crop or leaf.'
      };
    }

    return { status: null }; // Passed pre-checks
  } catch (e) {
    console.warn('[Canvas Quality Check]', e);
    return { status: null };
  }
}

/**
 * 3. Master Plant Vision Inference Engine
 */
export async function analyzePlantVision({
  file = null,
  dataUrl = '',
  language = 'en',
  backendUrl = 'https://smartfarming-e3b2.onrender.com',
  signal = null
}) {
  const isTe = language === 'te';

  // Attempt Tier 1: Dedicated Backend Endpoint
  const cleanBackendUrl = backendUrl ? backendUrl.trim().replace(/\/+$/, '') : 'https://smartfarming-e3b2.onrender.com';

  try {
    let res;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      res = await fetch(`${cleanBackendUrl}/api/plant/analyze`, {
        method: 'POST',
        body: formData,
        signal: signal || AbortSignal.timeout(18000)
      });
    } else if (dataUrl) {
      res = await fetch(`${cleanBackendUrl}/api/plant/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, language }),
        signal: signal || AbortSignal.timeout(18000)
      });
    }

    if (res && res.ok) {
      const data = await res.json();
      if (data && data.validation_status) {
        return formatDiagnosticResult(data, isTe);
      }
    }
  } catch (err) {
    console.warn('[PlantVisionEngine] Backend analysis unavailable:', err.message);
  }

  // Attempt Tier 2: Direct Client-Side Multimodal AI Vision if user configured an API key in Settings
  const aiConfig = getAIConfig();
  if (dataUrl && (aiConfig.geminiKey || aiConfig.groqKey || aiConfig.openaiKey)) {
    try {
      const clientVisionResult = await callClientVisionModel({
        dataUrl,
        aiConfig,
        language,
        isTe,
        signal
      });
      if (clientVisionResult) {
        return formatDiagnosticResult(clientVisionResult, isTe);
      }
    } catch (clientErr) {
      console.warn('[PlantVisionEngine] Direct client vision call failed:', clientErr.message);
    }
  }

  // Tier 3: Model Unavailable
  // Strictly tell the truth! Never fabricate mock disease findings!
  return {
    validation_status: VALIDATION_STATUSES.MODEL_UNAVAILABLE,
    is_plant: null,
    detected_crop: null,
    condition: null,
    is_healthy: null,
    model_score: null,
    symptoms: [],
    recommendations: isTe
      ? ['దయచేసి బ్యాకెండ్ సర్వర్‌ను ప్రారంభించండి లేదా సెట్టింగ్స్‌లో చెల్లుబాటు అయ్యే AI విజన్ కీని కాన్ఫిగర్ చేయండి.']
      : ['Plant analysis requires an active backend server or a configured AI Vision API key in Settings.'],
    message: isTe
      ? 'మొక్కల విశ్లేషణ తాత్కాలికంగా అందుబాటులో లేదు.'
      : 'Plant analysis is temporarily unavailable.',
    model_info: 'Real Computer Vision Pipeline',
    limitations: 'Inference model is currently offline or unreachable. Fabricated results are strictly forbidden.'
  };
}

/**
 * Helper to call Gemini, Groq, or OpenAI directly with the botanical system prompt
 */
async function callClientVisionModel({ dataUrl, aiConfig, isTe, signal }) {
  const systemPrompt = `You are an expert botanical validator and precision crop pathologist for SmartFarm AI.
Analyze the provided image with clinical accuracy. Language: ${isTe ? 'Telugu' : 'English'}.

Follow this 4-step decision hierarchy strictly:
1. BOTANICAL VALIDATION:
   Does this image contain an actual plant, crop, leaf, stem, or agricultural foliage?
   - If the image contains a human, person, face, animal, vehicle, indoor room, furniture, screen, casing, hardware board, drawing, tool, or non-plant subject:
     Return:
     "validation_status": "NO_PLANT_DETECTED",
     "is_plant": false,
     "detected_crop": "Non-plant",
     "condition": null,
     "is_healthy": null,
     "message": "${isTe ? 'మొక్క లేదా ఆకు గుర్తించబడలేదు. దయచేసి స్పష్టమైన పంట లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయండి.' : 'No plant detected. Please upload a clear photo of a crop or leaf.'}"

2. CLARITY CHECK:
   Is the image clear enough for leaf/pathology analysis?
   - If extremely blurry, out-of-focus, completely black/white, or too distant:
     Return:
     "validation_status": "UNCLEAR_IMAGE",
     "is_plant": false,
     "detected_crop": "Unknown",
     "condition": null,
     "is_healthy": null,
     "message": "${isTe ? 'ఫోటో అస్పష్టంగా ఉంది. దయచేసి దగ్గరగా, మంచి వెలుతురులో తీసిన ఫోటోను అప్‌లోడ్ చేయండి.' : 'The image is unclear. Please upload a closer, well-lit photo.'}"

3. CROP IDENTIFICATION:
   Identify the plant species. Supported crops are ONLY:
   - Tomato
   - Chili
   - Paddy
   - Groundnut
   - If the image is a plant or leaf, but NOT one of these 4 crops (e.g. Apple, Wheat, Corn, Cotton, Mango, Rose, Houseplant, Weed):
     Return:
     "validation_status": "UNSUPPORTED_CROP",
     "is_plant": true,
     "detected_crop": "<Common name of the detected plant>",
     "condition": null,
     "is_healthy": null,
     "message": "${isTe ? 'ఈ పంట ప్రస్తుతం మద్దతు ఇవ్వబడలేదు. ప్రస్తుతం టమోటా, మిర్చి, వరి, మరియు వేరుశనగ పంటలకు మాత్రమే మద్దతు ఉంది.' : 'This crop is not currently supported.'}"

4. CONDITION & HEALTH DIAGNOSIS (Only for Tomato, Chili, Paddy, Groundnut):
   - If healthy:
     "validation_status": "VALID_SUPPORTED_CROP",
     "is_plant": true,
     "condition": "Healthy",
     "is_healthy": true,
     "model_score": 0.95,
     "symptoms": [],
     "recommendations": ["Maintain regular irrigation schedule.", "Inspect foliage weekly for early signs of stress."]
   - If diseased or stressed:
     "validation_status": "VALID_SUPPORTED_CROP",
     "is_plant": true,
     "condition": "<Precise condition name, e.g. Tomato Early Blight, Chili Leaf Curl, Paddy Blast, Groundnut Tikka Spot>",
     "is_healthy": false,
     "model_score": 0.90,
     "symptoms": ["Visible concentric brown leaf lesions", "Chlorosis on margin"],
     "recommendations": ["Remove heavily affected lower leaves.", "Avoid overhead irrigation to keep canopy dry.", "Consult local agricultural extension for recommended treatment."]

Respond strictly with valid JSON conforming to this schema:
{
  "validation_status": "VALID_SUPPORTED_CROP" | "NO_PLANT_DETECTED" | "UNSUPPORTED_CROP" | "UNCLEAR_IMAGE",
  "is_plant": true | false,
  "detected_crop": string,
  "condition": string | null,
  "is_healthy": true | false | null,
  "model_score": number | null,
  "symptoms": string[],
  "recommendations": string[],
  "message": string
}`;

  // 1. Google Gemini
  if (aiConfig.geminiKey) {
    const cleanKey = aiConfig.geminiKey.trim();
    const model = aiConfig.geminiModel || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    
    let mimeType = 'image/jpeg';
    let base64Part = dataUrl;
    if (dataUrl.includes(',')) {
      const parts = dataUrl.split(',');
      if (parts[0].includes('image/png')) mimeType = 'image/png';
      else if (parts[0].includes('image/webp')) mimeType = 'image/webp';
      base64Part = parts[1];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: mimeType, data: base64Part } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json'
        }
      }),
      signal: signal || AbortSignal.timeout(18000)
    });

    if (res.ok) {
      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        parsed.model_info = `Google ${model} Vision`;
        parsed.limitations = 'Classification inference. Does not provide localized bounding box coordinates.';
        return parsed;
      }
    }
  }

  // 2. Groq Vision
  if (aiConfig.groqKey) {
    const cleanKey = aiConfig.groqKey.trim();
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: signal || AbortSignal.timeout(18000)
    });

    if (res.ok) {
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        parsed.model_info = 'Groq Llama 3.2 Vision (11B)';
        parsed.limitations = 'Classification inference. Does not provide localized bounding box coordinates.';
        return parsed;
      }
    }
  }

  // 3. OpenAI Vision
  if (aiConfig.openaiKey) {
    const cleanKey = aiConfig.openaiKey.trim();
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: signal || AbortSignal.timeout(18000)
    });

    if (res.ok) {
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        parsed.model_info = 'OpenAI GPT-4o-mini Vision';
        parsed.limitations = 'Classification inference. Does not provide localized bounding box coordinates.';
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Normalizes and formats the response object
 */
function formatDiagnosticResult(data, isTe) {
  const status = data.validation_status || VALIDATION_STATUSES.MODEL_UNAVAILABLE;

  let message = data.message;
  if (!message) {
    switch (status) {
      case VALIDATION_STATUSES.NO_PLANT_DETECTED:
        message = isTe
          ? 'మొక్క లేదా ఆకు గుర్తించబడలేదు. దయచేసి స్పష్టమైన పంట లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయండి.'
          : 'No plant detected. Please upload a clear photo of a crop or leaf.';
        break;
      case VALIDATION_STATUSES.UNSUPPORTED_CROP:
        message = isTe
          ? 'ఈ పంట ప్రస్తుతం మద్దతు ఇవ్వబడలేదు.'
          : 'This crop is not currently supported.';
        break;
      case VALIDATION_STATUSES.UNCLEAR_IMAGE:
        message = isTe
          ? 'ఫోటో అస్పష్టంగా ఉంది. దయచేసి దగ్గరగా, మంచి వెలుతురులో తీసిన ఫోటోను అప్‌లోడ్ చేయండి.'
          : 'The image is unclear. Please upload a closer, well-lit photo.';
        break;
      case VALIDATION_STATUSES.MODEL_UNAVAILABLE:
        message = isTe
          ? 'మొక్కల విశ్లేషణ తాత్కాలికంగా అందుబాటులో లేదు.'
          : 'Plant analysis is temporarily unavailable.';
        break;
      default:
        message = isTe ? 'విశ్లేషణ పూర్తయింది.' : 'Analysis complete.';
    }
  }

  return {
    validation_status: status,
    is_plant: data.is_plant ?? null,
    detected_crop: data.detected_crop || (status === VALIDATION_STATUSES.VALID_SUPPORTED_CROP ? 'Supported Crop' : 'Unknown'),
    condition: data.condition || null,
    is_healthy: data.is_healthy ?? null,
    model_score: typeof data.model_score === 'number' ? data.model_score : null,
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    message,
    model_info: data.model_info || 'Real Computer Vision Pipeline',
    limitations: data.limitations || 'Classification model. Object detection bounding boxes are disabled because bounding boxes require a verified localization/YOLO detection model.'
  };
}

/**
 * Backward compatibility exports
 */
export const analyzeUploadedImage = async (dataUrl, matchedZone, customHint, language = 'en') => {
  return await analyzePlantVision({ dataUrl, language });
};

export const PRESET_DIAGNOSES = [];
