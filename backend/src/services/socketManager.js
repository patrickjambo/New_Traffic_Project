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
                userId: null,
                role: null,
                lastLocation: null,
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
                        console.log(`👤 Client ${socket.id} joined user room: user:${userId}`);
                    }

                    // Store user info
                    const clientData = this.connectedClients.get(socket.id);
                    if (clientData) {
                        clientData.userId = userId;
                        clientData.role = role;
                    }

                    this.updateClientRoom(socket.id, roomName);
                    console.log(`👮 Client ${socket.id} joined room: ${roomName}`);
                }
            });

            // Join user-specific room (for targeted deployment notifications)
            socket.on('join:user', (data) => {
                const { userId } = data;
                if (userId) {
                    const roomName = `user:${userId}`;
                    socket.join(roomName);
                    
                    // Store user info
                    const clientData = this.connectedClients.get(socket.id);
                    if (clientData) {
                        clientData.userId = userId;
                    }
                    
                    console.log(`👤 Client ${socket.id} joined user room: ${roomName}`);
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

            // ============================================
            // REAL-TIME OFFICER LOCATION TRACKING
            // ============================================
            
            // Officer sends location update
            socket.on('officer:location_update', async (data) => {
                const clientData = this.connectedClients.get(socket.id);
                if (!clientData || clientData.role !== 'police') return;

                const { latitude, longitude, accuracy, speed, heading, address, timestamp } = data;
                
                if (!latitude || !longitude) return;

                // Store in client data
                clientData.lastLocation = {
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    heading,
                    address,
                    timestamp: timestamp || new Date().toISOString(),
                };

                // Broadcast to admin for real-time tracking dashboard
                const adminRoom = this.io.sockets.adapter.rooms.get('role:admin');
                const adminCount = adminRoom ? adminRoom.size : 0;
                console.log(`📡 Broadcasting to ${adminCount} admin clients`);
                
                this.io.to('role:admin').emit('officer:location', {
                    officerId: clientData.userId,
                    socketId: socket.id,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    heading,
                    address,
                    timestamp: clientData.lastLocation.timestamp,
                });

                // Update database (async, don't block)
                this._updateOfficerLocationInDB(clientData.userId, {
                    latitude,
                    longitude,
                    address,
                }).catch(err => console.error('DB location update error:', err));

                console.log(`📍 Officer ${clientData.userId} location: ${latitude}, ${longitude}`);
            });

            // Heartbeat for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
        });
    }

    /**
     * Update officer location in database (async helper)
     */
    async _updateOfficerLocationInDB(officerId, location) {
        try {
            const { query } = require('../config/database');
            await query(`
                UPDATE officer_profiles 
                SET current_latitude = $1, 
                    current_longitude = $2, 
                    status = 'available',
                    is_on_duty = true,
                    location_updated_at = NOW()
                WHERE user_id = $3
            `, [location.latitude, location.longitude, officerId]);
            console.log(`✅ DB updated for officer ${officerId}: ${location.latitude}, ${location.longitude}`);
        } catch (error) {
            console.error('Error updating officer location in DB:', error.message);
        }
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
     * Emit deployment deletion
     */
    emitDeploymentDelete(deploymentId) {
        if (!this.io) return;

        this.io.to('role:police').to('role:admin').emit('deployment:delete', { id: deploymentId });
        console.log(`🗑️ Emitted deployment:delete - ID: ${deploymentId}`);
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
    // GEO-FENCING & EMERGENCY ALERT METHODS
    // ============================================

    /**
     * Emit emergency alarm to specific user (for mobile app full-screen alert)
     */
    emitEmergencyAlarm(userId, alertData) {
        if (!this.io) return;

        const payload = {
            alertId: alertData.alertId,
            incidentId: alertData.incidentId,
            type: alertData.type,
            severity: 'critical',
            isEmergency: true,
            priority: alertData.priority || 1,
            location: alertData.location,
            title: alertData.title,
            message: alertData.message,
            ai: alertData.ai || {},
            mediaUrls: alertData.mediaUrls || [],
            distanceKm: alertData.distanceKm,
            timestamp: new Date().toISOString(),
            // Special flags for mobile app
            requiresFullScreen: true,
            overrideDoNotDisturb: true,
            soundType: 'siren',
            vibrationPattern: 'emergency'
        };

        // Send to specific user
        this.io.to(`user:${userId}`).emit('emergency:alarm', payload);
        console.log(`🚨 EMERGENCY ALARM sent to user ${userId}`);
    }

    /**
     * Emit to specific user room
     */
    emitToUser(userId, event, data) {
        if (!this.io) return;
        this.io.to(`user:${userId}`).emit(event, data);
        console.log(`📤 Emitted ${event} to user:${userId}`);
    }

    /**
     * Emit to specific role (police, admin, public)
     */
    emitToRole(role, event, data) {
        if (!this.io) return;
        this.io.to(`role:${role}`).emit(event, data);
        console.log(`📤 Emitted ${event} to role:${role}`);
    }

    /**
     * Emit to district room
     */
    emitToDistrict(districtId, event, data) {
        if (!this.io) return;
        this.io.to(`district:${districtId}`).emit(event, data);
        console.log(`📤 Emitted ${event} to district:${districtId}`);
    }

    /**
     * Internal event emitter (for service-to-service communication)
     */
    emitInternal(event, data) {
        if (!this.io) return;
        // This can be used for internal event handling
        // For example, triggering FCM sends
        this.io.emit(`internal:${event}`, data);
    }

    /**
     * Broadcast alert to all police in geo-fence
     */
    broadcastGeoFencedAlert(alertData, targetRooms = []) {
        if (!this.io) return;

        const event = alertData.isEmergency ? 'emergency:alarm' : 'incident:alert';

        // Always send to police and admin
        this.io.to('role:police').to('role:admin').emit(event, alertData);

        // Send to additional target rooms
        for (const room of targetRooms) {
            this.io.to(room).emit(event, alertData);
        }

        console.log(`📡 Geo-fenced alert broadcast: ${event} to ${targetRooms.length + 2} rooms`);
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
