/**
 * GeoFencing Service - Intelligent Location-Based Alert System
 * Handles geo-fence processing, officer location tracking, and targeted alerts
 * Uses FREE technologies: PostgreSQL/PostGIS, Socket.IO, Firebase (free tier)
 */

const { query } = require('../config/database');
const socketManager = require('./socketManager');
const fcmService = require('./fcmService');

class GeoFencingService {
    constructor() {
        // Kigali district boundaries (approximate center points)
        this.kigaliDistricts = {
            'Nyarugenge': { lat: -1.9536, lng: 30.0606, radius: 5 },
            'Gasabo': { lat: -1.9147, lng: 30.1045, radius: 8 },
            'Kicukiro': { lat: -1.9876, lng: 30.1029, radius: 6 }
        };
        
        // Alert priority levels
        this.PRIORITY = {
            CRITICAL: 1,
            HIGH: 2,
            MEDIUM: 5,
            LOW: 8
        };
    }

    // ============================================================
    // OFFICER LOCATION MANAGEMENT
    // ============================================================

    /**
     * Update officer's current location
     * @param {number} officerId - Officer profile ID
     * @param {number} latitude - GPS latitude
     * @param {number} longitude - GPS longitude
     * @param {object} metadata - Additional location data (accuracy, speed, heading)
     */
    async updateOfficerLocation(officerId, latitude, longitude, metadata = {}) {
        try {
            // Find district for this location using Haversine distance
            const districtResult = await query(`
                SELECT id, name, code, radius_km,
                    (6371 * acos(
                        LEAST(1, GREATEST(-1,
                            cos(radians($1)) * cos(radians(center_lat)) *
                            cos(radians(center_lng) - radians($2)) +
                            sin(radians($1)) * sin(radians(center_lat))
                        ))
                    )) as distance_km
                FROM districts
                WHERE is_active = TRUE
                ORDER BY distance_km ASC
                LIMIT 1
            `, [latitude, longitude]);
            
            let districtId = null;
            if (districtResult.rows.length > 0) {
                const district = districtResult.rows[0];
                if (district.distance_km <= district.radius_km) {
                    districtId = district.id;
                }
            }

            // Update officer profile with current location
            // NOTE: Using user_id (not id) since officerId comes from req.user.id
            // Also update BOTH timestamp columns for consistency
            const updateResult = await query(`
                UPDATE officer_profiles 
                SET 
                    current_latitude = $1,
                    current_longitude = $2,
                    current_district_id = $3,
                    location_updated_at = CURRENT_TIMESTAMP,
                    last_location_update = CURRENT_TIMESTAMP,
                    is_on_duty = true,
                    is_online = true,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $4
                RETURNING id, badge_number, is_on_duty
            `, [latitude, longitude, districtId, officerId]);

            if (updateResult.rows.length === 0) {
                console.log(`Officer ${officerId} not found for location update`);
                return null;
            }

            // Record location history (for auditing)
            await query(`
                INSERT INTO officer_location_history (officer_id, latitude, longitude, district_id, accuracy_meters, speed_kmh, heading)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [officerId, latitude, longitude, districtId, metadata.accuracy || null, metadata.speed || null, metadata.heading || null]);

            // Emit location update to admin dashboard
            socketManager.emitOfficerLocation(officerId, { latitude, longitude, districtId, ...metadata });

            console.log(`📍 Officer ${officerId} location updated: ${latitude}, ${longitude}`);
            return { success: true, districtId };
        } catch (error) {
            console.error('Error updating officer location:', error);
            throw error;
        }
    }

    /**
     * Update officer FCM token for push notifications
     */
    async updateOfficerFCMToken(officerId, fcmToken, deviceInfo = {}) {
        try {
            await query(`
                UPDATE officer_profiles 
                SET 
                    fcm_token = $1,
                    device_id = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3
            `, [fcmToken, deviceInfo.deviceId || null, officerId]);

            console.log(`📱 FCM token updated for officer ${officerId}`);
            return { success: true };
        } catch (error) {
            console.error('Error updating FCM token:', error);
            throw error;
        }
    }

    /**
     * Update officer duty status
     */
    async updateOfficerDutyStatus(officerId, isOnDuty) {
        try {
            await query(`
                UPDATE officer_profiles 
                SET 
                    is_on_duty = $1, 
                    duty_start_time = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE duty_start_time END,
                    duty_end_time = CASE WHEN $1 = false THEN CURRENT_TIMESTAMP ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [isOnDuty, officerId]);

            // Notify admin dashboard
            socketManager.emitToRole('admin', 'officer:status_changed', {
                officerId,
                isOnDuty,
                timestamp: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating duty status:', error);
            throw error;
        }
    }

    // ============================================================
    // GEO-FENCE PROCESSING
    // ============================================================

    /**
     * Find all officers in a specific district
     * @param {number} districtId - District ID
     * @param {object} options - Filter options
     */
    async findOfficersInDistrict(districtId, options = {}) {
        try {
            const { onDuty = false, alertEnabled = false } = options;
            
            let whereClause = 'WHERE (op.current_district_id = $1 OR op.assigned_district_id = $1)';
            if (onDuty) whereClause += ' AND op.is_on_duty = TRUE';
            if (alertEnabled) whereClause += ' AND op.notification_enabled = TRUE';

            const result = await query(`
                SELECT 
                    op.id as officer_id,
                    op.user_id,
                    op.badge_number,
                    op.full_name,
                    op.rank,
                    op.fcm_token,
                    op.is_on_duty,
                    op.current_latitude,
                    op.current_longitude,
                    op.notification_enabled,
                    op.emergency_alert_enabled
                FROM officer_profiles op
                ${whereClause}
                ORDER BY op.is_on_duty DESC, op.location_updated_at DESC
            `, [districtId]);

            return result.rows;
        } catch (error) {
            console.error('Error finding officers in district:', error);
            return [];
        }
    }

    /**
     * Get district from GPS coordinates
     */
    async getDistrictFromLocation(latitude, longitude) {
        try {
            // Find district where coordinates fall within radius
            const result = await query(`
                SELECT id, name, code,
                    (6371 * acos(
                        cos(radians($1)) * cos(radians(center_lat)) *
                        cos(radians(center_lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(center_lat))
                    )) as distance_km
                FROM districts
                WHERE is_active = TRUE
                ORDER BY distance_km ASC
                LIMIT 1
            `, [latitude, longitude]);

            if (result.rows.length > 0 && result.rows[0].distance_km <= result.rows[0].radius_km) {
                return result.rows[0];
            }

            // Return closest district anyway
            return result.rows[0] || { id: 1, name: 'Nyarugenge', code: 'NYA' };
        } catch (error) {
            console.error('Error getting district:', error);
            // Return default district on error
            return { id: 1, name: 'Nyarugenge', code: 'NYA' };
        }
    }

    /**
     * Find officers within geo-fence radius
     * @param {number} latitude - Incident latitude
     * @param {number} longitude - Incident longitude
     * @param {number} radiusKm - Search radius in km
     * @param {number} districtId - Optional: include officers assigned to district
     * @param {boolean} includeOffDuty - Whether to include off-duty officers for emergencies
     */
    async findOfficersInGeoFence(latitude, longitude, radiusKm = 5, districtId = null, includeOffDuty = false) {
        try {
            // Simple distance-based query without PostGIS - using subquery for filtering
            const result = await query(`
                SELECT * FROM (
                    SELECT 
                        op.id as officer_id,
                        op.user_id,
                        op.badge_number,
                        op.full_name,
                        op.fcm_token,
                        op.is_on_duty,
                        op.assigned_district_id,
                        op.current_latitude,
                        op.current_longitude,
                        -- Haversine distance calculation (approx km)
                        (6371 * acos(
                            LEAST(1, GREATEST(-1,
                                cos(radians($1)) * cos(radians(op.current_latitude)) *
                                cos(radians(op.current_longitude) - radians($2)) +
                                sin(radians($1)) * sin(radians(op.current_latitude))
                            ))
                        )) as distance_km
                    FROM officer_profiles op
                    WHERE
                        (op.notification_enabled IS NOT FALSE)
                        AND ($4 OR op.is_on_duty = TRUE)
                        AND op.current_latitude IS NOT NULL
                        AND op.current_longitude IS NOT NULL
                ) AS officers_with_distance
                WHERE distance_km <= $3
                ORDER BY distance_km ASC
                LIMIT 50
            `, [latitude, longitude, radiusKm, includeOffDuty]);

            return result.rows;
        } catch (error) {
            console.error('Error finding officers in geo-fence:', error);
            
            // Fallback: Simple query by district
            const fallbackResult = await query(`
                SELECT 
                    op.id as officer_id,
                    op.user_id,
                    op.badge_number,
                    op.full_name,
                    op.fcm_token,
                    op.is_on_duty,
                    op.assigned_district_id
                FROM officer_profiles op
                WHERE
                    (op.notification_enabled IS NOT FALSE)
                    AND ($1 OR op.is_on_duty = TRUE)
                ORDER BY op.location_updated_at DESC
                LIMIT 50
            `, [includeOffDuty]);

            return fallbackResult.rows;
        }
    }

    // ============================================================
    // ALERT CREATION & TARGETING
    // ============================================================

    /**
     * Create and send targeted alert for an incident
     * OPTIMIZED: Broadcasts alert IMMEDIATELY, then does DB operations
     * This ensures police receive alerts in real-time without database delay
     * 
     * @param {object} incident - Incident data
     * @param {boolean} isEmergency - Whether this is an emergency alert
     * @param {object} aiData - AI detection data (confidence, detected object, etc.)
     */
    async createTargetedAlert(incident, isEmergency = false, aiData = {}) {
        try {
            const latitude = incident.latitude || incident.lat;
            const longitude = incident.longitude || incident.lng;

            // Determine alert type and priority FIRST
            const alertType = this.determineAlertType(incident.type, isEmergency, aiData);
            const priority = isEmergency ? this.PRIORITY.CRITICAL : this.PRIORITY.MEDIUM;
            const searchRadius = isEmergency ? 10 : 5; // km

            // CRITICAL: Build and broadcast alert payload IMMEDIATELY (before DB)
            const alertPayload = {
                alertId: incident.emergency_id || incident.id,
                emergencyId: incident.emergency_id || incident.id,
                incidentId: incident.id,
                type: incident.type,
                emergency_type: incident.type,
                severity: incident.severity || 'medium',
                isEmergency,
                priority,
                location: {
                    latitude,
                    longitude,
                    address: incident.address || incident.location_name,
                    district: 'Kigali'
                },
                latitude,
                longitude,
                location_name: incident.address || incident.location_name,
                locationName: incident.address || incident.location_name,
                title: this.generateAlertTitle(incident, isEmergency, aiData),
                message: this.generateAlertMessage(incident, isEmergency, aiData),
                description: incident.description || this.generateAlertMessage(incident, isEmergency, aiData),
                ai: {
                    confidence: aiData.confidence,
                    detectedObject: aiData.detectedObject,
                    detectionMethod: aiData.detectionMethod
                },
                aiConfidence: aiData.confidence,
                mediaUrls: incident.media_urls || [],
                requiresFullScreen: isEmergency,
                overrideDoNotDisturb: isEmergency,
                soundType: isEmergency ? 'siren' : 'default',
                vibrationPattern: isEmergency ? 'emergency' : 'default',
                timestamp: new Date().toISOString()
            };

            // BROADCAST IMMEDIATELY - Don't wait for database
            console.log(`🚀 BROADCASTING ALERT IMMEDIATELY: ${isEmergency ? 'EMERGENCY' : 'STANDARD'}`);
            this.broadcastAlert(alertPayload, null); // Broadcast to all police immediately

            // Get district for the incident location (can be slightly delayed)
            const district = await this.getDistrictFromLocation(latitude, longitude);
            alertPayload.location.district = district?.name || 'Kigali';

            // Create alert record in database (background operation)
            let alertId = incident.emergency_id || incident.id;
            try {
                const alertResult = await query(`
                    INSERT INTO incident_alerts (
                        incident_id, emergency_id, alert_type_id,
                        alert_type, is_emergency, priority,
                        incident_location, incident_lat, incident_lng,
                        latitude, longitude,
                        district_id,
                        title, message, ai_confidence, detected_object,
                        media_urls, target_radius_km, source, created_by
                    ) VALUES (
                        $1, $2, 
                        (SELECT id FROM alert_types WHERE code = $3 LIMIT 1),
                        $3, $4, $5,
                        POINT($7, $6)::TEXT, $6, $7,
                        $6, $7,
                        $8,
                        $9, $10, $11, $12,
                        $13, $14, $15, $16
                    )
                    RETURNING id
                `, [
                    incident.id || null,
                    incident.emergency_id || null,
                    alertType,
                    isEmergency,
                    priority,
                    latitude,
                    longitude,
                    district?.id || null,
                    alertPayload.title,
                    alertPayload.message,
                    aiData.confidence || null,
                    aiData.detectedObject || null,
                    incident.media_urls || null,
                    searchRadius,
                    aiData.source || 'manual',
                    incident.reported_by || null
                ]);
                alertId = alertResult.rows[0]?.id || alertId;
            } catch (dbError) {
                console.log('⚠️ Alert DB insert failed (non-critical):', dbError.message);
            }

            // Find target officers within geo-fence (for logging/tracking)
            const officers = await this.findOfficersInGeoFence(
                latitude, 
                longitude, 
                searchRadius, 
                district?.id,
                isEmergency
            );

            console.log(`🎯 Found ${officers.length} officers in geo-fence for alert ${alertId}`);

            // Send targeted alerts to individual officers (FCM for background delivery)
            for (const officer of officers) {
                this.sendAlertToOfficer(alertId, officer, alertPayload).catch(e => {
                    console.log(`⚠️ Officer alert failed: ${e.message}`);
                });
            }

            return {
                success: true,
                alertId,
                targetedOfficers: officers.length,
                district: district?.name
            };
        } catch (error) {
            console.error('Error creating targeted alert:', error);
            throw error;
        }
    }

    /**
     * Send alert to a specific officer
     */
    async sendAlertToOfficer(alertId, officer, alertPayload) {
        try {
            // Record delivery attempt
            await query(`
                INSERT INTO alert_deliveries (alert_id, officer_id, distance_km, delivery_status, delivery_method, sent_at)
                VALUES ($1, $2, $3, 'sent', 'websocket', CURRENT_TIMESTAMP)
                ON CONFLICT (alert_id, officer_id) DO UPDATE SET
                    delivery_status = 'sent',
                    sent_at = CURRENT_TIMESTAMP
            `, [alertId, officer.officer_id, officer.distance_km || null]);

            // Send via WebSocket (immediate)
            socketManager.emitToUser(officer.user_id, 
                alertPayload.isEmergency ? 'emergency:alarm' : 'incident:alert',
                {
                    ...alertPayload,
                    distanceKm: officer.distance_km
                }
            );

            // If officer has FCM token, queue push notification
            if (officer.fcm_token) {
                // Push notification will be handled by FCM service
                await this.queuePushNotification(officer.fcm_token, alertPayload);
            }

            console.log(`📤 Alert ${alertId} sent to officer ${officer.badge_number || officer.user_id}`);
        } catch (error) {
            console.error(`Error sending alert to officer ${officer.user_id}:`, error);
        }
    }

    /**
     * Send push notification via FCM
     */
    async queuePushNotification(fcmToken, alertPayload) {
        try {
            const notification = {
                title: alertPayload.title,
                body: alertPayload.message,
            };

            const data = {
                alertId: String(alertPayload.alertId || ''),
                incidentId: String(alertPayload.incidentId || ''),
                isEmergency: String(alertPayload.isEmergency),
                latitude: String(alertPayload.location?.latitude || ''),
                longitude: String(alertPayload.location?.longitude || ''),
                address: alertPayload.location?.address || '',
                district: alertPayload.location?.district || '',
                type: alertPayload.type || 'incident',
                severity: alertPayload.severity || 'medium',
                aiConfidence: String(alertPayload.ai?.confidence || ''),
                detectedObject: alertPayload.ai?.detectedObject || '',
                timestamp: new Date().toISOString(),
            };

            // Send via FCM service
            const result = await fcmService.sendToDevice(
                fcmToken, 
                notification, 
                data, 
                alertPayload.isEmergency
            );

            if (result.success) {
                console.log(`📱 FCM push sent for alert ${alertPayload.alertId}`);
            }

            return result;
        } catch (error) {
            console.error('FCM push notification error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send emergency alarm to multiple officers via FCM
     */
    async sendEmergencyAlarmToOfficers(officers, alertPayload) {
        try {
            const result = await fcmService.sendEmergencyAlarm(officers, alertPayload);
            console.log(`🚨 Emergency FCM sent: ${result.successCount || 0} delivered`);
            return result;
        } catch (error) {
            console.error('Emergency FCM error:', error.message);
            return { success: false };
        }
    }

    /**
     * Broadcast alert via WebSocket to targeted rooms
     */
    broadcastAlert(alertPayload, districtId) {
        if (!socketManager.io) return;

        const eventName = alertPayload.isEmergency ? 'emergency:alarm' : 'incident:alert';

        // Broadcast to police and admin
        socketManager.io.to('role:police').to('role:admin').emit(eventName, alertPayload);

        // Broadcast to location-based room
        if (alertPayload.location) {
            const locRoom = `loc:${Math.round(alertPayload.location.latitude * 100)}_${Math.round(alertPayload.location.longitude * 100)}`;
            socketManager.io.to(locRoom).emit(eventName, alertPayload);
        }

        // Broadcast to district room if available
        if (districtId) {
            socketManager.io.to(`district:${districtId}`).emit(eventName, alertPayload);
        }

        console.log(`📡 Alert broadcasted: ${eventName}`);
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Determine alert type code based on incident
     * Returns: 'standard' or 'emergency' (matching DB constraint)
     */
    determineAlertType(incidentType, isEmergency, aiData) {
        // DB constraint only allows 'standard' or 'emergency'
        if (isEmergency) return 'emergency';
        
        // Check for emergency-level incidents
        if (aiData.detectedObject) {
            const object = aiData.detectedObject.toLowerCase();
            if (object.includes('fire') || object.includes('flame')) return 'emergency';
            if (object.includes('gun') || object.includes('firearm') || object.includes('weapon')) return 'emergency';
            if (object.includes('accident') || object.includes('crash') || object.includes('collision')) return 'emergency';
        }

        // Check incident type for emergency level
        if (incidentType) {
            const type = incidentType.toLowerCase();
            if (type.includes('accident')) return 'emergency';
            if (type.includes('fire')) return 'emergency';
            if (type.includes('assault')) return 'emergency';
            if (type.includes('robbery')) return 'emergency';
        }

        return 'standard';
    }

    /**
     * Get detailed alert category (for display/logging purposes)
     */
    getAlertCategory(incidentType, isEmergency, aiData) {
        if (aiData.detectedObject) {
            const object = aiData.detectedObject.toLowerCase();
            if (object.includes('fire') || object.includes('flame')) return 'FIRE';
            if (object.includes('gun') || object.includes('weapon')) return 'FIREARM';
            if (object.includes('accident') || object.includes('crash')) return 'ACCIDENT';
        }
        if (incidentType) {
            const type = incidentType.toLowerCase();
            if (type.includes('accident')) return 'ACCIDENT';
            if (type.includes('fire')) return 'FIRE';
            if (type.includes('congestion')) return 'CONGESTION';
        }
        return isEmergency ? 'EMERGENCY' : 'GENERAL';
    }

    /**
     * Generate alert title
     */
    generateAlertTitle(incident, isEmergency, aiData) {
        if (isEmergency) {
            if (aiData.detectedObject) {
                return `🚨 EMERGENCY: ${aiData.detectedObject} Detected!`;
            }
            return `🚨 EMERGENCY: ${incident.type || 'Critical Incident'}`;
        }
        return `📢 Incident: ${incident.type || 'Traffic Update'}`;
    }

    /**
     * Generate alert message
     */
    generateAlertMessage(incident, isEmergency, aiData) {
        let message = '';
        
        if (isEmergency) {
            message = 'URGENT RESPONSE REQUIRED!\n';
        }

        message += `${incident.description || incident.type || 'Incident reported'}`;
        
        if (incident.address || incident.location_name) {
            message += `\n📍 Location: ${incident.address || incident.location_name}`;
        }

        if (aiData.confidence) {
            message += `\n🤖 AI Confidence: ${Math.round(aiData.confidence * 100)}%`;
        }

        if (aiData.detectedObject) {
            message += `\n⚠️ Detected: ${aiData.detectedObject}`;
        }

        return message;
    }

    /**
     * Get all officers with their current locations
     */
    async getAllOfficersWithLocations() {
        try {
            const result = await query(`
                SELECT 
                    op.id,
                    op.user_id,
                    op.badge_number,
                    u.full_name,
                    op.rank,
                    op.current_latitude as latitude,
                    op.current_longitude as longitude,
                    op.is_on_duty,
                    CASE 
                        WHEN op.is_on_duty = TRUE THEN 'on_duty'
                        ELSE 'off_duty'
                    END as duty_status,
                    op.location_updated_at as last_location_update,
                    op.assigned_district_id,
                    d.name as district_name
                FROM officer_profiles op
                JOIN users u ON op.user_id = u.id
                LEFT JOIN districts d ON op.assigned_district_id = d.id
                WHERE u.role = 'police'
                ORDER BY op.is_on_duty DESC, op.location_updated_at DESC NULLS LAST
            `);

            return result.rows;
        } catch (error) {
            console.error('Error getting officers:', error);
            return [];
        }
    }

    /**
     * Get districts with officer counts and active incidents
     */
    async getDistrictsWithStats() {
        try {
            const result = await query(`
                SELECT 
                    d.id,
                    d.name,
                    d.code,
                    d.center_lat,
                    d.center_lng,
                    d.radius_km,
                    COUNT(DISTINCT op.id) FILTER (WHERE op.is_on_duty = TRUE) as officers_on_duty,
                    COUNT(DISTINCT op.id) as total_officers,
                    (
                        SELECT COUNT(*) 
                        FROM incidents i 
                        WHERE i.status IN ('pending', 'assigned', 'in_progress')
                        AND (6371 * acos(
                            LEAST(1, GREATEST(-1,
                                cos(radians(d.center_lat)) * cos(radians(i.latitude)) *
                                cos(radians(i.longitude) - radians(d.center_lng)) +
                                sin(radians(d.center_lat)) * sin(radians(i.latitude))
                            ))
                        )) <= d.radius_km
                    ) as active_incidents,
                    (
                        SELECT COUNT(*) 
                        FROM emergencies e 
                        WHERE e.status IN ('pending', 'dispatched', 'en_route')
                        AND (6371 * acos(
                            LEAST(1, GREATEST(-1,
                                cos(radians(d.center_lat)) * cos(radians(e.latitude)) *
                                cos(radians(e.longitude) - radians(d.center_lng)) +
                                sin(radians(d.center_lat)) * sin(radians(e.latitude))
                            ))
                        )) <= d.radius_km
                    ) as active_emergencies
                FROM districts d
                LEFT JOIN officer_profiles op ON op.assigned_district_id = d.id OR op.current_district_id = d.id
                WHERE d.is_active = TRUE
                GROUP BY d.id
                ORDER BY d.name
            `);

            // Combine incidents + emergencies for total active
            return result.rows.map(row => ({
                ...row,
                active_incidents: parseInt(row.active_incidents || 0) + parseInt(row.active_emergencies || 0)
            }));
        } catch (error) {
            console.error('Error getting districts:', error);
            return [];
        }
    }

    /**
     * Acknowledge alert by officer
     */
    async acknowledgeAlert(alertId, officerId, action = 'acknowledged', note = null) {
        try {
            await query(`
                UPDATE alert_deliveries
                SET 
                    status = 'acknowledged',
                    acknowledged_at = CURRENT_TIMESTAMP,
                    response_action = $3,
                    response_note = $4,
                    response_at = CURRENT_TIMESTAMP
                WHERE alert_id = $1 AND officer_id = (
                    SELECT id FROM officer_profiles WHERE user_id = $2
                )
            `, [alertId, officerId, action, note]);

            // Notify admin of acknowledgment
            socketManager.emitToRole('admin', 'alert:acknowledged', {
                alertId,
                officerId,
                action,
                timestamp: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            throw error;
        }
    }
}

// Export singleton instance
const geoFencingService = new GeoFencingService();
module.exports = geoFencingService;
