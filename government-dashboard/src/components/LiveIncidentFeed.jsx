import React from 'react';
import { AlertTriangle, Clock, MapPin, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LiveIncidentFeed = ({ incidents, loading }) => {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'severity-critical';
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'status-resolved';
      case 'in_progress':
        return 'status-in-progress';
      default:
        return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="gov-card">
        <div className="flex items-center justify-center py-8">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="gov-card sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
          Live Incidents
        </h3>
        <span className="flex items-center text-sm text-green-600 font-semibold">
          <span className="live-indicator mr-2">●</span>
          Live
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {incidents && incidents.length > 0 ? (
          incidents.slice(0, 10).map((incident) => (
            <div
              key={incident.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(incident.severity)}`}>
                      {incident.severity || 'MEDIUM'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(incident.status)}`}>
                      {incident.status || 'Pending'}
                    </span>
                    {incident.auto_captured && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        📱 Auto
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {incident.incident_type || 'Traffic Incident'}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {incident.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {incident.location || 'Kigali'}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {incident.created_at ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No incidents to display</p>
            <p className="text-xs mt-1">All clear on Kigali roads! 🎉</p>
          </div>
        )}
      </div>

      {incidents && incidents.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
            View All {incidents.length} Incidents →
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveIncidentFeed;
