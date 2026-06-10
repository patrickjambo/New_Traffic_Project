const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const socketManager = require('../services/socketManager');
const geoFencingService = require('../services/geoFencingService');
const { resolveDistrict } = require('../services/districtResolver');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'incident-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024, // 200MB (increased for mobile uploads)
    },
    fileFilter: (req, file, cb) => {
        // Accept ANY video MIME type or common video extensions
        const isVideoMime = file.mimetype && file.mimetype.startsWith('video/');
        const isVideoExt = /\.(mp4|mov|avi|mkv|3gp|webm|flv)$/i.test(file.originalname);

        if (isVideoMime || isVideoExt) {
            console.log('✅ Video accepted:', file.originalname, file.mimetype);
            return cb(null, true);
        } else {
            console.log('❌ File rejected:', {
                originalname: file.originalname,
                mimetype: file.mimetype
            });
            cb(new Error('Only video files are allowed'));
        }
    }
});

/**
 * Report new incident
 */
const reportIncident = async (req, res) => {
    try {
        const { type, severity, latitude, longitude, address, description, isAnonymous } = req.validatedBody;
        const videoFile = req.file;

        // Determine reporter
        const reportedBy = isAnonymous ? null : (req.user ? req.user.id : null);

        // 🎯 Auto-resolve district from coordinates
        const { districtId } = await resolveDistrict(latitude, longitude);

        // Insert incident into database
        const result = await query(
            `INSERT INTO incidents 
       (type, severity, latitude, longitude, address, description, video_url, reported_by, is_anonymous, district_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, type, severity, latitude, longitude, created_at, district_id`,
            [type, severity, latitude, longitude, address || null, description || null,
                videoFile ? `/uploads/${videoFile.filename}` : null, reportedBy, isAnonymous, districtId]
        );

        const incident = result.rows[0];
        console.log(`📍 Incident #${incident.id} assigned to district ${districtId || 'UNKNOWN'}`);

        // If video exists, submit to AI service for analysis
        if (videoFile) {
            try {
                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
                const formData = new FormData();
                const videoBuffer = await fs.readFile(videoFile.path);
                formData.append('video', new Blob([videoBuffer]), videoFile.filename);

                const aiResponse = await axios.post(`${aiServiceUrl}/ai/analyze-traffic`, formData, {
                    timeout: 30000, // 30 seconds timeout
                });

                // Store AI analysis results
                if (aiResponse.data.incident_detected) {
                    await query(
                        `INSERT INTO incident_analytics 
             (incident_id, vehicle_count, avg_speed, confidence, detected_type) 
             VALUES ($1, $2, $3, $4, $5)`,
                        [
                            incident.id,
                            aiResponse.data.vehicle_count || 0,
                            aiResponse.data.avg_speed || 0,
                            aiResponse.data.confidence || 0,
                            aiResponse.data.incident_type || type
                        ]
                    );
                }
            } catch (aiError) {
                console.error('AI analysis failed:', aiError.message);
                // Continue without AI analysis - not critical
            }
        }

        // Emit real-time update via Socket Manager
        socketManager.emitIncidentNew(incident);

        // 🎯 AUTOMATIC GEO-FENCED ALERT TO NEARBY OFFICERS
        try {
            // Critical/high severity incidents trigger emergency alarm on officer devices
            const isEmergencyAlert = severity === 'critical' || severity === 'high' ||
                                     type === 'accident' || type === 'fire';

            // Create targeted geo-fenced alert to nearby officers
            const alertResult = await geoFencingService.createTargetedAlert({
                id: incident.id,
                incident_id: incident.id,
                type: type,
                severity: severity,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address: address || 'Unknown location',
                location_name: address || 'Reported Location',
                description: description || `${type} incident reported`,
                media_urls: videoFile ? [`/uploads/${videoFile.filename}`] : [],
                reported_by: reportedBy
            }, isEmergencyAlert, {
                source: isAnonymous ? 'anonymous' : 'manual',
                confidence: 1.0,
                detectedObject: type,
                detectionMethod: 'User Report'
            });

            console.log(`🎯 GEO-FENCED ALERT sent to ${alertResult.targetedOfficers} officers in ${alertResult.district || 'area'}`);
        } catch (geoError) {
            console.error('⚠️ Geo-fencing alert failed (non-critical):', geoError?.message || geoError);
            // Continue even if geo-fencing fails - the incident was still created
        }

        res.status(201).json({
            success: true,
            message: 'Incident reported successfully',
            data: {
                id: incident.id,
                type: incident.type,
                severity: incident.severity,
                location: incident.location,
                createdAt: incident.created_at,
            },
        });
    } catch (error) {
        console.error('Report incident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report incident',
            error: error.message,
        });
    }
};

