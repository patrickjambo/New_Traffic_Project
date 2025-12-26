import React, { useState, useEffect, useRef } from 'react';
import { FaCarCrash, FaFireExtinguisher, FaAmbulance, FaPhone, FaUser, FaCar, FaShieldAlt, FaMedkit, FaExclamationTriangle, FaMapMarkerAlt, FaSyncAlt, FaUsers } from 'react-icons/fa';
import { AlertTriangle, MapPin, FileText, Send, Zap, Crosshair } from 'lucide-react';
import { searchKigaliLocation } from '../data/kigaliLocations';
import toast from 'react-hot-toast';

const EMERGENCY_TYPE_OPTIONS = [
  { label: 'Accident', value: 'accident', icon: <FaCarCrash className="inline mr-1" /> },
  { label: 'Fire', value: 'fire', icon: <FaFireExtinguisher className="inline mr-1" /> },
  { label: 'Medical Emergency', value: 'medical', icon: <FaMedkit className="inline mr-1" /> },
  { label: 'Crime', value: 'crime', icon: <FaShieldAlt className="inline mr-1" /> },
  { label: 'Natural Disaster', value: 'disaster', icon: <FaExclamationTriangle className="inline mr-1" /> },
  { label: 'Riot/Violence', value: 'riot', icon: <FaUsers className="inline mr-1" /> },
  { label: 'Hazmat Spill', value: 'hazmat', icon: <FaExclamationTriangle className="inline mr-1" /> },
  { label: 'Other Emergency', value: 'other', icon: <FaExclamationTriangle className="inline mr-1" /> },
];

function ReportIncidentForm(props) {
  const [incidentType, setIncidentType] = useState('');
  const [isEmergency, setIsEmergency] = useState(props.isEmergency || false);
  const [emergencyHelp, setEmergencyHelp] = useState([]);
  const [casualties, setCasualties] = useState(0);
  const [vehicles, setVehicles] = useState(0);
  const [contactPhone, setContactPhone] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('low');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationRef = useRef(null);

  const SEVERITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const EMERGENCY_SERVICES = [
    { value: 'police', label: 'Police', icon: <FaShieldAlt /> },
    { value: 'ambulance', label: 'Ambulance', icon: <FaAmbulance /> },
    { value: 'fire', label: 'Fire Team', icon: <FaFireExtinguisher /> },
  ];

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
    setShowSuggestions(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In a real app, we would reverse geocode here
        // For now, we'll just format the coordinates nicely
        const { latitude, longitude } = position.coords;
        setLocation(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        setLocationLoading(false);
        toast.success('Location acquired!');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to retrieve your location');
        setLocationLoading(false);
      }
    );
  };

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    // Simulate form submission
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      toast.success(isEmergency ? 'Emergency reported successfully!' : 'Incident reported successfully!');
      if (props.onSuccess) props.onSuccess();
    }, 1000);
  }

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-lg shadow-xl p-6 space-y-4 ${isEmergency ? 'border-2 border-red-500' : ''}`}>
      <div className="flex items-center mb-2">
        {isEmergency ? (
          <Zap className="w-6 h-6 text-red-600 mr-2" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-orange-600 mr-2" />
        )}
        <h2 className={`text-lg font-bold ${isEmergency ? 'text-red-600' : 'text-blue-900'}`}>{isEmergency ? 'Emergency Report' : 'Report Incident'}</h2>
      </div>
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        {isEmergency && (
          <>
            <div className="mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <FaExclamationTriangle className="text-red-600" />
                <span className="font-bold text-red-600">EMERGENCY REPORT</span>
              </div>
              <span className="text-xs text-red-800">For life-threatening emergencies, call 999 immediately.</span>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-semibold transition-all ${incidentType === opt.value ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                    onClick={() => setIncidentType(opt.value)}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Services Needed *</label>
              <div className="flex flex-col gap-2">
                {EMERGENCY_SERVICES.map(service => (
                  <label key={service.value} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer text-sm font-semibold transition-all ${emergencyHelp.includes(service.value) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                    <input
                      type="checkbox"
                      value={service.value}
                      checked={emergencyHelp.includes(service.value)}
                      onChange={e => {
                        if (e.target.checked) setEmergencyHelp([...emergencyHelp, service.value]);
                        else setEmergencyHelp(emergencyHelp.filter(v => v !== service.value));
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="flex items-center gap-2">{service.icon} {service.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <FaUser />
                    <span>Casualties</span>
                  </div>
                  <input type="number" min={0} className="w-full bg-transparent border-none p-0 text-lg font-semibold focus:ring-0" value={casualties} onChange={e => setCasualties(Number(e.target.value))} />
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <FaCar />
                    <span>Vehicles</span>
                  </div>
                  <input type="number" min={0} className="w-full bg-transparent border-none p-0 text-lg font-semibold focus:ring-0" value={vehicles} onChange={e => setVehicles(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <FaPhone className="text-gray-400" />
                <input type="text" className="w-full border-none bg-transparent focus:ring-0 text-sm" placeholder="Contact Phone Number" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
              </div>
            </div>
          </>
        )}
        {!isEmergency && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-gray-50"
              value={incidentType}
              onChange={e => setIncidentType(e.target.value)}
              required
            >
              <option value="">Select type...</option>
              {['Traffic Jam', 'Accident', 'Road Work', 'Police Checkpoint', 'Heavy Traffic', 'Fire', 'Medical Emergency', 'Other'].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Shared fields for both modes */}
        <div className="mb-4 relative" ref={locationRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="e.g., Kimihurura, Remera..."
                value={location}
                onChange={handleLocationChange}
                required
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.map((loc, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectLocation(loc)}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-sm text-gray-800">{loc.name}</p>
                      <p className="text-xs text-gray-500">{loc.type} • {loc.district || 'Kigali'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
              title="Use my location"
            >
              {locationLoading ? <FaSyncAlt className="animate-spin" /> : <Crosshair className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <textarea
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder="Describe what you see..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <div className="flex gap-2">
            {SEVERITIES.map(s => (
              <label key={s.value} className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${severity === s.value ? (s.value === 'critical' ? 'bg-red-600 text-white border-red-600' : s.value === 'high' ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                <input
                  type="radio"
                  name="severity"
                  value={s.value}
                  checked={severity === s.value}
                  onChange={() => setSeverity(s.value)}
                  className="hidden"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</div>}

      <button
        type="submit"
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] ${isEmergency ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'}`}
        disabled={submitting}
      >
        {isEmergency ? <FaExclamationTriangle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {submitting ? (isEmergency ? 'Reporting...' : 'Submitting...') : (isEmergency ? 'REPORT EMERGENCY' : 'REPORT INCIDENT')}
      </button>
    </form>
  );
}

export default ReportIncidentForm;
