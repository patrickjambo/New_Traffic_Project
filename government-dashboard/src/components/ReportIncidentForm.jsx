import React, { useState, useEffect, useRef } from 'react';
import { FaCarCrash, FaFireExtinguisher, FaAmbulance, FaPhone, FaShieldAlt, FaExclamationTriangle, FaSyncAlt, FaTruck, FaTree, FaRoad, FaTrafficLight, FaHeartbeat, FaSkull } from 'react-icons/fa';
import { AlertTriangle, MapPin, FileText, Send, Zap, Crosshair, Flame } from 'lucide-react';
import { searchKigaliLocation, getLocationCoordinates } from '../data/kigaliLocations';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';

// Clean incident types for public emergency reporting
const EMERGENCY_TYPE_OPTIONS = [
  { label: 'Accident', value: 'accident', icon: <FaCarCrash className="text-lg" />, color: 'red' },
  { label: 'Fire', value: 'fire', icon: <Flame className="w-5 h-5" />, color: 'orange' },
  { label: 'Traffic Jam', value: 'traffic_jam', icon: <FaTrafficLight className="text-lg" />, color: 'amber' },
  { label: 'Damaged Road', value: 'damaged_road', icon: <FaRoad className="text-lg" />, color: 'yellow' },
  { label: 'Tree Fall', value: 'tree_fall', icon: <FaTree className="text-lg" />, color: 'green' },
];

// Emergency services available
const EMERGENCY_SERVICES = [
  { value: 'police', label: 'Police', icon: <FaShieldAlt className="text-lg" />, color: 'blue' },
  { value: 'ambulance', label: 'Ambulance', icon: <FaAmbulance className="text-lg" />, color: 'red' },
  { value: 'fire_brigade', label: 'Fire Brigade', icon: <FaFireExtinguisher className="text-lg" />, color: 'orange' },
  { value: 'road_clearance', label: 'Road Clearance', icon: <FaTruck className="text-lg" />, color: 'slate', desc: 'Remove vehicles/debris' },
];

// Severity levels
const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Minor issue, no injuries', color: 'green' },
  { value: 'medium', label: 'Medium', desc: 'Moderate, needs attention', color: 'yellow' },
  { value: 'high', label: 'High', desc: 'Serious, injuries possible', color: 'orange' },
  { value: 'critical', label: 'Critical', desc: 'Life-threatening emergency', color: 'red' },
];

