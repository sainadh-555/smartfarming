import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Droplets, 
  FlaskConical, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  TrendingUp, 
  IndianRupee, 
  Tag, 
  Wrench, 
  Sprout, 
  FileSpreadsheet,
  Layers,
  Filter
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

const INITIAL_INVENTORY = [
  // Seeds
  {
    id: 'INV-S1',
    name: 'Arka Rakshak F1 Tomato Seeds',
    category: 'Seeds',
    categoryTe: 'విత్తనాలు',
    quantity: 10,
    unit: 'Packets (10g each)',
    unitPrice: 450,
    minStock: 2,
    status: 'In Stock',
    batchNo: 'BATCH-2026-TOM1',
    supplier: 'IIHR Certified Seeds'
  },
  {
    id: 'INV-S2',
    name: 'Guntur Sannam Chili Seeds',
    category: 'Seeds',
    categoryTe: 'విత్తనాలు',
    quantity: 6,
    unit: 'Packets (50g each)',
    unitPrice: 320,
    minStock: 2,
    status: 'In Stock',
    batchNo: 'BATCH-2026-CHL4',
    supplier: 'AP Seed Corporation'
  },
  {
    id: 'INV-S3',
    name: 'BPT 5204 (Sona Masoori) Paddy Seeds',
    category: 'Seeds',
    categoryTe: 'విత్తనాలు',
    quantity: 3,
    unit: 'Bags (25kg each)',
    unitPrice: 1250,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'BATCH-2026-PAD9',
    supplier: 'National Seeds Corp'
  },
  // Fertilizers
  {
    id: 'INV-F1',
    name: 'Water Soluble NPK 19:19:19',
    category: 'Fertilizers',
    categoryTe: 'ఎరువులు',
    quantity: 8,
    unit: 'Bags (25kg each)',
    unitPrice: 2200,
    minStock: 3,
    status: 'In Stock',
    batchNo: 'LOT-2026-NPK19',
    supplier: 'IFFCO Agro'
  },
  {
    id: 'INV-F2',
    name: 'Granular Urea (Neem Coated)',
    category: 'Fertilizers',
    categoryTe: 'ఎరువులు',
    quantity: 4,
    unit: 'Bags (45kg each)',
    unitPrice: 266,
    minStock: 2,
    status: 'In Stock',
    batchNo: 'LOT-2026-UR55',
    supplier: 'KRIBHCO'
  },
  {
    id: 'INV-F3',
    name: 'Bio-Enriched Compost & Vermicompost',
    category: 'Fertilizers',
    categoryTe: 'ఎరువులు',
    quantity: 15,
    unit: 'Bags (50kg each)',
    unitPrice: 350,
    minStock: 5,
    status: 'In Stock',
    batchNo: 'LOT-2026-VCOM',
    supplier: 'Local Organic Co-op'
  },
  // Pesticides & Plant Protection
  {
    id: 'INV-P1',
    name: 'NeemAzal-T/S (Azadirachtin 1% EC)',
    category: 'Pesticides',
    categoryTe: 'పురుగుమందులు',
    quantity: 5,
    unit: 'Bottles (1 Liter)',
    unitPrice: 850,
    minStock: 2,
    status: 'In Stock',
    batchNo: 'LOT-2026-NZ91',
    supplier: 'EID Parry'
  },
  {
    id: 'INV-P2',
    name: 'Copper Oxychloride 50% WP',
    category: 'Pesticides',
    categoryTe: 'పురుగుమందులు',
    quantity: 4,
    unit: 'Packs (500g)',
    unitPrice: 280,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'LOT-2026-COC4',
    supplier: 'Tata Rallis'
  },
  // Irrigation Supplies
  {
    id: 'INV-I1',
    name: '16mm Inline Drip Lateral Pipe',
    category: 'Irrigation',
    categoryTe: 'బిందు సేద్యం',
    quantity: 4,
    unit: 'Rolls (400m each)',
    unitPrice: 3400,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'DRIP-LAT-16MM',
    supplier: 'Jain Irrigation'
  },
  {
    id: 'INV-I2',
    name: 'Pressure Compensating Drip Emitters (2 LPH)',
    category: 'Irrigation',
    categoryTe: 'బిందు సేద్యం',
    quantity: 250,
    unit: 'Pieces',
    unitPrice: 4.5,
    minStock: 50,
    status: 'In Stock',
    batchNo: 'EMIT-PC-2L',
    supplier: 'Netafim India'
  },
  {
    id: 'INV-I3',
    name: 'Disc Screen Filter (2 Inch)',
    category: 'Irrigation',
    categoryTe: 'బిందు సేద్యం',
    quantity: 1,
    unit: 'Unit',
    unitPrice: 4200,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'FLT-DISC-2IN',
    supplier: 'Finolex Plastro'
  },
  // Tools & Equipment
  {
    id: 'INV-E1',
    name: '16-Liter 12V Battery Knapsack Sprayer',
    category: 'Equipment',
    categoryTe: 'పరికరాలు',
    quantity: 2,
    unit: 'Units',
    unitPrice: 3200,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'EQ-SPRAY-BAT1',
    supplier: 'Kisan Craft'
  },
  {
    id: 'INV-E2',
    name: 'Digital Soil pH & Temperature Tester',
    category: 'Equipment',
    categoryTe: 'పరికరాలు',
    quantity: 1,
    unit: 'Unit',
    unitPrice: 1850,
    minStock: 1,
    status: 'In Stock',
    batchNo: 'EQ-SOIL-PH01',
    supplier: 'AgriTech Tools'
  }
];

