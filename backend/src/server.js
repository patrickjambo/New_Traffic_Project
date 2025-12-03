const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const emergencyRoutes = require('./routes/emergency');
const autoAnalysisRoutes = require('./routes/autoAnalysis');

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

// Make io accessible in routes
app.set('io', io);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Serve frontend static files
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/auto-analysis', autoAnalysisRoutes);
app.use('/api/police', require('./routes/police'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'TrafficGuard API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
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

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });

    // Join location-based room
    socket.on('join_location', (data) => {
        const { latitude, longitude } = data;
        const room = `loc_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
        socket.join(room);
        console.log(`📍 Client joined location room: ${room}`);
    });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
🚦 TrafficGuard AI Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📡 WebSocket enabled
🗄️  Database: ${process.env.DB_NAME || 'trafficguard'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
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
