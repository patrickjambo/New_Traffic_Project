import React from 'react';
import { MapPin, Clock, AlertTriangle, CheckCircle, Info, Activity, Camera } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../context/DataContext';

const DailyIncidentsModal = ({ isOpen, onClose }) => {
    const { incidents, emergencies } = useData();

    // Filter for today's incidents
    const today = new Date().toDateString();

    const todayIncidents = (Array.isArray(incidents) ? incidents : []).filter(inc => {
        if (!inc || !inc.created_at) return false;
        try {
            return new Date(inc.created_at).toDateString() === today;
        } catch (e) {
            return false;
        }
    });

    const todayEmergencies = (Array.isArray(emergencies) ? emergencies : []).filter(em => {
        if (!em || !em.created_at) return false;
        try {
            return new Date(em.created_at).toDateString() === today;
        } catch (e) {
            return false;
        }
    });

    const allToday = [...todayIncidents, ...todayEmergencies].sort((a, b) => {
        try {
            return new Date(b.created_at) - new Date(a.created_at);
        } catch (e) {
            return 0;
        }
    });

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'text-red-600 bg-red-50 border-red-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'in_progress': return <Activity className="w-4 h-4 text-blue-500" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Today's Traffic Incidents">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-800">
                        <Info className="w-5 h-5" />
                        <span className="font-semibold">Daily Summary</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                        {allToday.length} Incidents Reported
                    </span>
                </div>

                {allToday.length > 0 ? (
                    <div className="space-y-3">
                        {allToday.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all border-l-4"
                                style={{ borderLeftColor: item.severity === 'critical' ? '#ef4444' : item.severity === 'high' ? '#f97316' : '#3b82f6' }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                            {item.incident_type || item.type || 'Traffic Incident'}
                                            {item.source === 'mobile_app' && (
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                    <Camera className="w-3 h-3" /> AI
                                                </span>
                                            )}
                                        </h4>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {item.location || 'Kigali'}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase ${getSeverityColor(item.severity)}`}>
                                        {item.severity || 'Low'}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {item.description || 'No additional details provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center text-xs text-gray-400">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                            {getStatusIcon(item.status)}
                                            {item.status?.replace('_', ' ') || 'Pending'}
                                        </div>
                                    </div>
                                    {item.status === 'resolved' && (
                                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                            RESOLVED
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No incidents reported today</p>
                        <p className="text-sm text-gray-400">All roads are currently clear.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DailyIncidentsModal;
