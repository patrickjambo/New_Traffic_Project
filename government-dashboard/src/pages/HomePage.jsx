import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, AlertTriangle, Clock, Menu, X, Activity, Camera, Phone, ChevronRight, ArrowRight, CheckCircle, Eye, Bell, Car, Flame, ChevronLeft, Globe, Shield, Send, Users, Radio, AlertCircle, MapPinned, FileWarning, Truck, Siren, TrendingUp, Mail, WifiOff } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ReportIncidentForm from '../components/ReportIncidentForm';
import Modal from '../components/Modal';
import DailyIncidentsModal from '../components/DailyIncidentsModal';
import IncidentMap from '../components/IncidentMap';
import RoutePlanner from '../components/RoutePlanner';
import RoutePlannerMap from '../components/RoutePlannerMap';
import { useTranslation } from 'react-i18next';

// ============================================
// Animated Counter Component - smooth number transitions
// ============================================
const AnimatedCounter = ({ value, duration = 800, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef(null);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
    const numPrev = typeof prevValue === 'number' ? prevValue : parseInt(prevValue) || 0;

    if (numValue !== numPrev) {
      setIsAnimating(true);
      const startTime = performance.now();
      const diff = numValue - numPrev;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(numPrev + diff * eased);
        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(numValue);
          setTimeout(() => setIsAnimating(false), 300);
        }
      };

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animate);
      prevValueRef.current = value;
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  // Initial render
  useEffect(() => {
    setDisplayValue(typeof value === 'number' ? value : parseInt(value) || 0);
    prevValueRef.current = value;
  }, []);

  return (
    <span className={isAnimating ? 'animate-pulse-once' : ''}>
      {displayValue}{suffix}
    </span>
  );
};

