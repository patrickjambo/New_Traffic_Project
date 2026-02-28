const db = require('../config/database');
const { validationResult } = require('express-validator');
const smsService = require('../services/sms_service');
const socketManager = require('../services/socketManager');
const fcmService = require('../services/fcmService');
const geoFencingService = require('../services/geoFencingService');

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
            reportedAt,
        } = req.body;

        // Map frontend types to backend types
        const typeMapping = {
            'accident': 'accident',
            'fire': 'fire',
            'medical': 'medical',
            'crime': 'crime',
            'disaster': 'natural_disaster',
            'riot': 'other',
            'hazmat': 'hazard',
            'other': 'other'
        };

        const finalEmergencyType = typeMapping[emergencyType] || (['accident', 'fire', 'medical', 'crime', 'natural_disaster', 'hazard', 'other'].includes(emergencyType) ? emergencyType : 'other');

        const userId = req.user ? req.user.id : null;
        
        // Use frontend timestamp or current server time
        const createdAt = reportedAt ? new Date(reportedAt) : new Date();

        // Insert emergency into database
        const result = await db.query(
            `INSERT INTO emergencies (
                user_id, type, emergency_type, severity, location_name, location_description,
                latitude, longitude, description, casualties_count, vehicles_involved,
                services_needed, contact_name, contact_phone, images, status, source, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
            [
                userId,
                finalEmergencyType,
                finalEmergencyType,
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
                'pending',
                'manual',
                createdAt
            ]
        );

        const emergency = result.rows[0];

        // Emit real-time notification via Socket Manager
        socketManager.emitEmergencyNew(emergency);

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

        // 🔔 Send FCM Push Notifications to all police officers
        try {
            // Get all police officers with FCM tokens
            const officersResult = await db.query(`
                SELECT u.id, u.full_name, op.fcm_token, op.emergency_alert_enabled
                FROM users u
                LEFT JOIN officer_profiles op ON u.id = op.user_id
                WHERE u.role IN ('police', 'admin')
                AND op.fcm_token IS NOT NULL
                AND op.emergency_alert_enabled = true
            `);
            
            const officers = officersResult.rows;
            
            if (officers.length > 0) {
                console.log(`📱 Sending FCM push to ${officers.length} officers for emergency #${emergency.id}`);
                
                const fcmResult = await fcmService.sendEmergencyAlarm(officers, {
                    alertId: emergency.id,
                    emergencyId: emergency.id,
                    title: `🚨 ${severity.toUpperCase()} EMERGENCY: ${finalEmergencyType}`,
                    message: `${description}\n📍 ${locationName}`,
                    type: finalEmergencyType,
                    location: {
                        latitude: latitude,
                        longitude: longitude,
                        address: locationName
                    }
                });
                
                if (fcmResult.success) {
                    console.log(`✅ FCM push sent: ${fcmResult.successCount} success, ${fcmResult.failureCount} failed`);
                } else {
                    console.warn(`⚠️ FCM push failed: ${fcmResult.error || 'Unknown error'}`);
                }
            } else {
                console.log('ℹ️ No officers with FCM tokens found for push notification');
            }
        } catch (fcmError) {
            console.error('❌ FCM push error:', fcmError.message);
        }

        // 🎯 AUTOMATIC GEO-FENCED ALERT TO NEARBY OFFICERS
        try {
            // ALL emergencies trigger alerts - every report matters!
            // Critical/High get emergency alarm (red screen, vibration)
            // Medium/Low get standard alert notification
            const isEmergencyAlert = true; // All reports trigger alerts to nearby officers

            // Create targeted geo-fenced alert to nearby officers
            const alertResult = await geoFencingService.createTargetedAlert({
                id: emergency.id,
                emergency_id: emergency.id,
                type: finalEmergencyType,
                severity: severity,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                address: locationName,
                location_name: locationName,
                description: description,
                media_urls: images || [],
                reported_by: userId
            }, isEmergencyAlert, {
                source: 'manual',
                confidence: 1.0,
                detectedObject: finalEmergencyType,
                detectionMethod: 'Manual Report',
                casualties: casualtiesCount || 0,
                vehiclesInvolved: vehiclesInvolved || 0
            });

            console.log(`🎯 GEO-FENCED ALERT sent to ${alertResult.targetedOfficers} officers in ${alertResult.district || 'area'}`);
        } catch (geoError) {
            console.error('⚠️ Geo-fencing alert failed (non-critical):', geoError?.message || geoError);
            // Continue even if geo-fencing fails - the emergency was still created
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
                u.full_name as reporter_name,
                u.email as reporter_email,
                assigned.full_name as assigned_to_name,
                e.source,
                CASE 
                    WHEN $1::decimal IS NOT NULL AND $2::decimal IS NOT NULL AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
                    THEN (6371 * acos(cos(radians($1::decimal)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians($2::decimal)) + sin(radians($1::decimal)) * sin(radians(e.latitude))))
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
            query += ` AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
                AND (6371 * acos(cos(radians($1::decimal)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians($2::decimal)) + sin(radians($1::decimal)) * sin(radians(e.latitude)))) < $${paramIndex}`;
            params.push(radius);
            paramIndex++;
        }

        // Order by creation time (newest first) - all emergencies are important
        query += ` ORDER BY e.created_at DESC`;

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
                u.full_name as reporter_name,
                u.email as reporter_email,
                u.phone as reporter_phone,
                assigned.full_name as assigned_to_name,
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
                u.full_name as changed_by_name
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

        // Get updated emergency with officer name
        const fullResult = await db.query(
            `SELECT e.*, u.full_name as assigned_to_name
             FROM emergencies e
             LEFT JOIN users u ON e.assigned_to = u.id
             WHERE e.id = $1`,
            [id]
        );

        const updatedEmergency = fullResult.rows[0] || result.rows[0];

        // Record status change in history
        await db.query(
            `INSERT INTO emergency_status_history 
            (emergency_id, old_status, new_status, changed_by, notes)
            VALUES ($1, $2, $3, $4, $5)`,
            [id, currentEmergency.status, status, userId, notes || '']
        );

        // Emit real-time update via Socket Manager
        socketManager.emitEmergencyUpdate(updatedEmergency);

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
                assigned.full_name as assigned_to_name
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
            `SELECT id FROM users WHERE role IN('police', 'admin')`
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
            ).join(', ')
                }
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
            COUNT(*) FILTER(WHERE status = 'pending') as pending,
            COUNT(*) FILTER(WHERE status = 'active') as active,
            COUNT(*) FILTER(WHERE status = 'dispatched') as dispatched,
            COUNT(*) FILTER(WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER(WHERE severity = 'critical') as critical,
            COUNT(*) FILTER(WHERE severity = 'high') as high,
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

const generateEmergencyReport = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT 
                e.*,
                u.full_name as reporter_name,
                u.email as reporter_email,
                u.phone as reporter_phone,
                assigned.full_name as assigned_to_name
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

        const emergency = result.rows[0];

        // Generate a formatted text report
        const report = `
==================================================
RNP TRAFFIC MANAGEMENT - EMERGENCY REPORT
==================================================
Report ID: ${emergency.id}
Generated: ${new Date().toLocaleString()}
--------------------------------------------------
TYPE: ${emergency.emergency_type.toUpperCase()}
SEVERITY: ${emergency.severity.toUpperCase()}
STATUS: ${emergency.status.toUpperCase()}
--------------------------------------------------
LOCATION: ${emergency.location_name}
COORDINATES: ${emergency.latitude}, ${emergency.longitude}
--------------------------------------------------
DESCRIPTION:
${emergency.description}
--------------------------------------------------
REPORTER DETAILS:
Name: ${emergency.contact_name || emergency.reporter_name || 'Anonymous'}
Phone: ${emergency.contact_phone}
Email: ${emergency.reporter_email || 'N/A'}
--------------------------------------------------
INCIDENT DATA:
Casualties: ${emergency.casualties_count}
Vehicles Involved: ${emergency.vehicles_involved}
Services Needed: ${Array.isArray(emergency.services_needed) ? emergency.services_needed.join(', ') : emergency.services_needed}
--------------------------------------------------
RESPONSE DATA:
Assigned To: ${emergency.assigned_to_name || 'Unassigned'}
Responder Notes: ${emergency.responder_notes || 'No notes yet'}
Created At: ${new Date(emergency.created_at).toLocaleString()}
Updated At: ${new Date(emergency.updated_at).toLocaleString()}
==================================================
CONFIDENTIAL - OFFICIAL USE ONLY
==================================================
`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=emergency_report_${id}.txt`);
        res.send(report);
    } catch (error) {
        console.error('Generate emergency report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message,
        });
    }
};

/**
 * @desc    Officer responds to emergency (accept/decline/forward)
 * @route   POST /api/emergency/:id/respond
 * @access  Private (Police)
 */
const respondToEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes, forwardToOfficerId } = req.body;
        const officerId = req.user.id;
        const officerName = req.user.full_name;

        // Validate action
        if (!['accept', 'decline', 'forward'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be: accept, decline, or forward',
            });
        }

        // Get emergency details
        const emergencyResult = await db.query(
            `SELECT e.*, u.full_name as reporter_name, u.phone as reporter_phone,
                    assigned.full_name as current_responder_name
             FROM emergencies e
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN users assigned ON e.assigned_to = assigned.id
             WHERE e.id = $1`,
            [id]
        );

        if (emergencyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found',
            });
        }

        const emergency = emergencyResult.rows[0];

        // Check if already assigned to another officer
        if (emergency.assigned_to && emergency.assigned_to !== officerId && action === 'accept') {
            return res.status(400).json({
                success: false,
                message: `Emergency already accepted by ${emergency.current_responder_name}`,
                acceptedBy: {
                    officerId: emergency.assigned_to,
                    officerName: emergency.current_responder_name
                }
            });
        }

        let responseMessage = '';
        let newStatus = emergency.status;

        if (action === 'accept') {
            // Officer accepts the emergency
            await db.query(
                `UPDATE emergencies 
                 SET assigned_to = $1, status = 'dispatched', 
                     response_time = NOW(), updated_at = NOW()
                 WHERE id = $2`,
                [officerId, id]
            );
            newStatus = 'dispatched';
            responseMessage = `Officer ${officerName} is responding to the emergency`;

            // Record in history
            await db.query(
                `INSERT INTO emergency_status_history 
                 (emergency_id, old_status, new_status, changed_by, notes)
                 VALUES ($1, $2, 'dispatched', $3, $4)`,
                [id, emergency.status, officerId, `Accepted by ${officerName}`]
            );

            // 🔔 Broadcast to ALL nearby officers that this emergency has been accepted
            // This will stop alarms on their devices
            socketManager.io.to('role:police').emit('emergency:accepted', {
                emergencyId: parseInt(id),
                acceptedBy: {
                    officerId: officerId,
                    officerName: officerName
                },
                timestamp: new Date().toISOString(),
                message: `${officerName} is responding to this emergency`
            });

            // 🔔 Also broadcast to admins so they see real-time updates
            socketManager.io.to('role:admin').emit('emergency:accepted', {
                emergencyId: parseInt(id),
                acceptedBy: {
                    officerId: officerId,
                    officerName: officerName
                },
                timestamp: new Date().toISOString(),
                message: `${officerName} is responding to this emergency`
            });

            // 🔔 Also emit emergency:update with full data for dashboard refresh
            socketManager.io.emit('emergency:update', {
                id: parseInt(id),
                emergencyId: parseInt(id),
                status: 'dispatched',
                assigned_to: officerId,
                assigned_to_name: officerName,
                responder_name: officerName,
                response_time: new Date().toISOString(),
            });

            console.log(`✅ Emergency #${id} accepted by officer ${officerName} (ID: ${officerId})`);

        } else if (action === 'decline') {
            // Officer declines
            responseMessage = 'Emergency declined. Other officers will be notified.';

            // Record decline
            await db.query(
                `INSERT INTO emergency_response_log 
                 (emergency_id, officer_id, action, notes, created_at)
                 VALUES ($1, $2, 'declined', $3, NOW())
                 ON CONFLICT DO NOTHING`,
                [id, officerId, notes || 'Declined without reason']
            );

            console.log(`⚠️ Emergency #${id} declined by officer ${officerName}`);

        } else if (action === 'forward') {
            // Forward to another officer
            if (!forwardToOfficerId) {
                return res.status(400).json({
                    success: false,
                    message: 'forwardToOfficerId is required for forwarding',
                });
            }

            // Get target officer info
            const targetOfficer = await db.query(
                `SELECT u.id, u.full_name, op.fcm_token FROM users u 
                 LEFT JOIN officer_profiles op ON u.id = op.user_id
                 WHERE u.id = $1 AND u.role = 'police'`,
                [forwardToOfficerId]
            );

            if (targetOfficer.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Target officer not found',
                });
            }

            const target = targetOfficer.rows[0];

            // Send notification to target officer
            socketManager.io.to(`user:${forwardToOfficerId}`).emit('emergency:forwarded', {
                emergency: emergency,
                forwardedBy: {
                    officerId: officerId,
                    officerName: officerName
                },
                timestamp: new Date().toISOString()
            });

            responseMessage = `Emergency forwarded to ${target.full_name}`;
            console.log(`➡️ Emergency #${id} forwarded from ${officerName} to ${target.full_name}`);
        }

        // Get updated emergency with full details
        const updatedResult = await db.query(
            `SELECT e.*, 
                    u.full_name as reporter_name, 
                    u.phone as reporter_phone,
                    assigned.full_name as assigned_to_name,
                    assigned.phone as responder_phone
             FROM emergencies e
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN users assigned ON e.assigned_to = assigned.id
             WHERE e.id = $1`,
            [id]
        );

        const updatedEmergency = updatedResult.rows[0];

        // Emit update to admin dashboard
        socketManager.emitEmergencyUpdate(updatedEmergency);

        res.json({
            success: true,
            message: responseMessage,
            action: action,
            data: {
                emergency: updatedEmergency,
                responder: action === 'accept' ? {
                    officerId: officerId,
                    officerName: officerName
                } : null
            }
        });

    } catch (error) {
        console.error('Respond to emergency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to respond to emergency',
            error: error.message,
        });
    }
};

