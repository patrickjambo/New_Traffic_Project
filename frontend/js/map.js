// Map Management

let map = null;
let markers = {};
let userLocationMarker = null;

// Initialize map
function initMap() {
    // Create map instance
    map = L.map('traffic-map').setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: CONFIG.MAX_ZOOM,
        minZoom: CONFIG.MIN_ZOOM,
    }).addTo(map);

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                addUserLocationMarker(latitude, longitude);
            },
            (error) => {
                console.warn('Geolocation error:', error);
            }
        );
    }

    // Set up search functionality
    setupSearch();

    console.log('✅ Map initialized');
}

// Add user location marker
function addUserLocationMarker(lat, lon) {
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
    }

    const icon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [20, 20],
    });

    userLocationMarker = L.marker([lat, lon], { icon }).addTo(map);

    userLocationMarker.bindPopup(`
        <div style="text-align: center; padding: 8px;">
            <strong>Your Location</strong>
        </div>
    `);
}

// Add incident marker to map
function addIncidentMarker(incident) {
    const { id, latitude, longitude, type, location, description, status, created_at } = incident;

    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="custom-marker marker-${type}">${utils.getIncidentIcon(type)}</div>`,
        iconSize: [40, 40],
    });

    // Create marker
    const marker = L.marker([latitude, longitude], { icon }).addTo(map);

    // Create popup content
    const popupContent = `
        <div class="popup-content">
            <div class="popup-header" style="background: linear-gradient(135deg, ${utils.getIncidentColor(type)}, ${utils.getIncidentColor(type)}dd);">
                <div class="popup-title">
                    ${utils.getIncidentIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <div class="popup-location">${location}</div>
            </div>
            <div class="popup-body">
                ${description ? `<p style="margin-bottom: 12px; color: #3C4043;">${description}</p>` : ''}
                <div class="popup-info-row">
                    <div class="popup-info-icon">⏰</div>
                    <span>Reported ${utils.formatTimeAgo(created_at)}</span>
                </div>
                <div class="popup-info-row">
                    <div class="popup-info-icon">📊</div>
                    <span>Status: <strong>${status}</strong></span>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn popup-btn-primary" onclick="viewIncidentDetails('${id}')">
                    View Details
                </button>
                <button class="popup-btn popup-btn-secondary" onclick="getDirections(${latitude}, ${longitude})">
                    Directions
                </button>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
    });

    // Store marker reference
    markers[id] = marker;

    return marker;
}

// Remove incident marker
function removeIncidentMarker(incidentId) {
    const marker = markers[incidentId];
    if (marker) {
        map.removeLayer(marker);
        delete markers[incidentId];
    }
}

// Update incident marker
function updateIncidentMarker(incident) {
    removeIncidentMarker(incident.id);
    addIncidentMarker(incident);
}

// Clear all markers
function clearAllMarkers() {
    Object.values(markers).forEach(marker => {
        map.removeLayer(marker);
    });
    markers = {};
}

// Center map on coordinates
function centerMap(lat = CONFIG.DEFAULT_CENTER[0], lon = CONFIG.DEFAULT_CENTER[1], zoom = CONFIG.DEFAULT_ZOOM) {
    map.setView([lat, lon], zoom);
}

// Get directions
function getDirections(lat, lon) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    window.open(url, '_blank');
}

// View incident details
function viewIncidentDetails(incidentId) {
    // Focus on the incident in the sidebar
    const incidentElement = document.querySelector(`[data-incident-id="${incidentId}"]`);
    if (incidentElement) {
        incidentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        incidentElement.style.background = 'var(--primary-light)';
        setTimeout(() => {
            incidentElement.style.background = '';
        }, 2000);
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('location-search');

    if (!searchInput) return;

    const debouncedSearch = utils.debounce(async (query) => {
        if (!query || query.length < 3) return;

        try {
            // Use Nominatim for geocoding (free, no API key required)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},Kigali,Rwanda&limit=5`
            );
            const results = await response.json();

            if (results.length > 0) {
                const { lat, lon, display_name } = results[0];
                centerMap(parseFloat(lat), parseFloat(lon), 15);

                // Add temporary marker
                const tempMarker = L.marker([lat, lon]).addTo(map);
                tempMarker.bindPopup(display_name).openPopup();

                setTimeout(() => {
                    map.removeLayer(tempMarker);
                }, 5000);
            } else {
                utils.showNotification('Location not found', 'warning');
            }
        } catch (error) {
            console.error('Search error:', error);
            utils.showNotification('Search failed', 'error');
        }
    }, 500);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}

// Initialize map on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}

// Export functions
window.addIncidentMarker = addIncidentMarker;
window.removeIncidentMarker = removeIncidentMarker;
window.updateIncidentMarker = updateIncidentMarker;
window.centerMap = centerMap;
window.getDirections = getDirections;
window.viewIncidentDetails = viewIncidentDetails;
