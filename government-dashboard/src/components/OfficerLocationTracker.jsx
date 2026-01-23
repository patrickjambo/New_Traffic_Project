import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Clock, User, Radio, Signal, Activity, Circle } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

/**
 * Real-time Officer Location Tracker Component
 * Shows live locations of all officers with their status
 */
const OfficerLocationTracker = ({ officers = [], deployments = [], onOfficerClick }) => {
    const { subscribe, isConnected } = useWebSocket();
    const [officerLocations, setOfficerLocations] = useState(new Map());
    const [lastUpdate, setLastUpdate] = useState(null);

    // Listen for real-time officer location updates
    useEffect(() => {
        if (!isConnected) return;

        const unsubLocation = subscribe('officer:location', (data) => {
            console.log('📍 Real-time officer location:', data);
            
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                newMap.set(data.officerId, {
                    ...data,
                    receivedAt: new Date(),
                    isOnline: true,
                });
                return newMap;
            });
            
            setLastUpdate(new Date());
        });

        return () => unsubLocation();
    }, [isConnected, subscribe]);

    // Mark officers as offline if no update in 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            
            setOfficerLocations(prev => {
                const newMap = new Map(prev);
                newMap.forEach((location, officerId) => {
                    if (location.receivedAt < twoMinutesAgo) {
                        newMap.set(officerId, { ...location, isOnline: false });
                    }
                });
                return newMap;
            });
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Get officer's active deployment
    const getOfficerDeployment = useCallback((officerId) => {
        return deployments.find(d => 
            d.officers?.some(o => o.id === officerId) && 
            !['Completed', 'Cancelled'].includes(d.status)
        );
    }, [deployments]);

    // Format time ago
    const formatTimeAgo = (date) => {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'en_route': return 'text-blue-500 bg-blue-100';
            case 'on_scene': return 'text-green-500 bg-green-100';
            case 'assigned': return 'text-yellow-500 bg-yellow-100';
            case 'available': return 'text-emerald-500 bg-emerald-100';
            default: return 'text-gray-500 bg-gray-100';
        }
    };

    // Get online/offline indicator
    const OnlineIndicator = ({ isOnline }) => (
        <span className={`inline-flex items-center ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
            <Circle className={`h-2 w-2 ${isOnline ? 'fill-green-500' : 'fill-gray-400'}`} />
        </span>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Radio className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Live Officer Tracking</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <Signal className={`h-4 w-4 ${isConnected ? 'text-green-300' : 'text-red-300'}`} />
                        <span>{isConnected ? 'Live' : 'Offline'}</span>
                        {lastUpdate && (
                            <span className="text-xs opacity-75">
                                · Updated {formatTimeAgo(lastUpdate)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    <span className="text-gray-600">
                        Online: {Array.from(officerLocations.values()).filter(l => l.isOnline).length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">
                        Active: {deployments.filter(d => d.status === 'Active').length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-indigo-500" />
                    <span className="text-gray-600">
                        En Route: {deployments.filter(d => 
                            d.officers?.some(o => o.status === 'en_route')
                        ).length}
                    </span>
                </div>
            </div>

            {/* Officers List */}
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {officers.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No officers available</p>
                    </div>
                ) : (
                    officers.map((officer) => {
                        const location = officerLocations.get(officer.id);
                        const deployment = getOfficerDeployment(officer.id);
                        const isOnline = location?.isOnline;

                        return (
                            <div
                                key={officer.id}
                                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    isOnline ? '' : 'opacity-60'
                                }`}
                                onClick={() => onOfficerClick?.(officer, location, deployment)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar with online indicator */}
                                        <div className="relative">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                                isOnline ? 'bg-green-500' : 'bg-gray-400'
                                            }`} />
                                        </div>

                                        {/* Officer Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {officer.full_name || officer.fullName || 'Unknown Officer'}
                                                </span>
                                                {officer.badge_number && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        #{officer.badge_number}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Location */}
                                            {location ? (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="truncate max-w-xs">
                                                        {location.address || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>Location not available</span>
                                                </div>
                                            )}

                                            {/* Current Deployment */}
                                            {deployment && (
                                                <div className="mt-2">
                                                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                                                        📋 {deployment.unit_name || deployment.unitName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - Status & Speed */}
                                    <div className="text-right">
                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                            getStatusColor(deployment?.officers?.find(o => o.id === officer.id)?.status || officer.status)
                                        }`}>
                                            {deployment?.officers?.find(o => o.id === officer.id)?.status || officer.status || 'Available'}
                                        </span>

                                        {/* Speed & Last Update */}
                                        {location && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                {location.speed > 0 && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Navigation className="h-3 w-3" />
                                                        <span>{Math.round(location.speed * 3.6)} km/h</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatTimeAgo(location.timestamp || location.receivedAt)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer with Map Link */}
            <div className="px-6 py-3 bg-gray-50 border-t">
                <button className="w-full py-2 text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                    🗺️ View All on Map
                </button>
            </div>
        </div>
    );
};

export default OfficerLocationTracker;
