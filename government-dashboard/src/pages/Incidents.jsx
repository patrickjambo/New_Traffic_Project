import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Search, Filter, CheckCircle, Clock, MapPin } from 'lucide-react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Incidents = () => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get('/incidents');
      setIncidents(response.data.data?.incidents || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load incidents');
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.patch(`/incidents/${id}/status`, { status: newStatus });
      toast.success(`Incident status updated to ${newStatus}`);
      fetchIncidents();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesFilter = filter === 'all' || incident.status === filter;
    const matchesSearch = incident.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            Incidents Management
          </h1>
          <p className="text-gray-400 mt-1">Monitor and manage traffic incidents in real-time</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search incidents..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'
                }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'resolved' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
                }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/5 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium">Severity</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredIncidents.length > 0 ? (
                  filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{incident.type}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{incident.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {incident.location}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${incident.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          incident.severity === 'high' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                            incident.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                          {incident.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${incident.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                          incident.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${incident.status === 'resolved' ? 'bg-green-400' :
                            incident.status === 'in_progress' ? 'bg-blue-400' :
                              'bg-gray-400'
                            }`}></span>
                          {incident.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(incident.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {incident.status !== 'resolved' && (
                          <button
                            onClick={() => handleStatusUpdate(incident.id, 'resolved')}
                            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No incidents found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;