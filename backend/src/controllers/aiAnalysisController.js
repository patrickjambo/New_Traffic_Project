const axios = require('axios');
const FormData = require('form-data');
const db = require('../config/database');
const fs = require('fs');
const socketManager = require('../services/socketManager');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * @desc    Upload video, analyze with AI, and create incident if detected
 * @route   POST /api/incidents/analyze-video
 * @access  Public (with optional auth)
 * @note    OPTIMIZED: Returns immediately, processes video asynchronously
 */
const analyzeVideoAndCreateIncident = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No video file uploaded',
            });
        }

        const { latitude, longitude } = req.body;
        const userId = req.user ? req.user.id : null;

        // Validate video file exists
        if (!req.file || !req.file.path) {
            return res.status(400).json({
                success: false,
                message: 'No video file uploaded',
            });
        }

        // Check if file exists on disk
        if (!fs.existsSync(req.file.path)) {
            return res.status(400).json({
                success: false,
                message: 'Video file not found on server',
            });
        }

        const fileStats = fs.statSync(req.file.path);
        const videoId = `video_${Date.now()}`;

        console.log('📹 Received video:', {
            videoId: videoId,
            filename: req.file.originalname,
            size: `${(fileStats.size / 1024).toFixed(2)} KB`,
            mimetype: req.file.mimetype,
            path: req.file.path
        });

        // Return success immediately - process in background
        res.json({
            success: true,
            message: 'Video uploaded successfully, processing in background',
            data: {
                videoId: videoId,
                status: 'processing',
                incident_detected: false
            }
        });

        // Process video asynchronously (don't await)
        processVideoAsync(req.file, videoId, userId, latitude, longitude).catch(err => {
            console.error(`❌ Async video processing error for ${videoId}:`, err.message);
        });

    } catch (error) {
        console.error('❌ Error receiving video:', error);
        
        // Only send response if not already sent
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Error uploading video',
                error: error.message
            });
        }
    }
};

/**
 * Process video asynchronously
 */
