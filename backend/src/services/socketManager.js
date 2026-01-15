/**
 * Socket Manager - Centralized WebSocket Event Hub
 * Handles all real-time communication between backend, frontend, and mobile app
 */

class SocketManager {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }

    /**
     * Initialize the socket manager with Socket.IO instance
     */
    initialize(io) {
        this.io = io;
        this.setupConnectionHandlers();
        console.log('📡 SocketManager initialized');
    }

    /**
     * Setup connection and disconnection handlers
     */
    setupConnectionHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`✅ Client connected: ${socket.id}`);
            this.connectedClients.set(socket.id, {
                connectedAt: new Date(),
                rooms: [],
            });

            // Handle client disconnection
            socket.on('disconnect', (reason) => {
                console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
                this.connectedClients.delete(socket.id);
            });

            // Join role-based room (police, admin, public)
            socket.on('join:role', (data) => {
                const { role, userId } = data;
                if (role && ['police', 'admin', 'public'].includes(role)) {
                    const roomName = `role:${role}`;
                    socket.join(roomName);

                    // Also join user-specific room for targeted notifications
                    if (userId) {
                        socket.join(`user:${userId}`);
                    }

                    this.updateClientRoom(socket.id, roomName);
                    console.log(`👮 Client ${socket.id} joined room: ${roomName}`);
                }
            });

            // Join location-based room
            socket.on('join:location', (data) => {
                const { latitude, longitude } = data;
                if (latitude && longitude) {
                    // Create grid-based room (roughly 1km squares)
                    const roomName = `loc:${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
                    socket.join(roomName);
                    this.updateClientRoom(socket.id, roomName);
                    console.log(`📍 Client ${socket.id} joined location room: ${roomName}`);
                }
            });

            // Heartbeat for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
        });
    }

    /**
     * Update client's room membership
     */
    updateClientRoom(socketId, room) {
        const client = this.connectedClients.get(socketId);
        if (client && !client.rooms.includes(room)) {
            client.rooms.push(room);
        }
    }

    // ============================================
    // INCIDENT EVENTS
    // ============================================

    /**
     * Emit new incident to all connected clients
     */
    emitIncidentNew(incident) {
        if (!this.io) return;

        const payload = {
            id: incident.id,
            type: incident.type,
            severity: incident.severity,
            location: incident.location,
            address: incident.address,
            description: incident.description,
            status: incident.status || 'reported',
            createdAt: incident.created_at || new Date().toISOString(),
        };

        // Emit to all clients
        this.io.emit('incident:new', payload);

        // Also emit to police and admin rooms specifically
        this.io.to('role:police').to('role:admin').emit('incident:alert', {
            ...payload,
            priority: incident.severity === 'critical' || incident.severity === 'high' ? 'high' : 'normal',
        });

        // Emit notification for police and admin
        this.emitNotificationToRole('police', {
            id: `inc_${incident.id}`,
            title: `New Incident: ${incident.type}`,
            message: `A new ${incident.severity} severity incident has been reported at ${incident.address || 'Unknown location'}.`,
            type: 'incident',
            created_at: incident.created_at
        });
        this.emitNotificationToRole('admin', {
            id: `inc_${incident.id}`,
            title: `New Incident: ${incident.type}`,
            message: `A new ${incident.severity} severity incident has been reported at ${incident.address || 'Unknown location'}.`,
            type: 'incident',
            created_at: incident.created_at
        });

        console.log(`📢 Emitted incident:new and notifications - ID: ${incident.id}`);
    }

    /**
     * Emit incident status update
     */
    emitIncidentUpdate(incident) {
        if (!this.io) return;

        const payload = {
            id: incident.id,
            status: incident.status,
            updatedAt: incident.updated_at || new Date().toISOString(),
            updatedBy: incident.verified_by,
        };

        this.io.emit('incident:update', payload);
        console.log(`🔄 Emitted incident:update - ID: ${incident.id}, Status: ${incident.status}`);
    }

    // ============================================
    // EMERGENCY EVENTS
    // ============================================

    /**
     * Emit new emergency to all connected clients
     */
    emitEmergencyNew(emergency) {
        if (!this.io) return;

        const payload = {
            id: emergency.id,
            type: emergency.emergency_type,
            severity: emergency.severity,
            location: {
                name: emergency.location_name,
                latitude: parseFloat(emergency.latitude),
                longitude: parseFloat(emergency.longitude),
            },
            description: emergency.description,
            servicesNeeded: emergency.services_needed,
            createdAt: emergency.created_at || new Date().toISOString(),
        };

        // Emit to all clients
        this.io.emit('emergency:new', payload);

        // Emit to location-based room
        if (emergency.latitude && emergency.longitude) {
            const room = `loc:${Math.round(emergency.latitude * 100)}_${Math.round(emergency.longitude * 100)}`;
            this.io.to(room).emit('emergency:nearby', payload);
        }

        // High priority alert for police/admin
        this.io.to('role:police').to('role:admin').emit('emergency:alert', {
            ...payload,
            priority: emergency.severity === 'critical' ? 'critical' : 'high',
        });

        // Emit notification for police and admin
        const emergencyNotification = {
            id: `em_${emergency.id}`,
            title: `🚨 EMERGENCY: ${emergency.type}`,
            message: `URGENT: ${emergency.severity} severity emergency at ${emergency.location_name}. Services needed: ${Array.isArray(emergency.services_needed) ? emergency.services_needed.join(', ') : 'Immediate attention'}.`,
            type: 'emergency',
            created_at: emergency.created_at
        };
        this.emitNotificationToRole('police', emergencyNotification);
        this.emitNotificationToRole('admin', emergencyNotification);

        console.log(`🚨 Emitted emergency:new and notifications - ID: ${emergency.id}`);
    }

    /**
     * Emit emergency status update
     */
    emitEmergencyUpdate(emergency) {
        if (!this.io) return;

        const payload = {
            id: emergency.id,
            status: emergency.status,
            assignedTo: emergency.assigned_to,
            updatedAt: emergency.updated_at || new Date().toISOString(),
        };

        this.io.emit('emergency:update', payload);
        console.log(`🔄 Emitted emergency:update - ID: ${emergency.id}, Status: ${emergency.status}`);
    }

    // ============================================
    // ANALYSIS EVENTS (AI Service)
    // ============================================

    /**
     * Emit AI analysis completion
     */
    emitAnalysisComplete(analysisResult) {
        if (!this.io) return;

        const payload = {
            incidentId: analysisResult.incident_id,
            result: analysisResult.result,
            confidence: analysisResult.confidence,
            vehicleCount: analysisResult.vehicle_count,
            incidentDetected: analysisResult.incident_detected,
            detectedType: analysisResult.detected_type,
            completedAt: new Date().toISOString(),
        };

        // Emit to police and admin only
        this.io.to('role:police').to('role:admin').emit('analysis:complete', payload);
        console.log(`🤖 Emitted analysis:complete - Incident ID: ${analysisResult.incident_id}`);
    }

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================

    /**
     * Emit notification to specific user
     */
    emitNotificationToUser(userId, notification) {
        if (!this.io) return;

        const payload = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.created_at || new Date().toISOString(),
            isRead: false,
        };

        this.io.to(`user:${userId}`).emit('notification:new', payload);
        console.log(`🔔 Emitted notification:new to user ${userId}`);
    }

    /**
     * Emit notification to all clients in a role
     */
    emitNotificationToRole(role, notification) {
        if (!this.io) return;

        const payload = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.created_at || new Date().toISOString(),
            isRead: false,
        };

        this.io.to(`role:${role}`).emit('notification:new', payload);
        console.log(`🔔 Emitted notification:new to role: ${role}`);
    }

    /**
     * Broadcast notification to all connected clients
     */
    emitNotificationBroadcast(notification) {
        if (!this.io) return;

        const payload = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.created_at || new Date().toISOString(),
        };

        this.io.emit('notification:new', payload);
        console.log(`🔔 Broadcast notification:new - ${notification.title}`);
    }

    // ============================================
    // DEPLOYMENT EVENTS (Police Officer Assignment)
    // ============================================

    /**
     * Emit new deployment to all connected clients
     */
    emitDeploymentNew(deployment) {
        if (!this.io) return;

        const payload = {
            id: deployment.id,
            officerId: deployment.officer_id,
            officerName: deployment.officer_name,
            incidentId: deployment.incident_id,
            emergencyId: deployment.emergency_id,
            type: deployment.type, // 'incident' or 'emergency'
            status: deployment.status || 'assigned',
            location: deployment.location,
            assignedAt: deployment.assigned_at || new Date().toISOString(),
        };

        // Emit to all police and admin
        this.io.to('role:police').to('role:admin').emit('deployment:new', payload);

        // Emit to specific officer
        if (deployment.officer_id) {
            this.io.to(`user:${deployment.officer_id}`).emit('deployment:assigned', payload);
        }

        console.log(`👮 Emitted deployment:new - Officer: ${deployment.officer_name}`);
    }

    /**
     * Emit deployment status update
     */
    emitDeploymentUpdate(deployment) {
        if (!this.io) return;

        const payload = {
            id: deployment.id,
            status: deployment.status,
            location: deployment.location,
            updatedAt: deployment.updated_at || new Date().toISOString(),
        };

        this.io.to('role:police').to('role:admin').emit('deployment:update', payload);

        // Also notify the assigned officer
        if (deployment.officer_id) {
            this.io.to(`user:${deployment.officer_id}`).emit('deployment:update', payload);
        }

        console.log(`🔄 Emitted deployment:update - ID: ${deployment.id}, Status: ${deployment.status}`);
    }

    /**
     * Emit officer location update (for tracking)
     */
    emitOfficerLocation(officerId, location) {
        if (!this.io) return;

        const payload = {
            officerId,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString(),
        };

        // Only emit to admin for tracking
        this.io.to('role:admin').emit('officer:location', payload);
    }

    /**
     * Emit officer assigned notification
     */
    emitOfficerAssigned(officer, incident) {
        if (!this.io) return;

        const payload = {
            officerId: officer.id,
            officerName: officer.name,
            incidentId: incident.id,
            incidentType: incident.type,
            location: incident.location,
            severity: incident.severity,
            assignedAt: new Date().toISOString(),
        };

        // Notify all admin and police
        this.io.to('role:police').to('role:admin').emit('officer:assigned', payload);

        // Send targeted notification to the assigned officer
        this.emitNotificationToUser(officer.id, {
            id: `assign_${incident.id}_${Date.now()}`,
            title: '📍 New Assignment',
            message: `You have been assigned to a ${incident.severity} ${incident.type} incident.`,
            type: 'assignment',
            created_at: new Date().toISOString(),
        });

        console.log(`👮 Emitted officer:assigned - ${officer.name} → Incident ${incident.id}`);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connectedClients: this.connectedClients.size,
            clients: Array.from(this.connectedClients.entries()).map(([id, data]) => ({
                id,
                connectedAt: data.connectedAt,
                rooms: data.rooms,
            })),
        };
    }

    /**
     * Check if socket manager is ready
     */
    isReady() {
        return this.io !== null;
    }
}

// Export singleton instance
const socketManager = new SocketManager();
module.exports = socketManager;
