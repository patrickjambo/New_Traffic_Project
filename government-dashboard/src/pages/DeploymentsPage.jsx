import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, MapPin, Clock, Shield, Plus, Search, Filter, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deploymentService } from '../services/api';

const DeploymentsPage = () => {
    const { isAuthenticated } = useAuth();
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const fetchDeployments = async () => {
            try {
                setLoading(true);
                const data = await deploymentService.getAll();
                setDeployments(data);
            } catch (error) {
                console.error('Error fetching deployments:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchDeployments();
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    const filteredDeployments = deployments.filter(d => {
        const matchesSearch = d.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.address && d.address.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterStatus === 'All' || d.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Standby': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'Completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'Cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Deployment Management</h1>
                            <p className="text-blue-300">Manage police units and officer assignments</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium">
                        <Plus className="w-5 h-5" />
                        New Deployment
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 mb-6 border border-white/10 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search units or locations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="text-gray-400 w-5 h-5" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Standby">Standby</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>

                {/* Deployments Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading deployments...</p>
                    </div>
                ) : filteredDeployments.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">No Deployments Found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDeployments.map((deployment) => (
                            <div key={deployment.id} className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-blue-500/30 transition-all hover:bg-white/10 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{deployment.unit_name}</h3>
                                            <div className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(deployment.status)} inline-block mt-1`}>
                                                {deployment.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">{deployment.address || 'No location specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">Started: {new Date(deployment.start_time).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Shield className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">{deployment.officers?.length || 0} Officers Assigned</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div className="flex -space-x-2">
                                        {deployment.officers?.slice(0, 3).map((officer, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold" title={officer.fullName}>
                                                {officer.fullName.charAt(0)}
                                            </div>
                                        ))}
                                        {deployment.officers?.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold">
                                                +{deployment.officers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                                        View Details →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeploymentsPage;
