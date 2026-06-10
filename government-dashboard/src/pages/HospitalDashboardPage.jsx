import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Siren, Bell, CheckCircle2, ChevronDown,
    Clock, LogOut, Map, MapPin, Phone, RefreshCw,
    Wifi, WifiOff, Zap, Heart, Eye, Navigation,
    Radio, AlertCircle, Download, FileSpreadsheet, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import axios from '../config/axios';
import toast from 'react-hot-toast';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const makeIcon = (color) => L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px ${color}aa;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

const ICONS = {
    critical: makeIcon('#ef4444'),
    ambulance: makeIcon('#f97316'),
    medical: makeIcon('#3b82f6'),
    ai: makeIcon('#8b5cf6'),
    default: makeIcon('#22d3ee'),
};

const TABS = [
    { id: 'all', label: 'All', icon: Eye },
    { id: 'ambulance', label: 'Siren', icon: Siren },
    { id: 'medical', label: 'Medical', icon: Heart },
    { id: 'ai', label: 'AI Detected', icon: Zap },
    { id: 'critical', label: 'Critical', icon: AlertTriangle },
    { id: 'pending', label: 'Awaiting', icon: Radio },
];

const needsSiren = (e) => {
    const services = Array.isArray(e.services_needed)
        ? e.services_needed
        : (typeof e.services_needed === 'string' ? JSON.parse(e.services_needed || '[]') : []);
    return services.some(s => typeof s === 'string' && s.toLowerCase().includes('ambulance'))
        || (e.emergency_type || e.type || '').toLowerCase() === 'medical'
        || (e.emergency_type || e.type || '').toLowerCase() === 'accident';
};

const severityBorder = {
    critical: 'border-red-500/60 shadow-red-500/10',
    high: 'border-orange-500/40',
    medium: 'border-yellow-500/30',
    low: 'border-slate-600/40',
};

const severityBadge = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/40',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

const statusBadge = {
    pending: 'bg-red-500/20 text-red-400',
    active: 'bg-orange-500/20 text-orange-400',
    dispatched: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-slate-500/20 text-slate-400',
};

const getMarkerIcon = (item) => {
    if (item.severity === 'critical') return ICONS.critical;
    if (item.source === 'ai') return ICONS.ai;
    if (needsSiren(item)) return ICONS.ambulance;
    if ((item.emergency_type || item.type || '').toLowerCase() === 'medical') return ICONS.medical;
    return ICONS.default;
};

