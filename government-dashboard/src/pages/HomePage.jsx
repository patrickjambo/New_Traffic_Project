import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, AlertTriangle, Clock, Menu, X, Activity, Camera, Phone, ChevronRight, ArrowRight, CheckCircle, Eye, Bell, Car, Flame, ChevronLeft, Globe, Shield, Send, Users, Radio, AlertCircle, MapPinned, FileWarning, Truck, Siren, TrendingUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ReportIncidentForm from '../components/ReportIncidentForm';
import Modal from '../components/Modal';
import DailyIncidentsModal from '../components/DailyIncidentsModal';
import RoutePlannerMap from '../components/RoutePlannerMap';

const heroSlides = [
  { id: 1, image: '/assets/hero/traffic-police-kigali.png', title: 'Report Traffic Congestion', subtitle: 'Help fellow citizens avoid delays by reporting traffic jams', gradient: 'from-blue-600', accent: 'blue' },
  { id: 2, image: '/assets/hero/kigali-night-traffic.png', title: 'Real-Time Traffic Updates', subtitle: 'Stay informed about traffic conditions across Kigali 24/7', gradient: 'from-indigo-600', accent: 'indigo' },
  { id: 3, image: '/assets/hero/road-accident.png', title: 'Report Road Accidents', subtitle: 'Your quick report enables faster emergency response', gradient: 'from-red-600', accent: 'red' },
  { id: 4, image: '/assets/hero/bus-accident-response.png', title: 'Emergency Response', subtitle: 'Rwanda National Police responds quickly to all incidents', gradient: 'from-orange-600', accent: 'orange' },
  { id: 5, image: '/assets/hero/rnp-fire-brigade.png', title: 'Fire & Rescue Ready', subtitle: 'Fire Brigade always ready to respond', gradient: 'from-emerald-600', accent: 'green' },
  { id: 6, image: '/assets/hero/firefighter-action.png', title: 'Report Fire Emergencies', subtitle: 'Alert fire brigade immediately', gradient: 'from-rose-600', accent: 'red' }
];