export default function Inventory() {
  const { zones, formatINR, formatIndianNumber, language, t } = useFarmData();
  const isTe = language === 'te';

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('smartfarm_inventory_items');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Seeds',
    quantity: '',
    unit: 'Packets',
    unitPrice: '',
    supplier: ''
  });

  const saveItems = (updated) => {
    setItems(updated);
    try {
      localStorage.setItem('smartfarm_inventory_items', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save inventory:', e);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.unitPrice) return;

    const itemObj = {
      id: `INV-${Date.now().toString().slice(-5)}`,
      name: newItem.name.trim(),
      category: newItem.category,
      categoryTe: newItem.category === 'Seeds' ? 'విత్తనాలు' : (newItem.category === 'Fertilizers' ? 'ఎరువులు' : (newItem.category === 'Pesticides' ? 'పురుగుమందులు' : (newItem.category === 'Irrigation' ? 'బిందు సేద్యం' : 'పరికరాలు'))),
      quantity: parseFloat(newItem.quantity) || 1,
      unit: newItem.unit.trim() || 'Units',
      unitPrice: parseFloat(newItem.unitPrice) || 0,
      minStock: 1,
      status: 'In Stock',
      batchNo: `BATCH-${Date.now().toString().slice(-4)}`,
      supplier: newItem.supplier.trim() || 'Direct Farm Purchase'
    };

    saveItems([itemObj, ...items]);
    setShowAddModal(false);
    setNewItem({
      name: '',
      category: 'Seeds',
      quantity: '',
      unit: 'Packets',
      unitPrice: '',
      supplier: ''
    });
  };

  const handleDeleteItem = (id) => {
    saveItems(items.filter(i => i.id !== id));
  };

  // Financial Computations
  const totalExpensesINR = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  // Total acreage across all active zones
  const totalAcreage = useMemo(() => {
    return zones.reduce((acc, z) => {
      const acre = z.agronomy?.acreage || 0.25;
      return acc + acre;
    }, 0);
  }, [zones]);

  // Estimated Harvest Revenue based on crop target yields & prevailing market rates
  // Tomato: ~3,200 kg / 0.25 ac @ ₹16/kg = ₹51,200
  // Chili: ~1,100 kg / 0.25 ac @ ₹110/kg = ₹1,21,000
  // Paddy: ~1,500 kg / 0.25 ac @ ₹24/kg = ₹36,000
  // Groundnut: ~650 kg / 0.25 ac @ ₹65/kg = ₹42,250
  const estimatedRevenueINR = useMemo(() => {
    let rev = 0;
    zones.forEach(z => {
      const crop = z.cropType;
      const acre = z.agronomy?.acreage || 0.25;
      const multiplier = acre / 0.25;
      if (crop === 'Tomato') rev += 51200 * multiplier;
      else if (crop === 'Chili') rev += 121000 * multiplier;
      else if (crop === 'Paddy') rev += 36000 * multiplier;
      else if (crop === 'Groundnut') rev += 42250 * multiplier;
      else if (crop === 'Cotton') rev += 65000 * multiplier;
      else if (crop === 'Corn') rev += 38000 * multiplier;
      else if (crop === 'Sugarcane') rev += 85000 * multiplier;
      else rev += 40000 * multiplier;
    });
    return Math.round(rev);
  }, [zones]);

  const estimatedProfitINR = estimatedRevenueINR - totalExpensesINR;
  const costPerAcreINR = totalAcreage > 0 ? Math.round(totalExpensesINR / totalAcreage) : 0;

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Export CSV in Indian Format
  const downloadFinancialCSV = () => {
    const headers = ['Item ID', 'Item Name', 'Category', 'Quantity', 'Unit', 'Unit Price (INR)', 'Total Cost (INR)', 'Stock Status', 'Batch No', 'Supplier'];
    const rows = items.map(i => [
      `"${i.id}"`,
      `"${i.name}"`,
      `"${i.category}"`,
      i.quantity,
      `"${i.unit}"`,
      `₹${i.unitPrice}`,
      `₹${(i.quantity * i.unitPrice).toFixed(2)}`,
      `"${i.status}"`,
      `"${i.batchNo}"`,
      `"${i.supplier}"`
    ]);

    // Financial Summary Footer
    rows.push([]);
    rows.push(['--- FINANCIAL SUMMARY ---', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Farm Expenses', '', '', '', '', '', `₹${totalExpensesINR.toLocaleString('en-IN')}`, '', '', '']);
    rows.push(['Estimated Harvest Revenue', '', '', '', '', '', `₹${estimatedRevenueINR.toLocaleString('en-IN')}`, '', '', '']);
    rows.push(['Estimated Farm Profit', '', '', '', '', '', `₹${estimatedProfitINR.toLocaleString('en-IN')}`, '', '', '']);
    rows.push(['Total Farm Area', '', '', '', '', '', `${totalAcreage.toFixed(2)} Acres`, '', '', '']);
    rows.push(['Cost Per Acre', '', '', '', '', '', `₹${costPerAcreINR.toLocaleString('en-IN')} / Acre`, '', '', '']);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartFarm_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const categories = [
    { id: 'All', label: isTe ? 'అన్నీ' : 'All' },
    { id: 'Seeds', label: isTe ? 'విత్తనాలు' : 'Seeds' },
    { id: 'Fertilizers', label: isTe ? 'ఎరువులు' : 'Fertilizers' },
    { id: 'Pesticides', label: isTe ? 'పురుగుమందులు' : 'Pesticides' },
    { id: 'Irrigation', label: isTe ? 'బిందు సేద్యం' : 'Irrigation' },
    { id: 'Equipment', label: isTe ? 'పరికరాలు' : 'Equipment' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'వ్యవసాయ నిల్వలు & ఆర్థిక విశ్లేషణ' : 'Farm Inventory & Financial Analysis'}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isTe ? 'భారతీయ రూపాయలు (₹)' : 'Indian Rupees (₹)'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isTe 
              ? 'విత్తనాలు, ఎరువులు, బిందు సేద్యం ఖర్చులు మరియు పంట లాభాల లెక్కలు' 
              : 'Track seeds, fertilizers, irrigation supplies, expenditure, and harvest profits'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isTe ? '+ కొత్త వస్తువును చేర్చండి' : '+ Add Item'}</span>
          </button>
          <button
            onClick={downloadFinancialCSV}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{isTe ? 'CSV రిపోర్ట్ డౌన్‌లోడ్ (₹)' : 'Export CSV (₹)'}</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isTe ? 'మొత్తం వ్యవసాయ ఖర్చులు' : 'Total Farm Expenses'}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatINR(totalExpensesINR)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isTe ? `${items.length} ఇన్వెంటరీ కొనుగోళ్ల మొత్తం` : `Across ${items.length} inventory supplies`}
            </p>
          </div>
        </div>

        {/* Estimated Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isTe ? 'అంచనా వేసిన దిగుబడి రాబడి' : 'Estimated Harvest Revenue'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-blue-700 tracking-tight">
              {formatINR(estimatedRevenueINR)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isTe ? `${totalAcreage.toFixed(2)} ఎకరాల పంట దిగుబడి ఆధారంగా` : `Based on ${totalAcreage.toFixed(2)} ac target yields`}
            </p>
          </div>
        </div>

        {/* Estimated Farm Profit */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isTe ? 'అంచనా వేసిన నికర లాభం' : 'Estimated Farm Profit'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatINR(estimatedProfitINR)}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {isTe ? 'రాబడి - పెట్టుబడి ఖర్చులు' : 'Gross revenue minus expenses'}
            </p>
          </div>
        </div>

        {/* Cost per Acre */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isTe ? 'ఎకరానికి పెట్టుబడి ఖర్చు' : 'Cost Per Acre'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatINR(costPerAcreINR)} <span className="text-xs font-normal text-slate-500">{isTe ? '/ ఎకరా' : '/ acre'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isTe ? `మొత్తం సాగు: ${totalAcreage.toFixed(2)} ఎకరాలు` : `Cultivated area: ${totalAcreage.toFixed(2)} acres`}
            </p>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder={isTe ? 'వస్తువు పేరు లేదా సరఫరాదారుని వెతకండి...' : 'Search items or supplier...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{isTe ? 'వస్తువు వివరాలు' : 'Item Details'}</th>
                <th className="py-3.5 px-4">{isTe ? 'వర్గం' : 'Category'}</th>
                <th className="py-3.5 px-4">{isTe ? 'పరిమాణం' : 'Quantity'}</th>
                <th className="py-3.5 px-4 text-right">{isTe ? 'ధర (₹)' : 'Unit Price (₹)'}</th>
                <th className="py-3.5 px-4 text-right">{isTe ? 'మొత్తం ఖర్చు (₹)' : 'Total Cost (₹)'}</th>
                <th className="py-3.5 px-4">{isTe ? 'నిల్వ స్థితి' : 'Stock Status'}</th>
                <th className="py-3.5 px-4 text-center">{isTe ? 'చర్య' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const totalItemCost = item.quantity * item.unitPrice;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.batchNo} • {item.supplier}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {isTe ? item.categoryTe || item.category : item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        {formatINR(totalItemCost)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{isTe ? 'సరిపడా నిల్వ ఉంది' : 'In Stock'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {isTe ? 'ఎలాంటి వస్తువులు కనుగొనబడలేదు.' : 'No inventory items found matching your filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
              <h3 className="font-bold text-slate-900">
                {isTe ? 'కొత్త వ్యవసాయ వస్తువును చేర్చండి' : 'Add New Inventory Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isTe ? 'వస్తువు పేరు' : 'Item Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bio-DAP Fertilizer"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isTe ? 'వర్గం' : 'Category'}</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Seeds">{isTe ? 'విత్తనాలు' : 'Seeds'}</option>
                    <option value="Fertilizers">{isTe ? 'ఎరువులు' : 'Fertilizers'}</option>
                    <option value="Pesticides">{isTe ? 'పురుగుమందులు' : 'Pesticides'}</option>
                    <option value="Irrigation">{isTe ? 'బిందు సేద్యం' : 'Irrigation'}</option>
                    <option value="Equipment">{isTe ? 'పరికరాలు' : 'Equipment'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isTe ? 'ధర (₹)' : 'Unit Price (₹)'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={newItem.unitPrice}
                    onChange={e => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isTe ? 'పరిమాణం' : 'Quantity'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isTe ? 'యూనిట్' : 'Unit'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Bags, Liters"
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isTe ? 'సరఫరాదారు / దుకాణం' : 'Supplier / Dealer'}</label>
                <input
                  type="text"
                  placeholder="e.g. Rythu Bharosa Kendram (RBK)"
                  value={newItem.supplier}
                  onChange={e => setNewItem({ ...newItem, supplier: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  {isTe ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isTe ? 'వస్తువును చేర్చండి' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
