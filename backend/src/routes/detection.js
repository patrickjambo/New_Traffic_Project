const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const socketManager = require('../services/socketManager');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `video_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|avi|mov|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only video files are allowed!'));
    }
});

/**
 * POST /api/detect
 * Receive video from mobile app and analyze for incidents
 * OPTIMIZED: Accepts upload immediately, processes async
 */
router.post('/detect', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No video file provided'
            });
        }

        const videoPath = req.file.path;
        const videoId = path.basename(videoPath, path.extname(videoPath));

        console.log(`📥 Received video: ${req.file.originalname}`);
        console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Saved as: ${videoPath}`);

        // Return success immediately - process async
        res.json({
            success: true,
            status: 'queued',
            message: 'Video uploaded successfully, processing in background',
            videoId: videoId
        });

        // Process video asynchronously (don't await)
        processVideoAsync(videoPath, videoId, req.file.originalname).catch(err => {
            console.error(`❌ Async processing error for ${videoId}:`, err.message);
        });

    } catch (error) {
        console.error('❌ Error receiving video:', error);

        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Async video processing function
 */
async function processVideoAsync(videoPath, videoId, originalName) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
        // Forward video to Python AI service
        const formData = new FormData();
        const fileBuffer = await fs.readFile(videoPath);
        const blob = new Blob([fileBuffer], { type: 'video/mp4' });
        formData.append('video', blob, originalName);
        formData.append('test_mode', 'true');

        console.log(`🤖 [${videoId}] Sending to AI service...`);

        const aiResponse = await axios.post(`${aiServiceUrl}/ai/analyze-traffic`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 180000 // 3 minute timeout
        });

        const aiData = aiResponse.data || {};
        let incidents = Array.isArray(aiData.incidents) ? aiData.incidents : [];

        // Fallback for lightweight AI service: single-result response
        if (incidents.length === 0 && aiData.incident_detected &&
            aiData.incident_type && !['none', 'normal', 'error'].includes(aiData.incident_type)) {
            incidents = [
                {
                    type: aiData.incident_type,
                    confidence: aiData.confidence || 0.0,
                    timestamp: aiData.timestamp_in_video || 0,
                    location: aiData.location || { latitude: null, longitude: null },
                    description: aiData.description || undefined,
                }
            ];
        }

        console.log(`✅ [${videoId}] AI analysis complete: ${incidents.length} detection(s)`);

        // Store incidents in database and emit via socketManager
        if (incidents.length > 0) {
            const storedIncidents = await storeIncidents(incidents, videoId, videoPath);

            // Send real-time notifications via socketManager for each incident
            for (const incident of storedIncidents) {
                socketManager.emitIncidentNew({
                    id: incident.id,
                    type: incident.type,
                    severity: incident.severity || 'medium',
                    location: {
                        latitude: incident.location_lat,
                        longitude: incident.location_lng,
                    },
                    address: incident.description,
                    description: incident.description,
                    status: 'pending',
                    source: 'ai',
                    created_at: incident.created_at,
                });
            }
            console.log(`📢 [${videoId}] Notifications sent for ${storedIncidents.length} incidents`);
        }

    } catch (aiError) {
        console.error(`❌ [${videoId}] AI service error:`, aiError.message);
    }
}

/**
 * POST /api/detect/quick
 * Ultra-fast upload endpoint - just stores video, no AI processing
 */
router.post('/detect/quick', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No video file provided'
            });
        }

        const videoId = path.basename(req.file.path, path.extname(req.file.path));
        
        console.log(`⚡ Quick upload: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Return success immediately
        res.json({
            success: true,
            status: 'uploaded',
            message: 'Video uploaded successfully',
            videoId: videoId
        });

    } catch (error) {
        console.error('❌ Quick upload error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/detect/status/:videoId
 * Check analysis status of a video
 */
router.get('/status/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        // Query database for incidents related to this video
        const { pool } = require('../config/database');
        const result = await pool.query(
            `SELECT id, type, confidence, created_at 
             FROM incidents 
             WHERE video_id = $1 
             ORDER BY created_at DESC`,
            [videoId]
        );

        res.json({
            success: true,
            videoId: videoId,
            incidents: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Helper function to store incidents in database
 * Returns array of stored incidents with their IDs
 */
async function storeIncidents(incidents, videoId, videoPath) {
    const { pool } = require('../config/database');
    const storedIncidents = [];

    for (const incident of incidents) {
        try {
            const result = await pool.query(
                `INSERT INTO incidents 
                (type, location_lat, location_lng, description, status, video_path, video_id, confidence, timestamp_in_video, reported_by, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, type, location_lat, location_lng, description, status, confidence, created_at`,
                [
                    incident.type,
                    incident.location?.latitude || -1.9441,  // Default Kigali coords
                    incident.location?.longitude || 30.0619,
                    `AI detected ${incident.type} with ${(incident.confidence * 100).toFixed(1)}% confidence`,
                    'pending',
                    videoPath,
                    videoId,
                    incident.confidence,
                    incident.timestamp,
                    'AI_SYSTEM',
                    'ai'  // Mark source as AI
                ]
            );

            if (result.rows[0]) {
                storedIncidents.push({
                    ...result.rows[0],
                    severity: incident.confidence > 0.8 ? 'high' : (incident.confidence > 0.6 ? 'medium' : 'low'),
                });
            }

            console.log(`💾 Stored incident: ${incident.type} at ${incident.timestamp}s (ID: ${result.rows[0]?.id})`);

        } catch (dbError) {
            console.error('Error storing incident:', dbError.message);
        }
    }

    return storedIncidents;
}

module.exports = router;