/**
 * Get nearby incidents OR all incidents if no location specified
 */
const getNearbyIncidents = async (req, res) => {
    try {
        const { latitude, longitude, radius, status, type, limit, offset, startDate, endDate, includeResolved } = req.query;

        // 🎯 District filtering for district_admin and co_admin
        // JWT token stores districtId (camelCase), DB queries may use district_id
        let userDistrictId = null;
        if (req.user && (req.user.role === 'district_admin' || req.user.role === 'co_admin') && (req.user.districtId || req.user.district_id)) {
            userDistrictId = req.user.districtId || req.user.district_id;
        }

        // Check if location params are provided
        const hasLocation = latitude && longitude;

        let queryText;
        let params;
        let paramCount;

        if (hasLocation) {
            queryText = `
              SELECT 
                i.id, 
                i.type as incident_type, 
                i.severity, 
                i.status,
                i.address as location,
                i.latitude,
                i.longitude,
                i.address,
                i.description,
                i.video_url,
                i.created_at,
                i.updated_at,
                i.responding_officer_id,
                i.response_started_at,
                i.district_id,
                COALESCE(i.is_anonymous, false) as is_anonymous,
                'manual' as source,
                u.full_name as reported_by_name,
                responder.full_name as responding_officer_name,
                (6371 * acos(cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) + sin(radians($1)) * sin(radians(i.latitude)))) as distance_km
              FROM incidents i
              LEFT JOIN users u ON i.reported_by = u.id
              LEFT JOIN users responder ON i.responding_officer_id = responder.id
              WHERE i.latitude IS NOT NULL AND i.longitude IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) + sin(radians($1)) * sin(radians(i.latitude)))) < $3
            `;
            params = [parseFloat(latitude), parseFloat(longitude), parseFloat(radius || 5)];
            paramCount = 3;
        } else {
            queryText = `
              SELECT 
                i.id, 
                i.type as incident_type, 
                i.severity, 
                i.status,
                i.address as location,
                i.latitude,
                i.longitude,
                i.address,
                i.description,
                i.video_url,
                i.created_at,
                i.updated_at,
                i.responding_officer_id,
                i.response_started_at,
                i.district_id,
                COALESCE(i.is_anonymous, false) as is_anonymous,
                'manual' as source,
                u.full_name as reported_by_name,
                responder.full_name as responding_officer_name
              FROM incidents i
              LEFT JOIN users u ON i.reported_by = u.id
              LEFT JOIN users responder ON i.responding_officer_id = responder.id
              WHERE 1=1
            `;
            params = [];
            paramCount = 0;
        }

        // 🎯 District filter — district_admin/co_admin only sees their district
        if (userDistrictId) {
            paramCount++;
            queryText += ` AND i.district_id = $${paramCount}`;
            params.push(userDistrictId);
        }

        // Date filter: today by default.
        // Pass startDate+endDate for a date range (e.g. monthly PDF).
        // Pass includeResolved=true with no dates to fetch ALL days (Excel full export).
        if (startDate && endDate) {
            paramCount++;
            queryText += ` AND i.created_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
            queryText += ` AND i.created_at <= $${paramCount}`;
            params.push(endDate);
        } else if (includeResolved !== 'true') {
            queryText += ` AND DATE(i.created_at) = CURRENT_DATE`;
        }

        // Status filter: hide resolved/dismissed from live dashboards by default.
        // Pass an explicit status param to target a specific status.
        // Pass includeResolved=true (e.g. for report downloads) to skip the exclusion.
        if (status) {
            paramCount++;
            queryText += ` AND i.status = $${paramCount}`;
            params.push(status);
        } else if (includeResolved !== 'true') {
            queryText += ` AND i.status NOT IN ('resolved', 'dismissed')`;
        }

        // Add type filter
        if (type) {
            paramCount++;
            queryText += ` AND i.type = $${paramCount}`;
            params.push(type);
        }

        // Order by created_at (most recent first) or distance if location provided
        if (hasLocation) {
            queryText += ` ORDER BY distance_km LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        } else {
            queryText += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        }
        params.push(parseInt(limit || 50), parseInt(offset || 0));

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get incidents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch incidents',
            error: error.message,
        });
    }
};