async function processVideoAsync(file, videoId, userId, latitude, longitude) {
    console.log(`🤖 [${videoId}] Starting async AI analysis...`);

    try {
        // Step 1: Send video to AI service using file stream
        const formData = new FormData();
        formData.append('video', fs.createReadStream(file.path), {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        // Enable test_mode (enhanced analyzer) for better screen video detection
        formData.append('test_mode', 'true');

        const aiResponse = await axios.post(
            `${AI_SERVICE_URL}/ai/analyze-traffic`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 180000, // 180 seconds timeout (3 minutes)
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        if (!aiResponse.data.success) {
            throw new Error('AI analysis failed');
        }

        const aiResults = aiResponse.data.data;

        console.log(`🤖 [${videoId}] AI Analysis Results:`, {
            incident_detected: aiResults.incident_detected,
            type: aiResults.incident_type,
            confidence: aiResults.confidence,
        });

        // Step 2: If incident detected, create incident in database
        let incident = null;
        if (aiResults.incident_detected) {
            // Determine severity based on incident type and confidence
            const severity = determineSeverity(aiResults.incident_type, aiResults.confidence);

            // Create incident
            const incidentResult = await db.query(
                `INSERT INTO incidents (
                    user_id, type, severity, description, 
                    latitude, longitude, location_name,
                    ai_confidence, ai_metadata, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    userId,
                    mapIncidentType(aiResults.incident_type),
                    severity,
                    generateIncidentDescription(aiResults),
                    latitude || 0,
                    longitude || 0,
                    'AI Detected Location',
                    aiResults.confidence,
                    JSON.stringify({
                        vehicle_count: aiResults.vehicle_count,
                        max_vehicle_count: aiResults.max_vehicle_count,
                        avg_speed: aiResults.avg_speed,
                        stationary_count: aiResults.stationary_count,
                        frames_analyzed: aiResults.frames_analyzed,
                        analysis_time: aiResults.analysis_time,
                    }),
                    'active'
                ]
            );

            incident = incidentResult.rows[0];

            console.log(`✅ [${videoId}] Incident created in database:`, incident.id);

            // Step 3: Broadcast real-time notification via WebSocket
            socketManager.emitIncidentNew({
                ...incident,
                source: 'ai'
            });

            // Emit analysis complete event
            socketManager.emitAnalysisComplete({
                incident_id: incident.id,
                result: 'Incident detected',
                confidence: aiResults.confidence,
                vehicle_count: aiResults.vehicle_count,
                incident_detected: true,
                detected_type: aiResults.incident_type,
            });

            // Step 4: Create notifications for police/admin users
            await createIncidentNotifications(incident, aiResults);

            // Step 5: Automatically create EMERGENCY for critical incidents
            if (incident.severity === 'critical' || incident.severity === 'high') {
                await createAutomaticEmergency(incident, aiResults, latitude, longitude);
            }
        } else {
            // Even if no incident detected, notify about analysis completion
            socketManager.emitAnalysisComplete({
                result: 'No incident detected',
                confidence: aiResults.confidence || 0,
                incident_detected: false,
            });
            console.log(`✅ [${videoId}] Analysis complete - no incident detected`);
        }

    } catch (error) {
        console.error(`❌ [${videoId}] AI analysis error:`, error.message);
        // Emit error event
        socketManager.emitAnalysisComplete({
            result: 'Analysis failed',
            error: error.message,
            incident_detected: false,
        });
    }
}

/**
 * Helper: Determine severity based on incident type and AI confidence
 */
function determineSeverity(incidentType, confidence) {
    if (incidentType === 'accident') {
        return confidence > 0.7 ? 'critical' : 'high';
    } else if (incidentType === 'road_blockage') {
        return 'high';
    } else if (incidentType === 'congestion') {
        return confidence > 0.7 ? 'medium' : 'low';
    }
    return 'low';
}

/**
 * Helper: Map AI incident type to database incident type
 */
function mapIncidentType(aiType) {
    const mapping = {
        'accident': 'accident',
        'congestion': 'traffic_jam',
        'road_blockage': 'road_blockage',
    };
    return mapping[aiType] || 'other';
}

/**
 * Helper: Generate human-readable incident description
 */
function generateIncidentDescription(aiResults) {
    const parts = [
        `AI-detected ${aiResults.incident_type}`,
        `${aiResults.vehicle_count} vehicles observed`,
        `average speed ${Math.round(aiResults.avg_speed)} km/h`,
    ];

    if (aiResults.stationary_count > 0) {
        parts.push(`${aiResults.stationary_count} stationary vehicles`);
    }

    parts.push(`(${Math.round(aiResults.confidence * 100)}% confidence)`);

    return parts.join(', ') + '.';
}

/**
 * Helper: Create notifications for relevant users
 */
async function createIncidentNotifications(incident, aiResults = {}) {
    try {
        // Get all police and admin users
        const usersResult = await db.query(
            `SELECT id FROM users WHERE role IN ('police', 'admin')`
        );

        if (usersResult.rows.length === 0) {
            return;
        }

        // Ensure incident has required fields
        const incidentType = incident.type || 'traffic incident';
        const incidentSeverity = incident.severity || 'medium';
        const incidentAddress = incident.address || incident.location_name || 'Unknown location';
        const confidence = aiResults.confidence || 0;
        const vehicleCount = aiResults.vehicle_count || 0;

        // Create notification for each police/admin user
        const notifications = usersResult.rows.map(user => [
            user.id,
            incident.id,
            'incident',
            `AI-Detected ${incidentSeverity.toUpperCase()} ${incidentType}`,
            `Location: ${incidentAddress}. Confidence: ${Math.round(confidence * 100)}%. Vehicles: ${vehicleCount}`,
            false, // is_read
        ]);

        const queryText = `
            INSERT INTO notifications 
            (user_id, incident_id, type, title, message, is_read)
            VALUES ${notifications.map((_, i) =>
            `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
        ).join(', ')}
        `;

        await db.query(queryText, notifications.flat());

        console.log(`📬 Notifications sent to ${usersResult.rows.length} police/admin users`);
    } catch (error) {
        console.error('Failed to create notifications:', error);
    }
}

/**
 * Automatically create EMERGENCY for critical/high severity incidents
 * Kigali, Rwanda - Emergency services auto-dispatch
 */
async function createAutomaticEmergency(incident, aiResults, latitude, longitude) {
    try {
        // Determine emergency type based on incident type
        let emergencyType = 'traffic';
        let servicesNeeded = [];
        let description = '';

        if (incident.type === 'accident') {
            emergencyType = 'accident';
            servicesNeeded = ['police', 'ambulance'];
            description = `🚨 AUTOMATIC ALERT: Traffic accident detected in Kigali. ${aiResults.stationary_count || 0} vehicles stationary. Immediate response needed.`;
        } else if (incident.type === 'road_blockage') {
            emergencyType = 'road_blockage';
            servicesNeeded = ['police'];
            description = `🚧 AUTOMATIC ALERT: Road blockage detected in Kigali. ${aiResults.vehicle_count || 0} vehicles affected. Traffic control needed.`;
        } else if (incident.type === 'congestion') {
            emergencyType = 'traffic';
            servicesNeeded = ['traffic_police'];
            description = `🚦 AUTOMATIC ALERT: Heavy traffic congestion detected in Kigali. ${aiResults.max_vehicle_count || 0} vehicles in frame. Traffic management required.`;
        }

        // Create emergency in database
        const result = await db.query(
            `INSERT INTO emergencies (
                user_id, emergency_type, severity, location_name, location_description,
                latitude, longitude, services_needed, description, contact_phone, 
                contact_name, incident_id, status, source, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            RETURNING *`,
            [
                null, // System-generated (no specific user)
                emergencyType,
                incident.severity,
                incident.address || 'Kigali, Rwanda',
                `AI-Detected ${incident.type}. Confidence: ${Math.round(aiResults.confidence * 100)}%. Vehicle count: ${aiResults.vehicle_count || 0}.`,
                latitude || incident.latitude || -1.9536,
                longitude || incident.longitude || 30.0606,
                JSON.stringify(servicesNeeded),
                description,
                '112', // Emergency hotline number for Rwanda
                'TrafficGuard AI System', // System-generated emergency
                incident.id,
                'pending',
                'ai'
            ]
        );

        const emergency = result.rows[0];

        console.log(`🚨 AUTOMATIC EMERGENCY CREATED: ID ${emergency.id}, Type: ${emergencyType}, Location: Kigali`);

        // Broadcast via WebSocket using SocketManager
        socketManager.emitEmergencyNew({
            ...emergency,
            latitude: parseFloat(emergency.latitude),
            longitude: parseFloat(emergency.longitude),
            automatic: true,
            aiConfidence: aiResults.confidence
        });

        console.log('📡 Automatic emergency broadcast via SocketManager');

        // ============================================================
        // TRIGGER GEO-FENCED ALERT TO NEARBY OFFICERS
        // ============================================================
        try {
            const geoFencingService = require('../services/geoFencingService');
            
            // Determine if this is an emergency-level alert
            const isEmergencyAlert = incident.severity === 'critical' || 
                                     incident.type === 'accident' ||
                                     emergencyType === 'accident';

            // Create targeted geo-fenced alert
            const alertResult = await geoFencingService.createTargetedAlert({
                id: incident.id,
                emergency_id: emergency.id,
                type: incident.type || emergencyType,
                severity: incident.severity,
                latitude: latitude || incident.latitude || -1.9536,
                longitude: longitude || incident.longitude || 30.0606,
                address: incident.address || 'Kigali, Rwanda',
                location_name: incident.location_name || 'Kigali',
                description: description,
                media_urls: incident.video_url ? [incident.video_url] : [],
                reported_by: null // AI-generated
            }, isEmergencyAlert, {
                source: 'ai',
                confidence: aiResults.confidence,
                detectedObject: incident.type,
                detectionMethod: 'AI Traffic Analysis',
                vehicleCount: aiResults.vehicle_count,
                stationaryCount: aiResults.stationary_count
            });

            console.log(`🎯 GEO-FENCED ALERT sent to ${alertResult.targetedOfficers} officers in ${alertResult.district}`);
        } catch (geoError) {
            console.error('⚠️ Geo-fencing alert failed (non-critical):', geoError && geoError.message ? geoError.message : geoError);
            // Continue even if geo-fencing fails - the emergency was still created
        }

        return emergency;
    } catch (error) {
        console.error('❌ Failed to create automatic emergency:', error);
    }
}

/**
 * @desc    Test endpoint to simulate incident detection (bypasses AI)
 * @route   POST /api/incidents/test-detection
 * @access  Public (for testing only)
 */
const testIncidentDetection = async (req, res) => {
    try {
        const {
            incident_detected,
            type,
            confidence,
            severity,
            vehicle_count,
            stationary_count,
            avg_speed,
            frames_analyzed,
            location
        } = req.body;

        if (!incident_detected) {
            return res.status(200).json({
                success: true,
                message: 'No incident detected (test)',
                data: { incident_detected: false }
            });
        }

        const { latitude, longitude, location_name } = location;

        // Step 1: Create incident in database
        const incidentResult = await db.query(
            `INSERT INTO incidents 
            (reported_by, type, severity, latitude, longitude, address, description, status, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
            RETURNING id, type, severity, address, status, created_at, latitude, longitude`,
            [
                null, // Test incident (no user)
                type,
                severity,
                latitude,
                longitude,
                location_name,
                `TEST: ${type} detected - ${vehicle_count} vehicles, ${stationary_count} stationary, avg speed: ${avg_speed} km/h`,
                'reported'
            ]
        );

        const incident = incidentResult.rows[0];
        console.log(`✅ TEST INCIDENT CREATED: ${type} (${severity}) - ID: ${incident.id}`);

        // Step 2: Create notifications for police/admin
        const aiResults = {
            confidence: confidence / 100, // Convert percentage to decimal
            vehicle_count,
            stationary_count,
            avg_speed
        };
        await createIncidentNotifications(incident, aiResults);

        // Step 3: Broadcast via WebSocket using SocketManager
        socketManager.emitIncidentNew({
            ...incident,
            test: true,
            confidence: confidence,
            vehicleCount: vehicle_count
        });
        console.log('📡 TEST INCIDENT broadcast via SocketManager');

        // Step 4: Automatically create EMERGENCY for critical/high incidents
        let emergency = null;
        if (incident.severity === 'critical' || incident.severity === 'high') {
            const aiResults = {
                vehicle_count,
                stationary_count,
                avg_speed,
                confidence
            };
            emergency = await createAutomaticEmergency(incident, aiResults, latitude, longitude);
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Test incident created successfully',
            data: {
                incident_detected: true,
                incident_id: incident.id,
                incident_type: incident.type,
                severity: incident.severity,
                confidence: confidence,
                emergency_created: emergency !== null,
                emergency_id: emergency ? emergency.id : null,
                location: incident.address
            }
        });

    } catch (error) {
        console.error('❌ Test incident detection error:', error);
        return res.status(500).json({
            success: false,
            message: 'Test incident detection failed',
            error: error.message
        });
    }
};

module.exports = {
    analyzeVideoAndCreateIncident,
    testIncidentDetection,
};
