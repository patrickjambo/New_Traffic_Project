const db = require('../config/database');
const { validationResult } = require('express-validator');
const smsService = require('../services/sms_service');

/**
 * @desc    Create new emergency request
 * @route   POST /api/emergency
 * @access  Public (with optional auth)
 */
const createEmergency = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('❌ Emergency validation failed:', JSON.stringify(errors.array(), null, 2));
            console.error('📥 Request body:', JSON.stringify(req.body, null, 2));
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const {
            emergencyType,
            severity,
            locationName,
            locationDescription,
            latitude,
            longitude,
            description,
            casualtiesCount,
            vehiclesInvolved,
            servicesNeeded,
            contactName,
            contactPhone,
            images,
        } = req.body;

        const userId = req.user ? req.user.id : null;

        // Insert emergency into database
        const result = await db.query(
            `INSERT INTO emergencies (
                user_id, emergency_type, severity, location_name, location_description,
                latitude, longitude, description, casualties_count, vehicles_involved,
                services_needed, contact_name, contact_phone, images, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                userId,
                emergencyType,
                severity,
                locationName,
                locationDescription || '',
                latitude,
                longitude,
                description,
                casualtiesCount || 0,
                vehiclesInvolved || 0,
                JSON.stringify(servicesNeeded || []),
                contactName || '',
                contactPhone,
                JSON.stringify(images || []),
                'pending'
            ]
        );

        const emergency = result.rows[0];

        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.emit('emergency:new', {
                id: emergency.id,
                type: emergency.emergency_type,
                severity: emergency.severity,
                location: {
                    name: emergency.location_name,
                    latitude: parseFloat(emergency.latitude),
                    longitude: parseFloat(emergency.longitude),
                },
                description: emergency.description,
                servicesNeeded: emergency.services_needed,
                createdAt: emergency.created_at,
            });

            // Emit to location-based room
            const room = `loc_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
            io.to(room).emit('emergency:nearby', emergency);
        }

        // Create notifications for police/admin users
        await createEmergencyNotifications(emergency);

        // 🚨 Send SMS alert to police dispatch (CRITICAL/HIGH emergencies only)
        if (emergency.severity === 'critical' || emergency.severity === 'high') {
            console.log(`📱 Sending SMS alert for ${emergency.severity} emergency #${emergency.id}`);
            const smsResult = await smsService.sendEmergencySMS(emergency);
            if (smsResult.success) {
                console.log(`✅ SMS alert sent successfully to ${smsResult.successful} dispatch center(s)`);
            } else {
                console.warn(`⚠️  SMS alert failed: ${smsResult.error}`);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Emergency reported successfully. Help is on the way!',
            data: emergency,
        });
    } catch (error) {
        console.error('Create emergency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create emergency',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all emergencies (with filters)
 * @route   GET /api/emergency
 * @access  Public/Private (different data based on role)
 */
const getEmergencies = async (req, res) => {
    try {
        const {
            status,
            severity,
            type,
            latitude,
            longitude,
            radius = 50, // km
            userId,
            limit = 50,
            offset = 0,
        } = req.query;

        let query = `
            SELECT 
                e.*,
                u.username as reporter_name,
                u.email as reporter_email,
                assigned.username as assigned_to_name,
                CASE 
                    WHEN $1::decimal IS NOT NULL AND $2::decimal IS NOT NULL 
                    THEN (ST_Distance(
                        e.location::geography,
                        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                    ) / 1000)
                    ELSE NULL
                END AS distance_km
            FROM emergencies e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN users assigned ON e.assigned_to = assigned.id
            WHERE 1=1
        `;

        const params = [latitude, longitude];
        let paramIndex = 3;

        // Add filters
        if (status) {
            query += ` AND e.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (severity) {
            query += ` AND e.severity = $${paramIndex}`;
            params.push(severity);
            paramIndex++;
        }

        if (type) {
            query += ` AND e.emergency_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (userId) {
            query += ` AND e.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        // Add distance filter if coordinates provided
        if (latitude && longitude) {
            query += ` AND ST_DWithin(
                e.location::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                $${paramIndex} * 1000
            )`;
            params.push(radius);
            paramIndex++;
        }

        // Order by severity and creation time
        query += ` ORDER BY 
            CASE e.severity 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END,
            e.created_at DESC
        `;

        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM emergencies WHERE 1=1'
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    } catch (error) {
        console.error('Get emergencies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emergencies',
            error: error.message,
        });
    }
};

/**
 * @desc    Get emergency by ID
 * @route   GET /api/emergency/:id
 * @access  Public
 */
const getEmergencyById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT 
                e.*,
                u.username as reporter_name,
                u.email as reporter_email,
                u.phone as reporter_phone,
                assigned.username as assigned_to_name,
                assigned.email as assigned_to_email
            FROM emergencies e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN users assigned ON e.assigned_to = assigned.id
            WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found',
            });
        }

        // Get status history
        const historyResult = await db.query(
            `SELECT 
                sh.*,
                u.username as changed_by_name
            FROM emergency_status_history sh
            LEFT JOIN users u ON sh.changed_by = u.id
            WHERE sh.emergency_id = $1
            ORDER BY sh.created_at DESC`,
            [id]
        );

        const emergency = result.rows[0];
        emergency.statusHistory = historyResult.rows;

        res.json({
            success: true,
            data: emergency,
        });
    } catch (error) {
        console.error('Get emergency by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emergency',
            error: error.message,
        });
    }
};

/**
 * @desc    Update emergency status
 * @route   PUT /api/emergency/:id/status
 * @access  Private (Police/Admin)
 */
const updateEmergencyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, assignedTo } = req.body;
        const userId = req.user.id;

        // Get current emergency
        const currentResult = await db.query(
            'SELECT * FROM emergencies WHERE id = $1',
            [id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found',
            });
        }

        const currentEmergency = currentResult.rows[0];

        // Update emergency
        const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
        const params = [status];
        let paramIndex = 2;

        if (assignedTo) {
            updateFields.push(`assigned_to = $${paramIndex}`);
            params.push(assignedTo);
            paramIndex++;
        }

        if (notes) {
            updateFields.push(`responder_notes = $${paramIndex}`);
            params.push(notes);
            paramIndex++;
        }

        params.push(id);

        const result = await db.query(
            `UPDATE emergencies 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`,
            params
        );

        const updatedEmergency = result.rows[0];

        // Record status change in history
        await db.query(
            `INSERT INTO emergency_status_history 
            (emergency_id, old_status, new_status, changed_by, notes)
            VALUES ($1, $2, $3, $4, $5)`,
            [id, currentEmergency.status, status, userId, notes || '']
        );

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('emergency:updated', {
                id: updatedEmergency.id,
                status: updatedEmergency.status,
                assignedTo: updatedEmergency.assigned_to,
                updatedAt: updatedEmergency.updated_at,
            });
        }

        // Notify the reporter
        if (currentEmergency.user_id) {
            await db.query(
                `INSERT INTO emergency_notifications 
                (emergency_id, user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    id,
                    currentEmergency.user_id,
                    'status_update',
                    'Emergency Status Updated',
                    `Your emergency request status has been updated to: ${status}`,
                ]
            );
        }

        // 📱 Send SMS update for critical status changes
        if (status === 'active' || status === 'dispatched' || status === 'resolved') {
            console.log(`📱 Sending SMS status update for emergency #${id}: ${status}`);
            const smsResult = await smsService.sendStatusUpdateSMS(updatedEmergency, status, notes);
            if (smsResult.success) {
                console.log(`✅ Status update SMS sent to ${smsResult.successful} dispatch center(s)`);
            }
        }

        res.json({
            success: true,
            message: 'Emergency status updated successfully',
            data: updatedEmergency,
        });
    } catch (error) {
        console.error('Update emergency status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update emergency status',
            error: error.message,
        });
    }
};

/**
 * @desc    Get user's emergency requests
 * @route   GET /api/emergency/my-emergencies
 * @access  Private
 */
const getUserEmergencies = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT 
                e.*,
                assigned.username as assigned_to_name
            FROM emergencies e
            LEFT JOIN users assigned ON e.assigned_to = assigned.id
            WHERE e.user_id = $1
            ORDER BY e.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get user emergencies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user emergencies',
            error: error.message,
        });
    }
};

