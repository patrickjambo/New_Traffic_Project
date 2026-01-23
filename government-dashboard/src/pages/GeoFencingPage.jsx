import React from 'react';
import GeoFencingManager from '../components/GeoFencingManager';

/**
 * Geo-Fencing Page
 * Admin page for managing:
 * - Kigali district geo-fences
 * - Officer location tracking
 * - Targeted alert dispatch
 */
const GeoFencingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <span className="text-2xl">🗺️</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Geo-Fencing Control Center</h1>
            <p className="text-gray-400">
              Intelligent location-based alert system for Kigali districts
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">Real-Time Tracking Active</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>📍 GPS Updates: Every 30s</span>
            <span>🔔 WebSocket: Connected</span>
            <span>📱 FCM: Ready</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <GeoFencingManager />

      {/* Info Footer */}
      <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
        <h4 className="text-white font-medium mb-2">ℹ️ How Geo-Fencing Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
          <div>
            <p className="text-blue-400 font-medium mb-1">1. Location Tracking</p>
            <p>Officer mobile apps continuously report GPS location to the system.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-medium mb-1">2. Incident Detection</p>
            <p>When AI or manual reports create incidents, the system identifies the district.</p>
          </div>
          <div>
            <p className="text-green-400 font-medium mb-1">3. Targeted Alerts</p>
            <p>Only officers within the geo-fence radius receive notifications.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoFencingPage;
