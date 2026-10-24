import React, { useState } from 'react';
import { 
  Package, 
  Droplets, 
  FlaskConical, 
  Truck, 
  ShieldCheck, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Layers,
  FileSpreadsheet,
  Tag
} from 'lucide-react';
import { useFarmData } from '../context/FarmContext';

export default function Inventory() {
  const { zones, unitSystem, formatVolume, downloadAuditCSV } = useFarmData();

  const inventoryItems = [
    { 
      name: 'NeemAzal-T/S (Azadirachtin 1% EC)', 
      category: 'Bio-Insecticide (IRAC UN)', 
      stock: '18.5 Liters', 
      status: 'Optimal', 
      phi: '1 Day',
      whoClass: 'Class U (Unlikely to present hazard)',
      batchLot: 'LOT-2026-NZ91',
      icon: Package, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      name: 'Copper Oxychloride 50% WP', 
      category: 'Protective Fungicide (FRAC M01)', 
      stock: '14.0 kg', 
      status: 'Optimal', 
      phi: '7 Days',
      whoClass: 'Class III (Slightly Hazardous)',
      batchLot: 'LOT-2026-COC4',
      icon: FlaskConical, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50' 
    },
    { 
      name: 'Primary Reservoir A (10,000 Gallons)', 
      category: 'ISO Water Storage', 
      stock: '8,250 Gallons (82.5%)', 
      status: 'Optimal', 
      phi: 'Direct Potable / Drip',
      whoClass: 'Food Grade Drip Safe',
      batchLot: 'WELL-EAST-PUMP-01',
      icon: Droplets, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      name: 'Water Soluble NPK 19:19:19', 
      category: 'Drip Fertigation (Grade A)', 
      stock: '250 kg', 
      status: 'Optimal', 
      phi: 'Zero PHI',
      whoClass: 'Eco-Fertilizer Non-Toxic',
      batchLot: 'LOT-2026-NPK19',
      icon: FlaskConical, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    }
  ];

  // Pull all treatments from zones
  const treatmentLogs = [];
  zones.forEach(zone => {
    const agro = zone.agronomy;
    if (agro?.pesticideUsage?.treatments) {
      agro.pesticideUsage.treatments.forEach(t => {
        treatmentLogs.push({
          ...t,
          zoneName: zone.name,
          cropName: zone.cropType
        });
      });
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Inventory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              GlobalG.A.P. Agrochemical & Resource Inventory
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ISO 22005 Traceable
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compliant with GlobalG.A.P. IFA v6.0 CB.7 regulations: FRAC/IRAC resistance rotation, WHO toxicity, and Pre-Harvest Interval (PHI) verification.
          </p>
        </div>

        <button 
          onClick={downloadAuditCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export GAP Compliance Log</span>
        </button>
      </div>

      {/* 4 Cards: Agrochemicals & Water Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventoryItems.map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {item.status}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{item.name}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.category}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Stock Balance:</span>
                <strong className="font-mono text-slate-900">{item.stock}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">PHI Buffer:</span>
                <strong className="font-mono text-emerald-600">{item.phi}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Traceability:</span>
                <span className="font-mono text-[10px] text-slate-600">{item.batchLot}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* GlobalG.A.P. Certified Agrochemical Application Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              GlobalG.A.P. Agrochemical Application Log (Last 30 Days)
            </h2>
            <p className="text-xs text-slate-500">
              Complete batch tracing, certified sprayer operators, applied dosages, and target pests for official food safety inspection.
            </p>
          </div>

          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            {treatmentLogs.length} Verified Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[11px] uppercase">
                <th className="pb-3 font-bold">Treatment ID</th>
                <th className="pb-3 font-bold">Crop & Zone</th>
                <th className="pb-3 font-bold">Pesticide / Agrochemical</th>
                <th className="pb-3 font-bold">Target Pest / Pathogen</th>
                <th className="pb-3 font-bold">Dosage & Volume</th>
                <th className="pb-3 font-bold">Certified Operator</th>
                <th className="pb-3 font-bold">Date Applied</th>
                <th className="pb-3 font-bold text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {treatmentLogs.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-mono text-emerald-700 font-bold">{entry.id}</td>
                  <td className="py-3">
                    <strong className="text-slate-900 block">{entry.cropName}</strong>
                    <span className="text-[11px] text-slate-400">{entry.zoneName} (0.25 Ac)</span>
                  </td>
                  <td className="py-3">
                    <div className="text-slate-900 font-bold">{entry.pesticideName}</div>
                    <span className="text-[10px] text-slate-500 font-mono">{entry.type}</span>
                  </td>
                  <td className="py-3 text-slate-800">{entry.targetPest}</td>
                  <td className="py-3 font-mono">
                    <div>{entry.dosage}</div>
                    <span className="text-[10px] text-slate-400">Carrier: {entry.carrierVolume}</span>
                  </td>
                  <td className="py-3 text-slate-600">{entry.operator}</td>
                  <td className="py-3 font-mono text-slate-500">{entry.date}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Compliant
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
