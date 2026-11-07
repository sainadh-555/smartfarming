import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  IndianRupee, 
  CheckCircle2, 
  AlertTriangle, 
  Filter,
  Trash2
} from 'lucide-react';
import { useFarmData } from '../../context/FarmContext';

const INITIAL_INVENTORY_ITEMS = [
  { id: 'INV-1', name: 'Arka Rakshak Tomato F1 Seeds', category: 'Seeds', categoryTe: 'విత్తనాలు', qty: 10, unit: 'packets', price: 450, status: 'In Stock' },
  { id: 'INV-2', name: 'Guntur Sannam Chili Seeds', category: 'Seeds', categoryTe: 'విత్తనాలు', qty: 5, unit: 'packets', price: 320, status: 'In Stock' },
  { id: 'INV-3', name: 'Neem Oil Bio-Pesticide (10000 ppm)', category: 'Pesticides', categoryTe: 'సహజ పురుగుమందులు', qty: 2, unit: 'liters', price: 680, status: 'Low Stock' },
  { id: 'INV-4', name: 'Water-Soluble NPK 19:19:19', category: 'Fertilizers', categoryTe: 'ఎరువులు', qty: 4, unit: 'bags (25kg)', price: 1450, status: 'In Stock' },
  { id: 'INV-5', name: 'Drip Lateral Pipes 16mm', category: 'Equipment', categoryTe: 'పరికరాలు', qty: 3, unit: 'rolls (100m)', price: 1200, status: 'In Stock' },
  { id: 'INV-6', name: 'Trichoderma Viride Bio-Fungicide', category: 'Bio-Agents', categoryTe: 'జీవ శిలీంద్రనాశిని', qty: 1, unit: 'kg', price: 290, status: 'Low Stock' },
];

export default function MobileInventory() {
  const { language } = useFarmData();
  const isTe = language === 'te';

  const [items, setItems] = useState(INITIAL_INVENTORY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  const categories = useMemo(() => [
    { id: 'ALL', name: isTe ? 'అన్నీ' : 'All' },
    { id: 'Seeds', name: isTe ? 'విత్తనాలు' : 'Seeds' },
    { id: 'Fertilizers', name: isTe ? 'ఎరువులు' : 'Fertilizers' },
    { id: 'Pesticides', name: isTe ? 'పురుగుమందులు' : 'Pesticides' },
    { id: 'Equipment', name: isTe ? 'పరికరాలు' : 'Equipment' },
  ], [isTe]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const updateQuantity = (id, delta) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return {
          ...item,
          qty: newQty,
          status: newQty === 0 ? 'Out of Stock' : (newQty <= 2 ? 'Low Stock' : 'In Stock')
        };
      }
      return item;
    }));
  };

  return (
    <div className="space-y-3 pb-6 max-w-lg mx-auto">
      
      {/* Header Search & Category Filter */}
      <section className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder={isTe ? 'ఎరువులు, విత్తనాలు వెతకండి...' : 'Search supplies, seeds, tools...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target-min cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

      </section>

      {/* Inventory Products List */}
      <div className="space-y-2.5">
        {filteredItems.map(item => {
          const isLow = item.status === 'Low Stock';
          const isOut = item.status === 'Out of Stock';

          return (
            <div 
              key={item.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3"
            >
              {/* Product Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900">{item.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                      {isTe ? item.categoryTe : item.category}
                    </span>
                  </div>

                  {/* Price in INR ₹ */}
                  <div className="flex items-center gap-1 mt-1 text-xs font-bold text-emerald-800">
                    <span>₹{item.price.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-normal text-slate-400">/ {item.unit}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 border ${
                  isOut 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : (isLow ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Quantity Counter */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  {isTe ? 'ప్రస్తుత నిల్వ:' : 'In Stock:'} <strong className="text-slate-900 font-mono text-xs">{item.qty} {item.unit}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold touch-target-min cursor-pointer active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                    {item.qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold touch-target-min cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              {isTe ? 'సరుకులు కనుగొనబడలేదు' : 'No supplies match your search'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

