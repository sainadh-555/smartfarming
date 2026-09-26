import React from 'react';
import { Package, Droplets, FlaskConical, Truck } from 'lucide-react';

export default function Inventory() {
  const inventoryItems = [
    { name: 'Nitrogen Fertilizer', category: 'Fertilizer', stock: '450 kg', status: 'Optimal', icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Water Reservoir A', category: 'Water', stock: '85%', status: 'Optimal', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Pesticide (Organic)', category: 'Chemicals', stock: '12 Liters', status: 'Low', icon: Package, color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Tractor Fuel (Diesel)', category: 'Fuel', stock: '120 Gallons', status: 'Optimal', icon: Truck, color: 'text-gray-600', bg: 'bg-gray-100' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resource & Inventory Management</h1>
        <p className="text-gray-500">Track your farm's physical resources and supplies in real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventoryItems.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className={`w-12 h-12 rounded-full ${item.bg} ${item.color} flex items-center justify-center mb-4`}>
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{item.category}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Current Stock</p>
                <p className="text-xl font-bold text-gray-900">{item.stock}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.status === 'Low' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Usage Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-semibold min-w-[150px]">Resource</th>
                <th className="pb-3 font-semibold min-w-[120px]">Amount Used</th>
                <th className="pb-3 font-semibold min-w-[150px]">Applied To</th>
                <th className="pb-3 font-semibold min-w-[120px]">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-gray-100">
                <td className="py-3 font-medium text-gray-900">Water</td>
                <td className="py-3 text-gray-600">4,500 Gallons</td>
                <td className="py-3 text-gray-600">Zone A (Tomato)</td>
                <td className="py-3 text-gray-500">Today, 08:30 AM</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 font-medium text-gray-900">Nitrogen Fertilizer</td>
                <td className="py-3 text-gray-600">50 kg</td>
                <td className="py-3 text-gray-600">Zone B (Chili)</td>
                <td className="py-3 text-gray-500">Yesterday, 14:00 PM</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-gray-900">Tractor Fuel</td>
                <td className="py-3 text-gray-600">15 Gallons</td>
                <td className="py-3 text-gray-600">Zone D (Groundnut)</td>
                <td className="py-3 text-gray-500">Oct 23, 09:15 AM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
