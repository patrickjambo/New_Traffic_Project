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

        console.log(`📢 Emitted incident:new - ID: ${incident.id}`);
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

        console.log(`🚨 Emitted emergency:new - ID: ${emergency.id}`);
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
