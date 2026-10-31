import React, { useState } from 'react';
import { X, Sprout, Plus, MapPin, Layers, Check } from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function AddPlotModal({ isOpen, onClose }) {
  const { addZone, cropsCatalog, t, language } = useFarmData();
  const isTe = language === 'te';

  const [plotName, setPlotName] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Corn');
  const [acreage, setAcreage] = useState('0.5');
  const [soilType, setSoilType] = useState('Red Sandy Loam');
  const [variety, setVariety] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    addZone({
      name: plotName.trim() || undefined,
      cropType: selectedCrop,
      acreage: parseFloat(acreage) || 0.25,
      soilType: soilType,
      variety: variety.trim() || undefined
    });
    onClose();
  };

  const currentCropInfo = (cropsCatalog || []).find(c => c.id === selectedCrop);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isTe ? 'కొత్త పొలం ప్లాట్ జోడించండి' : 'Add New Farm Plot'}
              </h2>
              <p className="text-xs text-slate-500">
                {isTe ? 'పంటను ఎంచుకోండి & 3D డిజిటల్ ట్విన్ పర్యవేక్షణ ప్రారంభించండి' : 'Select any crop & configure real-time monitoring'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Plot Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isTe ? 'ప్లాట్ పేరు' : 'Plot Name'}
            </label>
            <input
              type="text"
              placeholder={isTe ? 'ఉదాహరణ: ఉత్తర పొలం లేదా ప్లాట్ E' : 'e.g. North Plot or Zone E'}
              value={plotName}
              onChange={(e) => setPlotName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 text-slate-900 font-medium"
            />
          </div>

          {/* Crop Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isTe ? 'పంట రకం (ఏ పంటైనా ఎంచుకోండి)' : 'Select Crop (Any Kind of Crop)'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/30">
              {(cropsCatalog || []).map((c) => {
                const isSelected = selectedCrop === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCrop(c.id);
                      if (c.soilType) setSoilType(c.soilType);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <span className="truncate">{isTe ? c.nameTe || c.name : c.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
            {currentCropInfo && (
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                <span>💧 {currentCropInfo.waterDemand}</span>
                <span>•</span>
                <span>🌡️ {currentCropInfo.optimalTemp}</span>
              </p>
            )}
          </div>

          {/* Acreage & Soil Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {isTe ? 'విస్తీర్ణం (ఎకరాలు)' : 'Plot Acreage (Acres)'}
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="50"
                value={acreage}
                onChange={(e) => setAcreage(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {isTe ? 'మట్టి రకం' : 'Soil Type'}
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-900 font-medium"
              >
                <option value="Red Sandy Loam">Red Sandy Loam</option>
                <option value="Black Cotton Soil">Black Cotton Soil</option>
                <option value="Clayey Loam">Clayey Loam</option>
                <option value="Sandy Loam">Sandy Loam</option>
                <option value="Fertile Silt Loam">Fertile Silt Loam</option>
              </select>
            </div>
          </div>

          {/* Variety */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isTe ? 'రకం / వెరైటీ (ఐచ్ఛికం)' : 'Variety / Hybrid Name (Optional)'}
            </label>
            <input
              type="text"
              placeholder={currentCropInfo?.variety || (isTe ? 'వెరైటీ పేరు' : 'Variety name')}
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-900 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isTe ? 'రద్దు చేయండి' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isTe ? 'ప్లాట్ సృష్టించండి' : 'Create Plot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
