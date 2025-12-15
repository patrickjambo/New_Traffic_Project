const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL Connection Pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rnp_traffic',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.stack);
    } else {
        console.log('✅ PostgreSQL Connected');
        release();
    }
});

// ==================== DATABASE HELPER FUNCTIONS ====================

const query = (text, params) => pool.query(text, params);

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { firstName, lastName, email, password, role, badgeNumber, unit } = req.body;

        // Check if user exists
        const userCheck = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await client.query(
            `INSERT INTO users (first_name, last_name, email, password, role, badge_number, unit, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
       RETURNING id, first_name, last_name, email, role, badge_number, unit`,
            [firstName, lastName, email, hashedPassword, role || 'viewer', badgeNumber, unit]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password } = req.body;

        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await client.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role,
                badgeNumber: user.badge_number,
                unit: user.unit
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== DASHBOARD STATS ROUTES ====================

// Get Dashboard Statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        // Active incidents
        const activeResult = await client.query(
            `SELECT COUNT(*) as count FROM incidents WHERE status IN ('Active', 'Resolving')`
        );

        // Critical incidents
        const criticalResult = await client.query(
            `SELECT COUNT(*) as count FROM incidents WHERE status = 'Active' AND severity IN ('high', 'critical')`
        );

        // Resolved today
        const resolvedResult = await client.query(
            `SELECT COUNT(*) as count FROM incidents 
       WHERE status = 'Resolved' AND resolved_at >= CURRENT_DATE`
        );

        // Average response time
        const avgTimeResult = await client.query(
            `SELECT AVG(response_time) as avg_time FROM incidents 
       WHERE response_time IS NOT NULL 
       ORDER BY created_at DESC LIMIT 50`
        );

        const avgResponseTime = parseFloat(avgTimeResult.rows[0].avg_time) || 0;
        const systemHealth = 99; // Can be calculated based on system metrics

        res.json({
            activeIncidents: {
                total: parseInt(activeResult.rows[0].count),
                critical: parseInt(criticalResult.rows[0].count)
            },
            avgResponseTime: Math.round(avgResponseTime * 10) / 10,
            resolvedToday: parseInt(resolvedResult.rows[0].count),
            systemHealth
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== INCIDENT ROUTES ====================

// Get all incidents
app.get('/api/incidents', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { status, severity, region, limit = 50 } = req.query;

        let queryText = `
      SELECT i.*, 
             u1.first_name as reporter_first_name, 
             u1.last_name as reporter_last_name,
             u1.badge_number as reporter_badge
      FROM incidents i
      LEFT JOIN users u1 ON i.reported_by = u1.id
      WHERE 1=1
    `;

        const params = [];
        let paramCount = 1;

        if (status) {
            queryText += ` AND i.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (severity) {
            queryText += ` AND i.severity = $${paramCount}`;
            params.push(severity);
            paramCount++;
        }

        if (region) {
            queryText += ` AND i.region = $${paramCount}`;
            params.push(region);
            paramCount++;
        }

        queryText += ` ORDER BY i.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await client.query(queryText, params);

        // Format response
        const incidents = result.rows.map(row => ({
            id: row.id,
            type: row.type,
            location: {
                address: row.address,
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude),
                region: row.region
            },
            severity: row.severity,
            status: row.status,
            description: row.description,
            reportedBy: row.reported_by ? {
                firstName: row.reporter_first_name,
                lastName: row.reporter_last_name,
                badgeNumber: row.reporter_badge
            } : null,
            responseTime: row.response_time,
            resolvedAt: row.resolved_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json(incidents);
    } catch (error) {
        console.error('Get incidents error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Create new incident
app.post('/api/incidents', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { type, location, severity, status, description } = req.body;

        const result = await client.query(
            `INSERT INTO incidents 
       (type, address, latitude, longitude, region, severity, status, description, reported_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
            [
                type,
                location.address,
                location.latitude,
                location.longitude,
                location.region,
                severity || 'medium',
                status || 'Active',
                description,
                req.user.id
            ]
        );

        const incident = result.rows[0];

        // Emit socket event
        io.emit('new_incident', incident);

        // Create notification
        await client.query(
            `INSERT INTO notifications (title, message, type, severity, created_at)
       VALUES ($1, $2, 'incident', $3, NOW())`,
            [
                'New Incident Reported',
                `${type} at ${location.address}`,
                severity === 'critical' || severity === 'high' ? 'critical' : 'warning'
            ]
        );

        res.status(201).json(incident);
    } catch (error) {
        console.error('Create incident error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update incident
app.put('/api/incidents/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (key === 'location') {
                if (updates.location.address) {
                    fields.push(`address = $${paramCount}`);
                    values.push(updates.location.address);
                    paramCount++;
                }
                if (updates.location.latitude) {
                    fields.push(`latitude = $${paramCount}`);
                    values.push(updates.location.latitude);
                    paramCount++;
                }
                if (updates.location.longitude) {
                    fields.push(`longitude = $${paramCount}`);
                    values.push(updates.location.longitude);
                    paramCount++;
                }
                if (updates.location.region) {
                    fields.push(`region = $${paramCount}`);
                    values.push(updates.location.region);
                    paramCount++;
                }
            } else {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        });

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await client.query(
            `UPDATE incidents SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        io.emit('incident_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update incident error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete incident
app.delete('/api/incidents/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const result = await client.query(
            'DELETE FROM incidents WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        io.emit('incident_deleted', { id });
        res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
        console.error('Delete incident error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== DEPLOYMENT ROUTES ====================

// Get all deployments
app.get('/api/deployments', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT d.*, 
              json_agg(json_build_object(
                'id', u.id,
                'firstName', u.first_name,
                'lastName', u.last_name,
                'badgeNumber', u.badge_number
              )) FILTER (WHERE u.id IS NOT NULL) as officers
       FROM deployments d
       LEFT JOIN deployment_officers do ON d.id = do.deployment_id
       LEFT JOIN users u ON do.officer_id = u.id
       GROUP BY d.id
       ORDER BY d.start_time DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get deployments error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Create deployment
app.post('/api/deployments', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { unitName, location, officers, status, incidentId } = req.body;

        const result = await client.query(
            `INSERT INTO deployments 
       (unit_name, address, latitude, longitude, status, start_time, incident_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING *`,
            [
                unitName,
                location?.address,
                location?.latitude,
                location?.longitude,
                status || 'Standby',
                incidentId
            ]
        );

        const deployment = result.rows[0];

        // Add officers to deployment
        if (officers && officers.length > 0) {
            for (const officerId of officers) {
                await client.query(
                    'INSERT INTO deployment_officers (deployment_id, officer_id) VALUES ($1, $2)',
                    [deployment.id, officerId]
                );
            }
        }

        await client.query('COMMIT');

        io.emit('new_deployment', deployment);
        res.status(201).json(deployment);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create deployment error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== REGIONAL DATA ROUTES ====================

// Get regional overview
app.get('/api/regions/overview', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const regions = ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'];

        const regionData = await Promise.all(
            regions.map(async (region) => {
                // Count incidents
                const incidentResult = await client.query(
                    `SELECT COUNT(*) as count FROM incidents 
           WHERE region = $1 AND status IN ('Active', 'Resolving')`,
                    [region]
                );

                // Count deployments (approximate officers)
                const deploymentResult = await client.query(
                    `SELECT COUNT(*) as count FROM deployments 
           WHERE address ILIKE $1 AND status = 'Active'`,
                    [`%${region}%`]
                );

                // Get latest traffic data
                const trafficResult = await client.query(
                    `SELECT congestion_level FROM traffic_data 
           WHERE region = $1 
           ORDER BY timestamp DESC LIMIT 1`,
                    [region]
                );

                return {
                    name: region,
                    value: trafficResult.rows[0]?.congestion_level || Math.floor(Math.random() * 100),
                    incidents: parseInt(incidentResult.rows[0].count),
                    officers: parseInt(deploymentResult.rows[0].count) * 6
                };
            })
        );

        res.json(regionData);
    } catch (error) {
        console.error('Regional overview error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== TRAFFIC DATA ROUTES ====================

// Update traffic data
app.post('/api/traffic/update', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { region, congestionLevel, vehicleCount, averageSpeed } = req.body;

        const result = await client.query(
            `INSERT INTO traffic_data (region, congestion_level, vehicle_count, average_speed, timestamp)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
            [region, congestionLevel, vehicleCount, averageSpeed]
        );

        io.emit('traffic_update', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Traffic update error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get traffic heatmap data
app.get('/api/traffic/heatmap', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { startDate, endDate } = req.query;

        let queryText = 'SELECT * FROM traffic_data WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (startDate && endDate) {
            queryText += ` AND timestamp BETWEEN $${paramCount} AND $${paramCount + 1}`;
            params.push(startDate, endDate);
            paramCount += 2;
        }

        queryText += ' ORDER BY timestamp DESC LIMIT 100';

        const result = await client.query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Traffic heatmap error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== NOTIFICATION ROUTES ====================

// Get notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { limit = 20, unreadOnly = false } = req.query;

        let queryText = 'SELECT * FROM notifications WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (unreadOnly === 'true') {
            queryText += ` AND is_read = false`;
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await client.query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ==================== WEBSOCKET EVENTS ====================

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });

    socket.on('officer_location', (data) => {
        socket.broadcast.emit('officer_location_update', data);
    });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 RNP Traffic Management API running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
});
