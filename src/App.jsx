import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FarmProvider } from './context/FarmContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FarmMap from './pages/FarmMap';
import PlantVision from './pages/PlantVision';
import Alerts from './pages/Alerts';
import DataSources from './pages/DataSources';

// Simple placeholder for pages not fully implemented yet to ensure routing works
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-full text-gray-500">
    <h2 className="text-xl font-medium">{title} Page - Coming Soon</h2>
  </div>
);

function App() {
  return (
    <FarmProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<FarmMap />} />
            <Route path="vision" element={<PlantVision />} />
            <Route path="insights" element={<Placeholder title="AI Insights" />} />
            <Route path="analytics" element={<Placeholder title="Analytics" />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FarmProvider>
  );
}

export default App;
