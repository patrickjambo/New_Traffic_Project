const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

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

        // Insert incident into database
        const result = await query(
            `INSERT INTO incidents 
       (type, severity, location, address, description, video_url, reported_by, is_anonymous) 
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9) 
       RETURNING id, type, severity, ST_AsText(location::geometry) as location, created_at`,
            [type, severity, longitude, latitude, address || null, description || null,
                videoFile ? `/uploads/${videoFile.filename}` : null, reportedBy, isAnonymous]
        );

        const incident = result.rows[0];

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

        // Emit real-time update via WebSocket (if initialized)
        // Emit real-time update via WebSocket (if initialized)
        if (req.app.get('io')) {
            req.app.get('io').emit('incident:new', incident);
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
 * Get nearby incidents
 */
const getNearbyIncidents = async (req, res) => {
    try {
        const { latitude, longitude, radius, status, type, limit, offset } = req.query;

        // Build query with filters
        let queryText = `
      SELECT 
        i.id, 
        i.type, 
        i.severity, 
        i.status,
        ST_AsText(i.location::geometry) as location,
        ST_Y(i.location::geometry) as latitude,
        ST_X(i.location::geometry) as longitude,
        i.address,
        i.description,
        i.video_url,
        i.created_at,
        i.updated_at,
        u.full_name as reported_by_name,
        ST_Distance(
          i.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      WHERE ST_DWithin(
        i.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3 * 1000
      )
    `;

        const params = [parseFloat(longitude), parseFloat(latitude), parseFloat(radius || 5)];
        let paramCount = 3;

        // Add status filter
        if (status) {
            paramCount++;
            queryText += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        // Add type filter
        if (type) {
            paramCount++;
            queryText += ` AND i.type = $${paramCount}`;
            params.push(type);
        }

        queryText += ` ORDER BY distance_km LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit || 20), parseInt(offset || 0));

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: {
                incidents: result.rows,
                count: result.rowCount,
            },
        });
    } catch (error) {
        console.error('Get nearby incidents error:', error);
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
        ST_Y(i.location::geometry) as latitude,
        ST_X(i.location::geometry) as longitude,
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

        // Emit real-time update
        // Emit real-time update
        if (req.app.get('io')) {
            req.app.get('io').emit('incident:update', result.rows[0]);
        }

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
        ST_AsText(i.location::geometry) as location,
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

module.exports = {
    upload,
    reportIncident,
    getNearbyIncidents,
    getIncidentById,
    updateIncidentStatus,
    getUserIncidents,
};
