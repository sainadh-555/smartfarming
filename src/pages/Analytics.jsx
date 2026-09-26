import React from 'react';
import { useFarmData } from '../context/FarmContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit } from 'lucide-react';

// Generate mock historical data for the charts
const generateMockHistory = () => {
  const data = [];
  let moisture = 60;
  let temp = 25;
  for(let i=24; i>=0; i--) {
    moisture = Math.max(10, Math.min(90, moisture + (Math.random() * 10 - 5.5)));
    temp = Math.max(15, Math.min(40, temp + (Math.random() * 4 - 1.8)));
    data.push({
      time: `-${i}h`,
      moisture: Math.round(moisture),
      temperature: Math.round(temp),
      health: Math.round(80 + (Math.random() * 10 - 5)),
    });
  }
  return data;
};

const historyData = generateMockHistory();

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historical Analytics</h1>
          <p className="text-gray-500">Track sensor trends and correlations over time.</p>
        </div>
        <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <button className="px-4 py-2 text-sm font-medium bg-nature-50 text-nature-700">24 Hours</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200">7 Days</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200">30 Days</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Soil Moisture vs Temperature</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="moisture" name="Moisture (%)" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f97316" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Average Plant Health</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="health" name="Health Score" stroke="#22c55e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          <BrainCircuit className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900">AI Correlation Insight</h4>
          <p className="text-sm text-blue-800 mt-1">
            "Historical data shows that when soil moisture drops below 35% while temperatures exceed 30°C, 
            plant health scores decline rapidly within 4 hours. The AI engine frequently generates irrigation 
            recommendations during these conditions to prevent stress."
          </p>
        </div>
      </div>
    </div>
  );
}
