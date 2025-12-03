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

    // Ensure incidentList is an array
    if (!Array.isArray(incidentList)) {
        console.warn('incidentList is not an array:', incidentList);
        incidentList = [];
    }

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

// Report incident (opens reporting modal)
function reportIncident() {
    if (!utils.isAuthenticated()) {
        utils.showNotification('Please login to report an incident', 'warning');
        showLogin();
        return;
    }

    // Show reporting modal
    const modal = document.getElementById('reportModal') || createReportModal();
    modal.style.display = 'block';

    // Reset form
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// Create report incident modal
function createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeReportModal()"></div>
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Report Traffic Incident</h2>
                <button class="modal-close" onclick="closeReportModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="reportForm" onsubmit="handleReportSubmit(event)">
                    <div class="form-group">
                        <label>Incident Type *</label>
                        <select name="type" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                            <option value="">Select type...</option>
                            <option value="congestion">Traffic Congestion</option>
                            <option value="accident">Accident</option>
                            <option value="road_blockage">Road Blockage</option>
                            <option value="hazard">Road Hazard</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Severity Level *</label>
                        <select name="severity" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Location *</label>
                        <input type="text" name="address" placeholder="Street or landmark" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; box-sizing: border-box;">
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" placeholder="Additional details..." rows="3" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; box-sizing: border-box; font-family: inherit;"></textarea>
                    </div>

                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" name="useCurrentLocation">
                            Use my current location
                        </label>
                    </div>

                    <div class="form-footer">
                        <button type="button" class="btn btn-outline" onclick="closeReportModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Report</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

// Handle report form submission
async function handleReportSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const incidentData = {
        type: formData.get('type'),
        severity: formData.get('severity'),
        address: formData.get('address'),
        description: formData.get('description') || null,
        latitude: CONFIG.DEFAULT_CENTER[0],
        longitude: CONFIG.DEFAULT_CENTER[1],
    };

    // Get current location if requested
    if (formData.get('useCurrentLocation') && navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            incidentData.latitude = position.coords.latitude;
            incidentData.longitude = position.coords.longitude;
        } catch (error) {
            console.log('Using default location');
        }
    }

    await submitIncident(incidentData);
}

// Close report modal
function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
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
