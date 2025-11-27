// Incident Management

let incidents = [];

// Load and display incidents
async function loadIncidents() {
    try {
        const response = await api.getIncidents();

        if (response.success) {
            incidents = response.data;
            displayIncidents(incidents);
            updateStats(incidents);
            utils.updateLastUpdateTime();
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
        showIncidentError('Failed to load incidents');
    }
}

// Display incidents in sidebar
function displayIncidents(incidentList) {
    const container = document.getElementById('incident-list');

    if (!container) return;

    // Clear existing incidents
    container.innerHTML = '';

    if (incidentList.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <p>No incidents reported</p>
            </div>
        `;
        return;
    }

    // Sort by created_at (most recent first)
    const sortedIncidents = [...incidentList].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    // Display incidents
    sortedIncidents.forEach(incident => {
        const incidentElement = createIncidentElement(incident);
        container.appendChild(incidentElement);

        // Add marker to map
        addIncidentMarker(incident);
    });
}

// Create incident DOM element
function createIncidentElement(incident) {
    const { id, type, location, description, status, created_at, severity } = incident;

    const div = document.createElement('div');
    div.className = `incident-item incident-${type}`;
    div.setAttribute('data-incident-id', id);

    div.innerHTML = `
        <div class="incident-type">
            ${utils.getIncidentIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}
            ${severity ? `<span style="font-size: 11px; background: var(--danger-color); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${severity}</span>` : ''}
        </div>
        <div class="incident-location">${location}</div>
        ${description ? `<div style="font-size: 13px; color: var(--gray-700); margin: 4px 0;">${description}</div>` : ''}
        <div class="incident-meta">
            Reported ${utils.formatTimeAgo(created_at)} • ${status}
        </div>
    `;

    // Click to center on map
    div.addEventListener('click', () => {
        if (incident.latitude && incident.longitude) {
            centerMap(incident.latitude, incident.longitude, 16);

            // Open marker popup
            const marker = window.markers[id];
            if (marker) {
                marker.openPopup();
            }
        }
    });

    return div;
}

// Update statistics
function updateStats(incidentList) {
    const activeCount = incidentList.filter(i => i.status !== 'resolved').length;
    const congestionCount = incidentList.filter(i => i.type === 'congestion' && i.status !== 'resolved').length;
    const accidentCount = incidentList.filter(i => i.type === 'accident' && i.status !== 'resolved').length;

    const activeElement = document.getElementById('active-incidents');
    const congestionElement = document.getElementById('congestion-count');
    const accidentElement = document.getElementById('accident-count');

    if (activeElement) {
        activeElement.textContent = activeCount;
        animateNumber(activeElement, activeCount);
    }

    if (congestionElement) {
        congestionElement.textContent = `${congestionCount} areas`;
        animateNumber(congestionElement, congestionCount);
    }

    if (accidentElement) {
        accidentElement.textContent = `${accidentCount} reported`;
        animateNumber(accidentElement, accidentCount);
    }
}

// Animate number change
function animateNumber(element, targetValue) {
    element.style.transform = 'scale(1.2)';
    element.style.color = 'var(--primary-color)';

    setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 300);
}

// Show incident error
function showIncidentError(message) {
    const container = document.getElementById('incident-list');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <p style="color: var(--danger-color);">${message}</p>
                <button class="btn btn-primary" onclick="loadIncidents()" style="margin-top: 12px;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Refresh incidents
async function refreshIncidents() {
    utils.showNotification('Refreshing incidents...', 'info');
    await loadIncidents();
    utils.showNotification('Incidents updated', 'success');
}

// Report incident (opens reporting interface)
function reportIncident() {
    if (!utils.isAuthenticated()) {
        utils.showNotification('Please login to report an incident', 'warning');
        showLogin();
        return;
    }

    // For now, show a simple prompt (you can create a proper modal later)
    const type = prompt('Incident type (congestion/accident/blockage):');
    const location = prompt('Location:');
    const description = prompt('Description:');

    if (!type || !location) {
        return;
    }

    // Get current position or use default
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const incident = {
                    type: type.toLowerCase(),
                    location,
                    description,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };

                await submitIncident(incident);
            },
            async () => {
                // Fallback to default coordinates
                const incident = {
                    type: type.toLowerCase(),
                    location,
                    description,
                    latitude: CONFIG.DEFAULT_CENTER[0],
                    longitude: CONFIG.DEFAULT_CENTER[1],
                };

                await submitIncident(incident);
            }
        );
    }
}

// Submit incident to API
async function submitIncident(incidentData) {
    try {
        const response = await api.createIncident(incidentData);

        if (response.success) {
            utils.showNotification('Incident reported successfully!', 'success');
            await refreshIncidents();
        }
    } catch (error) {
        console.error('Error reporting incident:', error);
        utils.showNotification(error.message || 'Failed to report incident', 'error');
    }
}

// View emergency information
function viewEmergency() {
    alert(`🆘 Emergency Contacts:

Police: 112
Ambulance: 912
Fire: 111

TrafficGuard AI Support: +250 788 XXX XXX

For immediate assistance, please call the relevant emergency service.`);
}

// Initialize incidents on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for map to initialize
        setTimeout(loadIncidents, 1000);
    });
} else {
    setTimeout(loadIncidents, 1000);
}

// Auto-refresh every 30 seconds
setInterval(() => {
    loadIncidents();
}, 30000);

// Export functions
window.refreshIncidents = refreshIncidents;
window.reportIncident = reportIncident;
window.viewEmergency = viewEmergency;
window.markers = window.markers || {};
