/**
 * AI/ML Plant Vision Inference Engine (EPPO & GlobalG.A.P. Standard)
 * Simulates YOLOv8 & ResNet-50 Deep Learning inference for precision crop diagnostics,
 * object detection bounding boxes, EPPO global pathogen codes, and ESP32 telemetry correlation.
 */

export const PRESET_DIAGNOSES = [
  {
    id: 'sample-tomato-blight',
    cropName: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    zoneId: 'ZONE-A',
    image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=800&q=80',
    title: 'Tomato Early Blight (Alternaria solani)',
    eppoCode: 'ALTESO',
    fracIracCode: 'FRAC M01 (Inorganic Copper) / FRAC 11 (QoI)',
    whoClass: 'WHO Class III (Slightly Hazardous)',
    mrlStatus: 'MRL Safe (Codex Standard 0.5 mg/kg)',
    model: 'YOLOv8x-PlantDisease + ResNet50 Classifier (EPPO Taxonomy)',
    confidence: 96.8,
    severity: 'Moderate',
    healthScore: 54,
    status: 'Attention',
    affectedArea: '14.2% leaf surface',
    growthStage: 'Flowering & Early Fruit Set (Day 48)',
    esp32Data: {
      deviceId: 'ESP32-CAM-01',
      zoneName: 'Zone A',
      airTemp: 34.0,
      humidity: 72.0,
      soilMoisture: 28.0,
      soilPH: 6.5,
      lightIntensity: 850
    },
    correlationAnalysis: 'High canopy humidity (72%) combined with elevated daytime temperature (34°C) created favorable incubation conditions for Alternaria spores over the last 48 hours.',
    detections: [
      { label: 'Early Blight Lesion (ALTESO)', confidence: 97.2, x: 25, y: 35, width: 28, height: 26, color: '#ef4444' },
      { label: 'Leaf Margin Necrosis', confidence: 91.5, x: 58, y: 48, width: 22, height: 20, color: '#f59e0b' },
      { label: 'Healthy Fruit Tissue', confidence: 98.4, x: 38, y: 65, width: 32, height: 28, color: '#10b981' }
    ],
    prescription: {
      chemical: 'Copper Oxychloride 50% WP',
      dosage: '2.5 g / Liter of water (Foliar spray)',
      organicOption: 'NeemAzal-T/S (Azadirachtin 1% EC) @ 3 ml / L',
      fertilizer: 'Foliar Potassium Nitrate (13:0:45) @ 4g/L to strengthen leaf epidermis',
      phi: '7 Days safety interval (GlobalG.A.P. Certified)',
      culturalPractice: 'Prune lower leaves touching soil; maintain drip irrigation without splashing foliage.'
    }
  },
  {
    id: 'sample-chili-thrips',
    cropName: 'Chili',
    scientificName: 'Capsicum annuum',
    zoneId: 'ZONE-B',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
    title: 'Chili Leaf Curl & Thrips Infestation',
    eppoCode: 'THRPSP',
    fracIracCode: 'IRAC 4A (Neonicotinoids) / IRAC 5 (Spinosyns)',
    whoClass: 'WHO Class II/III (Moderately Hazardous)',
    mrlStatus: 'MRL Safe (Codex Standard 0.05 mg/kg)',
    model: 'YOLOv8-PestDetector (EPPO Standard)',
    confidence: 94.2,
    severity: 'Mild to Moderate',
    healthScore: 78,
    status: 'Attention',
    affectedArea: '8.5% canopy area',
    growthStage: 'Vegetative & Pre-Flowering (Day 35)',
    esp32Data: {
      deviceId: 'ESP32-CAM-02',
      zoneName: 'Zone B',
      airTemp: 29.5,
      humidity: 55.0,
      soilMoisture: 35.0,
      soilPH: 6.8,
      lightIntensity: 780
    },
    correlationAnalysis: 'Dry warm weather (29.5°C, 55% RH) accelerated thrips reproduction cycle. Moderate vector activity detected on fresh shoot tips.',
    detections: [
      { label: 'Thrips Upward Leaf Curl (THRPSP)', confidence: 95.1, x: 30, y: 22, width: 35, height: 32, color: '#f59e0b' },
      { label: 'Healthy Shoot Bud', confidence: 92.0, x: 62, y: 55, width: 25, height: 24, color: '#10b981' }
    ],
    prescription: {
      chemical: 'Imidacloprid 17.8% SL',
      dosage: '0.5 ml / Liter of water (Ultra-low volume foliar spray)',
      organicOption: 'Pongamia oil extract + Lecanicillium lecanii bio-agent',
      fertilizer: 'Zinc Sulphate (0.2%) micronutrient spray to restore leaf vigor',
      phi: '5 Days safety interval',
      culturalPractice: 'Install yellow sticky traps (15 traps / 0.25 acre) around quadrant borders.'
    }
  },
  {
    id: 'sample-paddy-blast',
    cropName: 'Paddy',
    scientificName: 'Oryza sativa',
    zoneId: 'ZONE-C',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    title: 'Paddy Sheath & Leaf Blast (Magnaporthe oryzae)',
    eppoCode: 'PYRIOR',
    fracIracCode: 'FRAC 16.1 (Melanin Biosynthesis Inhibitor)',
    whoClass: 'WHO Class U (Unlikely to present acute hazard)',
    mrlStatus: 'MRL Safe (Codex Standard 0.1 mg/kg)',
    model: 'ResNet50-GrainVision (IRRI & FAO Standard)',
    confidence: 95.5,
    severity: 'Minimal',
    healthScore: 88,
    status: 'Healthy',
    affectedArea: '3.1% tiller area',
    growthStage: 'Active Tillering (Day 40)',
    esp32Data: {
      deviceId: 'ESP32-CAM-03',
      zoneName: 'Zone C',
      airTemp: 26.0,
      humidity: 82.0,
      soilMoisture: 75.0,
      soilPH: 6.2,
      lightIntensity: 650
    },
    correlationAnalysis: 'Paddy flood moisture (75%) and morning mist humidity (82%) elevated blast risk. Canopy vigor remains high with negligible lesion spread.',
    detections: [
      { label: 'Minor Spindle Blast Lesion (PYRIOR)', confidence: 92.4, x: 40, y: 38, width: 20, height: 26, color: '#f59e0b' },
      { label: 'Vigorous Tiller Canopy', confidence: 97.9, x: 22, y: 50, width: 55, height: 40, color: '#10b981' }
    ],
    prescription: {
      chemical: 'Tricyclazole 75% WP',
      dosage: '0.6 g / Liter of water',
      organicOption: 'Pseudomonas fluorescens seed and foliar drenching @ 10g/L',
      fertilizer: 'Avoid excess top-dressing Nitrogen; apply Silicon foliar spray (2ml/L)',
      phi: '14 Days safety interval',
      culturalPractice: 'Maintain 3-5 cm standing water level; avoid deep prolonged submersion.'
    }
  },
  {
    id: 'sample-groundnut-tikka',
    cropName: 'Groundnut',
    scientificName: 'Arachis hypogaea',
    zoneId: 'ZONE-D',
    image: 'https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=800&q=80',
    title: 'Groundnut Tikka Leaf Spot & Drought Stress',
    eppoCode: 'CERCAR',
    fracIracCode: 'FRAC 3 (DMI Triazoles) / FRAC M02 (Inorganic Sulfur)',
    whoClass: 'WHO Class III (Slightly Hazardous)',
    mrlStatus: 'MRL Safe (Codex Standard 0.2 mg/kg)',
    model: 'YOLOv8-CanopyStress + CNN Diagnostic',
    confidence: 98.1,
    severity: 'Critical (Drought + Spot)',
    healthScore: 38,
    status: 'Critical',
    affectedArea: '22.8% leaf surface + severe moisture deficit',
    growthStage: 'Pod Development & Pegging (Day 52)',
    esp32Data: {
      deviceId: 'ESP32-CAM-04',
      zoneName: 'Zone D',
      airTemp: 38.0,
      humidity: 42.0,
      soilMoisture: 15.0,
      soilPH: 6.9,
      lightIntensity: 980
    },
    correlationAnalysis: 'CRITICAL LIMITING FACTOR: Soil moisture collapsed to 15% under 38°C midday heat, compromising plant cuticle defenses and accelerating Tikka fungal lesions.',
    detections: [
      { label: 'Tikka Circular Necrosis (CERCAR)', confidence: 97.8, x: 32, y: 28, width: 30, height: 28, color: '#ef4444' },
      { label: 'Thermal Wilting Desiccation', confidence: 98.5, x: 20, y: 52, width: 45, height: 35, color: '#ef4444' },
      { label: 'Surviving Leaflet Area', confidence: 89.2, x: 62, y: 65, width: 25, height: 22, color: '#10b981' }
    ],
    prescription: {
      chemical: 'Hexaconazole 5% EC + Mancozeb 75% WP',
      dosage: 'Mix 2g + 1g in 1L water; spray immediately',
      organicOption: 'Trichoderma soil drenching + 5% Panchagavya spray',
      fertilizer: 'Agricultural Gypsum @ 50 kg / 0.25 acre to nourish peg calcium',
      phi: '10 Days safety interval',
      culturalPractice: 'URGENT: Run drip irrigation for minimum 45 minutes to restore soil moisture above 40%.'
    }
  }
];

