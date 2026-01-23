import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Users,
    MapPin,
    Clock,
    Shield,
    Plus,
    Search,
    Filter,
    ChevronLeft,
    X,
    MoreVertical,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Activity,
    BarChart3,
    Bell,
    Radio,
    Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { deploymentService, incidentService, emergencyService, adminService } from '../services/api';
import OfficerLocationTracker from '../components/OfficerLocationTracker';
import toast from 'react-hot-toast';

const DeploymentsPage = () => {
    const { isAuthenticated } = useAuth();
    const { subscribe, isConnected } = useWebSocket();
    const [deployments, setDeployments] = useState([]);
    const [stats, setStats] = useState({
        total_deployments: 0,
        active_deployments: 0,
        standby_deployments: 0,
        pending_acknowledgments: 0,
        total_officers_deployed: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // New Deployment Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableOfficers, setAvailableOfficers] = useState([]);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        unitName: '',
        address: '',
        selectedOfficers: [],
        linkedEvent: null // { type: 'incident'|'emergency', id: number }
    });

    // Active Events for Auto-fill
    const [activeEvents, setActiveEvents] = useState([]);
    const [isManageOfficersOpen, setIsManageOfficersOpen] = useState(false);
    const [isAddOfficerModalOpen, setIsAddOfficerModalOpen] = useState(false);
    const [selectedDeployment, setSelectedDeployment] = useState(null);
    const [addOfficerFormData, setAddOfficerFormData] = useState({
        email: '',
        full_name: '',
        password: 'password123',
        badge_number: '',
        unit: 'Traffic Unit',
        phone: ''
    });

    // Live Officer Tracking State
    const [showOfficerTracker, setShowOfficerTracker] = useState(true);
    const [officerLocations, setOfficerLocations] = useState(new Map());

    const fetchDeployments = async () => {
        try {
            setLoading(true);
            const response = await deploymentService.getAll();
            setDeployments(response.data || []);
        } catch (error) {
            console.error('Error fetching deployments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await deploymentService.getStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchAvailableOfficers = async () => {
        try {
            const response = await deploymentService.getAvailableOfficers();
            setAvailableOfficers(response.data || []);
        } catch (error) {
            console.error('Error fetching available officers:', error);
        }
    };

    const fetchActiveEvents = async () => {
        try {
            console.log('Fetching active events...');
            const [incidentsRes, emergenciesRes] = await Promise.all([
                incidentService.getAll({ status: 'reported' }),
                emergencyService.getAll()
            ]);

            console.log('Incidents Res:', incidentsRes);
            console.log('Emergencies Res:', emergenciesRes);

            const activeIncidents = (incidentsRes.data || incidentsRes || []).map(i => ({
                ...i,
                eventType: 'incident',
                label: i.incident_type || i.type,
                location: i.address,
                severity: i.severity || 'medium'
            }));

            const activeEmergencies = (emergenciesRes.data || emergenciesRes || [])
                .filter(e => ['pending', 'active', 'dispatched'].includes(e.status))
                .map(e => ({
                    ...e,
                    eventType: 'emergency',
                    label: e.emergency_type,
                    location: e.location_name,
                    severity: e.severity || 'high'
                }));

            const events = [...activeIncidents, ...activeEmergencies];
            console.log('Processed Events:', events);
            setActiveEvents(events);
        } catch (error) {
            console.error('Error fetching active events:', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchDeployments();
            fetchStats();
            fetchAvailableOfficers(); // Load officers for tracker
        }
    }, [isAuthenticated]);

    // Real-time WebSocket subscriptions for deployment updates
    useEffect(() => {
        if (!isAuthenticated) return;

        // Listen for officer acknowledgments
        const unsubAck = subscribe('deployment:acknowledged', (data) => {
            console.log('📬 Officer acknowledged deployment:', data);
            toast.success(
                `${data.officerName || 'Officer'} acknowledged deployment`,
                { icon: '✅', duration: 4000 }
            );
            
            // Update local state
            setDeployments(prev => prev.map(d => {
                if (d.id === data.deploymentId && d.officers) {
                    return {
                        ...d,
                        officers: d.officers.map(o => 
                            o.id === data.officerId 
                                ? { ...o, acknowledged: true, acknowledgedAt: data.acknowledgedAt }
                                : o
                        )
                    };
                }
                return d;
            }));
            
            // Refresh stats
            fetchStats();
        });

        // Listen for officer status updates
        const unsubStatus = subscribe('deployment:officer_status', (data) => {
            console.log('📍 Officer status update:', data);
            toast(
                `${data.officerName || 'Officer'}: ${data.status.replace('_', ' ')}`,
                { icon: data.status === 'on_scene' ? '📍' : (data.status === 'completed' ? '✅' : '🚗') }
            );
            
            // Update local state
            setDeployments(prev => prev.map(d => {
                if (d.id === data.deploymentId && d.officers) {
                    return {
                        ...d,
                        officers: d.officers.map(o => 
                            o.id === data.officerId 
                                ? { ...o, status: data.status }
                                : o
                        )
                    };
                }
                return d;
            }));
        });

        // Listen for new deployments
        const unsubNew = subscribe('deployment:new', (data) => {
            console.log('🆕 New deployment:', data);
            fetchDeployments();
            fetchStats();
        });

        // Listen for deployment updates
        const unsubUpdate = subscribe('deployment:update', (data) => {
            console.log('🔄 Deployment updated:', data);
            fetchDeployments();
        });

        // Listen for real-time officer location updates
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
        });

        return () => {
            unsubAck();
            unsubStatus();
            unsubNew();
            unsubUpdate();
            unsubLocation();
        };
    }, [isAuthenticated, subscribe]);

    useEffect(() => {
        if (isModalOpen || isManageOfficersOpen) {
            fetchAvailableOfficers();
            if (isModalOpen) {
                fetchActiveEvents();
                // Default autonomous unit name
                if (!formData.unitName) {
                    const units = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
                    const randomUnit = units[Math.floor(Math.random() * units.length)];
                    setFormData(prev => ({ ...prev, unitName: `Unit ${randomUnit}-${Math.floor(Math.random() * 99) + 1}` }));
                }
            }
        }
    }, [isModalOpen, isManageOfficersOpen]);

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    const handleCreateDeployment = async (e) => {
        e.preventDefault();
        try {
            setFormLoading(true);
            const payload = {
                unitName: formData.unitName,
                location: {
                    address: formData.address,
                    latitude: -1.9441, // Default Kigali coordinates
                    longitude: 30.0619
                },
                officers: formData.selectedOfficers,
                status: 'Active'
            };

            await deploymentService.create({
                ...payload,
                incidentId: formData.linkedEvent?.eventType === 'incident' ? formData.linkedEvent.id : null,
                emergencyId: formData.linkedEvent?.eventType === 'emergency' ? formData.linkedEvent.id : null
            });
            setIsModalOpen(false);
            setFormData({ unitName: '', address: '', selectedOfficers: [], linkedEvent: null });
            fetchDeployments();
            fetchStats();
        } catch (error) {
            console.error('Error creating deployment:', error);
            alert('Failed to create deployment. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await deploymentService.updateStatus(id, newStatus);
            fetchDeployments();
            fetchStats();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleDeleteDeployment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) {
            return;
        }
        try {
            await deploymentService.delete(id);
            fetchDeployments();
            fetchStats();
        } catch (error) {
            console.error('Error deleting deployment:', error);
            alert('Failed to delete deployment');
        }
    };

    const toggleOfficer = (officerId) => {
        setFormData(prev => ({
            ...prev,
            selectedOfficers: prev.selectedOfficers.includes(officerId)
                ? prev.selectedOfficers.filter(id => id !== officerId)
                : [...prev.selectedOfficers, officerId]
        }));
    };

    const handleSelectAllOfficers = () => {
        setFormData(prev => ({
            ...prev,
            selectedOfficers: availableOfficers.map(o => o.id)
        }));
    };

    const handleClearAllOfficers = () => {
        setFormData(prev => ({
            ...prev,
            selectedOfficers: []
        }));
    };

    const handleEventSelect = (event) => {
        if (!event) {
            setFormData(prev => ({ ...prev, linkedEvent: null }));
            return;
        }

        // Autonomous Unit Naming
        const unitPrefix = event.eventType === 'incident' ? 'Traffic' : 'Emergency';
        const eventType = (event.incident_type || event.emergency_type || 'Unit').toLowerCase();
        const suggestedName = `${unitPrefix} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} - Unit ${Math.floor(Math.random() * 99) + 1}`;

        setFormData(prev => ({
            ...prev,
            unitName: suggestedName,
            address: event.eventType === 'incident' ? event.address : event.location_name,
            linkedEvent: event
        }));
    };

    const handleAddOfficer = async (e) => {
        e.preventDefault();
        try {
            setFormLoading(true);
            await adminService.createOfficer(addOfficerFormData);
            setIsAddOfficerModalOpen(false);
            setAddOfficerFormData({
                email: '',
                full_name: '',
                password: 'password123',
                badge_number: '',
                unit: 'Traffic Unit',
                phone: ''
            });
            fetchAvailableOfficers();
        } catch (error) {
            console.error('Error adding officer:', error);
            alert(error.response?.data?.message || 'Failed to add officer');
        } finally {
            setFormLoading(false);
        }
    };

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

    const statCards = [
        { label: 'Total Units', value: stats.total_deployments, icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Active Now', value: stats.active_deployments, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Pending Ack', value: stats.pending_acknowledgments || 0, icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Total Officers', value: stats.total_officers_deployed, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
            {/* Background Watermark */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-5">
                <img src="/rnp-logo.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] object-contain" alt="" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                            <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-white" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">Deployment Management</h1>
                            <p className="text-blue-400/80 font-medium">Real-time police unit coordination & oversight</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowOfficerTracker(!showOfficerTracker)}
                            className={`flex items-center justify-center gap-2 px-4 py-3.5 ${
                                showOfficerTracker 
                                    ? 'bg-indigo-600 hover:bg-indigo-500' 
                                    : 'bg-white/5 hover:bg-white/10'
                            } rounded-2xl transition-all font-bold active:scale-95`}
                            title="Toggle Live Officer Tracking"
                        >
                            <Radio className={`w-5 h-5 ${showOfficerTracker ? 'animate-pulse' : ''}`} />
                            <span className="hidden sm:inline">Live Tracking</span>
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-all font-bold shadow-lg shadow-blue-600/25 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            New Deployment
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {statCards.map((card, idx) => (
                        <div key={idx} className="bg-slate-800/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl hover:bg-slate-800/60 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${card.bg}`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <BarChart3 className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                            </div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{card.label}</p>
                            <div className="text-3xl font-black text-white">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Live Officer Tracking Panel */}
                {showOfficerTracker && (
                    <div className="mb-8 animate-in slide-in-from-top duration-300">
                        <OfficerLocationTracker
                            officers={availableOfficers}
                            deployments={deployments}
                            onOfficerClick={(officer, location, deployment) => {
                                console.log('Officer clicked:', officer, location, deployment);
                                if (deployment) {
                                    toast(`${officer.full_name || officer.fullName} is on ${deployment.unit_name || deployment.unitName}`, {
                                        icon: '👮',
                                        duration: 3000,
                                    });
                                }
                            }}
                        />
                    </div>
                )}

                {/* Filters & Search */}
                <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-5 mb-8 border border-white/5 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search units, locations, or officers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-2">
                            <Filter className="text-gray-500 w-4 h-4" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer"
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Standby">Standby</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            Showing {filteredDeployments.length} results
                        </div>
                    </div>
                </div>

                {/* Deployments Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-medium animate-pulse">Synchronizing deployment data...</p>
                    </div>
                ) : filteredDeployments.length === 0 ? (
                    <div className="text-center py-24 bg-slate-800/20 rounded-3xl border border-dashed border-white/10">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-300 mb-2">No Deployments Found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Adjust your search or filters to find what you're looking for.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredDeployments.map((deployment) => (
                            <div key={deployment.id} className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 border border-white/5 hover:border-blue-500/30 transition-all hover:translate-y-[-4px] group relative overflow-hidden">
                                {/* Status Indicator Line */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${deployment.status === 'Active' ? 'bg-green-500' :
                                    deployment.status === 'Standby' ? 'bg-yellow-500' :
                                        deployment.status === 'Completed' ? 'bg-blue-500' : 'bg-red-500'
                                    } opacity-50`}></div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors">{deployment.unit_name}</h3>
                                            <div className={`text-[10px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter mt-1 ${getStatusColor(deployment.status)}`}>
                                                {deployment.status}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedDeployment(deployment);
                                                setFormData({
                                                    ...formData,
                                                    selectedOfficers: deployment.officers ? deployment.officers.map(o => o.id) : []
                                                });
                                                setIsManageOfficersOpen(true);
                                            }}
                                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400 group/btn"
                                            title="Manage Officers"
                                        >
                                            <Users className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <select
                                            onChange={(e) => handleUpdateStatus(deployment.id, e.target.value)}
                                            value={deployment.status}
                                            className="bg-slate-900/80 border border-white/10 rounded-lg text-[10px] font-bold py-1 pl-2 pr-6 focus:ring-0 cursor-pointer hover:bg-slate-900 transition-colors"
                                        >
                                            <option value="Active">Set Active</option>
                                            <option value="Standby">Set Standby</option>
                                            <option value="Completed">Set Completed</option>
                                            <option value="Cancelled">Set Cancelled</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteDeployment(deployment.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                            title="Delete Deployment"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-start gap-3 text-gray-400">
                                        <MapPin className="w-4 h-4 mt-0.5 text-blue-500/50" />
                                        <span className="text-sm font-medium leading-tight">{deployment.address || 'No location specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Clock className="w-4 h-4 text-yellow-500/50" />
                                        <span className="text-sm font-medium">Started {new Date(deployment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Shield className="w-4 h-4 text-green-500/50" />
                                        <span className="text-sm font-bold text-white">{deployment.officers?.length || 0} Officers Assigned</span>
                                    </div>
                                    {/* Acknowledgment Status */}
                                    {deployment.officers && deployment.officers.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className={`w-4 h-4 ${
                                                deployment.officers.every(o => o.acknowledged) 
                                                    ? 'text-green-500' 
                                                    : deployment.officers.some(o => o.acknowledged)
                                                        ? 'text-yellow-500'
                                                        : 'text-gray-500'
                                            }`} />
                                            <span className="text-sm font-medium">
                                                <span className={`font-bold ${
                                                    deployment.officers.every(o => o.acknowledged)
                                                        ? 'text-green-400'
                                                        : deployment.officers.some(o => o.acknowledged)
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-400'
                                                }`}>
                                                    {deployment.officers.filter(o => o.acknowledged).length}/{deployment.officers.length}
                                                </span>
                                                <span className="text-gray-500 ml-1">Acknowledged</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-5 border-t border-white/5">
                                    <div className="flex -space-x-3">
                                        {deployment.officers?.slice(0, 4).map((officer, i) => (
                                            <div 
                                                key={i} 
                                                className={`w-10 h-10 rounded-full border-4 border-slate-800 flex items-center justify-center text-xs font-black text-white shadow-xl relative ${
                                                    officer.acknowledged ? 'bg-green-600' : 'bg-slate-700'
                                                }`} 
                                                title={`${officer.fullName}${officer.acknowledged ? ' ✓ Acknowledged' : ' - Pending'}`}
                                            >
                                                {officer.fullName?.charAt(0)}
                                                {officer.acknowledged && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {deployment.officers?.length > 4 && (
                                            <div className="w-10 h-10 rounded-full bg-blue-600 border-4 border-slate-800 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                                                +{deployment.officers.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <button className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                        Details <ChevronLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl shadow-blue-500/10 overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Premium Modal Header */}
                        <div className="relative p-8 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10 border-b border-white/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                                            <Shield className="w-6 h-6 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tight">Smart Deployment</h2>
                                    </div>
                                    <p className="text-blue-400/60 font-bold text-sm ml-13">AUTONOMOUS UNIT ASSIGNMENT & REAL-TIME MONITORING</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors group"
                                >
                                    <X className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateDeployment} className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Quick Link Section */}
                            <div className="space-y-5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-blue-400/80 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Active Events Needing Support
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-white bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/20">
                                            {activeEvents.length} LIVE EVENTS
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar -mx-2 px-2">
                                    {activeEvents.length === 0 ? (
                                        <div className="w-full py-12 bg-white/[0.02] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600 group hover:border-blue-500/30 transition-colors">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Shield className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-40">No active events found</p>
                                            <p className="text-[10px] font-bold mt-1 opacity-20">SYSTEM IS CURRENTLY CLEAR</p>
                                        </div>
                                    ) : (
                                        activeEvents.map(event => (
                                            <div
                                                key={`${event.eventType}-${event.id}`}
                                                onClick={() => handleEventSelect(event)}
                                                className={`flex-shrink-0 w-72 p-5 rounded-[24px] border transition-all duration-500 cursor-pointer group relative overflow-hidden ${formData.linkedEvent?.id === event.id && formData.linkedEvent?.eventType === event.eventType
                                                    ? 'bg-blue-600 border-blue-400 shadow-2xl shadow-blue-600/40 scale-[1.02]'
                                                    : 'bg-slate-950/40 border-white/5 hover:border-blue-500/40 hover:bg-slate-900/60'
                                                    }`}
                                            >
                                                {/* Card Background Glow */}
                                                <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500 ${formData.linkedEvent?.id === event.id && formData.linkedEvent?.eventType === event.eventType
                                                    ? 'bg-white/20 opacity-100'
                                                    : 'bg-blue-500/10 opacity-0 group-hover:opacity-100'
                                                    }`} />

                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${event.eventType === 'incident'
                                                        ? (formData.linkedEvent?.id === event.id ? 'bg-white/20 text-white' : 'bg-yellow-500/10 text-yellow-500')
                                                        : (formData.linkedEvent?.id === event.id ? 'bg-white/20 text-white' : 'bg-red-500/10 text-red-500')
                                                        }`}>
                                                        {event.eventType}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Live</span>
                                                        <div className={`w-2 h-2 rounded-full animate-pulse ${event.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                                                            }`} />
                                                    </div>
                                                </div>
                                                <h4 className={`font-black text-lg mb-2 truncate tracking-tight ${formData.linkedEvent?.id === event.id && formData.linkedEvent?.eventType === event.eventType ? 'text-white' : 'text-gray-200'
                                                    }`}>
                                                    {event.label.charAt(0).toUpperCase() + event.label.slice(1)}
                                                </h4>
                                                <div className={`flex items-center gap-2 text-[11px] font-bold ${formData.linkedEvent?.id === event.id && formData.linkedEvent?.eventType === event.eventType ? 'text-blue-100' : 'text-gray-500'
                                                    }`}>
                                                    <MapPin className={`w-3.5 h-3.5 ${formData.linkedEvent?.id === event.id ? 'text-white' : 'text-blue-500'}`} />
                                                    <span className="truncate">{event.location || 'Unknown Location'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1 group-focus-within:text-blue-400 transition-colors">Unit Designation</label>
                                    <div className="relative">
                                        <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500/30 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Unit Delta"
                                            value={formData.unitName}
                                            onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-950 transition-all font-black text-lg shadow-inner"
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600/10 rounded-md border border-blue-500/20">
                                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Autonomous</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1 group-focus-within:text-blue-400 transition-colors">Deployment Zone</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500/30 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Kimironko Road"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-950 transition-all font-black text-lg shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="flex justify-between items-end px-1">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-[0.2em] text-blue-400/80">Deploy Personnel</label>
                                        <p className="text-[10px] font-bold text-gray-600 mt-1">SELECT ONE OR MORE OFFICERS FOR THIS UNIT</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddOfficerModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-xl text-[10px] font-black uppercase transition-all border border-blue-500/20"
                                        >
                                            <Plus className="w-3 h-3" /> Add New Officer
                                        </button>
                                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                            <button type="button" onClick={handleSelectAllOfficers} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors">Select All</button>
                                            <div className="w-px h-3 bg-white/10" />
                                            <button type="button" onClick={handleClearAllOfficers} className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-400 transition-colors">Clear</button>
                                        </div>
                                        <span className="text-[10px] font-black text-white bg-blue-600 px-3 py-2 rounded-xl shadow-lg shadow-blue-600/20">
                                            {formData.selectedOfficers.length} SELECTED
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 border border-white/5 rounded-[32px] overflow-hidden shadow-inner">
                                    {availableOfficers.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                                <Users className="w-10 h-10 text-gray-800" />
                                            </div>
                                            <p className="text-gray-600 font-black text-sm uppercase tracking-widest">No Available Personnel</p>
                                            <p className="text-[10px] text-gray-700 mt-1 font-bold">ALL OFFICERS ARE CURRENTLY ON ACTIVE DUTY</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                                            {availableOfficers.map((officer) => (
                                                <div
                                                    key={officer.id}
                                                    onClick={() => toggleOfficer(officer.id)}
                                                    className={`group relative flex items-center justify-between p-5 cursor-pointer rounded-[24px] transition-all duration-500 overflow-hidden ${formData.selectedOfficers.includes(officer.id)
                                                        ? 'bg-blue-600 shadow-xl shadow-blue-600/30 scale-[1.02]'
                                                        : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-blue-500/20'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 ${formData.selectedOfficers.includes(officer.id)
                                                            ? 'bg-white/20 text-white rotate-6'
                                                            : 'bg-slate-800 text-gray-500 group-hover:bg-blue-500/20 group-hover:text-blue-400'
                                                            }`}>
                                                            {officer.full_name ? officer.full_name.charAt(0) : (officer.email ? officer.email.charAt(0).toUpperCase() : '?')}
                                                        </div>
                                                        <div>
                                                            <p className={`font-black text-sm leading-none mb-1.5 tracking-tight ${formData.selectedOfficers.includes(officer.id) ? 'text-white' : 'text-gray-200'}`}>
                                                                {officer.full_name || officer.email || 'Unknown Officer'}
                                                            </p>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${officer.status === 'Available' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${formData.selectedOfficers.includes(officer.id) ? 'text-blue-100' : 'text-gray-500'
                                                                        }`}>
                                                                        {officer.unit || 'General Duty'} • {officer.badge_number || 'N/A'}
                                                                    </p>
                                                                </div>
                                                                {officer.status === 'Deployed' && (
                                                                    <p className={`text-[9px] font-bold uppercase tracking-tighter ${formData.selectedOfficers.includes(officer.id) ? 'text-white/60' : 'text-yellow-500/80'}`}>
                                                                        At: {officer.current_deployment}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {formData.selectedOfficers.includes(officer.id) ? (
                                                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative z-10">
                                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full border-2 border-white/5 group-hover:border-blue-500/30 transition-colors relative z-10" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-6 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-8 py-5 bg-white/5 hover:bg-white/10 rounded-[20px] font-black text-sm uppercase tracking-widest transition-all text-gray-500 hover:text-white border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading || formData.selectedOfficers.length === 0}
                                    className="flex-[2] px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-[20px] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-600/40 text-white active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {formLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Initializing...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" /> Deploy Unit
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Officers Modal */}
            {isManageOfficersOpen && selectedDeployment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsManageOfficersOpen(false)} />
                    <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl shadow-blue-500/10 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                                        <Users className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Manage Personnel</h2>
                                </div>
                                <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest ml-11">UNIT: {selectedDeployment.unit_name}</p>
                            </div>
                            <button onClick={() => setIsManageOfficersOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-end px-1">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-[0.2em] text-blue-400/80">Current Assignments</label>
                                    <p className="text-[10px] font-bold text-gray-600 mt-1">UPDATE PERSONNEL FOR THIS ACTIVE UNIT</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={handleSelectAllOfficers} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors">Select All</button>
                                    <span className="w-1 h-1 rounded-full bg-gray-800" />
                                    <button type="button" onClick={handleClearAllOfficers} className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-400 transition-colors">Clear</button>
                                </div>
                            </div>

                            <div className="bg-slate-950/50 border border-white/5 rounded-[32px] max-h-[400px] overflow-y-auto p-4 custom-scrollbar shadow-inner">
                                <div className="grid grid-cols-1 gap-3">
                                    {availableOfficers.map((officer) => (
                                        <div
                                            key={officer.id}
                                            onClick={() => toggleOfficer(officer.id)}
                                            className={`group relative flex items-center justify-between p-5 cursor-pointer rounded-[24px] transition-all duration-500 ${formData.selectedOfficers.includes(officer.id)
                                                ? 'bg-blue-600 shadow-xl shadow-blue-600/30'
                                                : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-blue-500/20'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 ${formData.selectedOfficers.includes(officer.id)
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-800 text-gray-500'
                                                    }`}>
                                                    {officer.full_name ? officer.full_name.charAt(0) : officer.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`font-black text-sm leading-none mb-1.5 tracking-tight ${formData.selectedOfficers.includes(officer.id) ? 'text-white' : 'text-gray-200'}`}>
                                                        {officer.full_name || officer.email}
                                                    </p>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${officer.status === 'Available' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                            <p className={`text-[10px] font-black uppercase tracking-widest ${formData.selectedOfficers.includes(officer.id) ? 'text-blue-100' : 'text-gray-500'
                                                                }`}>
                                                                {officer.unit || 'General Duty'} • {officer.badge_number || 'N/A'}
                                                            </p>
                                                        </div>
                                                        {officer.status === 'Deployed' && (
                                                            <p className={`text-[9px] font-bold uppercase tracking-tighter ${formData.selectedOfficers.includes(officer.id) ? 'text-white/60' : 'text-yellow-500/80'}`}>
                                                                At: {officer.current_deployment}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {formData.selectedOfficers.includes(officer.id) ? (
                                                <CheckCircle2 className="w-6 h-6 text-white relative z-10" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full border-2 border-white/5 group-hover:border-blue-500/30 transition-colors relative z-10" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    try {
                                        setFormLoading(true);
                                        await deploymentService.updateOfficers(selectedDeployment.id, formData.selectedOfficers);
                                        setIsManageOfficersOpen(false);
                                        fetchDeployments();
                                        fetchStats();
                                    } catch (error) {
                                        console.error('Error updating officers:', error);
                                        alert('Failed to update officers');
                                    } finally {
                                        setFormLoading(false);
                                    }
                                }}
                                disabled={formLoading}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] text-white transition-all shadow-2xl shadow-blue-600/40 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {formLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Assignments'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Officer Modal */}
            {isAddOfficerModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsAddOfficerModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-600/20 to-transparent flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Add New Officer</h2>
                                <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest">Register a new police personnel</p>
                            </div>
                            <button onClick={() => setIsAddOfficerModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddOfficer} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Jean Pierre"
                                        value={addOfficerFormData.full_name}
                                        onChange={(e) => setAddOfficerFormData({ ...addOfficerFormData, full_name: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Badge Number</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="P-1234"
                                            value={addOfficerFormData.badge_number}
                                            onChange={(e) => setAddOfficerFormData({ ...addOfficerFormData, badge_number: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Unit</label>
                                        <select
                                            value={addOfficerFormData.unit}
                                            onChange={(e) => setAddOfficerFormData({ ...addOfficerFormData, unit: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                        >
                                            <option value="Traffic Unit">Traffic Unit</option>
                                            <option value="Fire Brigade">Fire Brigade</option>
                                            <option value="Emergency Response">Emergency Response</option>
                                            <option value="Patrol Unit">Patrol Unit</option>
                                            <option value="Special Forces">Special Forces</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="officer@rnp.gov.rw"
                                        value={addOfficerFormData.email}
                                        onChange={(e) => setAddOfficerFormData({ ...addOfficerFormData, email: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={formLoading}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] text-white transition-all shadow-2xl shadow-blue-600/40 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {formLoading ? 'Adding...' : 'Register Officer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeploymentsPage;
