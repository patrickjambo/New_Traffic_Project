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
                const clientData = this.connectedClients.get(socket.id);
                console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
                
                // If this was a police officer, notify admins they went offline
                if (clientData && clientData.role === 'police' && clientData.userId) {
                    this.io.to('role:admin').emit('officer:offline', {
                        officerId: clientData.userId,
                        disconnectedAt: new Date().toISOString(),
                        reason: reason,
                    });
                    console.log(`📴 Officer ${clientData.userId} went OFFLINE`);
                    
                    // Update DB: mark officer as offline
                    this._setOfficerOnlineStatus(clientData.userId, false)
                        .catch(err => console.error('Error setting officer offline:', err));
                }
                
                this.connectedClients.delete(socket.id);
            });

            // Join role-based room (police, admin, district_admin, public)
            socket.on('join:role', (data) => {
                const { role, userId } = data;
                if (role && ['police', 'admin', 'district_admin', 'public'].includes(role)) {
                    const roomName = `role:${role}`;
                    socket.join(roomName);
                    
                    // District admins also join the admin room to receive admin broadcasts
                    if (role === 'district_admin') {
                        socket.join('role:admin');
                        console.log(`🏢 District admin ${userId} also joined role:admin room`);
                    }

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
                    
                    // If police officer joined, notify admins they are ONLINE
                    if (role === 'police' && userId) {
                        this.io.to('role:admin').emit('officer:online', {
                            officerId: userId,
                            connectedAt: new Date().toISOString(),
                            socketId: socket.id,
                        });
                        console.log(`📱 Officer ${userId} came ONLINE - notified admins`);
                        
                        // Update DB: mark officer as online
                        this._setOfficerOnlineStatus(userId, true)
                            .catch(err => console.error('Error setting officer online:', err));
                    }
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
                console.log('📍 Received location update from socket:', socket.id, data);
                
                const clientData = this.connectedClients.get(socket.id);
                
                // Accept location if we have userId (even if role not set yet)
                // This handles the case where location is sent before join:role
                const userId = data.userId || clientData?.userId;
                const role = data.role || clientData?.role;
                
                if (!userId) {
                    console.log('⚠️ Location update rejected: no userId. Data:', data, 'ClientData:', clientData);
                    return;
                }
                
                // Update clientData if we got userId from the data payload
                if (clientData && data.userId) {
                    clientData.userId = data.userId;
                    if (data.role) clientData.role = data.role;
                }

                const { latitude, longitude, accuracy, speed, heading, address, timestamp } = data;
                
                if (!latitude || !longitude) {
                    console.log('⚠️ Location rejected: missing lat/lng');
                    return;
                }

                // Store in client data if available
                if (clientData) {
                    clientData.lastLocation = {
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        heading,
                        address,
                        timestamp: timestamp || new Date().toISOString(),
                    };
                }

                // Broadcast to admin for real-time tracking dashboard
                const adminRoom = this.io.sockets.adapter.rooms.get('role:admin');
                const adminCount = adminRoom ? adminRoom.size : 0;
                console.log(`📡 Broadcasting location to ${adminCount} admin clients for officer ${userId}`);
                
                this.io.to('role:admin').emit('officer:location', {
                    officerId: userId,
                    socketId: socket.id,
                    latitude,
                    longitude,
                    accuracy,
                    speed,
                    heading,
                    address,
                    timestamp: timestamp || new Date().toISOString(),
                });

                // Update database (async, don't block)
                this._updateOfficerLocationInDB(userId, {
                    latitude,
                    longitude,
                    address,
                }).catch(err => console.error('DB location update error:', err));

                console.log(`✅ Officer ${userId} location saved: ${latitude}, ${longitude}`);
            });

            // Heartbeat for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });

            // 🚨 Handle emergency accepted from mobile app (instant broadcast)
            socket.on('emergency:accepted', (data) => {
                console.log('📱 Mobile app emitted emergency:accepted:', data);
                this._broadcastEmergencyAccepted(data, socket);
            });
            
            // 🚨 Handle emergency:officer_response from mobile app (instant broadcast)
            socket.on('emergency:officer_response', (data) => {
                console.log('📱 Mobile app emitted emergency:officer_response:', data);
                this._broadcastEmergencyAccepted(data, socket);
            });
            
            // 🚨 Handle emergency:status_change from mobile app (instant broadcast)
            socket.on('emergency:status_change', (data) => {
                console.log('📱 Mobile app emitted emergency:status_change:', data);
                this._broadcastStatusChange(data, socket);
            });
        });
    }
    
    /**
     * Broadcast status change to all clients
     */
    _broadcastStatusChange(data, socket) {
        const emergencyId = data.emergencyId || data.id;
        const newStatus = data.newStatus || data.status;
        const officerId = data.officerId;
        const officerName = data.officerName || data.responder_name || 'Officer';
        
        const payload = {
            emergencyId: emergencyId,
            id: emergencyId,
            status: newStatus,
            newStatus: newStatus,
            officerId: officerId,
            officerName: officerName,
            responder_name: officerName,
            assigned_to_name: officerName,
            timestamp: data.timestamp || new Date().toISOString(),
            eventType: 'status_change',
            message: `Emergency #${emergencyId} status: ${newStatus}`,
        };
        
        // INSTANT: Broadcast to all clients
        this.io.to('role:admin').emit('emergency:status_change', payload);
        this.io.to('role:admin').emit('emergency:status_changed', payload);
        this.io.emit('emergency:update', payload);
        
        // Notify other police
        if (socket) {
            socket.to('role:police').emit('emergency:status_change', payload);
        }
        
        console.log(`✅ INSTANT: Broadcasted status change for #${emergencyId} -> ${newStatus}`);
    }
    
    /**
     * Broadcast emergency accepted/responded to all clients
     */
    _broadcastEmergencyAccepted(data, socket) {
        const emergencyId = data.emergencyId || data.id;
        const officerId = data.officerId || data.acceptedBy?.officerId;
        const officerName = data.officerName || data.acceptedBy?.officerName || 'Officer';
        const action = data.action || 'accept';
        
        // Common payload for all events
        const payload = {
            emergencyId: emergencyId,
            id: emergencyId,
            status: 'dispatched',
            officerId: officerId,
            officerName: officerName,
            assigned_to: officerId,
            assigned_to_name: officerName,
            responder_name: officerName,
            action: action,
            timestamp: data.timestamp || new Date().toISOString(),
            message: `${officerName} is responding to emergency #${emergencyId}`,
        };
        
        // INSTANT: Broadcast to all admins (multiple events for compatibility)
        this.io.to('role:admin').emit('emergency:accepted', payload);
        this.io.to('role:admin').emit('emergency:officer_response', payload);
        this.io.to('role:admin').emit('emergency:status_changed', {
            ...payload,
            eventType: 'status_change',
        });
        
        // CRITICAL: Emit emergency:update for dashboard to update the card
        this.io.emit('emergency:update', payload);
        
        // Broadcast to other officers so they stop alarming
        if (socket) {
            socket.to('role:police').emit('emergency:accepted', payload);
        } else {
            this.io.to('role:police').emit('emergency:accepted', payload);
        }
        
        console.log(`✅ INSTANT: Broadcasted emergency accepted for #${emergencyId} by ${officerName}`);
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
                    current_address = $3,
                    is_on_duty = true,
                    location_updated_at = NOW()
                WHERE user_id = $4
            `, [location.latitude, location.longitude, location.address || null, officerId]);
            console.log(`✅ DB updated for officer ${officerId}: ${location.latitude}, ${location.longitude}`);
        } catch (error) {
            console.error('Error updating officer location in DB:', error.message);
        }
    }

    /**
     * Set officer online/offline status in database
     */
    async _setOfficerOnlineStatus(officerId, isOnline) {
        try {
            const { query } = require('../config/database');
            if (isOnline) {
                await query(`
                    UPDATE officer_profiles 
                    SET is_on_duty = true, location_updated_at = NOW()
                    WHERE user_id = $1
                `, [officerId]);
            } else {
                await query(`
                    UPDATE officer_profiles 
                    SET is_on_duty = false
                    WHERE user_id = $1
                `, [officerId]);
            }
            console.log(`✅ Officer ${officerId} status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        } catch (error) {
            console.error('Error updating officer online status:', error.message);
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
     * OPTIMIZED: Sends WebSocket immediately + FCM push in parallel
     */
    emitEmergencyNew(emergency) {
        if (!this.io) return;

        const payload = {
            id: emergency.id,
            emergencyId: emergency.id,  // Add emergencyId for mobile app compatibility
            alertId: emergency.id,      // Add alertId as fallback
            type: emergency.emergency_type,
            severity: emergency.severity,
            location: {
                name: emergency.location_name,
                latitude: parseFloat(emergency.latitude),
                longitude: parseFloat(emergency.longitude),
            },
            latitude: parseFloat(emergency.latitude),
            longitude: parseFloat(emergency.longitude),
            location_name: emergency.location_name,
            description: emergency.description,
            servicesNeeded: emergency.services_needed,
            createdAt: emergency.created_at || new Date().toISOString(),
            isEmergency: true,
            priority: emergency.severity === 'critical' ? 'critical' : 'high',
        };

        // CRITICAL: Emit WebSocket events IMMEDIATELY (no await)
        // 1. Emit to all clients
        this.io.emit('emergency:new', payload);

        // 2. Emit to location-based room
        if (emergency.latitude && emergency.longitude) {
            const room = `loc:${Math.round(emergency.latitude * 100)}_${Math.round(emergency.longitude * 100)}`;
            this.io.to(room).emit('emergency:nearby', payload);
        }

        // 3. High priority ALARM for police/admin (triggers siren/vibration/red screen)
        this.io.to('role:police').to('role:admin').emit('emergency:alarm', {
            ...payload,
            title: `🚨 ${emergency.emergency_type?.toUpperCase() || 'EMERGENCY'}`,
            message: emergency.description || 'Immediate response required!',
            requiresFullScreen: true,
            overrideDoNotDisturb: true,
            soundType: 'siren',
            vibrationPattern: 'emergency',
        });

        // 4. Also emit legacy alert event
        this.io.to('role:police').to('role:admin').emit('emergency:alert', {
            ...payload,
            priority: emergency.severity === 'critical' ? 'critical' : 'high',
        });

        // 5. Emit notification for police and admin
        const emergencyNotification = {
            id: `em_${emergency.id}`,
            title: `🚨 EMERGENCY: ${emergency.type || emergency.emergency_type}`,
            message: `URGENT: ${emergency.severity} severity emergency at ${emergency.location_name}. Services needed: ${Array.isArray(emergency.services_needed) ? emergency.services_needed.join(', ') : 'Immediate attention'}.`,
            type: 'emergency',
            created_at: emergency.created_at
        };
        this.emitNotificationToRole('police', emergencyNotification);
        this.emitNotificationToRole('admin', emergencyNotification);

        console.log(`🚨 Emitted emergency:new + emergency:alarm - ID: ${emergency.id}`);

        // PARALLEL: Send FCM push for background/closed apps
        this._sendEmergencyFCMPush({
            alertId: emergency.id,
            emergencyId: emergency.id,
            type: emergency.emergency_type,
            title: `🚨 ${emergency.emergency_type?.toUpperCase() || 'EMERGENCY'}`,
            message: emergency.description || 'Immediate response required!',
            latitude: parseFloat(emergency.latitude),
            longitude: parseFloat(emergency.longitude),
            location_name: emergency.location_name,
            severity: emergency.severity,
            isEmergency: true
        }).catch(err => {
            console.log('⚠️ FCM push failed:', err.message);
        });
    }

    /**
     * Emit emergency status update
     * OPTIMIZED: Sends complete data for admin dashboard real-time updates
     */
    emitEmergencyUpdate(emergency) {
        if (!this.io) return;

        const payload = {
            id: emergency.id,
            emergencyId: emergency.id,
            status: emergency.status,
            assignedTo: emergency.assigned_to,
            assigned_to: emergency.assigned_to,
            assigned_to_name: emergency.assigned_to_name || emergency.responder_name,
            responder_name: emergency.assigned_to_name || emergency.responder_name,
            officer_name: emergency.assigned_to_name || emergency.responder_name,
            officerName: emergency.assigned_to_name || emergency.responder_name,
            // Include more details for dashboard
            severity: emergency.severity,
            type: emergency.emergency_type || emergency.type,
            emergency_type: emergency.emergency_type || emergency.type,
            location_name: emergency.location_name,
            latitude: emergency.latitude,
            longitude: emergency.longitude,
            description: emergency.description,
            response_time: emergency.response_time,
            responder_notes: emergency.responder_notes,
            updatedAt: emergency.updated_at || new Date().toISOString(),
            updated_at: emergency.updated_at || new Date().toISOString(),
            timestamp: new Date().toISOString(),
        };

        // CRITICAL: Emit to ALL clients immediately
        this.io.emit('emergency:update', payload);
        
        // Also emit specific status change event for admin dashboard
        this.io.to('role:admin').emit('emergency:status_changed', {
            ...payload,
            eventType: 'status_change',
        });

        // Emit to police as well so they see updates from other officers
        this.io.to('role:police').emit('emergency:status_changed', {
            ...payload,
            eventType: 'status_change',
        });

        console.log(`🔄 Emitted emergency:update - ID: ${emergency.id}, Status: ${emergency.status}, Officer: ${payload.responder_name || 'N/A'}`);
    }

    /**
     * Emit officer response/accept event - INSTANT notification to admin
     * Call this when police accepts/responds to emergency
     */
    emitOfficerResponse(emergencyId, officerId, officerName, status, action = 'accepted') {
        if (!this.io) return;

        const payload = {
            emergencyId: parseInt(emergencyId),
            id: parseInt(emergencyId),
            officerId: officerId,
            officerName: officerName,
            officer_name: officerName,
            responder_name: officerName,
            assigned_to_name: officerName,
            status: status,
            action: action,
            timestamp: new Date().toISOString(),
            message: `${officerName} ${action === 'accepted' ? 'is responding to' : `changed status to ${status} for`} emergency #${emergencyId}`,
        };

        // INSTANT broadcast to admin dashboard
        this.io.to('role:admin').emit('emergency:officer_response', payload);
        this.io.to('role:admin').emit('emergency:accepted', payload);
        this.io.to('role:admin').emit('emergency:update', payload);
        
        // Also notify other police
        this.io.to('role:police').emit('emergency:accepted', payload);

        console.log(`👮 INSTANT: Officer ${officerName} ${action} emergency #${emergencyId} - broadcasted to admin`);
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
            deploymentId: deployment.id,
            status: deployment.status,
            unit_name: deployment.unit_name,
            address: deployment.address,
            latitude: deployment.latitude,
            longitude: deployment.longitude,
            priority: deployment.priority,
            instructions: deployment.instructions,
            incident_id: deployment.incident_id,
            emergency_id: deployment.emergency_id,
            created_at: deployment.created_at,
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
     * OPTIMIZED: Sends WebSocket + FCM push in PARALLEL for instant delivery
     */
    broadcastGeoFencedAlert(alertData, targetRooms = []) {
        if (!this.io) return;

        const event = alertData.isEmergency ? 'emergency:alarm' : 'incident:alert';

        // CRITICAL: Send WebSocket IMMEDIATELY (no await)
        // Send to police and admin rooms
        this.io.to('role:police').to('role:admin').emit(event, alertData);

        // Send to additional target rooms
        for (const room of targetRooms) {
            this.io.to(room).emit(event, alertData);
        }

        console.log(`📡 Geo-fenced alert broadcast: ${event} to ${targetRooms.length + 2} rooms`);

        // PARALLEL: Also send FCM push for background/closed apps
        // This ensures police get the alert even if app is closed
        if (alertData.isEmergency) {
            this._sendEmergencyFCMPush(alertData).catch(err => {
                console.log('⚠️ FCM push failed (non-critical):', err.message);
            });
        }
    }

    /**
     * Send FCM push notification for emergency (runs in background)
     * This ensures delivery even when app is closed
     */
    async _sendEmergencyFCMPush(alertData) {
        try {
            const fcmService = require('./fcmService');
            if (!fcmService.initialized) return;

            const { query } = require('../config/database');
            
            // Get all police officers with FCM tokens
            const result = await query(`
                SELECT op.fcm_token, u.full_name, u.id
                FROM officer_profiles op
                JOIN users u ON op.user_id = u.id
                WHERE op.fcm_token IS NOT NULL 
                AND u.role = 'police'
                AND u.is_active = true
                AND op.emergency_alert_enabled = true
            `);

            const officers = result.rows;
            if (officers.length === 0) return;

            // Send emergency FCM to all officers
            await fcmService.sendEmergencyAlarm(officers, {
                alertId: alertData.alertId || alertData.emergencyId,
                emergencyId: alertData.emergencyId,
                incidentId: alertData.incidentId,
                type: alertData.type || 'emergency',
                title: alertData.title || '🚨 EMERGENCY ALERT',
                message: alertData.message || alertData.description || 'Immediate response required!',
                location: alertData.location || {
                    latitude: alertData.latitude,
                    longitude: alertData.longitude,
                    address: alertData.location_name
                },
                ai: alertData.ai
            });

            console.log(`📱 FCM push sent to ${officers.length} police officers`);
        } catch (error) {
            console.error('FCM push error:', error.message);
        }
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
