import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFarmData } from '../context/FarmContext';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Info, 
  RefreshCw, 
  Thermometer, 
  X,
  ArrowRight
} from 'lucide-react';
import { 
  validateImageFile, 
  checkImageCanvasQuality, 
  analyzePlantVision, 
  VALIDATION_STATUSES,
  SUPPORTED_CROPS 
} from '../ai/plantVisionEngine';

export default function PlantVision() {
  const { language, hardwareData, operatingMode, backendUrl } = useFarmData();
  const isTe = language === 'te';

  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const activeAbortRef = useRef(null);
  const requestIdRef = useRef(0);

  // Core application states
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() => {
    try {
      const saved = localStorage.getItem('smartfarm_latest_plant_vision');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle incoming file selection
  const processSelectedFile = (file) => {
    if (!file) return;

    // Cancel any running analysis
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }

    // 1. CLEAR previous state immediately
    setAnalysisResult(null);
    setErrorMessage(null);
    setIsAnalyzing(false);

    // 2. Validate file metadata
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      setSelectedFile(null);
      setImagePreview(null);
      setImageMeta(null);
      return;
    }

    setSelectedFile(file);
    setImageMeta({
      name: file.name,
      sizeKb: (file.size / 1024).toFixed(1),
      type: file.type
    });

    // 3. Decode & preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
    };
    reader.onerror = () => {
      setErrorMessage(isTe ? 'చిత్రాన్ని చదవడం సాధ్యం కాలేదు.' : 'Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Run Real Computer Vision Analysis
  const handleAnalyze = async () => {
    if (!imagePreview && !selectedFile) return;

    // Reset previous results
    setAnalysisResult(null);
    setErrorMessage(null);
    setIsAnalyzing(true);

    const currentRequestId = ++requestIdRef.current;
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    try {
      // Step A: Client-side canvas check (resolution & solid color check)
      if (imgRef.current) {
        const qualityCheck = checkImageCanvasQuality(imgRef.current);
        if (qualityCheck.status) {
          if (currentRequestId === requestIdRef.current) {
            setAnalysisResult({
              validation_status: qualityCheck.status,
              is_plant: false,
              detected_crop: 'Non-plant',
              condition: null,
              is_healthy: null,
              model_score: null,
              symptoms: [],
              recommendations: isTe 
                ? ['దయచేసి పంట ఆకు లేదా మొక్క ఫోటోను స్పష్టంగా తీసి అప్‌లోడ్ చేయండి.']
                : ['Please upload a well-focused photo of a crop or leaf with adequate lighting.'],
              message: qualityCheck.message,
              model_info: 'Real Computer Vision Pipeline',
              limitations: 'Image did not pass pre-validation checks.'
            });
            setIsAnalyzing(false);
          }
          return;
        }
      }

      // Step B: Master Vision Analysis (calls backend /api/plant/analyze or configured client key)
      const result = await analyzePlantVision({
        file: selectedFile,
        dataUrl: imagePreview,
        language: isTe ? 'te' : 'en',
        backendUrl,
        signal: abortController.signal
      });

      // Step C: Verify request is still fresh
      if (currentRequestId === requestIdRef.current) {
        setAnalysisResult(result);
        if (result && result.validation_status) {
          try {
            localStorage.setItem('smartfarm_latest_plant_vision', JSON.stringify({
              ...result,
              analyzedAt: new Date().toISOString()
            }));
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
        setErrorMessage(err.message || (isTe ? 'విశ్లేషణలో లోపం సంభవించింది.' : 'An error occurred during plant analysis.'));
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsAnalyzing(false);
        activeAbortRef.current = null;
      }
    }
  };

  // Clear current image & reset to initial state
  const handleClearImage = () => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    setSelectedFile(null);
    setImagePreview(null);
    setImageMeta(null);
    setAnalysisResult(null);
    try {
      localStorage.removeItem('smartfarm_latest_plant_vision');
    } catch {}
    setErrorMessage(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Environmental context from hardware (clearly separate from image diagnosis)
  const isHwConnected = operatingMode === 'live_hardware' && hardwareData?.connectionStatus === 'connected' && !hardwareData?.isStale;
  const tempReading = isHwConnected && typeof hardwareData?.temperature === 'number' ? `${hardwareData.temperature.toFixed(1)}°C` : null;
  const humReading = isHwConnected && typeof hardwareData?.humidity === 'number' ? `${hardwareData.humidity.toFixed(1)}%` : null;
  const moistReading = isHwConnected && typeof hardwareData?.soil_moisture === 'number' ? `${hardwareData.soil_moisture.toFixed(1)}%` : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>{isTe ? 'కంప్యూటర్ విజన్ & పంట వ్యాధి విశ్లేషణ' : 'Plant Vision & Real Computer Vision Diagnostics'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {isTe ? 'మొక్కల దృశ్య విశ్లేషణ' : 'Plant Health & Disease Vision'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isTe 
            ? 'టమోటా, మిర్చి, వరి, మరియు వేరుశనగ పంటల ఆకు ఫోటోలను అప్‌లోడ్ చేసి నిజమైన వ్యాధి నిర్ధారణ పొందండి.'
            : 'Upload leaf or crop photos to verify botanical authenticity and diagnose diseases for Tomato, Chili, Paddy, and Groundnut.'}
        </p>

        {/* Supported Crops Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500">
            {isTe ? 'మద్దతు ఉన్న పంటలు:' : 'Supported Crops:'}
          </span>
          {SUPPORTED_CROPS.map((crop) => (
            <span key={crop} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {crop}
            </span>
          ))}
          <span className="text-[11px] text-slate-400 italic ml-1">
            ({isTe ? 'ఇతర చిత్రాలు లేదా మొక్కలు కానివి తిరస్కరించబడతాయి' : 'Non-plant & unsupported images will be rejected'})
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 shadow-xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-xs">{isTe ? 'అప్‌లోడ్ లేదా ధృవీకరణ లోపం' : 'Validation Error'}</h4>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. UPLOAD IMAGE SECTION                                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</span>
            <span>{isTe ? 'చిత్రాన్ని అప్‌లోడ్ చేయండి' : 'Upload Image'}</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">JPG, PNG, WebP (Max 10MB)</span>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInputChange} 
          accept="image/jpeg,image/png,image/webp" 
          className="hidden" 
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragOver 
              ? 'border-emerald-500 bg-emerald-50/50' 
              : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/70'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {isTe ? 'ఫోటోను ఎంచుకోండి లేదా ఇక్కడ లాగండి' : 'Click to browse or drag and drop a crop photo'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isTe 
              ? 'టమోటా, మిర్చి, వరి, లేదా వేరుశనగ మొక్క ఆకు ఫోటోను స్పష్టంగా తీసి అప్‌లోడ్ చేయండి.' 
              : 'Take a clear, well-lit close-up of a leaf showing any symptoms or healthy tissue.'}
          </p>
          <button 
            type="button"
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all pointer-events-none"
          >
            {isTe ? 'ఫైల్ ఎంచుకోండి' : 'Select Crop Photo'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. IMAGE PREVIEW SECTION                                 */}
      {/* ======================================================== */}
      {imagePreview && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">2</span>
              <span>{isTe ? 'చిత్ర పరిదృశ్యం' : 'Image Preview'}</span>
            </h2>
            <button
              onClick={handleClearImage}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isTe ? 'తొలగించు' : 'Remove Image'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6 flex flex-col gap-2">
              <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                <img 
                  ref={imgRef}
                  src={imagePreview} 
                  alt="Uploaded Crop Preview" 
                  className="w-full h-full object-contain"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-bold tracking-wide">
                      {isTe ? 'కంప్యూటర్ విజన్ విశ్లేషణ జరుగుతోంది...' : 'Validating & Analyzing Image with Vision AI...'}
                    </span>
                  </div>
                )}
              </div>

              {imageMeta && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
                  <span className="truncate max-w-[200px]">{imageMeta.name}</span>
                  <span>{imageMeta.sizeKb} KB • {imageMeta.type}</span>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* 3. ANALYZE PLANT ACTION                                  */}
            {/* ======================================================== */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
                  <span>{isTe ? 'విశ్లేషణను ప్రారంభించండి' : 'Analyze Plant'}</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isTe
                    ? 'ఈ చిత్రం మొక్క అవునో కాదో సిస్టమ్ మొదట ధృవీకరిస్తుంది, పంటను గుర్తిస్తుంది మరియు వ్యాధి లక్షణాలను నిష్పాక్షికంగా పరిశీలిస్తుంది.'
                    : 'The vision pipeline validates whether the image contains a real plant, verifies crop support, and diagnoses pathology with zero fabricated results.'}
                </p>

                {/* Optional Environmental Context from ESP32 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isTe ? 'పర్యావరణ సందర్భం (ESP32)' : 'Environmental Context (ESP32)'}</span>
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isHwConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {isHwConnected ? 'Live' : 'Disconnected'}
                    </span>
                  </div>

                  {isHwConnected ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-800">
                      <div>Temp: <strong>{tempReading || 'N/A'}</strong></div>
                      <div>Humidity: <strong>{humReading || 'N/A'}</strong></div>
                      <div>Moisture: <strong>{moistReading || 'N/A'}</strong></div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      {isTe 
                        ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ అయింది. చిత్ర నిర్ధారణ మాత్రమే వర్తిస్తుంది.'
                        : 'Hardware disconnected. Visual diagnosis operates independently.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isTe ? 'విశ్లేషిస్తోంది...' : 'Analyzing Plant...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isTe ? 'పంటను విశ్లేషించండి' : 'Analyze Plant'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ANALYSIS RESULT & 5. RECOMMENDED ACTIONS             */}
      {/* ======================================================== */}
      {analysisResult && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">4</span>
                <span>{isTe ? 'విశ్లేషణ ఫలితం' : 'Analysis Result'}</span>
              </h2>
              <span className="text-xs font-mono font-bold text-slate-500">
                {analysisResult.model_info}
              </span>
            </div>

            {/* OUTCOME A: Valid Supported Crop */}
            {analysisResult.validation_status === VALIDATION_STATUSES.VALID_SUPPORTED_CROP && (
              <div className="space-y-5">
                {/* 1. Pathological Classification & Crop identification */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  analysisResult.is_healthy 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      {isTe ? 'గుర్తించబడిన పంట & వర్గీకరణ' : 'Botanical Identification & Pathology'}
                    </span>
                    <h3 className="text-lg font-black mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{analysisResult.detected_crop}</span>
                      {analysisResult.scientific_name && (
                        <span className="text-xs font-normal italic opacity-80">({analysisResult.scientific_name})</span>
                      )}
                      <span className="opacity-40">—</span>
                      <span>{analysisResult.condition}</span>
                    </h3>
                    <p className="text-xs mt-1 opacity-90">
                      {analysisResult.is_healthy 
                        ? (isTe ? 'ఆకు ఆరోగ్యంగా ఉంది. వ్యాధి లేదా తెగులు లక్షణాలు కనిపించలేదు.' : 'Foliage appears healthy. No significant lesions, chlorosis, or fungal pathogen damage detected.')
                        : (isTe ? 'ఆకుపై తెగులు లేదా వ్యాధి లక్షణాలు కనిపించాయి.' : 'Pathology detected on foliage. Review symptoms and agronomic advice below.')}
                    </p>
                  </div>

                  {typeof analysisResult.model_score === 'number' && (
                    <div className="sm:text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                        {isTe ? 'మోడల్ స్కోరు' : 'Model Confidence'}
                      </span>
                      <span className="text-xl font-black font-mono">
                        {(analysisResult.model_score <= 1.0 ? analysisResult.model_score * 100 : analysisResult.model_score).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Key Metrics: Severity Rating & Surface Lesion Impact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {isTe ? 'తీవ్రత స్థాయి (Severity Rating)' : 'Severity Rating'}
                    </span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        (analysisResult.severity === 'None' || analysisResult.is_healthy)
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : analysisResult.severity === 'Mild'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          : analysisResult.severity === 'Moderate'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {analysisResult.severity || (analysisResult.is_healthy ? 'None (Healthy)' : 'Moderate')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {analysisResult.is_healthy ? 'No active lesions' : 'Pathological impact assessment'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {isTe ? 'క్షతి విస్తరణ (Surface Lesion Impact)' : 'Surface Lesion Impact'}
                    </span>
                    <p className="text-xs font-semibold text-slate-800 pt-0.5 font-mono">
                      {analysisResult.surface_lesion_impact || 'Not measurable from 2D classification (Visual observation only)'}
                    </p>
                  </div>
                </div>

                {/* Visible Symptoms */}
                {analysisResult.symptoms && analysisResult.symptoms.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {isTe ? 'కనిపించే లక్షణాలు:' : 'Visible Symptoms Observed:'}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                      {analysisResult.symptoms.map((symptom, idx) => (
                        <li key={idx}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ESP32 IoT Correlation Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
                      <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isTe ? 'ESP32 IoT నోడ్ పర్యావరణ అనుసంధానం' : 'ESP32 IoT Node Correlation'}</span>
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isHwConnected ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isHwConnected ? 'Live Sensor Feed' : 'Hardware Disconnected'}
                    </span>
                  </div>

                  {isHwConnected ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs text-slate-800">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Ambient Temp</span>
                        <span className="font-bold">{tempReading || 'N/A'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Relative Humidity</span>
                        <span className="font-bold">{humReading || 'N/A'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Soil Moisture</span>
                        <span className="font-bold">{moistReading || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      {isTe 
                        ? 'హార్డ్‌వేర్ డిస్‌కనెక్ట్ అయింది. చిత్ర నిర్ధారణ మాత్రమే వర్తిస్తుంది.'
                        : 'Physical hardware disconnected. Visual diagnosis operates independently without live environmental telemetry correlation.'}
                    </p>
                  )}
                </div>

                {/* Bounding Box Clarification / Model Limitation */}
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>{isTe ? 'మోడల్ వర్గీకరణ నిర్మాణశైలి:' : 'Model Classification Architecture:'}</strong>{' '}
                    {analysisResult.limitations || (isTe 
                      ? 'ఈ మోడల్ వర్గీకరణ పద్ధతిని ఉపయోగిస్తుంది. నిజమైన స్థానిక కోఆర్డినేట్లు లేకుండా కృత్రిమ బౌండింగ్ బాక్స్‌లు గీయబడవు.' 
                      : 'Object detection bounding boxes are disabled because bounding boxes require a verified localization/YOLO detection model with ground-truth coordinates.')}
                  </div>
                </div>
              </div>
            )}

            {/* OUTCOME B: No Plant Detected */}
            {analysisResult.validation_status === VALIDATION_STATUSES.NO_PLANT_DETECTED && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isTe ? 'మొక్క గుర్తించబడలేదు' : 'No Plant Detected'}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-rose-800 font-medium">
                  {analysisResult.message || (isTe 
                    ? 'మొక్క లేదా ఆకు గుర్తించబడలేదు. దయచేసి స్పష్టమైన పంట లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయండి.' 
                    : 'No plant detected. Please upload a clear photo of a crop or leaf.')}
                </p>
                <p className="text-[11px] text-rose-600 pt-1">
                  {isTe 
                    ? 'గమనిక: సిస్టమ్ మనుషులు, ముఖాలు, వాహనాలు, గది వస్తువులు లేదా నాన్-ప్లాంట్ చిత్రాలను ఆటోమేటిక్‌గా తిరస్కరిస్తుంది.' 
                    : 'Note: The botanical verification pipeline rejects humans, faces, vehicles, casing, screens, and non-agricultural objects.'}
                </p>
              </div>
            )}

            {/* OUTCOME C: Unsupported Crop */}
            {analysisResult.validation_status === VALIDATION_STATUSES.UNSUPPORTED_CROP && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isTe ? 'మద్దతు లేని పంట' : 'This Crop is Not Currently Supported'}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-amber-800 font-medium">
                  {analysisResult.message || (isTe ? 'ఈ పంట ప్రస్తుతం మద్దతు ఇవ్వబడలేదు.' : 'This crop is not currently supported.')}
                </p>
                {analysisResult.detected_crop && analysisResult.detected_crop !== 'Unknown' && (
                  <p className="text-xs text-amber-700 font-semibold">
                    {isTe ? 'గుర్తించబడిన మొక్క:' : 'Detected Subject:'} {analysisResult.detected_crop}
                  </p>
                )}
                <p className="text-[11px] text-amber-600 pt-1">
                  {isTe 
                    ? 'ప్రస్తుతం టమోటా, మిర్చి, వరి, మరియు వేరుశనగ పంటలకు మాత్రమే ధృవీకరించబడిన వ్యాధి విశ్లేషణ అందుబాటులో ఉంది.' 
                    : 'Verified disease diagnosis is currently supported only for: Tomato, Chili, Paddy, and Groundnut.'}
                </p>
              </div>
            )}

            {/* OUTCOME D: Unclear Image */}
            {analysisResult.validation_status === VALIDATION_STATUSES.UNCLEAR_IMAGE && (
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isTe ? 'చిత్రం అస్పష్టంగా ఉంది' : 'The Image is Unclear'}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-blue-800 font-medium">
                  {analysisResult.message || (isTe 
                    ? 'ఫోటో అస్పష్టంగా ఉంది. దయచేసి దగ్గరగా, మంచి వెలుతురులో తీసిన ఫోటోను అప్‌లోడ్ చేయండి.' 
                    : 'The image is unclear. Please upload a closer, well-lit photo.')}
                </p>
                <p className="text-[11px] text-blue-600 pt-1">
                  {isTe 
                    ? 'మసకబారిన, చీకటిగా ఉన్న, లేదా ఎక్కువ దూరంగా ఉన్న చిత్రాల నుండి తప్పుడు నిర్ణయాలు తీసుకోకుండా సిస్టమ్ నివారిస్తుంది.' 
                    : 'The quality filter prevents inaccurate predictions from blurry, dark, low-contrast, or overly distant images.'}
                </p>
              </div>
            )}

            {/* OUTCOME E: Model Unavailable */}
            {analysisResult.validation_status === VALIDATION_STATUSES.MODEL_UNAVAILABLE && (
              <div className="p-5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-600 shrink-0" />
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isTe ? 'మొక్కల విశ్లేషణ అందుబాటులో లేదు' : 'Plant Analysis is Temporarily Unavailable'}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {analysisResult.message || (isTe 
                    ? 'మొక్కల విశ్లేషణ తాత్కాలికంగా అందుబాటులో లేదు.' 
                    : 'Plant analysis is temporarily unavailable.')}
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  {isTe 
                    ? 'వాస్తవ విశ్లేషణ కోసం దయచేసి మీ పైథాన్ బ్యాకెండ్‌ను ప్రారంభించండి లేదా సెట్టింగ్స్ పేజీలో AI విజన్ API కీని నమోదు చేయండి.' 
                    : 'To enable real inference, start your backend server with an AI key or configure an AI Vision key in Settings. Hardcoded mock results are strictly disabled.'}
                </p>
                <div className="pt-1">
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <span>{isTe ? 'సెట్టింగ్స్‌లో AI విజన్ కాన్ఫిగర్ చేయండి' : 'Configure AI Vision in Settings'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* 5. RECOMMENDED ACTIONS SECTION                           */}
          {/* ======================================================== */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">5</span>
                  <span>{isTe ? 'రైతుకు సిఫార్సు చేయబడిన చర్యలు' : 'Recommended Next Steps'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTe 
                    ? 'నిర్ధారణ ఆధారంగా సరళమైన మరియు ఆచరణాత్మక వ్యవసాయ సలహాలు' 
                    : 'Farmer-friendly, non-hazardous cultural and agronomic recommendations based on verified analysis'}
                </p>
              </div>

              <div className="space-y-2.5">
                {analysisResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-800 leading-relaxed">
                      {rec}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100">
                {isTe 
                  ? 'ముఖ్య గమనిక: ఏదైనా రసాయన చికిత్సను వర్తించే ముందు ఎల్లప్పుడూ స్థానిక వ్యవసాయ విస్తరణ అధికారి లేదా కేవీకే (KVK) ను సంప్రదించండి.' 
                  : 'Important notice: Always consult local agricultural extension officers or Krishi Vigyan Kendra (KVK) before applying chemical treatments.'}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