const HospitalDashboardPage = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { subscribe, isConnected, onReconnect } = useWebSocket();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('all');
    const [showMap, setShowMap] = useState(true);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [showReports, setShowReports] = useState(false);
    const [reportPeriod, setReportPeriod] = useState('daily');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [loading, setLoading] = useState(true);

    const [emergencies, setEmergencies] = useState([]);
    const [aiIncidents, setAiIncidents] = useState([]);
    const [stats, setStats] = useState({ total: 0, ambulance: 0, medical: 0, ai: 0, critical: 0, pending: 0 });
    const [notifications, setNotifications] = useState([]);
    const unreadCount = notifications.filter(n => !n.read).length;

    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const feedRef = useRef(null);

    // Clock ticker
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = (e) => e.status !== 'resolved' && e.status !== 'cancelled';

    const computeStats = useCallback((emList, aiList) => {
        const active = emList.filter(isActive);
        setStats({
            total: active.length,
            ambulance: active.filter(needsSiren).length,
            medical: active.filter(e => (e.emergency_type || e.type || '').toLowerCase() === 'medical').length,
            ai: active.filter(e => e.source === 'ai' && needsSiren(e)).length,
            critical: active.filter(e => e.severity === 'critical').length,
            pending: active.filter(e => e.status === 'pending').length,
        });
    }, []);

    const fetchAll = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [emRes, incRes] = await Promise.all([
                axios.get('/api/emergency', { params: { limit: 100 } }),
                axios.get('/api/incidents', { params: { limit: 50 } }),
            ]);

            const allEm = emRes.data?.data || [];
            // Hospital admin: only ambulance/medical emergencies that are still active
            const emList = allEm.filter(needsSiren).filter(e => e.status !== 'resolved' && e.status !== 'cancelled');

            const incList = (incRes.data?.data || incRes.data || []);
            const aiList = Array.isArray(incList)
                ? incList.filter(i => i.source === 'ai' || i.ai_detected)
                : [];

            setEmergencies(emList);
            setAiIncidents(aiList);
            computeStats(emList, aiList);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Hospital fetch error:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [computeStats]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAll();
            const interval = setInterval(() => fetchAll(true), 15000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchAll]);

    // Reconnect recovery
    useEffect(() => {
        if (!onReconnect) return;
        return onReconnect(() => fetchAll(true));
    }, [onReconnect, fetchAll]);

    // Real-time WebSocket subscriptions
    useEffect(() => {
        if (!isAuthenticated) return;

        const addNotif = (msg, type = 'emergency') => {
            const n = { id: Date.now(), msg, type, time: new Date(), read: false };
            setNotifications(prev => [n, ...prev].slice(0, 30));
        };

        const unsubEmNew = subscribe('emergency:new', (data) => {
            // Only show to hospital admin if ambulance is needed
            if (!needsSiren(data)) return;
            const label = data.emergency_type || data.type || 'Emergency';
            toast.error(`🚨 New Emergency: ${label}`, { duration: 6000 });
            addNotif(`New emergency: ${label} at ${data.location_name || 'Unknown'}`, 'emergency');
            setEmergencies(prev => {
                const exists = prev.find(e => e.id === data.id);
                const updated = exists ? prev : [data, ...prev];
                computeStats(updated, aiIncidents);
                return updated;
            });
            fetchAll(true);
        });

        const unsubEmUpdate = subscribe('emergency:update', (data) => {
            const emId = data.id || data.emergencyId;
            const newStatus = data.status;
            if (newStatus === 'resolved' || newStatus === 'cancelled') {
                setEmergencies(prev => {
                    const updated = prev.filter(e => e.id !== emId && e.id !== parseInt(emId));
                    computeStats(updated, aiIncidents);
                    return updated;
                });
            } else {
                setEmergencies(prev => {
                    const updated = prev.map(e => (e.id === emId) ? { ...e, ...data, status: newStatus || e.status } : e);
                    computeStats(updated, aiIncidents);
                    return updated;
                });
            }
        });

        const unsubEmStatusChange = subscribe('emergency:status_changed', (data) => {
            const emId = data.emergencyId || data.id;
            const newStatus = data.newStatus || data.status;
            if (newStatus === 'resolved' || newStatus === 'cancelled') {
                setEmergencies(prev => {
                    const updated = prev.filter(e => e.id !== emId && e.id !== parseInt(emId));
                    computeStats(updated, aiIncidents);
                    return updated;
                });
            } else {
                setEmergencies(prev => {
                    const updated = prev.map(e => (e.id === emId) ? { ...e, status: newStatus || e.status } : e);
                    computeStats(updated, aiIncidents);
                    return updated;
                });
            }
        });

        const unsubAI = subscribe('ai:incident_detected', (data) => {
            toast(`🤖 AI Detected: ${data.type || 'Incident'}`, { icon: '🤖', duration: 5000 });
            addNotif(`AI detected: ${data.type || 'incident'} at ${data.address || data.location || 'Unknown'}`, 'ai');
            setAiIncidents(prev => {
                const updated = [data, ...prev];
                computeStats(emergencies, updated);
                return updated;
            });
        });

        const unsubIncNew = subscribe('incident:new', (data) => {
            if (data.source === 'ai' || data.ai_detected) {
                addNotif(`New AI incident: ${data.incident_type || data.type || 'incident'} at ${data.address || 'Unknown'}`, 'ai');
                setAiIncidents(prev => {
                    const updated = [data, ...prev];
                    computeStats(emergencies, updated);
                    return updated;
                });
            }
        });

        return () => {
            unsubEmNew();
            unsubEmUpdate();
            unsubEmStatusChange();
            unsubAI();
            unsubIncNew();
        };
    }, [isAuthenticated, subscribe, computeStats, emergencies, aiIncidents, fetchAll]);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'hospital_admin') return <Navigate to="/login" replace />;

    // Filter logic — resolved/cancelled are never shown on any tab
    const filteredEmergencies = emergencies.filter(e => {
        if (e.status === 'resolved' || e.status === 'cancelled') return false;
        if (activeTab === 'ambulance') return needsSiren(e);
        if (activeTab === 'medical') return (e.emergency_type || e.type || '').toLowerCase() === 'medical';
        if (activeTab === 'ai') return e.source === 'ai' && needsSiren(e);
        if (activeTab === 'critical') return e.severity === 'critical';
        if (activeTab === 'pending') return e.status === 'pending';
        return true;
    });

    // All map points: active emergencies + AI incidents (no resolved/cancelled pins)
    const mapPoints = [
        ...emergencies.filter(e => e.latitude && e.longitude && e.status !== 'resolved' && e.status !== 'cancelled').map(e => ({ ...e, _kind: 'emergency' })),
        ...aiIncidents.filter(i => i.latitude && i.longitude).map(i => ({ ...i, _kind: 'ai' })),
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
        toast.success('Logged out');
    };

    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const handleStatCardClick = (tab) => {
        setActiveTab(tab);
        setTimeout(() => feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const getPeriodSince = () => {
        const now = new Date();
        if (reportPeriod === 'daily') return new Date(now - 24 * 60 * 60 * 1000);
        if (reportPeriod === 'weekly') return new Date(now - 7 * 24 * 60 * 60 * 1000);
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
    };

    const getReportData = () => {
        const since = getPeriodSince();
        return emergencies.filter(e => e.created_at && new Date(e.created_at) >= since);
    };

    const exportToExcel = () => {
        const since = getPeriodSince();
        const data = getReportData();
        const allIncidents = aiIncidents.filter(i => i.created_at && new Date(i.created_at) >= since);

        const emSheet = data.map(e => {
            let services = [];
            try { services = Array.isArray(e.services_needed) ? e.services_needed : JSON.parse(e.services_needed || '[]'); } catch {}
            return {
                'ID': e.id,
                'Type': e.emergency_type || e.type || 'Unknown',
                'Severity': e.severity || 'N/A',
                'Status': e.status || 'N/A',
                'Location': e.location_name || 'N/A',
                'Date / Time': e.created_at ? new Date(e.created_at).toLocaleString('en-GB') : '',
                'Description': e.description || '',
                'Casualties': e.casualties_count || 0,
                'Vehicles Involved': e.vehicles_involved || 0,
                'Services Needed': services.join(', '),
                'Reporter': e.reporter_name || 'Anonymous',
                'Contact Phone': e.contact_phone || '',
                'Source': e.source || 'manual',
                'Siren Required': needsSiren(e) ? 'Yes' : 'No',
            };
        });

        const aiSheet = allIncidents.map(i => ({
            'ID': i.id,
            'Type': i.incident_type || i.type || 'Unknown',
            'Severity': i.severity || 'N/A',
            'Status': i.status || 'N/A',
            'Location': i.address || i.location_name || 'N/A',
            'Date / Time': i.created_at ? new Date(i.created_at).toLocaleString('en-GB') : '',
            'Confidence': i.confidence ? `${Math.round(i.confidence * 100)}%` : 'N/A',
            'Vehicles in Frame': i.vehicle_count || 0,
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emSheet.length ? emSheet : [{ Note: 'No data for this period' }]), 'Emergency Reports');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aiSheet.length ? aiSheet : [{ Note: 'No data for this period' }]), 'AI Incidents');

        const periodLabel = reportPeriod === 'daily' ? 'daily' : reportPeriod === 'weekly' ? 'weekly' : 'monthly';
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `hospital_report_${periodLabel}_${dateStr}.xlsx`);
        toast.success(`${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} report exported`);
    };

    const statCards = [
        { label: 'Total Emergencies', value: stats.total, icon: AlertCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', tab: 'all' },
        { label: 'Siren Needed', value: stats.ambulance, icon: Siren, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', tab: 'ambulance' },
        { label: 'Medical Reports', value: stats.medical, icon: Heart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', tab: 'medical' },
        { label: 'AI Detected', value: stats.ai, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', tab: 'ai' },
        { label: 'Critical Alerts', value: stats.critical, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', tab: 'critical' },
        { label: 'Awaiting Response', value: stats.pending, icon: Radio, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', tab: 'pending' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">

            {/* ─── TOP HEADER ─── */}
            <header className="bg-slate-900 border-b border-white/5 px-6 py-0 h-16 flex items-center justify-between z-40 flex-shrink-0 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/30">
                        <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-white leading-none">Hospital Emergency Dashboard</h1>
                        <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Medical Response Command Center</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${isConnected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </div>

                    {/* Clock */}
                    <div className="hidden md:flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-white/5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-mono font-bold text-white">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchAll(false)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-gray-400 hover:text-white transition-all"
                        title="Refresh data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifPanel(!showNotifPanel)}
                            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-gray-400 hover:text-white transition-all"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                    <span className="font-bold text-sm text-white">Notifications</span>
                                    <button onClick={markAllRead} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase">Mark all read</button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-gray-600 text-sm">No notifications</div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className={`px-4 py-3 border-b border-white/5 ${!n.read ? 'bg-red-500/5' : ''}`}>
                                            <div className="flex gap-2 items-start">
                                                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.type === 'emergency' ? 'bg-red-500' : 'bg-violet-500'}`} />
                                                <div>
                                                    <p className="text-xs text-gray-200">{n.msg}</p>
                                                    <p className="text-[10px] text-gray-600 mt-0.5">{n.time.toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setShowProfile(!showProfile)}
                            className="flex items-center gap-2 pl-3 border-l border-white/10 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center font-black text-white text-sm">
                                {(user?.full_name || user?.fullName || 'H').charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-bold text-white leading-none">{user?.full_name || user?.fullName || 'Hospital Admin'}</p>
                                <p className="text-[10px] text-cyan-400 font-bold uppercase">Hospital Admin</p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
                        </button>

                        {showProfile && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-2">
                                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-white/5 mb-1">
                                        {user?.email}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ─── MAIN CONTENT ─── */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Stats Grid — clickable, navigate to filtered feed */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                    {statCards.map((card, i) => (
                        <button
                            key={i}
                            onClick={() => handleStatCardClick(card.tab)}
                            className={`bg-slate-900/80 border ${card.border} rounded-2xl p-4 hover:bg-slate-800/80 hover:scale-[1.03] active:scale-100 transition-all text-left cursor-pointer group w-full ${activeTab === card.tab ? 'ring-2 ring-offset-1 ring-offset-slate-950 ' + card.border.replace('border-', 'ring-') : ''}`}
                        >
                            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div className={`text-3xl font-black ${card.color}`}>{card.value}</div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-1">{card.label}</p>
                            <p className="text-gray-600 text-[9px] mt-1 group-hover:text-gray-400 transition-colors">Click to filter ↓</p>
                        </button>
                    ))}
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 border border-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.id !== 'all' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700'}`}>
                                    {tab.id === 'ambulance' && stats.ambulance}
                                    {tab.id === 'medical' && stats.medical}
                                    {tab.id === 'ai' && stats.ai}
                                    {tab.id === 'critical' && stats.critical}
                                    {tab.id === 'pending' && stats.pending}
                                </span>
                            )}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowMap(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showMap ? 'bg-slate-700 text-white border border-white/10' : 'bg-slate-800 text-gray-400 hover:text-white border border-white/5'}`}
                        >
                            <Map className="w-4 h-4" />
                            {showMap ? 'Hide Map' : 'Show Map'}
                        </button>
                        <button
                            onClick={() => setShowReports(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showReports ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-800 text-gray-400 hover:text-white border border-white/5'}`}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Reports
                        </button>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                        Updated {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>

                {/* Two-column layout: Feed + Map */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ── Emergency Feed ── */}
                    <div ref={feedRef} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-cyan-400" />
                                Emergency Reports
                                <span className="text-xs font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                                    {filteredEmergencies.length}
                                </span>
                            </h2>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
                                <p className="text-gray-500 text-sm animate-pulse">Loading emergency data...</p>
                            </div>
                        ) : filteredEmergencies.length === 0 ? (
                            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-dashed border-white/5">
                                <CheckCircle2 className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-gray-500 font-bold">No emergencies in this category</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredEmergencies.map(em => (
                                    <EmergencyCard key={em.id} em={em} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right Column: Map + AI Incidents ── */}
                    <div className="space-y-6">

                        {/* Live Map */}
                        {showMap && (
                            <div className="bg-slate-900/80 border border-white/5 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                    <h2 className="text-sm font-black text-white flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-cyan-400" />
                                        Live Incident Map
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    </h2>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Siren</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> AI</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Other</span>
                                    </div>
                                </div>
                                <div style={{ height: '320px' }}>
                                    <MapContainer
                                        center={[-1.9536, 30.0606]}
                                        zoom={12}
                                        style={{ height: '100%', width: '100%' }}
                                        zoomControl={true}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        {mapPoints.map((pt, i) => (
                                            <Marker
                                                key={`${pt._kind}-${pt.id}-${i}`}
                                                position={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
                                                icon={getMarkerIcon(pt)}
                                            >
                                                <Popup>
                                                    <div className="p-1 min-w-[180px]">
                                                        <div className="font-bold text-sm mb-1">
                                                            {pt.emergency_type || pt.incident_type || pt.type || 'Incident'}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mb-1">
                                                            {pt.location_name || pt.address || 'Unknown location'}
                                                        </div>
                                                        {pt.severity && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pt.severity === 'critical' ? 'bg-red-100 text-red-700' : pt.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {pt.severity.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {pt.casualties_count > 0 && (
                                                            <div className="text-xs text-red-600 mt-1 font-bold">
                                                                {pt.casualties_count} Casualties
                                                            </div>
                                                        )}
                                                        {needsSiren(pt) && (
                                                            <div className="text-xs text-orange-600 mt-1 font-bold flex items-center gap-1">
                                                                🚑 Siren Needed
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 mt-1">
                                                            {pt.created_at ? new Date(pt.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                                <div className="px-4 py-2 border-t border-white/5 text-[10px] text-gray-600 font-medium">
                                    {mapPoints.length} locations plotted • Click a marker for details
                                </div>
                            </div>
                        )}

                        {/* AI Incidents Panel */}
                        <div className="bg-slate-900/80 border border-violet-500/20 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <h2 className="text-sm font-black text-white flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-violet-400" />
                                    AI Incident Reports
                                    <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">{aiIncidents.filter(needsSiren).length}</span>
                                </h2>
                                <span className="text-[10px] text-violet-400/60 font-bold uppercase">Ambulance Required</span>
                            </div>
                            {aiIncidents.filter(needsSiren).length === 0 ? (
                                <div className="py-8 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">
                                    No AI-detected incidents requiring ambulance
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                                    {aiIncidents.filter(needsSiren).slice(0, 20).map((inc, i) => (
                                        <AIIncidentRow key={inc.id || i} inc={inc} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── REPORTS PANEL ─── */}
                {showReports && <ReportsPanel
                    emergencies={emergencies}
                    aiIncidents={aiIncidents}
                    reportPeriod={reportPeriod}
                    setReportPeriod={setReportPeriod}
                    exportToExcel={exportToExcel}
                    getReportData={getReportData}
                    getPeriodSince={getPeriodSince}
                    needsSiren={needsSiren}
                />}

            </main>
        </div>
    );
};

/* ─── Emergency Card ─── */
const EmergencyCard = ({ em }) => {
    const services = (() => {
        try {
            return Array.isArray(em.services_needed)
                ? em.services_needed
                : JSON.parse(em.services_needed || '[]');
        } catch { return []; }
    })();

    const ambulanceNeeded = needsSiren(em);
    const timeStr = em.created_at
        ? new Date(em.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        : 'Just now';

    return (
        <div className={`bg-slate-900 border rounded-2xl p-4 transition-all hover:translate-y-[-2px] ${severityBorder[em.severity] || 'border-white/5'} ${em.severity === 'critical' ? 'shadow-lg shadow-red-500/10' : ''}`}>
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider ${severityBadge[em.severity] || severityBadge.low}`}>
                        {em.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge[em.status] || 'bg-slate-500/20 text-slate-400'}`}>
                        {em.status}
                    </span>
                    {em.source === 'ai' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-500/20 text-violet-400 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> AI
                        </span>
                    )}
                    {ambulanceNeeded && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-orange-500/20 text-orange-400 flex items-center gap-1 animate-pulse">
                            🚑 Siren
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-gray-600 font-medium flex-shrink-0 ml-2">{timeStr}</span>
            </div>

            {/* Type + Description */}
            <h3 className="font-black text-white text-base leading-tight capitalize mb-1">
                {em.emergency_type || em.type || 'Emergency'}
            </h3>
            {em.description && (
                <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">{em.description}</p>
            )}

            {/* Details */}
            <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{em.location_name || 'Location not specified'}</span>
                </div>
                {em.contact_phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span>{em.contact_phone}</span>
                    </div>
                )}
                {(em.casualties_count > 0 || em.vehicles_involved > 0) && (
                    <div className="flex items-center gap-3 text-xs">
                        {em.casualties_count > 0 && (
                            <span className="flex items-center gap-1 text-red-400 font-bold">
                                <Heart className="w-3 h-3" /> {em.casualties_count} {em.casualties_count === 1 ? 'Casualty' : 'Casualties'}
                            </span>
                        )}
                        {em.vehicles_involved > 0 && (
                            <span className="text-gray-500">{em.vehicles_involved} vehicle{em.vehicles_involved !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Services badges */}
            {services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {services.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-gray-400 border border-white/5 capitalize">
                            {s}
                        </span>
                    ))}
                </div>
            )}

            {/* Reporter */}
            {em.reporter_name && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-600 font-medium">
                    Reported by {em.reporter_name}
                    {em.assigned_to_name && <span className="ml-2 text-green-500">• Assigned to {em.assigned_to_name}</span>}
                </div>
            )}
        </div>
    );
};

/* ─── AI Incident Row ─── */
const AIIncidentRow = ({ inc }) => {
    const confidence = inc.confidence ? `${Math.round(inc.confidence * 100)}%` : null;
    return (
        <div className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white capitalize truncate">
                            {inc.incident_type || inc.type || 'AI Incident'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-500 truncate">{inc.address || inc.location_name || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {confidence && (
                        <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                            {confidence}
                        </span>
                    )}
                    {inc.severity && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${severityBadge[inc.severity] || severityBadge.low}`}>
                            {inc.severity}
                        </span>
                    )}
                    <span className="text-[10px] text-gray-600">
                        {inc.created_at ? new Date(inc.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                    </span>
                </div>
            </div>
        </div>
    );
};

/* ─── Reports Panel ─── */
const ReportsPanel = ({ emergencies, aiIncidents, reportPeriod, setReportPeriod, exportToExcel, getReportData, getPeriodSince, needsSiren }) => {
    const data = getReportData();
    const since = getPeriodSince();
    const aiData = aiIncidents.filter(i => i.created_at && new Date(i.created_at) >= since);

    const summary = {
        total: data.length,
        critical: data.filter(e => e.severity === 'critical').length,
        siren: data.filter(needsSiren).length,
        medical: data.filter(e => (e.emergency_type || e.type || '').toLowerCase() === 'medical').length,
        resolved: data.filter(e => e.status === 'resolved').length,
        pending: data.filter(e => e.status === 'pending').length,
        ai: aiData.length,
        casualties: data.reduce((sum, e) => sum + (parseInt(e.casualties_count) || 0), 0),
    };

    const periods = [
        { id: 'daily', label: 'Today (24h)' },
        { id: 'weekly', label: 'This Week (7d)' },
        { id: 'monthly', label: 'This Month (30d)' },
    ];

    const summaryCards = [
        { label: 'Total Emergencies', value: summary.total, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Critical', value: summary.critical, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Siren Required', value: summary.siren, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Medical', value: summary.medical, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Resolved', value: summary.resolved, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Pending', value: summary.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: 'AI Detected', value: summary.ai, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Total Casualties', value: summary.casualties, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    ];

    return (
        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                    Emergency Reports
                    <span className="text-xs font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{data.length} records</span>
                </h2>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Period selector */}
                <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-400">Report Period:</span>
                    <div className="flex gap-2">
                        {periods.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setReportPeriod(p.id)}
                                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${reportPeriod === p.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-800 text-gray-400 hover:text-white border border-white/5'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                    {summaryCards.map((card, i) => (
                        <div key={i} className={`${card.bg} rounded-xl p-3 text-center`}>
                            <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider mt-0.5">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Preview table */}
                {data.length === 0 ? (
                    <div className="text-center py-10 text-gray-600 font-bold text-sm border border-dashed border-white/5 rounded-xl">
                        No emergencies recorded in this period
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-800/80">
                                <tr>
                                    {['Date/Time', 'Type', 'Severity', 'Status', 'Location', 'Casualties', 'Siren', 'Source'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.slice(0, 15).map(e => (
                                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                            {e.created_at ? new Date(e.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-white font-medium capitalize">{e.emergency_type || e.type || 'Unknown'}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                                e.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                e.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                e.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>{e.severity}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                                e.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                                e.status === 'pending' ? 'bg-red-500/20 text-red-400' :
                                                e.status === 'dispatched' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>{e.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate">{e.location_name || 'N/A'}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`font-bold ${parseInt(e.casualties_count) > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                                                {e.casualties_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`font-bold text-[10px] ${needsSiren(e) ? 'text-orange-400' : 'text-gray-600'}`}>
                                                {needsSiren(e) ? '🚨 Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${e.source === 'ai' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                {e.source || 'manual'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.length > 15 && (
                            <div className="px-4 py-2 text-center text-xs text-gray-600 border-t border-white/5">
                                Showing 15 of {data.length} records — export Excel for full data
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalDashboardPage;