/**
 * @desc    Get nearby available officers for forwarding
 * @route   GET /api/emergency/:id/nearby-officers
 * @access  Private (Police)
 */
const getNearbyOfficers = async (req, res) => {
    try {
        const { id } = req.params;
        const currentOfficerId = req.user.id;

        // Get emergency location
        const emergencyResult = await db.query(
            'SELECT latitude, longitude FROM emergencies WHERE id = $1',
            [id]
        );

        if (emergencyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Emergency not found',
            });
        }

        const emergency = emergencyResult.rows[0];

        // Find nearby officers (within 10km, excluding current officer)
        const officersResult = await db.query(
            `SELECT u.id, u.full_name, op.badge_number, op.current_latitude, op.current_longitude,
                    op.is_on_duty,
                    (6371 * acos(cos(radians($1)) * cos(radians(op.current_latitude)) * 
                     cos(radians(op.current_longitude) - radians($2)) + 
                     sin(radians($1)) * sin(radians(op.current_latitude)))) as distance_km
             FROM users u
             JOIN officer_profiles op ON u.id = op.user_id
             WHERE u.role = 'police'
               AND u.id != $3
               AND op.is_on_duty = true
               AND op.current_latitude IS NOT NULL
               AND op.current_longitude IS NOT NULL
             HAVING (6371 * acos(cos(radians($1)) * cos(radians(op.current_latitude)) * 
                     cos(radians(op.current_longitude) - radians($2)) + 
                     sin(radians($1)) * sin(radians(op.current_latitude)))) < 10
             ORDER BY distance_km ASC
             LIMIT 10`,
            [emergency.latitude, emergency.longitude, currentOfficerId]
        );

        res.json({
            success: true,
            data: officersResult.rows.map(o => ({
                id: o.id,
                fullName: o.full_name,
                badgeNumber: o.badge_number,
                distanceKm: parseFloat(o.distance_km).toFixed(2),
                isOnDuty: o.is_on_duty
            }))
        });

    } catch (error) {
        console.error('Get nearby officers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get nearby officers',
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
    generateEmergencyReport,
    respondToEmergency,
    getNearbyOfficers,
};
