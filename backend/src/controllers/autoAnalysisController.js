const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const FormData = require('form-data');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'auto-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB for auto-captured clips (5-second videos)
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
 * Auto-analyze video from continuous capture
 * This endpoint receives 5-second clips and analyzes them
 * Returns immediately to mobile app, processes in background
 */
const analyzeAutoCapture = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const videoFile = req.file;

        if (!videoFile) {
            return res.status(400).json({
                success: false,
                message: 'Video file is required',
            });
        }

        if (!latitude || !longitude) {
            // Delete video if no location
            await fs.unlink(videoFile.path);
            return res.status(400).json({
                success: false,
                message: 'Location (latitude, longitude) is required',
            });
        }

        // Return immediately to mobile app
        res.status(202).json({
            success: true,
            message: 'Video received, processing in background',
            clip_id: videoFile.filename,
            status: 'processing'
        });

        // Process asynchronously in background
        processClipAsync(req, videoFile, latitude, longitude).catch(err => {
            console.error('❌ Background processing failed:', err);
        });

    } catch (error) {
        console.error('Auto-analysis error:', error);

        // Clean up video file on error
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to delete video:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to process auto-capture',
            error: error.message,
        });
    }
};

/**
 * Process video clip asynchronously
 */
async function processClipAsync(req, videoFile, latitude, longitude) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
        console.log(`🎬 Processing clip: ${videoFile.filename}`);
        
        // Send to AI service for quick analysis
        const formData = new FormData();
        const videoStream = require('fs').createReadStream(videoFile.path);
        formData.append('video', videoStream, videoFile.filename);

        const aiResponse = await axios.post(
            `${aiServiceUrl}/analyze`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 10000, // 10 seconds timeout for quick analysis
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        const analysisData = aiResponse.data;

        // Check if incident detected
        const incidents = analysisData.incidents || [];
        const incidentDetected = analysisData.success && incidents.length > 0;
        
        if (!incidentDetected) {
            // No incident detected - delete the video
            console.log(`✅ No incident in clip: ${videoFile.filename}`);
            await fs.unlink(videoFile.path);
            return;
        }

        // Incident detected - store in database
        console.log(`🚨 Incident detected in clip: ${videoFile.filename}`);
        const userId = req.user ? req.user.id : null;

        const incident = incidents[0]; // Take first incident
        const result = await query(
            `INSERT INTO incidents 
            (type, severity, location, video_url, reported_by, auto_captured, ai_confidence, status) 
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9) 
            RETURNING id, type, severity, ST_AsText(location::geometry) as location, created_at`,
            [
                incident.type || 'unknown',
                determineSeverity(incident.confidence || 0.5),
                parseFloat(longitude),
                parseFloat(latitude),
                `/uploads/${videoFile.filename}`,
                userId,
                true, // auto_captured
                incident.confidence || 0.5,
                'pending' // Auto-captured incidents start as pending
            ]
        );

        const storedIncident = result.rows[0];

        // Store AI analytics
        await query(
            `INSERT INTO incident_analytics 
            (incident_id, vehicle_count, confidence, detected_type) 
            VALUES ($1, $2, $3, $4)`,
            [
                storedIncident.id,
                incident.vehicle_count || 0,
                incident.confidence || 0.5,
                incident.type || 'unknown'
            ]
        );

        // Update user's auto-capture stats if authenticated
        if (userId) {
            await query(
                `INSERT INTO auto_capture_stats (user_id, videos_captured, incidents_detected, data_uploaded_mb, last_capture_at)
                VALUES ($1, 1, 1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    videos_captured = auto_capture_stats.videos_captured + 1,
                    incidents_detected = auto_capture_stats.incidents_detected + 1,
                    data_uploaded_mb = auto_capture_stats.data_uploaded_mb + $2,
                    last_capture_at = CURRENT_TIMESTAMP`,
                [userId, (videoFile.size / 1024 / 1024) || 0]
            );
        }

        // Emit real-time update via WebSocket
        if (req.app && req.app.get('io')) {
            req.app.get('io').emit('incident_update', {
                type: 'auto_detected',
                data: {
                    ...storedIncident,
                    ai_confidence: incident.confidence,
                    vehicle_count: incident.vehicle_count,
                },
            });
        }

        console.log(`✅ Incident stored: ID ${storedIncident.id}`);

    } catch (error) {
        console.error('❌ Async processing error:', error);
        
        // Delete video on error
        try {
            await fs.unlink(videoFile.path);
        } catch (unlinkError) {
            console.error('Failed to delete video:', unlinkError);
        }
    }
}

/**
 * Get auto-capture statistics for user
 */
const getAutoCaptureStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT 
                videos_captured,
                incidents_detected,
                data_uploaded_mb,
                last_capture_at,
                created_at
            FROM auto_capture_stats
            WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    videos_captured: 0,
                    incidents_detected: 0,
                    data_uploaded_mb: 0,
                    last_capture_at: null,
                },
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message,
        });
    }
};

/**
 * Determine severity based on AI confidence
 */
function determineSeverity(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
}

module.exports = {
    upload,
    analyzeAutoCapture,
    getAutoCaptureStats,
};