const HomePage = () => {
  const { incidents, loading, statistics, wsConnected } = useData();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDailyIncidentsModal, setShowDailyIncidentsModal] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [waveOffset, setWaveOffset] = useState(0);

  // Animated wave effect for header
  useEffect(() => {
    const waveTimer = setInterval(() => {
      setWaveOffset(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(waveTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  };

  const getSeverityStyles = (sev) => {
    const s = { critical: 'bg-gradient-to-r from-red-500 to-rose-600 text-white', high: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white', medium: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900', low: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' };
    return s[sev] || s.low;
  };

  const stats = [
    { label: 'Total Reports', value: statistics?.total_incidents || 156, icon: FileWarning, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
    { label: 'Active Now', value: statistics?.active_reports || 12, icon: Radio, color: 'from-orange-500 to-red-500', bg: 'bg-orange-50' },
    { label: 'Avg Response', value: (statistics?.avg_response_time || 8) + 'min', icon: Clock, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
    { label: 'Resolved Today', value: statistics?.resolved_today || 23, icon: CheckCircle, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* DYNAMIC ANIMATED HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Animated wave layers */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute bottom-0 w-[200%] h-12" style={{ transform: `translateX(-${waveOffset % 100}%)` }} preserveAspectRatio="none" viewBox="0 0 1440 48">
            <path fill="rgba(6, 182, 212, 0.15)" d="M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 L1440,48 L0,48 Z" />
          </svg>
          <svg className="absolute bottom-0 w-[200%] h-10" style={{ transform: `translateX(-${(waveOffset + 50) % 100}%)` }} preserveAspectRatio="none" viewBox="0 0 1440 40">
            <path fill="rgba(6, 182, 212, 0.1)" d="M0,20 C360,40 720,0 1080,20 C1260,30 1350,10 1440,20 L1440,40 L0,40 Z" />
          </svg>
          <svg className="absolute bottom-0 w-[200%] h-8" style={{ transform: `translateX(-${(waveOffset + 25) % 100}%)` }} preserveAspectRatio="none" viewBox="0 0 1440 32">
            <path fill="rgba(6, 182, 212, 0.08)" d="M0,16 C180,32 360,0 540,16 C720,32 900,0 1080,16 C1260,32 1440,0 1440,16 L1440,32 L0,32 Z" />
          </svg>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-2 h-2 bg-cyan-400/30 rounded-full" style={{ top: '20%', left: `${(waveOffset * 0.5) % 100}%` }} />
          <div className="absolute w-1.5 h-1.5 bg-cyan-300/40 rounded-full" style={{ top: '60%', left: `${(waveOffset * 0.3 + 30) % 100}%` }} />
          <div className="absolute w-1 h-1 bg-cyan-500/30 rounded-full" style={{ top: '40%', left: `${(waveOffset * 0.4 + 60) % 100}%` }} />
        </div>

        {/* Glowing line accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />

        {/* Header content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative w-11 h-11 rounded-full bg-white p-0.5 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/60 group-hover:ring-cyan-300 transition-all">
                  <img src="/assets/rnp-logo.png" alt="RNP" className="w-full h-full object-contain rounded-full" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white tracking-tight">RNP Traffic Guard</h1>
                <p className="text-[10px] font-medium text-cyan-300 tracking-wider uppercase">Rwanda National Police</p>
              </div>
            </Link>

            {/* Desktop Navigation - Consistent Secondary Color (Cyan/Teal) */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {/* About - Scrolls to About section */}
              <a href="#about" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">About</span>
              </a>

              {/* Check Route - Shows Route Planner and scrolls to it */}
              <button onClick={() => { setShowRoutePlanner(true); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Navigation className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="font-medium text-sm">Check Route</span>
              </button>

              {/* Live Incidents - Opens Modal */}
              <button onClick={() => setShowDailyIncidentsModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Eye className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">Live Incidents</span>
              </button>

              {/* Emergency - Consistent cyan style with red icon */}
              <button onClick={() => setShowEmergencyModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Siren className="w-4 h-4 text-red-400 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">Emergency</span>
              </button>

              {/* Report - Consistent cyan style */}
              <button onClick={() => setShowIncidentModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">Report</span>
              </button>

              {/* Login/Dashboard */}
              {user ? (
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/95 text-slate-900 font-semibold text-sm hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-cyan-400/60 text-cyan-300 font-semibold text-sm hover:bg-cyan-400/10 hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300">
                  <span>Login</span>
                </Link>
              )}
            </nav>

            {/* Mobile menu button */}
            <button className="lg:hidden p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/98 backdrop-blur-xl border-t border-cyan-500/20 p-4 space-y-2">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Users className="w-5 h-5 text-cyan-400" /><span className="font-medium">About</span>
            </a>
            <button onClick={() => { setShowRoutePlanner(true); setMobileMenuOpen(false); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Navigation className="w-5 h-5 text-cyan-400" /><span className="font-medium">Check Route</span>
            </button>
            <button onClick={() => { setShowDailyIncidentsModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Eye className="w-5 h-5 text-cyan-400" /><span className="font-medium">Live Incidents</span>
            </button>
            <button onClick={() => { setShowEmergencyModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Siren className="w-5 h-5 text-red-400 animate-pulse" /><span className="font-medium">Emergency</span>
            </button>
            <button onClick={() => { setShowIncidentModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Camera className="w-5 h-5 text-cyan-400" /><span className="font-medium">Report</span>
            </button>
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white text-slate-900 font-semibold">
                <Shield className="w-5 h-5 text-blue-600" /><span>Dashboard</span>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-cyan-400/50 text-cyan-300 font-medium hover:bg-cyan-500/10 transition-all">
                <span>Staff Login</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* HERO - FULL WIDTH BACKGROUND IMAGE */}
      <section className="relative h-[75vh] min-h-[500px] max-h-[700px] overflow-hidden">
        {/* Background Images - Fullscreen Rotating */}
        {heroSlides.map((slide, i) => (
          <div key={slide.id} className={"absolute inset-0 transition-all duration-1000 ease-in-out " + (i === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}>
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40" />
          </div>
        ))}
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                <span className="text-white text-sm font-medium">Live Traffic Monitoring</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 drop-shadow-2xl">{heroSlides[currentSlide].title}</h1>
              <p className="text-lg sm:text-xl text-white/90 max-w-xl mb-8">{heroSlides[currentSlide].subtitle}</p>
              
              {/* Action Buttons - Plan Route & Emergency Report */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => { setShowRoutePlanner(true); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/40 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                  <MapPinned className="w-5 h-5 text-cyan-400" />Plan Route
                </button>
                <button onClick={() => setShowEmergencyModal(true)} className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/40 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                  <Siren className="w-5 h-5 text-red-400 animate-pulse" />Emergency Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, i) => (<button key={i} onClick={() => setCurrentSlide(i)} className={"h-2 rounded-full transition-all " + (i === currentSlide ? 'w-10 bg-cyan-400' : 'w-2 bg-white/50 hover:bg-white/80')} />))}
        </div>
        <button onClick={() => setCurrentSlide(p => (p - 1 + heroSlides.length) % heroSlides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 transition-all"><ChevronLeft className="w-6 h-6 text-white" /></button>
        <button onClick={() => setCurrentSlide(p => (p + 1) % heroSlides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 transition-all"><ChevronRight className="w-6 h-6 text-white" /></button>
      </section>

      {/* STATS - Advanced Dynamic Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0">
          {/* Animated Grid */}
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, cyan 1px, transparent 0)', backgroundSize: '40px 40px'}} />
          {/* Glowing Orbs */}
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          {/* Border Lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 backdrop-blur border border-cyan-400/30 mb-4">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 text-sm font-semibold">Real-Time Statistics</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="group relative p-6 rounded-3xl bg-slate-800/50 backdrop-blur-xl border border-cyan-400/20 hover:border-cyan-400/50 hover:bg-slate-800/70 transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden"
                style={{animationDelay: `${i * 100}ms`}}
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-500" />
                
                {/* Animated Corner Accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon with enhanced styling */}
                  <div className={`inline-flex p-3.5 rounded-2xl bg-gradient-to-br shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Value with gradient */}
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 mb-1 group-hover:from-cyan-300 group-hover:to-white transition-all duration-500">
                    {stat.value}
                  </p>
                  
                  {/* Label */}
                  <p className="text-sm font-medium text-slate-400 group-hover:text-cyan-300 transition-colors duration-300">
                    {stat.label}
                  </p>
                </div>

                {/* Bottom Accent Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent group-hover:via-cyan-500/50 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAFFIC INCIDENTS DASHBOARD - Advanced Dynamic Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 relative overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, cyan 1px, transparent 0)', backgroundSize: '40px 40px'}} />
          {/* Glowing Orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-3xl" />
          {/* Animated Lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header with Animation */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-cyan-500/10 backdrop-blur-xl border border-cyan-400/30 mb-6 group hover:bg-cyan-500/20 transition-all duration-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-cyan-300 font-semibold tracking-wide">Live Traffic Updates</span>
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white mb-4">
              Traffic Incidents Dashboard
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              View live incidents across Kigali and help keep our roads safe
            </p>
          </div>

          {/* Route Planner Section - Hidden by default, shown when user clicks Check Route */}
          {showRoutePlanner && (
            <div id="route-planner" className="mb-10 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 border border-cyan-400/30 scroll-mt-24 transform transition-all duration-500">
              {/* Header with secondary cyan color matching navigation */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between relative overflow-hidden">
                {/* Subtle wave animation like header */}
                <div className="absolute inset-0 overflow-hidden">
                  <svg className="absolute bottom-0 w-full h-6 opacity-30" preserveAspectRatio="none" viewBox="0 0 1440 24">
                    <path fill="rgba(6, 182, 212, 0.3)" d="M0,12 C240,24 480,0 720,12 C960,24 1200,0 1440,12 L1440,24 L0,24 Z" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
                <div className="flex items-center gap-3 text-white relative z-10">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <MapPinned className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="font-bold text-lg text-cyan-50">Smart Route Planner</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="hidden sm:flex items-center gap-2 text-cyan-300/80 text-sm">
                    <Navigation className="w-4 h-4" />
                    <span>Plan your journey & avoid incidents</span>
                  </div>
                  <button 
                    onClick={() => setShowRoutePlanner(false)} 
                    className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 hover:border-cyan-400/50 text-cyan-300 hover:text-white transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Map container */}
              <div className="p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
                <div className="rounded-xl overflow-hidden border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
                  <RoutePlannerMap incidents={incidents} />
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* Live Incidents Feed - Left Panel */}
            <div className="lg:col-span-5 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-cyan-400/20 overflow-hidden shadow-2xl shadow-cyan-500/10 group hover:border-cyan-400/40 transition-all duration-500">
              {/* Header */}
              <div className="p-5 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 via-slate-900/80 to-slate-800/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        Recent Incidents
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                      </h3>
                      <p className="text-xs text-cyan-400">{incidents?.length || 0} active incidents</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDailyIncidentsModal(true)} className="flex items-center gap-1.5 text-cyan-400 hover:text-white text-sm font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 group/btn">
                    View All
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* Incidents List with Animations */}
              <div className="p-4 max-h-[480px] overflow-y-auto space-y-3 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-400/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <p className="text-cyan-400 mt-4 text-sm font-medium">Loading incidents...</p>
                  </div>
                ) : incidents?.length > 0 ? (
                  incidents.slice(0, 6).map((inc, i) => (
                    <div 
                      key={inc.id || i} 
                      onClick={() => setSelectedIncident(inc)} 
                      className="group/card p-4 rounded-2xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-cyan-400/40 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5"
                      style={{animationDelay: `${i * 100}ms`}}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={"px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg " + getSeverityStyles(inc.severity)}>
                              {(inc.severity || 'low').toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(inc.created_at)}
                            </span>
                          </div>
                          <h4 className="font-bold text-white group-hover/card:text-cyan-300 transition-colors">{inc.incident_type}</h4>
                          <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                            {inc.location || 'Kigali'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={"px-2.5 py-1 rounded-lg text-xs font-semibold " + (inc.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : inc.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-600/30 text-slate-400 border border-slate-500/30')}>
                            {(inc.status || 'reported').replace('_', ' ')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover/card:text-cyan-400 group-hover/card:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h4 className="font-bold text-white text-lg">All Clear!</h4>
                    <p className="text-slate-400 mt-1">No active incidents reported</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Activity Feed - Center Panel */}
            <div className="lg:col-span-4 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-cyan-400/20 overflow-hidden shadow-2xl shadow-cyan-500/10 group hover:border-cyan-400/40 transition-all duration-500">
              {/* Header */}
              <div className="p-5 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 via-slate-900/80 to-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/30 relative">
                    <Activity className="w-5 h-5 text-white" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Live Activity Feed</h3>
                    <p className="text-xs text-emerald-400">Real-time updates</p>
                  </div>
                </div>
              </div>
              
              {/* Live Feed Content */}
              <div className="p-4 max-h-[480px] overflow-y-auto space-y-3">
                {/* Real-time activity items */}
                {incidents?.slice(0, 5).map((inc, i) => (
                  <div 
                    key={`feed-${inc.id || i}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-700/20 border border-slate-600/20 hover:bg-slate-700/40 hover:border-cyan-400/30 transition-all duration-300 group/feed"
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      inc.severity === 'critical' || inc.severity === 'high' 
                        ? 'bg-red-500/20 border border-red-500/30' 
                        : inc.severity === 'medium' 
                          ? 'bg-amber-500/20 border border-amber-500/30' 
                          : 'bg-blue-500/20 border border-blue-500/30'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${
                        inc.severity === 'critical' || inc.severity === 'high' 
                          ? 'text-red-400' 
                          : inc.severity === 'medium' 
                            ? 'text-amber-400' 
                            : 'text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">{inc.incident_type}</span>
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-slate-400 truncate">{inc.location || 'Kigali'}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatTime(inc.created_at)}</p>
                    </div>
                  </div>
                ))}
                
                {/* Status Indicator */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-cyan-400/20 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">System Status</span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                      {wsConnected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-600/30 text-center">
                      <p className="text-2xl font-black text-cyan-400">{incidents?.length || 0}</p>
                      <p className="text-xs text-slate-400">Active</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-600/30 text-center">
                      <p className="text-2xl font-black text-cyan-400">24/7</p>
                      <p className="text-xs text-slate-400">Monitoring</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards - Right Panel */}
            <div className="lg:col-span-3 space-y-6">
              {/* Report Incident Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-400/20 p-6 shadow-2xl shadow-cyan-500/10 relative overflow-hidden group hover:border-cyan-400/40 hover:shadow-cyan-500/20 transition-all duration-500">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Report an Incident</h3>
                  <p className="text-slate-400 text-sm mb-5">Help keep Rwanda's roads safe</p>
                  <button 
                    onClick={() => setShowIncidentModal(true)} 
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5" />
                    Submit Report
                  </button>
                </div>
              </div>

              {/* Emergency Report Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-red-400/20 p-6 shadow-2xl shadow-red-500/10 relative overflow-hidden group hover:border-red-400/40 hover:shadow-red-500/20 transition-all duration-500">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 flex items-center justify-center mb-4 animate-pulse group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Siren className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Emergency?</h3>
                  <p className="text-slate-400 text-sm mb-5">Critical incidents need immediate attention</p>
                  <button 
                    onClick={() => setShowEmergencyModal(true)} 
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold hover:from-red-500 hover:to-rose-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Emergency Report
                  </button>
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-400/20 p-6 shadow-2xl shadow-cyan-500/10 relative overflow-hidden group hover:border-cyan-400/40 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Response Stats</h4>
                    <p className="text-xs text-cyan-400">Last 24 hours</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <span className="text-sm text-slate-400">Avg Response</span>
                    <span className="text-lg font-bold text-emerald-400">8 min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <span className="text-sm text-slate-400">Resolved Today</span>
                    <span className="text-lg font-bold text-cyan-400">{statistics?.resolved_today || 23}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-semibold text-sm mb-4">
              <Users className="w-4 h-4" />About Us
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Rwanda National Police Traffic Department</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Dedicated to ensuring road safety and efficient traffic management across Rwanda</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
              <p className="text-slate-400 text-sm">To provide efficient, responsive, and technology-driven traffic management services that ensure the safety of all road users in Rwanda.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Our Vision</h3>
              <p className="text-slate-400 text-sm">To be the leading traffic management authority in East Africa, utilizing cutting-edge technology to create safer roads for everyone.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">24/7 Service</h3>
              <p className="text-slate-400 text-sm">Our dedicated team monitors traffic conditions around the clock, responding swiftly to incidents and ensuring smooth traffic flow.</p>
            </div>
          </div>
          
          <div className="mt-12 grid md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400">500+</p>
              <p className="text-slate-400 text-sm">Officers Deployed</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400">30</p>
              <p className="text-slate-400 text-sm">Districts Covered</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400">8min</p>
              <p className="text-slate-400 text-sm">Avg Response Time</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400">24/7</p>
              <p className="text-slate-400 text-sm">Active Monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white p-1 shadow-xl"><img src="/assets/rnp-logo.png" alt="RNP" className="w-full h-full object-contain rounded-full" /></div>
                <div><h4 className="text-xl font-bold">Rwanda National Police</h4><p className="text-slate-400 text-sm">Traffic Management System</p></div>
              </div>
              <p className="text-slate-400 text-sm max-w-md">Ensuring safer roads across Rwanda</p>
            </div>
            <div>
              <h5 className="font-bold mb-4 text-slate-200">Quick Links</h5>
              <div className="space-y-2 text-sm">
                <a href="#about" className="block text-slate-400 hover:text-white transition-colors">About Us</a>
                <button onClick={() => { setShowRoutePlanner(true); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="block text-slate-400 hover:text-white transition-colors text-left">Check Route</button>
                <button onClick={() => setShowDailyIncidentsModal(true)} className="block text-slate-400 hover:text-white transition-colors text-left">View Incidents</button>
                <button onClick={() => setShowIncidentModal(true)} className="block text-slate-400 hover:text-white transition-colors text-left">Report Incident</button>
                <Link to="/login" className="block text-slate-400 hover:text-white transition-colors">Staff Portal</Link>
              </div>
            </div>
            <div>
              <h5 className="font-bold mb-4 text-slate-200">Emergency</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/20"><Phone className="w-5 h-5 text-red-400" /></div><div><p className="text-xs text-slate-400">Emergency</p><p className="font-bold">112</p></div></div>
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/20"><Car className="w-5 h-5 text-blue-400" /></div><div><p className="text-xs text-slate-400">Traffic</p><p className="font-bold">113</p></div></div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 Rwanda National Police</p>
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Globe className="w-4 h-4" />Kigali, Rwanda</div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <Modal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} title="Report Traffic Incident"><ReportIncidentForm onSuccess={() => setShowIncidentModal(false)} /></Modal>
      <Modal isOpen={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Emergency Report"><ReportIncidentForm isEmergency onSuccess={() => setShowEmergencyModal(false)} /></Modal>

      <Modal isOpen={!!selectedIncident} onClose={() => setSelectedIncident(null)} title="Incident Details">
        {selectedIncident && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className={"px-4 py-1.5 rounded-xl text-sm font-bold " + getSeverityStyles(selectedIncident.severity)}>{(selectedIncident.severity || 'LOW').toUpperCase()}</span><span className="text-sm text-slate-500">{new Date(selectedIncident.created_at).toLocaleString()}</span></div>
            <div><h4 className="text-xl font-bold text-slate-900">{selectedIncident.incident_type}</h4><p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" />{selectedIncident.location}</p></div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><h5 className="font-semibold text-slate-700 mb-2">Description</h5><p className="text-slate-600 text-sm">{selectedIncident.description || 'No description'}</p></div>
          </div>
        )}
      </Modal>
      <DailyIncidentsModal isOpen={showDailyIncidentsModal} onClose={() => setShowDailyIncidentsModal(false)} />
    </div>
  );
};

export default HomePage;