/**
 * Get incident by ID
 */
const getIncidentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT 
        i.*,
        i.latitude,
        i.longitude,
        u.full_name as reported_by_name,
        v.full_name as verified_by_name,
        a.vehicle_count,
        a.avg_speed,
        a.confidence,
        a.detected_type
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN users v ON i.verified_by = v.id
      LEFT JOIN incident_analytics a ON i.id = a.incident_id
      WHERE i.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incident not found',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get incident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch incident',
            error: error.message,
        });
    }
};

/**
 * Update incident status (Police/Admin only)
 */
const updateIncidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.validatedBody;

        // Update incident status
        const result = await query(
            `UPDATE incidents 
       SET status = $1, verified_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, status, updated_at`,
            [status, req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incident not found',
            });
        }

        // Add update to history
        await query(
            'INSERT INTO incident_updates (incident_id, user_id, status, comment) VALUES ($1, $2, $3, $4)',
            [id, req.user.id, status, comment || null]
        );

        // Emit real-time update via Socket Manager
        socketManager.emitIncidentUpdate(result.rows[0]);

        res.json({
            success: true,
            message: 'Incident status updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update incident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update incident',
            error: error.message,
        });
    }
};

/**
 * Police officer respond to incident
 * This is different from updateIncidentStatus - it specifically handles police response
 */
const respondToIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, response_notes } = req.body;
        const officerId = req.user.id;
        const officerName = req.user.full_name || 'Unknown Officer';

        // Validate action
        const validActions = ['responding', 'on_scene', 'resolved', 'cancelled'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be: responding, on_scene, resolved, or cancelled'
            });
        }

        // Get current incident
        const incidentResult = await query(
            `SELECT id, type, severity, status, latitude, longitude, address, responding_officer_id
             FROM incidents WHERE id = $1`,
            [id]
        );

        if (incidentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found'
            });
        }

        const incident = incidentResult.rows[0];

        // Check if another officer is already responding
        if (incident.responding_officer_id && 
            incident.responding_officer_id !== officerId && 
            action === 'responding') {
            
            // Get responding officer's name
            const responderResult = await query(
                'SELECT full_name FROM users WHERE id = $1',
                [incident.responding_officer_id]
            );
            const responderName = responderResult.rows[0]?.full_name || 'Another officer';
            
            return res.status(409).json({
                success: false,
                error: `${responderName} is already responding to this incident`
            });
        }

        // Map action to status
        const statusMap = {
            'responding': 'responding',
            'on_scene': 'in_progress',
            'resolved': 'resolved',
            'cancelled': 'active'
        };

        const newStatus = statusMap[action];
        const respondingOfficerId = action === 'cancelled' ? null : officerId;

        // Update incident with officer response
        const updateResult = await query(
            `UPDATE incidents 
             SET status = $1, 
                 responding_officer_id = $2, 
                 response_started_at = CASE WHEN $3 = 'responding' THEN CURRENT_TIMESTAMP ELSE response_started_at END,
                 response_notes = COALESCE($4, response_notes),
                 verified_by = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING id, type, severity, status, latitude, longitude, address, responding_officer_id, response_started_at`,
            [newStatus, respondingOfficerId, action, response_notes, officerId, id]
        );

        // Add to incident updates history
        await query(
            'INSERT INTO incident_updates (incident_id, user_id, status, comment) VALUES ($1, $2, $3, $4)',
            [id, officerId, newStatus, `Officer ${action}: ${response_notes || ''}`]
        );

        // Get updated incident with officer info
        const updatedIncident = updateResult.rows[0];

        // Emit real-time update to all connected clients
        const io = socketManager.getIO();
        if (io) {
            // Notify admin dashboard
            io.to('role:admin').emit('incident:response', {
                incidentId: id,
                action: action,
                officerId: officerId,
                officerName: officerName,
                incident: updatedIncident,
                timestamp: new Date().toISOString()
            });

            // Notify other police that this incident is being handled
            io.to('role:police').emit('incident:response', {
                incidentId: id,
                action: action,
                officerId: officerId,
                officerName: officerName,
                incident: updatedIncident,
                timestamp: new Date().toISOString()
            });

            // Also emit incident update
            socketManager.emitIncidentUpdate(updatedIncident);
        }

        console.log(`🚔 Officer ${officerName} (${officerId}) ${action} incident ${id}`);

        res.json({
            success: true,
            message: `Successfully ${action} incident`,
            data: {
                incident: updatedIncident,
                officer: {
                    id: officerId,
                    name: officerName
                }
            }
        });

    } catch (error) {
        console.error('Respond to incident error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to respond to incident',
            details: error.message
        });
    }
};

