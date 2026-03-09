const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Services
const socketManager = require('./services/socketManager');
const { authenticate } = require('./middleware/auth');
const fcmService = require('./services/fcmService');

// Initialize FCM Service
fcmService.initialize();

// Centralized database access
const db = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const emergencyRoutes = require('./routes/emergency');
const autoAnalysisRoutes = require('./routes/autoAnalysis');
const detectionRoutes = require('./routes/detection');
const deploymentRoutes = require('./routes/deployments');

// Initialize app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for development
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Initialize Socket Manager with io instance
socketManager.initialize(io);

// Make io and socketManager accessible in routes
app.set('io', io);
app.set('socketManager', socketManager);
app.set('fcmService', fcmService);

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers
app.use(compression()); // Response compression

// CORS configuration - Allow all origins for development
app.use(cors({
    origin: '*', // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '100mb' })); // Increased limit for video uploads
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // Increased limit
app.use(morgan('dev')); // Logging

// Rate limiting - DISABLED per user request
// const limiter = rateLimit({
//     windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute window
//     max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requests per minute
//     message: 'Too many requests from this IP, please try again later.',
//     skip: (req) => {
//         // Skip rate limiting for health checks and websocket
//         return req.path === '/api/health' || req.path.includes('socket');
//     }
// });
// app.use('/api/', limiter);

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/auto-analysis', autoAnalysisRoutes);
app.use('/api', detectionRoutes);  // Detection endpoint: /api/detect
app.use('/api/police', require('./routes/police'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/deployments', deploymentRoutes);
app.use('/api/geofencing', require('./routes/geofencing'));  // Geo-fencing & alerts

// Add convenience routes for mobile app compatibility
// /api/alerts route
app.get('/api/alerts', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM incident_alerts 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /api/users/profile - alias for /api/auth/profile
app.get('/api/users/profile', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /api/districts route
app.get('/api/districts', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM districts WHERE is_active = true ORDER BY name');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /api/stats route
app.get('/api/stats', async (req, res) => {
    try {
        const [incidents, alerts, officers] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM incidents'),
            db.query('SELECT COUNT(*) as count FROM incident_alerts'),
            db.query("SELECT COUNT(*) as count FROM users WHERE role = 'police'")
        ]);
        
        res.json({
            success: true,
            data: {
                totalIncidents: parseInt(incidents.rows[0].count),
                totalAlerts: parseInt(alerts.rows[0].count),
                totalOfficers: parseInt(officers.rows[0].count)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /api/health route (alias for /health)
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TrafficGuard API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Detailed tracking health endpoint — shows WebSocket + DB sync state
app.get('/api/health/tracking', async (req, res) => {
    try {
        const health = await socketManager.getTrackingHealth();
        res.json({ success: true, ...health });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook endpoint for AI service analysis callbacks
app.post('/webhook/analysis-complete', async (req, res) => {
    try {
        const { incident_id, result, confidence, vehicle_count, incident_detected, detected_type } = req.body;

        console.log(`🤖 AI Analysis webhook received for incident ${incident_id}`);

        // Emit analysis complete event via socket manager
        socketManager.emitAnalysisComplete({
            incident_id,
            result,
            confidence,
            vehicle_count,
            incident_detected,
            detected_type,
        });

        res.json({ success: true, message: 'Analysis notification sent' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'TrafficGuard API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        websocket: socketManager.getStats(),
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'TrafficGuard AI API',
        version: '1.0.0',
        description: 'Smart Traffic Management Platform',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            incidents: '/api/incidents',
        },
    });
});

// Serve frontend homepage for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large',
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file upload',
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// WebSocket connection handling is now managed by socketManager
// See: ./services/socketManager.js for all socket event handling

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`
🚦 TrafficGuard AI Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📡 WebSocket enabled
🗄️  Database: ${process.env.DB_NAME || 'trafficguard'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

    // ═══════════════════════════════════════════════════════════
    // STARTUP SELF-TEST — catches broken code immediately
    // DO NOT REMOVE — this prevents silent failures in AI
    // emergency reports, officer alerts, and timezone handling
    // ═══════════════════════════════════════════════════════════
    try {
        const { runStartupSelfTest } = require('./utils/startupSelfTest');
        await runStartupSelfTest();
    } catch (selfTestError) {
        console.error('❌ STARTUP SELF-TEST COULD NOT RUN:', selfTestError.message);
        console.error('⚠️  This means the self-test file is missing or broken!');
        console.error('⚠️  File: backend/src/utils/startupSelfTest.js');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
