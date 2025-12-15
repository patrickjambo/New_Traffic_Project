import React, { useState } from 'react';
import { FaCarCrash, FaFireExtinguisher, FaAmbulance, FaPhone, FaUser, FaCar, FaShieldAlt, FaMedkit, FaExclamationTriangle, FaMapMarkerAlt, FaSyncAlt, FaUsers } from 'react-icons/fa';
import { AlertTriangle, MapPin, FileText, Send, Zap } from 'lucide-react';


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

  // Example state declarations (add your actual logic as needed):
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

  // Example SEVERITIES array
  const SEVERITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  // Example EMERGENCY_SERVICES array
  const EMERGENCY_SERVICES = [
    { value: 'police', label: 'Police', icon: <FaShieldAlt /> },
    { value: 'ambulance', label: 'Ambulance', icon: <FaAmbulance /> },
    { value: 'fire', label: 'Fire Team', icon: <FaFireExtinguisher /> },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    // Simulate form submission
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
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
      <div className="max-h-[70vh] overflow-y-auto">
        {isEmergency && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FaExclamationTriangle className="text-red-600" />
                <span className="font-bold text-red-600">EMERGENCY REPORT</span>
              </div>
              <span className="text-xs text-gray-500">For life-threatening emergencies, call 999 immediately.</span>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type *</label>
              <div className="flex flex-wrap gap-2">
                {EMERGENCY_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border flex items-center gap-1 text-sm font-semibold transition ${incidentType === opt.value ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
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
                  <label key={service.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-semibold ${emergencyHelp.includes(service.value) ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}> 
                    <input
                      type="checkbox"
                      value={service.value}
                      checked={emergencyHelp.includes(service.value)}
                      onChange={e => {
                        if (e.target.checked) setEmergencyHelp([...emergencyHelp, service.value]);
                        else setEmergencyHelp(emergencyHelp.filter(v => v !== service.value));
                      }}
                      className="hidden"
                    />
                    {service.icon} {service.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
              <div className="flex gap-4 mb-2">
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <FaUser />
                  <span>Casualties</span>
                  <input type="number" min={0} className="w-12 border border-gray-300 rounded px-2" value={casualties} onChange={e => setCasualties(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <FaCar />
                  <span>Vehicles Involved</span>
                  <input type="number" min={0} className="w-12 border border-gray-300 rounded px-2" value={vehicles} onChange={e => setVehicles(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <FaPhone />
                <input type="text" className="w-full border-none bg-transparent" placeholder="Contact Phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
              </div>
            </div>
          </>
        )}
        {!isEmergency && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={incidentType}
              onChange={e => setIncidentType(e.target.value)}
              required
            >
              <option value="">Select type...</option>
              {['Traffic Jam','Accident','Road Work','Police Checkpoint','Heavy Traffic','Fire','Medical Emergency','Other'].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        {/* Shared fields for both modes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-500 mr-2" />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Kimihurura, Remera, City Center"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-blue-500 mr-2" />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what you see..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <div className="flex gap-2">
            {SEVERITIES.map(s => (
              <label key={s.value} className={`px-3 py-1 rounded-full border cursor-pointer text-xs font-semibold ${severity === s.value ? (s.value === 'critical' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
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
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Report submitted! Thank you.</div>}
      <button
        type="submit"
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors ${isEmergency ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        disabled={submitting}
      >
        {isEmergency ? <FaExclamationTriangle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {submitting ? (isEmergency ? 'Reporting...' : 'Submitting...') : (isEmergency ? 'REPORT EMERGENCY' : 'REPORT INCIDENT')}
      </button>
    </form>
  );
}

export default ReportIncidentForm;