function ReportIncidentForm(props) {
  const [incidentType, setIncidentType] = useState('');
  const [isEmergency, setIsEmergency] = useState(props.isEmergency || false);
  const [emergencyHelp, setEmergencyHelp] = useState([]);
  const [contactPhone, setContactPhone] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(-1.9536);
  const [longitude, setLongitude] = useState(30.0606);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [injuredCount, setInjuredCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { reportIncident, reportEmergency } = useData();

  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationRef = useRef(null);

  // Auto-select services based on incident type
  useEffect(() => {
    if (isEmergency && incidentType) {
      const autoServices = {
        'accident': ['police', 'ambulance'],
        'fire': ['fire_brigade', 'ambulance'],
        'traffic_jam': ['police'],
        'damaged_road': ['police', 'road_clearance'],
        'tree_fall': ['road_clearance', 'police'],
      };
      setEmergencyHelp(autoServices[incidentType] || []);
    }
  }, [incidentType, isEmergency]);

  // Auto-generate description based on selections
  useEffect(() => {
    if (isEmergency && incidentType) {
      // Get incident type label
      const incidentLabel = EMERGENCY_TYPE_OPTIONS.find(opt => opt.value === incidentType)?.label || incidentType;
      
      // Get selected services labels
      const selectedServices = emergencyHelp.map(serviceValue => {
        return EMERGENCY_SERVICES.find(s => s.value === serviceValue)?.label || serviceValue;
      });
      
      // Build automatic description
      let autoDescription = '';
      
      // Incident happened message
      const incidentMessages = {
        'accident': '🚨 ACCIDENT reported',
        'fire': '🔥 FIRE reported',
        'traffic_jam': '🚗 TRAFFIC JAM reported',
        'damaged_road': '🛣️ DAMAGED ROAD reported',
        'tree_fall': '🌳 TREE FALL blocking road reported',
      };
      
      autoDescription = incidentMessages[incidentType] || `${incidentLabel} reported`;
      
      // Add location
      if (location) {
        autoDescription += ` at ${location}`;
      }
      
      // Add severity
      const severityLabel = SEVERITY_OPTIONS.find(s => s.value === severity)?.label || severity;
      autoDescription += `. Severity: ${severityLabel.toUpperCase()}`;
      
      // Add casualties if any
      if (deadCount > 0 || injuredCount > 0) {
        autoDescription += '. ⚠️ CASUALTIES:';
        if (deadCount > 0) {
          autoDescription += ` ${deadCount} dead`;
        }
        if (injuredCount > 0) {
          autoDescription += deadCount > 0 ? `, ${injuredCount} injured` : ` ${injuredCount} injured`;
        }
      }
      
      // Add services needed
      if (selectedServices.length > 0) {
        autoDescription += `. Emergency services needed: ${selectedServices.join(', ')}`;
      }
      
      // Add urgency based on severity
      if (severity === 'critical' || deadCount > 0) {
        autoDescription += '. 🚨 URGENT - IMMEDIATE RESPONSE REQUIRED!';
      } else if (severity === 'high' || injuredCount > 0) {
        autoDescription += '. Please respond quickly!';
      } else {
        autoDescription += '. Please respond.';
      }
      
      // Add witness contact if phone provided
      if (contactPhone && contactPhone.trim().length >= 10) {
        autoDescription += ` Witness contact: ${contactPhone}`;
      }
      
      setDescription(autoDescription);
    }
  }, [incidentType, location, emergencyHelp, isEmergency, contactPhone, severity, injuredCount, deadCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    if (value.length > 1) {
      const results = searchKigaliLocation(value);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectLocation = (loc) => {
    setLocation(loc.name);
    if (loc.lat && loc.lng) {
      setLatitude(loc.lat);
      setLongitude(loc.lng);
    } else {
      const coords = getLocationCoordinates(loc.name);
      setLatitude(coords.lat);
      setLongitude(coords.lng);
    }
    setShowSuggestions(false);
  };

  const handleUseMyLocation = () => {
    // Check if we're on HTTPS or localhost (required for geolocation)
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please type your location manually.');
      return;
    }

    if (!isSecure) {
      // Show helpful message and set default Kigali location
      toast('📍 Location access requires HTTPS. Using Kigali City Center as default - please type your specific location.', {
        icon: 'ℹ️',
        duration: 5000,
      });
      // Set default to Kigali City Center
      setLatitude(-1.9536);
      setLongitude(30.0606);
      setLocation('Kigali City Center (please specify exact location)');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In a real app, we would reverse geocode here
        // For now, we'll just format the coordinates nicely
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        setLocation(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setLocationLoading(false);
        toast.success('Location acquired!');
      },
      (error) => {
        console.error('Error getting location:', error);
        // Provide helpful fallback
        toast('📍 Could not get your location. Please type your location manually or select from suggestions.', {
          icon: 'ℹ️',
          duration: 4000,
        });
        // Set default Kigali location
        setLatitude(-1.9536);
        setLongitude(30.0606);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Determine severity based on incident type
  const getSeverityFromType = (type) => {
    const severityMap = {
      'accident': 'high',
      'fire': 'critical',
      'traffic_jam': 'medium',
      'damaged_road': 'medium',
      'tree_fall': 'medium',
    };
    return severityMap[type] || 'medium';
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!incidentType && isEmergency) {
      toast.error('Please select an incident type');
      return;
    }

    if (!location) {
      toast.error('Please enter a location');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    // Generate current timestamp
    const reportedAt = new Date().toISOString();

    try {
      let result;
      if (isEmergency) {
        result = await reportEmergency({
          emergencyType: incidentType,
          severity: severity, // User-selected severity
          locationName: location,
          locationDescription: location,
          latitude,
          longitude,
          description,
          casualtiesCount: deadCount + injuredCount, // Total casualties
          injuredCount: injuredCount,
          deadCount: deadCount,
          vehiclesInvolved: 0,
          servicesNeeded: emergencyHelp,
          contactPhone: contactPhone || '0780000000',
          contactName: 'Public User',
          reportedAt: reportedAt
        });
      } else {
        result = await reportIncident({
          type: incidentType,
          severity: severity, // User-selected severity
          latitude,
          longitude,
          address: location,
          description,
          isAnonymous: true,
          reportedAt: reportedAt
        });
      }

      if (result.success) {
        setSuccess(true);
        // Only show toast for incidents - emergencies are handled by DataContext
        if (!isEmergency) {
          toast.success('Incident reported successfully!');
        }
        if (props.onSuccess) props.onSuccess();
        // Reset form
        setIncidentType('');
        setDescription('');
        setLocation('');
        setEmergencyHelp([]);
        setContactPhone('');
        setSeverity('medium');
        setInjuredCount(0);
        setDeadCount(0);
      } else {
        setError(result.message || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step 1: Select Incident Type */}
      <div>
        <label className="block text-sm font-semibold text-cyan-300 mb-2">
          {isEmergency ? 'What happened?' : 'Incident Type'} *
        </label>
        <div className="grid grid-cols-5 gap-2">
          {EMERGENCY_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIncidentType(opt.value)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
                incidentType === opt.value
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
              }`}
            >
              <div className={`mb-1 ${incidentType === opt.value ? 'text-cyan-400' : 'text-slate-400'}`}>
                {opt.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Location - Compact */}
      <div ref={locationRef}>
        <label className="block text-sm font-semibold text-cyan-300 mb-2">Where? *</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm text-white placeholder-slate-400"
              placeholder="Enter location (e.g., Kabeza, Kimironko)"
              value={location}
              onChange={handleLocationChange}
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                {suggestions.slice(0, 5).map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectLocation(loc)}
                    className="px-3 py-2 hover:bg-cyan-500/20 cursor-pointer text-sm border-b border-slate-700 last:border-0"
                  >
                    <p className="font-medium text-white">{loc.name}</p>
                    <p className="text-xs text-slate-400">{loc.district || 'Kigali'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationLoading}
            className="px-3 py-2.5 bg-slate-700/50 text-cyan-400 border border-slate-600 rounded-xl hover:bg-slate-700 hover:border-cyan-500 transition-colors"
            title="Use my location"
          >
            {locationLoading ? <FaSyncAlt className="animate-spin" /> : <Crosshair className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Step 3: Emergency Services Needed - Compact horizontal layout */}
      {isEmergency && (
        <div>
          <label className="block text-sm font-semibold text-cyan-300 mb-2">Services Needed</label>
          <div className="grid grid-cols-4 gap-2">
            {EMERGENCY_SERVICES.map(service => (
              <button
                key={service.value}
                type="button"
                onClick={() => {
                  if (emergencyHelp.includes(service.value)) {
                    setEmergencyHelp(emergencyHelp.filter(v => v !== service.value));
                  } else {
                    setEmergencyHelp([...emergencyHelp, service.value]);
                  }
                }}
                className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all duration-200 ${
                  emergencyHelp.includes(service.value)
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                <div className={emergencyHelp.includes(service.value) ? 'text-cyan-400' : 'text-slate-400'}>
                  {service.icon}
                </div>
                <span className="text-xs font-medium mt-1">{service.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3.5: Severity & Casualties - Only for emergencies */}
      {isEmergency && (
        <div className="grid grid-cols-3 gap-3">
          {/* Severity Selection */}
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">Severity Level</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeverity(option.value)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border-2 transition-all duration-200 ${
                    severity === option.value
                      ? `${option.bgColor} ${option.borderColor} ${option.textColor} shadow-lg`
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Injured Count */}
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">
              <span className="flex items-center gap-1.5">
                <FaHeartbeat className="text-orange-400" />
                Injured People
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInjuredCount(Math.max(0, injuredCount - 1))}
                className="w-10 h-10 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-lg font-bold"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className={`text-2xl font-bold ${injuredCount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                  {injuredCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInjuredCount(injuredCount + 1)}
                className="w-10 h-10 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Dead Count */}
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">
              <span className="flex items-center gap-1.5">
                <FaSkull className="text-red-400" />
                Deceased
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeadCount(Math.max(0, deadCount - 1))}
                className="w-10 h-10 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-lg font-bold"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className={`text-2xl font-bold ${deadCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {deadCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeadCount(deadCount + 1)}
                className="w-10 h-10 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Auto-Generated Description & Phone - Combined row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-cyan-300 mb-2">
            Auto-Generated Message
            <span className="ml-2 text-xs font-normal text-teal-400">✓ Created automatically</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-teal-400" />
            <textarea
              className="w-full pl-9 pr-3 py-2 bg-slate-700/30 border border-teal-500/50 rounded-xl text-sm resize-none text-teal-100 cursor-default"
              value={description}
              readOnly
              rows={3}
              placeholder="Select incident type, location, and services to auto-generate message..."
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-cyan-300 mb-2">Your Phone (optional)</label>
          <div className="relative">
            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="tel"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm text-white placeholder-slate-400"
              placeholder="07X XXX XXXX"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">For follow-up if needed</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/30">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || !incidentType || !location}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all duration-200 ${
          isEmergency
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-900 shadow-cyan-500/30 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400'
            : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-900 shadow-cyan-500/30 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400'
        } disabled:cursor-not-allowed disabled:shadow-none`}
      >
        {submitting ? (
          <>
            <FaSyncAlt className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            {isEmergency ? <Zap className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            {isEmergency ? 'REPORT EMERGENCY' : 'SUBMIT REPORT'}
          </>
        )}
      </button>
    </form>
  );
}

export default ReportIncidentForm;