/**
 * Helper function to create notifications for relevant users
 */
const createEmergencyNotifications = async (emergency) => {
    try {
        // Get all police and admin users
        const usersResult = await db.query(
            `SELECT id FROM users WHERE role IN ('police', 'admin')`
        );

        const notifications = usersResult.rows.map(user => [
            emergency.id,
            user.id,
            'new_emergency',
            `New ${emergency.severity} Emergency`,
            `${emergency.emergency_type} reported at ${emergency.location_name}`,
        ]);

        if (notifications.length > 0) {
            const query = `
                INSERT INTO emergency_notifications 
                (emergency_id, user_id, notification_type, title, message)
                VALUES ${notifications.map((_, i) => 
                    `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
                ).join(', ')}
            `;
            
            await db.query(query, notifications.flat());
        }
    } catch (error) {
        console.error('Create emergency notifications error:', error);
    }
};

/**
 * @desc    Get emergency statistics
 * @route   GET /api/emergency/stats
 * @access  Private (Police/Admin)
 */
const getEmergencyStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'dispatched') as dispatched,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                COUNT(*) FILTER (WHERE severity = 'high') as high,
                AVG(EXTRACT(EPOCH FROM response_time)) as avg_response_time_seconds,
                AVG(EXTRACT(EPOCH FROM resolution_time)) as avg_resolution_time_seconds
            FROM emergencies
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `;

        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                total: parseInt(stats.total),
                pending: parseInt(stats.pending),
                active: parseInt(stats.active),
                dispatched: parseInt(stats.dispatched),
                resolved: parseInt(stats.resolved),
                critical: parseInt(stats.critical),
                high: parseInt(stats.high),
                avgResponseTime: stats.avg_response_time_seconds ? 
                    Math.round(stats.avg_response_time_seconds / 60) : 0, // in minutes
                avgResolutionTime: stats.avg_resolution_time_seconds ? 
                    Math.round(stats.avg_resolution_time_seconds / 60) : 0, // in minutes
            },
        });
    } catch (error) {
        console.error('Get emergency stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emergency statistics',
            error: error.message,
        });
    }
};

module.exports = {
    createEmergency,
    getEmergencies,
    getEmergencyById,
    updateEmergencyStatus,
    getUserEmergencies,
    getEmergencyStats,
};
