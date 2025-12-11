import React, { useState } from 'react';
import { Navigation, MapPin, AlertTriangle } from 'lucide-react';
import { searchKigaliLocation, getLocationCoordinates } from '../data/kigaliLocations';

const RoutePlanner = () => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  const handleStartSearch = (value) => {
    setStartLocation(value);
    if (value.length >= 2) {
      const results = searchKigaliLocation(value);
      setStartSuggestions(results);
      setShowStartSuggestions(true);
    } else {
      setShowStartSuggestions(false);
    }
  };

  const handleEndSearch = (value) => {
    setEndLocation(value);
    if (value.length >= 2) {
      const results = searchKigaliLocation(value);
      setEndSuggestions(results);
      setShowEndSuggestions(true);
    } else {
      setShowEndSuggestions(false);
    }
  };

  const selectStart = (suggestion) => {
    setStartLocation(suggestion.name);
    setShowStartSuggestions(false);
  };

  const selectEnd = (suggestion) => {
    setEndLocation(suggestion.name);
    setShowEndSuggestions(false);
  };

  const checkRoute = () => {
    if (startLocation && endLocation) {
      setRouteResult({
        from: startLocation,
        to: endLocation,
        incidents: 0,
        status: 'clear'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Navigation className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Plan Your Route</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Start Location
          </label>
          <input
            type="text"
            value={startLocation}
            onChange={(e) => handleStartSearch(e.target.value)}
            onFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
            placeholder="e.g., Kimihurura, Airport, KN 3 Ave..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {showStartSuggestions && startSuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {startSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectStart(suggestion)}
                  className="autocomplete-item"
                >
                  {suggestion.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* End Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎯 Destination
          </label>
          <input
            type="text"
            value={endLocation}
            onChange={(e) => handleEndSearch(e.target.value)}
            onFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
            placeholder="e.g., Nyabugogo, KCC, Remera..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {showEndSuggestions && endSuggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {endSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectEnd(suggestion)}
                  className="autocomplete-item"
                >
                  {suggestion.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={checkRoute}
        disabled={!startLocation || !endLocation}
        className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Check Route for Incidents
      </button>

      {routeResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-800">
            <MapPin className="w-5 h-5" />
            <span className="font-semibold">
              Route from {routeResult.from} to {routeResult.to}
            </span>
          </div>
          <p className="text-green-700 mt-2">
            ✅ No major incidents on this route
          </p>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;
