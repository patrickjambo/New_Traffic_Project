import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Phone, MapPin, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Emergency = () => {
  const { isAuthenticated } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const response = await axios.get('/emergency');
      setEmergencies(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
      toast.error('Failed to load emergency alerts');
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`/emergency/${id}/status`, { status: newStatus });
      toast.success(`Emergency status updated to ${newStatus}`);
      fetchEmergencies();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" />
            Emergency Response
          </h1>
          <p className="text-gray-400 mt-1">Manage critical emergency situations and coordinate response teams</p>
        </div>
        <button
          onClick={fetchEmergencies}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {emergencies.length > 0 ? (
            emergencies.map((emergency) => (
              <div
                key={emergency.id}
                className={`bg-slate-800/50 backdrop-blur-md border rounded-xl p-6 transition-all ${emergency.status === 'pending' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                  emergency.status === 'active' ? 'border-orange-500/50' :
                    'border-white/5'
                  }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${emergency.severity === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                        emergency.severity === 'high' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                        {emergency.severity} Priority
                      </span>
                      <span className={`text-xs font-mono text-gray-400 flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        {new Date(emergency.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{emergency.emergency_type}</h3>
                    <p className="text-gray-300 mb-4">{emergency.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        {emergency.location_name}
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                        <Phone className="w-4 h-4 text-green-400" />
                        {emergency.contact_phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                    <div className="text-center mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Current Status</span>
                      <p className={`font-bold ${emergency.status === 'resolved' ? 'text-green-400' :
                        emergency.status === 'active' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                        {emergency.status.toUpperCase()}
                      </p>
                    </div>

                    {emergency.status !== 'resolved' && (
                      <div className="grid grid-cols-2 gap-2">
                        {emergency.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(emergency.id, 'active')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors col-span-2"
                          >
                            Dispatch Team
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusUpdate(emergency.id, 'resolved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Resolve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(emergency.id, 'cancelled')}
                          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-white/5">
              <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">All Clear</h3>
              <p className="text-gray-400">No active emergency alerts at the moment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Emergency;