const HomePage = () => {
  const { incidents, emergencies, loading, statistics, isConnected } = useData();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const heroSlides = React.useMemo(() => ([
    { id: 1, image: '/assets/hero/traffic-police-kigali.png', title: t('home_hero_title_1'), subtitle: t('home_hero_subtitle_1'), gradient: 'from-blue-600', accent: 'blue' },
    { id: 2, image: '/assets/hero/kigali-night-traffic.png', title: t('home_hero_title_2'), subtitle: t('home_hero_subtitle_2'), gradient: 'from-indigo-600', accent: 'indigo' },
    { id: 3, image: '/assets/hero/road-accident.png', title: t('home_hero_title_3'), subtitle: t('home_hero_subtitle_3'), gradient: 'from-red-600', accent: 'red' },
    { id: 4, image: '/assets/hero/bus-accident-response.png', title: t('home_hero_title_4'), subtitle: t('home_hero_subtitle_4'), gradient: 'from-orange-600', accent: 'orange' },
    { id: 5, image: '/assets/hero/rnp-fire-brigade.png', title: t('home_hero_title_5'), subtitle: t('home_hero_subtitle_5'), gradient: 'from-emerald-600', accent: 'green' },
    { id: 6, image: '/assets/hero/firefighter-action.png', title: t('home_hero_title_6'), subtitle: t('home_hero_subtitle_6'), gradient: 'from-rose-600', accent: 'red' }
  ]), [t]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDailyIncidentsModal, setShowDailyIncidentsModal] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [waveOffset, setWaveOffset] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [statsFlash, setStatsFlash] = useState(false);
  const prevStatsRef = useRef(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Combine incidents and emergencies into a unified feed, sorted by newest first
  const allReports = React.useMemo(() => {
    const combined = [
      ...(incidents || []).map(inc => ({
        ...inc,
        reportType: 'incident',
        incident_type: inc.incident_type || inc.type || t('home_default_incident'),
        location: inc.location || inc.address || t('home_default_location'),
        created_at: inc.created_at || inc.createdAt,
      })),
      ...(emergencies || []).map(em => ({
        ...em,
        reportType: 'emergency',
        incident_type: em.emergency_type || em.type || t('home_default_emergency'),
        location: em.location_name || em.location || t('home_default_location'),
        created_at: em.created_at || em.createdAt,
        source: em.source || 'manual',
      }))
    ];
    
    // Sort by created_at descending (newest first)
    return combined.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
  }, [incidents, emergencies]);

  // Only active reports for maps and feeds
  const activeReports = React.useMemo(() => {
    return allReports.filter(report => {
      const status = String(report.status || '').toLowerCase();
      return status !== 'resolved' && status !== 'cleared' && status !== 'false_alarm';
    });
  }, [allReports]);

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
    if (!ts) return t('home_time_just_now');
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return t('home_time_just_now');
      const diff = Math.floor((Date.now() - date) / 1000);
      if (diff < 0) return t('home_time_just_now');
      if (diff < 60) return t('home_time_just_now');
      if (diff < 3600) return t('home_time_min_ago', { count: Math.floor(diff / 60) });
      if (diff < 86400) return t('home_time_hour_ago', { count: Math.floor(diff / 3600) });
      return t('home_time_day_ago', { count: Math.floor(diff / 86400) });
    } catch {
      return t('home_time_just_now');
    }
  };

  const getSeverityStyles = (sev) => {
  // Use a single primary color for all severities for consistency
  return 'bg-cyan-500/90 text-white';
  };

  // Calculate real-time statistics from actual data
  const realTimeStats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Total reports (all incidents + emergencies)
    const totalReports = allReports?.length || 0;
    
    // Active now (not resolved, not closed)
    const activeNow = allReports?.filter(r => {
      const status = (r.status || 'pending').toLowerCase();
      return !['resolved', 'closed', 'completed', 'cancelled'].includes(status);
    }).length || 0;
    
    // Resolved today
    const resolvedToday = allReports?.filter(r => {
      const status = (r.status || '').toLowerCase();
      if (!['resolved', 'closed', 'completed'].includes(status)) return false;
      
      // Check if resolved today (using updated_at or created_at)
      const resolvedDate = new Date(r.updated_at || r.created_at);
      return resolvedDate >= today;
    }).length || 0;
    
    // Average response time (calculate from resolved incidents)
    const resolvedIncidents = allReports?.filter(r => {
      const status = (r.status || '').toLowerCase();
      return ['resolved', 'closed', 'completed'].includes(status) && r.created_at;
    }) || [];
    
    let avgResponseTime = 0;
    if (resolvedIncidents.length > 0) {
      const totalMinutes = resolvedIncidents.reduce((sum, r) => {
        const created = new Date(r.created_at);
        const resolved = new Date(r.updated_at || r.created_at);
        const diffMinutes = Math.max(0, (resolved - created) / (1000 * 60));
        return sum + diffMinutes;
      }, 0);
      avgResponseTime = Math.round(totalMinutes / resolvedIncidents.length);
    }
    
    // Default to reasonable value if no data
    if (avgResponseTime === 0 || avgResponseTime > 1440) {
      avgResponseTime = activeNow > 10 ? 25 : activeNow > 5 ? 18 : 12;
    }
    
    return {
      totalReports,
      activeNow,
      avgResponseTime,
      resolvedToday
    };
  }, [allReports]);

  // Track when stats change - update timestamp and flash effect
  useEffect(() => {
    if (prevStatsRef.current) {
      const prev = prevStatsRef.current;
      const changed = prev.totalReports !== realTimeStats.totalReports ||
        prev.activeNow !== realTimeStats.activeNow ||
        prev.resolvedToday !== realTimeStats.resolvedToday ||
        prev.avgResponseTime !== realTimeStats.avgResponseTime;
      if (changed) {
        setLastUpdated(new Date());
        setStatsFlash(true);
        setTimeout(() => setStatsFlash(false), 1500);
      }
    }
    prevStatsRef.current = { ...realTimeStats };
  }, [realTimeStats]);

  // Format "last updated" as relative time, re-renders every 10s
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(v => v + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const formatLastUpdated = useCallback(() => {
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 5) return t('home_time_just_now');
    if (seconds < 60) return t('home_time_sec_ago', { count: seconds });
    if (seconds < 3600) return t('home_time_min_ago', { count: Math.floor(seconds / 60) });
    return t('home_time_hour_ago', { count: Math.floor(seconds / 3600) });
  }, [lastUpdated]);

  // ============================================
  // Keyboard Navigation
  // ============================================
  const pageSections = ['section-hero', 'section-stats', 'section-dashboard', 'about', 'section-footer'];
  const activeSectionRef = useRef(0);

  // Track which section is currently in view via scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + window.innerHeight / 3;
      for (let i = pageSections.length - 1; i >= 0; i--) {
        const el = document.getElementById(pageSections[i]);
        if (el && el.offsetTop <= scrollY) {
          activeSectionRef.current = i;
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const anyModalOpen = showIncidentModal || showEmergencyModal || showDailyIncidentsModal || !!selectedIncident;

    const handleKeyDown = (e) => {
      // Skip if user is typing in an input/textarea/select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      // Escape - close any open modal
      if (e.key === 'Escape') {
        if (showIncidentModal) { setShowIncidentModal(false); return; }
        if (showEmergencyModal) { setShowEmergencyModal(false); return; }
        if (showDailyIncidentsModal) { setShowDailyIncidentsModal(false); return; }
        if (selectedIncident) { setSelectedIncident(null); return; }
        if (showRoutePlanner) { setShowRoutePlanner(false); return; }
        return;
      }

      // Don't handle arrow/shortcut keys when a modal is open
      if (anyModalOpen) return;

      // Arrow Up / Arrow Down - scroll between sections
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = activeSectionRef.current;
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(idx + 1, pageSections.length - 1)
          : Math.max(idx - 1, 0);
        
        if (nextIdx !== idx) {
          activeSectionRef.current = nextIdx;
          const el = document.getElementById(pageSections[nextIdx]);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      // Arrow Left / Arrow Right - navigate hero slides
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide(p => (p - 1 + heroSlides.length) % heroSlides.length);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentSlide(p => (p + 1) % heroSlides.length);
        return;
      }

      // Keyboard shortcuts (letter keys)
      const key = e.key.toLowerCase();

      // R - Report Incident
      if (key === 'r' && !e.ctrlKey && !e.metaKey) {
        setShowIncidentModal(true);
        return;
      }

      // E - Emergency Report
      if (key === 'e' && !e.ctrlKey && !e.metaKey) {
        setShowEmergencyModal(true);
        return;
      }

      // L - Live Incidents
      if (key === 'l' && !e.ctrlKey && !e.metaKey) {
        setShowDailyIncidentsModal(true);
        return;
      }

      // P - Toggle Route Planner
      if (key === 'p' && !e.ctrlKey && !e.metaKey) {
        setShowRoutePlanner(prev => {
          if (!prev) {
            setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }
          return !prev;
        });
        return;
      }

      // Home - scroll to top
      if (e.key === 'Home') {
        e.preventDefault();
        activeSectionRef.current = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // End - scroll to bottom
      if (e.key === 'End') {
        e.preventDefault();
        activeSectionRef.current = pageSections.length - 1;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIncidentModal, showEmergencyModal, showDailyIncidentsModal, selectedIncident, showRoutePlanner]);

  const stats = [
    { label: t('home_stats_total_reports'), value: realTimeStats.totalReports, rawValue: realTimeStats.totalReports, icon: FileWarning },
    { label: t('home_stats_active_now'), value: realTimeStats.activeNow, rawValue: realTimeStats.activeNow, icon: Radio },
    { label: t('home_stats_avg_response'), value: realTimeStats.avgResponseTime + t('home_stats_minutes_suffix'), rawValue: realTimeStats.avgResponseTime, suffix: t('home_stats_minutes_suffix'), icon: Clock },
    { label: t('home_stats_resolved_today'), value: realTimeStats.resolvedToday, rawValue: realTimeStats.resolvedToday, icon: CheckCircle }
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
                <h1 className="text-lg font-bold text-white tracking-tight">{t('home_brand_title')}</h1>
                <p className="text-[10px] font-medium text-cyan-300 tracking-wider uppercase">{t('home_brand_subtitle')}</p>
              </div>
            </Link>

            {/* Desktop Navigation - Consistent Secondary Color (Cyan/Teal) */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {/* Emergency - Consistent cyan style with red icon */}
              <button onClick={() => setShowEmergencyModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Siren className="w-4 h-4 text-red-400 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">{t('nav_emergency')}</span>
              </button>

              {/* About - Scrolls to About section */}
              <a href="#about" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">{t('nav_about')}</span>
              </a>

              {/* Check Route - Shows Route Planner and scrolls to it */}
              <button onClick={() => { setShowRoutePlanner(true); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Navigation className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="font-medium text-sm">{t('nav_check_route')}</span>
              </button>

              {/* Live Incidents - Opens Modal */}
              <button onClick={() => setShowDailyIncidentsModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Eye className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">{t('nav_live_incidents')}</span>
              </button>

              {/* Report - Consistent cyan style */}
              <button onClick={() => setShowIncidentModal(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all duration-300">
                <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">{t('nav_report')}</span>
              </button>

              {/* Login/Dashboard */}
              {user ? (
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/95 text-slate-900 font-semibold text-sm hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>{t('nav_dashboard')}</span>
                </Link>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-cyan-400/60 text-cyan-300 font-semibold text-sm hover:bg-cyan-400/10 hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300">
                  <span>{t('nav_login')}</span>
                </Link>
              )}

              {/* Language Switcher */}
              <button
                onClick={() => {
                  const newLang = i18n.language === 'en' ? 'rw' : 'en';
                  i18n.changeLanguage(newLang);
                }}
                className="flex items-center justify-center p-2 rounded-lg text-sm font-bold text-cyan-100 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/20 hover:border-cyan-400/50 transition-all uppercase w-10 h-10 ml-2"
                title={t('home_switch_language')}
              >
                {i18n.language === 'rw' ? 'RW' : 'EN'}
              </button>

            </nav>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => {
                  const newLang = i18n.language === 'en' ? 'rw' : 'en';
                  i18n.changeLanguage(newLang);
                }}
                className="flex items-center justify-center p-2 rounded-lg text-sm font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 transition-all uppercase w-10 h-10"
                title={t('home_switch_language')}
              >
                {i18n.language === 'rw' ? 'RW' : 'EN'}
              </button>
              <button className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/98 backdrop-blur-xl border-t border-cyan-500/20 p-4 space-y-2">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Users className="w-5 h-5 text-cyan-400" /><span className="font-medium">{t('nav_about')}</span>
            </a>
            <button onClick={() => { setShowRoutePlanner(true); setMobileMenuOpen(false); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Navigation className="w-5 h-5 text-cyan-400" /><span className="font-medium">{t('nav_check_route')}</span>
            </button>
            <button onClick={() => { setShowDailyIncidentsModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Eye className="w-5 h-5 text-cyan-400" /><span className="font-medium">{t('nav_live_incidents')}</span>
            </button>
            <button onClick={() => { setShowEmergencyModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Siren className="w-5 h-5 text-red-400 animate-pulse" /><span className="font-medium">{t('nav_emergency')}</span>
            </button>
            <button onClick={() => { setShowIncidentModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-100 hover:bg-cyan-500/20 transition-all">
              <Camera className="w-5 h-5 text-cyan-400" /><span className="font-medium">{t('nav_report')}</span>
            </button>
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white text-slate-900 font-semibold">
                <Shield className="w-5 h-5 text-blue-600" /><span>{t('nav_dashboard')}</span>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-cyan-400/50 text-cyan-300 font-medium hover:bg-cyan-500/10 transition-all">
                <span>{t('nav_staff_login')}</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* HERO - FULL WIDTH BACKGROUND IMAGE */}
      <section id="section-hero" className="relative h-[85vh] min-h-[600px] max-h-[850px] overflow-hidden">
        {/* Background Images - Fullscreen Rotating */}
        {heroSlides.map((slide, i) => (
          <div key={slide.id} className={"absolute inset-0 transition-all duration-1000 ease-in-out " + (i === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}>
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            {/* Light gradient on text side only - keeps photos visible */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/30 to-transparent" />
            {/* Subtle top/bottom vignette for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20" />
          </div>
        ))}
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
                <span className="text-white text-sm font-medium">{t('home_live_monitoring')}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 drop-shadow-2xl" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)' }}>{heroSlides[currentSlide].title}</h1>
              <p className="text-lg sm:text-xl text-white/95 max-w-xl mb-8" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{heroSlides[currentSlide].subtitle}</p>
              
              {/* Action Buttons - Plan Route & Emergency Report */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => { setShowRoutePlanner(true); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/40 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                  <MapPinned className="w-5 h-5 text-cyan-400" />{t('home_plan_route')}
                </button>
                <button onClick={() => setShowEmergencyModal(true)} className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/40 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3">
                  <Siren className="w-5 h-5 text-red-400 animate-pulse" />{t('home_emergency_report')}
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

      {/* STATS - Compact Section */}
      <section id="section-stats" className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-6 overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, cyan 1px, transparent 0)', backgroundSize: '40px 40px'}} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Title - Compact */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 backdrop-blur border border-cyan-400/30">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 text-xs font-semibold">{t('home_realtime_stats')}</span>
              <span className="mx-1 w-px h-3 bg-cyan-400/30" />
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {t('home_live_label')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-[10px] font-medium">
                  <WifiOff className="w-2.5 h-2.5" />
                  {t('home_polling_label')}
                </span>
              )}
              <span className="mx-1 w-px h-3 bg-cyan-400/30" />
              <span className="text-slate-500 text-[10px]">{t('home_updated_label')} {formatLastUpdated()}</span>
            </div>
          </div>

          {/* Stats Grid - Compact */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className={`group relative p-4 rounded-2xl bg-slate-800/50 backdrop-blur-xl border transition-all duration-500 overflow-hidden ${
                  statsFlash 
                    ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/20' 
                    : 'border-cyan-400/20 hover:border-cyan-400/40'
                }`}
              >
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-cyan-500/10 transition-all duration-300" />
                {/* Flash overlay on update */}
                <div className={`absolute inset-0 bg-cyan-400/10 transition-opacity duration-700 ${statsFlash ? 'opacity-100' : 'opacity-0'}`} />
                {/* Content */}
                <div className="relative z-10 flex items-center gap-3">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-400 shadow-lg transition-transform duration-500 ${statsFlash ? 'scale-110' : ''}`}>
                    <stat.icon className="w-5 h-5 text-cyan-50" />
                  </div>
                  {/* Text */}
                  <div>
                    <p className="text-2xl font-black text-white">
                      {typeof stat.rawValue === 'number' ? (
                        <AnimatedCounter value={stat.rawValue} suffix={stat.suffix || ''} />
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAFFIC INCIDENTS DASHBOARD - Advanced Dynamic Section */}
      <section id="section-dashboard" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 relative overflow-hidden">
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
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-cyan-300 font-semibold tracking-wide">{t('home_live_updates')}</span>
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white mb-4">
              {t('home_dashboard_title')}
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {t('home_dashboard_subtitle')}
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
                  <span className="font-bold text-lg text-cyan-50">{t('home_route_planner_title')}</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="hidden sm:flex items-center gap-2 text-cyan-300/80 text-sm">
                    <Navigation className="w-4 h-4" />
                    <span>{t('home_route_planner_subtitle')}</span>
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
                  <RoutePlannerMap incidents={allReports} />
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            
            {/* Live Incidents Feed - Left Panel */}
            <div className="lg:col-span-5 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-cyan-400/20 overflow-hidden shadow-2xl shadow-cyan-500/10 group hover:border-cyan-400/40 transition-all duration-500 flex flex-col h-[720px]">
              {/* Header */}
              <div className="p-5 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 via-slate-900/80 to-slate-800/80 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        {t('home_recent_incidents')}
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                      </h3>
                      <p className="text-xs text-cyan-400">{allReports?.length || 0} {t('home_active_incidents')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDailyIncidentsModal(true)} className="flex items-center gap-1.5 text-cyan-400 hover:text-white text-sm font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 group/btn">
                    {t('home_view_all')}
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* Incidents List with Animations - fills available space */}
              <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-400/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <p className="text-cyan-400 mt-4 text-sm font-medium">{t('home_loading_incidents')}</p>
                  </div>
                ) : activeReports?.length > 0 ? (
                  activeReports.slice(0, 15).map((inc, i) => (
                    <div 
                      key={`${inc.reportType}-${inc.id || i}`} 
                      onClick={() => setSelectedIncident(inc)} 
                      className="group/card p-3 rounded-2xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-cyan-400/40 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5"
                      style={{animationDelay: `${i * 50}ms`}}
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
                            {inc.source === 'manual' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                {t('home_manual')}
                              </span>
                            )}
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
                    <h4 className="font-bold text-white text-lg">{t('home_all_clear')}</h4>
                    <p className="text-slate-400 mt-1">{t('home_no_active_incidents_reported')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Activity Feed - Center Panel */}
            <div className="lg:col-span-4 bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-cyan-400/20 overflow-hidden shadow-2xl shadow-cyan-500/10 group hover:border-cyan-400/40 transition-all duration-500 flex flex-col h-[720px]">
              {/* Header */}
              <div className="p-5 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 via-slate-900/80 to-slate-800/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 relative">
                    <Activity className="w-5 h-5 text-white" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{t('home_live_activity_feed')}</h3>
                    <p className="text-xs text-cyan-400">{t('home_real_time_updates')}</p>
                  </div>
                </div>
              </div>
              
              {/* Live Feed Content - Same style as Recent Incidents */}
              <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-cyan-400/20 rounded-full" />
                      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <p className="text-cyan-400 mt-4 text-sm font-medium">{t('home_loading_feed')}</p>
                  </div>
                ) : activeReports?.length > 0 ? (
                  activeReports.slice(0, 15).map((inc, i) => (
                    <div 
                      key={`feed-${inc.reportType}-${inc.id || i}`}
                      className="group/card p-3 rounded-2xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5"
                      style={{animationDelay: `${i * 50}ms`}}
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
                            {inc.source === 'manual' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                {t('home_manual')}
                              </span>
                            )}
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
                    <h4 className="font-bold text-white text-lg">{t('home_all_clear')}</h4>
                    <p className="text-slate-400 mt-1">{t('home_no_active_incidents')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Cards - Right Panel */}
            <div className="lg:col-span-3 space-y-4">
              {/* Report Incident Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-400/20 p-5 shadow-2xl shadow-cyan-500/10 relative overflow-hidden group hover:border-cyan-400/40 hover:shadow-cyan-500/20 transition-all duration-500">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{t('home_report_incident')}</h3>
                  <p className="text-slate-400 text-sm mb-4">{t('home_report_incident_desc')}</p>
                  <button 
                    onClick={() => setShowIncidentModal(true)} 
                    className="w-full py-3 rounded-xl bg-cyan-500/80 text-white/90 font-bold hover:bg-cyan-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5 text-white/80" />
                    {t('home_submit_report')}
                  </button>
                </div>
              </div>

              {/* Emergency Report Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-5 shadow-2xl shadow-red-500/10 relative overflow-hidden group hover:border-red-400/40 hover:shadow-red-500/20 transition-all duration-500">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Siren className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{t('home_emergency_question')}</h3>
                  <p className="text-slate-400 text-sm mb-4">{t('home_emergency_desc')}</p>
                  <button 
                    onClick={() => setShowEmergencyModal(true)} 
                    className="w-full py-3 rounded-xl bg-red-500/80 text-white/90 font-bold hover:bg-red-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <AlertTriangle className="w-5 h-5 text-white/80" />
                    {t('home_emergency_report')}
                  </button>
                </div>
              </div>

              {/* Quick Stats Card - At bottom */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-400/20 p-5 shadow-2xl shadow-cyan-500/10 relative overflow-hidden group hover:border-cyan-400/40 transition-all duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t('home_response_stats')}</h4>
                    <p className="text-xs text-cyan-400">{t('home_last_24_hours')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <span className="text-sm text-slate-400">{t('home_stats_avg_response')}</span>
                    <span className="text-lg font-bold text-emerald-400"><AnimatedCounter value={realTimeStats.avgResponseTime} /> min</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <span className="text-sm text-slate-400">{t('home_stats_resolved_today')}</span>
                    <span className="text-lg font-bold text-cyan-400"><AnimatedCounter value={realTimeStats.resolvedToday} /></span>
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
              <Users className="w-4 h-4" />{t('home_about_us')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{t('home_about_title')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('home_about_subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('home_mission_title')}</h3>
              <p className="text-slate-400 text-sm">{t('home_mission_desc')}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('home_vision_title')}</h3>
              <p className="text-slate-400 text-sm">{t('home_vision_desc')}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('home_service_title')}</h3>
              <p className="text-slate-400 text-sm">{t('home_service_desc')}</p>
            </div>
          </div>
          
          <div className="mt-12 grid md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400"><AnimatedCounter value={realTimeStats.totalReports} /></p>
              <p className="text-slate-400 text-sm">{t('home_stats_total_reports')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400"><AnimatedCounter value={realTimeStats.activeNow} /></p>
              <p className="text-slate-400 text-sm">{t('home_stats_active_now')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400"><AnimatedCounter value={realTimeStats.avgResponseTime} suffix="min" /></p>
              <p className="text-slate-400 text-sm">{t('home_stats_avg_response_time')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-cyan-400/20">
              <p className="text-3xl font-black text-cyan-400">24/7</p>
              <p className="text-slate-400 text-sm">{t('home_active_monitoring')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - Advanced Professional Design */}
      <footer id="section-footer" className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}} />
        </div>

        {/* Main Footer Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
          <div className="grid lg:grid-cols-12 gap-8 mb-8">
            
            {/* Brand Section */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-4 mb-6 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative w-20 h-20 rounded-full bg-white p-1.5 shadow-2xl ring-2 ring-cyan-400/30">
                    <img src="/assets/rnp-logo.png" alt="RNP" className="w-full h-full object-contain rounded-full" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">{t('home_footer_brand')}</h4>
                  <p className="text-cyan-400/80 text-sm font-medium tracking-wide">{t('home_footer_brand_subtitle')}</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md mb-8">
                {t('home_footer_desc')}
              </p>
              
              {/* Social Links / Contact Icons */}
              <div className="flex items-center gap-3">
                <a href="#" className="group p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <Globe className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </a>
                <a href="mailto:info@rnp.gov.rw" className="group p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <Mail className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </a>
                <a href="tel:112" className="group p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <Phone className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </a>
                           </div>
            </div>

            {/* Quick Links Section */}
            <div className="lg:col-span-3">
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent" />
                {t('home_footer_quick_links')}
              </h5>
              <nav className="space-y-1">
                <a href="#about" className="group flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-cyan-500/10 transition-all duration-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Users className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 group-hover:text-white font-medium transition-colors">{t('home_about_us')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </a>
                <button onClick={() => { setShowRoutePlanner(true); setMobileMenuOpen(false); setTimeout(() => document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="group flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-cyan-500/10 transition-all duration-300 w-full text-left">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Navigation className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 group-hover:text-white font-medium transition-colors">{t('nav_check_route')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </button>
                <button onClick={() => setShowDailyIncidentsModal(true)} className="group flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-cyan-500/10 transition-all duration-300 w-full text-left">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Eye className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 group-hover:text-white font-medium transition-colors">{t('home_view_incidents')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </button>
                <button onClick={() => setShowIncidentModal(true)} className="group flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-cyan-500/10 transition-all duration-300 w-full text-left">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Camera className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 group-hover:text-white font-medium transition-colors">{t('home_report_incident')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </button>
                <Link to="/login" className="group flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-cyan-500/10 transition-all duration-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Shield className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-slate-400 group-hover:text-white font-medium transition-colors">{t('home_staff_portal')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </Link>
              </nav>
            </div>

            {/* Emergency Contacts Section */}
            <div className="lg:col-span-4">
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gradient-to-r from-red-400 to-transparent" />
                {t('home_emergency_contacts')}
              </h5>
              <div className="space-y-2">
                {/* Emergency 112 */}
                <a href="tel:112" className="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Siren className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="relative flex-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0">{t('home_emergency_hotline')}</p>
                    <p className="text-3xl font-black text-white">112</p>
                  </div>
                </a>

                {/* Traffic 113 */}
                <a href="tel:113" className="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Car className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="relative flex-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0">{t('home_traffic_police')}</p>
                    <p className="text-3xl font-black text-white">113</p>
                  </div>
                </a>

                {/* Fire Brigade */}
                <a href="tel:112" className="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300">
                  <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-300">
                    <Flame className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="relative flex-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0">{t('home_fire_rescue')}</p>
                    <p className="text-3xl font-black text-white">112</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative pt-8 border-t border-slate-800/50">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span>{t('home_footer_copyright')}</span>
                <span className="hidden sm:inline">{t('home_footer_rights')}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('home_system_online')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  <span>{t('home_location')}</span>
                </div>
              </div>
            </div>
            {/* Keyboard Shortcuts Hint */}
            <div className="hidden lg:flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-800/30">
              <span className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold">{t('home_keyboard')}</span>
              <div className="flex items-center gap-3 text-[10px] text-slate-600">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">↑</kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">↓</kbd> {t('home_keyboard_scroll')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">←</kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">→</kbd> {t('home_keyboard_hero')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">R</kbd> {t('home_keyboard_report')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">E</kbd> {t('home_keyboard_emergency')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">L</kbd> {t('home_keyboard_live')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">P</kbd> {t('home_keyboard_route')}</span>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">Esc</kbd> {t('home_keyboard_close')}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <Modal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} title={t('home_modal_report_incident')} theme="dark"><ReportIncidentForm onSuccess={() => setShowIncidentModal(false)} /></Modal>
      <Modal isOpen={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title={t('home_modal_emergency_report')} size="lg" theme="dark"><ReportIncidentForm isEmergency onSuccess={() => setShowEmergencyModal(false)} /></Modal>

      <Modal isOpen={!!selectedIncident} onClose={() => setSelectedIncident(null)} title={t('home_modal_incident_details')}>
        {selectedIncident && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className={"px-4 py-1.5 rounded-xl text-sm font-bold " + getSeverityStyles(selectedIncident.severity)}>{(selectedIncident.severity || t('home_severity_low')).toUpperCase()}</span><span className="text-sm text-slate-500">{selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString() : t('home_time_just_now')}</span></div>
            <div><h4 className="text-xl font-bold text-slate-900">{selectedIncident.incident_type}</h4><p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" />{selectedIncident.location}</p></div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><h5 className="font-semibold text-slate-700 mb-2">{t('home_description')}</h5><p className="text-slate-600 text-sm">{selectedIncident.description || t('home_no_description')}</p></div>
          </div>
        )}
      </Modal>
      <DailyIncidentsModal isOpen={showDailyIncidentsModal} onClose={() => setShowDailyIncidentsModal(false)} />
    </div>
  );
};

export default HomePage;