/**
 * Simulates analyzing an uploaded image via deep learning vision model.
 */
export const analyzeUploadedImage = (imageDataUrl, matchedZone, customCropHint = '') => {
  let baseTemplate = PRESET_DIAGNOSES[0];
  if (matchedZone?.zoneId === 'ZONE-B' || customCropHint.toLowerCase().includes('chili')) {
    baseTemplate = PRESET_DIAGNOSES[1];
  } else if (matchedZone?.zoneId === 'ZONE-C' || customCropHint.toLowerCase().includes('paddy') || customCropHint.toLowerCase().includes('rice')) {
    baseTemplate = PRESET_DIAGNOSES[2];
  } else if (matchedZone?.zoneId === 'ZONE-D' || customCropHint.toLowerCase().includes('groundnut') || customCropHint.toLowerCase().includes('peanut')) {
    baseTemplate = PRESET_DIAGNOSES[3];
  }

  const sensor = matchedZone?.sensorData || baseTemplate.esp32Data;

  return {
    id: `upload-${Date.now()}`,
    cropName: matchedZone?.cropType || baseTemplate.cropName,
    scientificName: matchedZone?.agronomy?.crop?.scientificName || baseTemplate.scientificName,
    zoneId: matchedZone?.zoneId || baseTemplate.zoneId,
    image: imageDataUrl,
    title: `${matchedZone?.cropType || baseTemplate.cropName} Vision Health Scan`,
    eppoCode: baseTemplate.eppoCode,
    fracIracCode: baseTemplate.fracIracCode,
    whoClass: baseTemplate.whoClass,
    mrlStatus: baseTemplate.mrlStatus,
    model: 'YOLOv8-AgriVision Deep Ensemble (EPPO & GlobalG.A.P. Standard)',
    confidence: (94.0 + Math.random() * 4.5).toFixed(1),
    severity: sensor.soilMoisture < 25 ? 'High Stress' : sensor.soilMoisture < 40 ? 'Moderate' : 'Optimal',
    healthScore: matchedZone?.analysis?.overallHealthScore || baseTemplate.healthScore,
    status: matchedZone?.analysis?.plantStatus || baseTemplate.status,
    affectedArea: `${(5.0 + Math.random() * 12.0).toFixed(1)}% leaf surface`,
    growthStage: matchedZone?.agronomy?.crop?.growthStage || baseTemplate.growthStage,
    esp32Data: {
      deviceId: sensor.deviceId || 'ESP32-CAM-01',
      zoneName: matchedZone?.name || 'Zone A',
      airTemp: sensor.airTemperature || sensor.airTemp || 32.0,
      humidity: sensor.humidity || 55.0,
      soilMoisture: sensor.soilMoisture || 35.0,
      soilPH: sensor.soilPH || 6.5,
      lightIntensity: sensor.lightIntensity || 850
    },
    correlationAnalysis: `ESP32 node telemetry (${sensor.soilMoisture}% moisture, ${sensor.airTemperature}°C ambient) cross-referenced with computer vision feature maps. Pathogen growth index calculated at ${(0.4 + Math.random() * 0.4).toFixed(2)}.`,
    detections: [
      { label: `${matchedZone?.cropType || 'Crop'} Leaf Margin Lesion (${baseTemplate.eppoCode})`, confidence: 95.8, x: 26, y: 30, width: 32, height: 28, color: '#ef4444' },
      { label: 'Chlorophyll Chlorosis', confidence: 91.2, x: 55, y: 46, width: 24, height: 22, color: '#f59e0b' },
      { label: 'Healthy Tissue Base', confidence: 98.0, x: 35, y: 62, width: 35, height: 30, color: '#10b981' }
    ],
    prescription: baseTemplate.prescription
  };
};
