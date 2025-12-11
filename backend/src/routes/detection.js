const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;

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
        
        // Send to AI service for analysis
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        
        try {
            // Forward video to Python AI service
            const formData = new FormData();
            const fileBuffer = await fs.readFile(videoPath);
            const blob = new Blob([fileBuffer], { type: 'video/mp4' });
            formData.append('file', blob, req.file.originalname);
            
            console.log(`🤖 Sending to AI service: ${aiServiceUrl}/analyze`);
            
            const aiResponse = await axios.post(`${aiServiceUrl}/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 120000 // 2 minute timeout
            });
            
            const incidents = aiResponse.data.incidents || [];
            
            console.log(`✅ AI analysis complete: ${incidents.length} detection(s)`);
            
            // Store incidents in database
            if (incidents.length > 0) {
                await storeIncidents(incidents, videoId, videoPath);
                
                // Send real-time notifications via WebSocket
                const io = req.app.get('io');
                io.emit('new_incident', {
                    videoId: videoId,
                    count: incidents.length,
                    incidents: incidents
                });
                
                console.log(`📢 Notifications sent to connected clients`);
            }
            
            return res.json({
                success: true,
                status: incidents.length > 0 ? 'incident_detected' : 'no_incident',
                count: incidents.length,
                incidents: incidents,
                videoId: videoId,
                message: incidents.length > 0 
                    ? `${incidents.length} incident(s) detected` 
                    : 'No incidents detected'
            });
            
        } catch (aiError) {
            console.error('❌ AI service error:', aiError.message);
            
            // Fallback: Return success but note AI service unavailable
            return res.json({
                success: true,
                status: 'ai_unavailable',
                message: 'Video uploaded but AI analysis is currently unavailable',
                videoId: videoId,
                error: aiError.message
            });
        }
        
    } catch (error) {
        console.error('❌ Error processing video:', error);
        
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
 */
async function storeIncidents(incidents, videoId, videoPath) {
    const { pool } = require('../config/database');
    
    for (const incident of incidents) {
        try {
            await pool.query(
                `INSERT INTO incidents 
                (type, location_lat, location_lng, description, status, video_path, video_id, confidence, timestamp_in_video, reported_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
                    'AI_SYSTEM'
                ]
            );
            
            console.log(`💾 Stored incident: ${incident.type} at ${incident.timestamp}s`);
            
        } catch (dbError) {
            console.error('Error storing incident:', dbError.message);
        }
    }
}

module.exports = router;