/**
 * Get incidents reported by the current user
 */
const getUserIncidents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit, offset } = req.query;

        const result = await query(
            `SELECT 
        i.id, 
        i.type, 
        i.severity, 
        i.status,
        i.address as location,
        i.address,
        i.description,
        i.video_url,
        i.created_at,
        i.updated_at
      FROM incidents i
      WHERE i.reported_by = $1
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3`,
            [userId, parseInt(limit || 20), parseInt(offset || 0)]
        );

        res.json({
            success: true,
            data: {
                incidents: result.rows,
                count: result.rowCount,
            },
        });
    } catch (error) {
        console.error('Get user incidents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user incidents',
            error: error.message,
        });
    }
};

/**
 * Get incident statistics
 */
const getIncidentStatistics = async (req, res) => {
    try {
        const [incStats, emStats] = await Promise.all([
            query(`
                SELECT
                    COUNT(*) as total_incidents,
                    COUNT(*) FILTER (WHERE status NOT IN ('resolved','dismissed') AND DATE(created_at) = CURRENT_DATE) as active_reports,
                    COUNT(*) FILTER (WHERE status IN ('resolved','dismissed') AND DATE(updated_at) = CURRENT_DATE) as incidents_resolved_today,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)
                        FILTER (WHERE status = 'resolved' AND DATE(updated_at) = CURRENT_DATE) as avg_response_time
                FROM incidents
            `),
            query(`
                SELECT COUNT(*) as emergencies_resolved_today
                FROM emergencies
                WHERE status IN ('resolved','cancelled')
                  AND DATE(COALESCE(updated_at, created_at)) = CURRENT_DATE
            `)
        ]);

        const incRow = incStats.rows[0];
        const emRow  = emStats.rows[0];

        res.json({
            success: true,
            data: {
                total_incidents: parseInt(incRow.total_incidents) || 0,
                active_reports: parseInt(incRow.active_reports) || 0,
                mobile_captures: 0,
                avg_response_time: Math.round(parseFloat(incRow.avg_response_time) || 0),
                resolved_today: (parseInt(incRow.incidents_resolved_today) || 0) +
                                (parseInt(emRow.emergencies_resolved_today) || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching incident statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch incident statistics',
            error: error.message,
        });
    }
};

module.exports = {
    upload,
    reportIncident,
    getNearbyIncidents,
    getIncidentById,
    updateIncidentStatus,
    respondToIncident,
    getUserIncidents,
    getIncidentStatistics,
};
