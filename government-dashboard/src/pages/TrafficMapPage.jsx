import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MapPin, ChevronLeft, RefreshCw, Layers, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { trafficService } from '../services/api';

const TrafficMapPage = () => {
    const { isAuthenticated } = useAuth();
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchTrafficData = async () => {
        try {
            setLoading(true);
            const data = await trafficService.getHeatmap();
            setHeatmapData(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching traffic data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchTrafficData();
            // Poll every 60 seconds
            const interval = setInterval(fetchTrafficData, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Traffic Monitor</h1>
                            <p className="text-blue-300">Real-time traffic density and congestion analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={fetchTrafficData}
                            disabled={loading}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="flex-1 bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden relative min-h-[600px]">
                    {/* Placeholder for actual map implementation */}
                    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                        <div className="text-center">
                            <div className="relative inline-block">
                                <MapPin className="w-24 h-24 text-blue-500 opacity-20 animate-pulse" />
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <Layers className="w-12 h-12 text-blue-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mt-4">Interactive Map Loading...</h3>
                            <p className="text-gray-400 mt-2">Connecting to traffic sensors and camera feeds</p>
                        </div>
                    </div>

                    {/* Overlay Stats */}
                    <div className="absolute top-4 right-4 w-80 space-y-4">
                        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl">
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                Congestion Alerts
                            </h4>
                            <div className="space-y-3">
                                {heatmapData.length > 0 ? (
                                    heatmapData.slice(0, 5).map((point, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-300">{point.region}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${point.congestion_level > 80 ? 'bg-red-500' :
                                                                point.congestion_level > 50 ? 'bg-orange-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${point.congestion_level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-mono">{point.congestion_level}%</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-2">No high congestion detected</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl">
                            <h4 className="font-bold mb-3">Legend</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-gray-300">Heavy Traffic (>80%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    <span className="text-gray-300">Moderate Traffic (50-80%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-gray-300">Light Traffic (&lt;50%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrafficMapPage;
