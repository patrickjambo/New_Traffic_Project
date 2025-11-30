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
        fileSize: 10 * 1024 * 1024, // 10MB for auto-captured clips
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|mov|avi|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

/**
 * Auto-analyze video from continuous capture
 * This endpoint receives 5-second clips and analyzes them
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

        // Send to AI service for quick analysis
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const formData = new FormData();
        const videoStream = require('fs').createReadStream(videoFile.path);
        formData.append('video', videoStream, videoFile.filename);

        try {
            const aiResponse = await axios.post(
                `${aiServiceUrl}/ai/quick-analyze`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 15000, // 15 seconds timeout for quick analysis
                }
            );

            const analysisData = aiResponse.data.data;

            // Check if relevant data was found
            if (!analysisData.has_relevant_data || !analysisData.incident_detected) {
                // No incident detected - delete the video
                await fs.unlink(videoFile.path);

                return res.json({
                    success: true,
                    incident_detected: false,
                    message: 'No incident detected, video deleted',
                    analysis: {
                        has_relevant_data: analysisData.has_relevant_data,
                        vehicle_count: analysisData.vehicle_count || 0,
                    }
                });
            }

            // Incident detected - store in database
            const userId = req.user ? req.user.id : null;

            const result = await query(
                `INSERT INTO incidents 
                (type, severity, location, video_url, reported_by, auto_captured, ai_confidence, status) 
                VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9) 
                RETURNING id, type, severity, ST_AsText(location::geometry) as location, created_at`,
                [
                    analysisData.incident_type,
                    determineSeverity(analysisData.confidence),
                    parseFloat(longitude),
                    parseFloat(latitude),
                    `/uploads/${videoFile.filename}`,
                    userId,
                    true, // auto_captured
                    analysisData.confidence,
                    'pending' // Auto-captured incidents start as pending
                ]
            );

            const incident = result.rows[0];

            // Store AI analytics
            await query(
                `INSERT INTO incident_analytics 
                (incident_id, vehicle_count, avg_speed, confidence, detected_type) 
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    incident.id,
                    analysisData.vehicle_count || 0,
                    analysisData.avg_speed || 0,
                    analysisData.confidence,
                    analysisData.incident_type
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
                    [userId, analysisData.video_size_mb || 0]
                );
            }

            // Emit real-time update via WebSocket
            if (req.app.get('io')) {
                req.app.get('io').emit('incident_update', {
                    type: 'auto_detected',
                    data: {
                        ...incident,
                        ai_confidence: analysisData.confidence,
                        vehicle_count: analysisData.vehicle_count,
                    },
                });
            }

            res.status(201).json({
                success: true,
                incident_detected: true,
                message: 'Incident detected and stored',
                data: {
                    incident_id: incident.id,
                    type: incident.type,
                    severity: incident.severity,
                    confidence: analysisData.confidence,
                    vehicle_count: analysisData.vehicle_count,
                },
            });

        } catch (aiError) {
            console.error('AI analysis failed:', aiError.message);

            // Delete video if AI analysis fails
            await fs.unlink(videoFile.path);

            return res.status(500).json({
                success: false,
                message: 'AI analysis failed',
                error: aiError.message,
            });
        }

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
