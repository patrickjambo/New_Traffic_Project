// WebSocket Connection for Real-time Updates

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Initialize WebSocket connection
function initWebSocket() {
    try {
        socket = io(CONFIG.WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: RECONNECT_DELAY,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        });

        // Connection successful
        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            reconnectAttempts = 0;

            // Join location-based room for Kigali
            socket.emit('join_location', {
                latitude: CONFIG.DEFAULT_CENTER[0],
                longitude: CONFIG.DEFAULT_CENTER[1],
            });

            utils.showNotification('Connected to live updates', 'success');
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);

            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect manually
                socket.connect();
            }
        });

        // Connection error
        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            reconnectAttempts++;

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                utils.showNotification('Unable to connect to live updates', 'error');
            }
        });

        // Listen for new incidents
        socket.on('new_incident', (incident) => {
            console.log('🆕 New incident received:', incident);

            // Add to incidents array
            if (window.incidents) {
                window.incidents.unshift(incident);
            }

            // Add marker to map
            addIncidentMarker(incident);

            // Update display
            if (document.getElementById('incident-list')) {
                loadIncidents();
            }

            // Show notification
            utils.showNotification(
                `New ${incident.type} reported at ${incident.location}`,
                'warning'
            );

            // Play notification sound (optional)
            playNotificationSound();
        });

        // Listen for incident updates
        socket.on('incident_updated', (update) => {
            console.log('🔄 Incident updated:', update);

            const { incidentId, status, updates } = update;

            // Update in local array
            if (window.incidents) {
                const index = window.incidents.findIndex(i => i.id === incidentId);
                if (index !== -1) {
                    window.incidents[index] = {
                        ...window.incidents[index],
                        ...updates,
                        status,
                    };
                }
            }

            // Update marker on map
            const marker = window.markers[incidentId];
            if (marker) {
                updateIncidentMarker({ id: incidentId, status, ...updates });
            }

            // Refresh display
            if (document.getElementById('incident-list')) {
                loadIncidents();
            }

            utils.showNotification(`Incident ${status}`, 'info');
        });

        // Listen for incident resolution
        socket.on('incident_resolved', (data) => {
            console.log('✅ Incident resolved:', data);

            const { incidentId } = data;

            // Remove from incidents array
            if (window.incidents) {
                window.incidents = window.incidents.filter(i => i.id !== incidentId);
            }

            // Remove marker from map
            removeIncidentMarker(incidentId);

            // Refresh display
            if (document.getElementById('incident-list')) {
                loadIncidents();
            }

            utils.showNotification('An incident has been resolved', 'success');
        });

        // Listen for broadcast alerts (Police/Admin)
        socket.on('broadcast_alert', (alert) => {
            console.log('📢 Broadcast alert:', alert);

            showBroadcastAlert(alert);
        });

        // Listen for system announcements
        socket.on('system_announcement', (announcement) => {
            console.log('📣 System announcement:', announcement);

            utils.showNotification(announcement.message, 'info');
        });

    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Show broadcast alert
function showBroadcastAlert(alert) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #EA4335, #D93025);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        z-index: 3000;
        max-width: 500px;
        animation: slideDown 0.3s ease-out;
    `;

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">📢</div>
            <div>
                <div style="font-weight: 700; margin-bottom: 4px;">ALERT</div>
                <div>${alert.message}</div>
            </div>
        </div>
    `;

    document.body.appendChild(alertDiv);

    // Play alert sound
    playAlertSound();

    // Remove after 10 seconds
    setTimeout(() => {
        alertDiv.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 300);
    }, 10000);
}

// Play notification sound
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
        // Silent fail - audio not critical
    }
}

// Play alert sound (louder)
function playAlertSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrge7y2Io2CBlou+3nn04QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAChRetOvrqFUUCkaf4PK+bCEFK4Hu8tiKNggZaLvt559OEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQAoUXrTr66hVFApGn+DyvmwhBSuB7vLYijYIGWi77eefThAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQU=');
        audio.volume = 0.6;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
        // Silent fail
    }
}

// Emit event to server
function emitEvent(eventName, data) {
    if (socket && socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.warn('Socket not connected');
    }
}

// Initialize WebSocket on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebSocket);
} else {
    initWebSocket();
}

// Export socket for use in other scripts
window.socket = socket;
window.emitEvent = emitEvent;
