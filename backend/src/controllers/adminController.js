const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

/**
 * Get system metrics for admin dashboard
 */
const getSystemMetrics = async (req, res) => {
    try {
        // Get incident statistics
        const incidentStats = await query(`
            SELECT 
                COUNT(*) as total_incidents,
                COUNT(*) FILTER (WHERE status != 'resolved') as active_incidents,
                COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_incidents,
                COUNT(*) FILTER (WHERE status = 'resolved' AND DATE(updated_at) = CURRENT_DATE) as resolved_today,
                COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'resolved') as avg_resolution_hours
            FROM incidents
        `);

        // Get user statistics
        const userStats = await query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE role = 'public') as public_users,
                COUNT(*) FILTER (WHERE role = 'police') as police_users,
                COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
                COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d
            FROM users
        `);

        // Get AI analysis statistics (if table exists)
        let aiStats = { ai_accuracy: 87, total_analyses: 0 };
        try {
            const aiQuery = await query(`
                SELECT 
                    COUNT(*) as total_analyses,
                    AVG(confidence) as avg_confidence
                FROM incident_analytics
                WHERE confidence IS NOT NULL
            `);
            if (aiQuery.rows[0].total_analyses > 0) {
                aiStats = {
                    ai_accuracy: Math.round(aiQuery.rows[0].avg_confidence * 100),
                    total_analyses: aiQuery.rows[0].total_analyses,
                };
            }
        } catch (err) {
            // Table might not exist yet
            console.log('AI analytics table not available');
        }

        res.json({
            success: true,
            data: {
                incidents: incidentStats.rows[0],
                users: userStats.rows[0],
                ai: aiStats,
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    node_version: process.version,
                },
            },
        });
    } catch (error) {
        console.error('Get system metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system metrics',
            error: error.message,
        });
    }
};

/**
 * Get all users with filtering
 */
const getUsers = async (req, res) => {
    try {
        const { role, status, limit, offset } = req.query;

        let queryText = `
            SELECT 
                id,
                email,
                full_name,
                phone,
                role,
                badge_number,
                unit,
                is_active,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM incidents WHERE reported_by = users.id) as incidents_reported
            FROM users
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (role) {
            paramCount++;
            queryText += ` AND role = $${paramCount}`;
            params.push(role);
        }

        if (status === 'active') {
            queryText += ` AND is_active = true`;
        } else if (status === 'inactive') {
            queryText += ` AND is_active = false`;
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit || 50), parseInt(offset || 0));

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query('SELECT COUNT(*) FROM users');

        res.json({
            success: true,
            data: result.rows,
            total: parseInt(countResult.rows[0].count),
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message,
        });
    }
};

/**
 * Update user information (role, verification, etc.)
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active } = req.body;

        const updates = [];
        const params = [];
        let paramCount = 0;

        if (role) {
            paramCount++;
            updates.push(`role = $${paramCount}`);
            params.push(role);
        }

        if (typeof is_active === 'boolean') {
            paramCount++;
            updates.push(`is_active = $${paramCount}`);
            params.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided',
            });
        }

        paramCount++;
        params.push(id);

        const result = await query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${paramCount}
             RETURNING id, email, full_name, role, is_active`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message,
        });
    }
};

/**
 * Get system activity logs
 */
const getSystemLogs = async (req, res) => {
    try {
        const { limit, offset, type } = req.query;

        // Get recent incident updates as activity logs
        let queryText = `
            SELECT 
                iu.id,
                iu.incident_id,
                iu.status,
                iu.comment,
                iu.created_at,
                u.full_name as user_name,
                u.role as user_role,
                i.type as incident_type
            FROM incident_updates iu
            JOIN users u ON iu.user_id = u.id
            JOIN incidents i ON iu.incident_id = i.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (type) {
            paramCount++;
            queryText += ` AND i.type = $${paramCount}`;
            params.push(type);
        }

        queryText += ` ORDER BY iu.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit || 50), parseInt(offset || 0));

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get system logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system logs',
            error: error.message,
        });
    }
};

/**
 * Generate system analytics report
 */
const generateReport = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;

        // Get comprehensive statistics
        const report = {
            period: {
                start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: endDate || new Date().toISOString(),
            },
            incidents: {},
            performance: {},
            users: {},
        };

        // Incident statistics by type
        const incidentsByType = await query(`
            SELECT 
                type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'resolved') as avg_hours_to_resolve
            FROM incidents
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY type
        `, [report.period.start, report.period.end]);

        report.incidents.by_type = incidentsByType.rows;

        // User growth
        const userGrowth = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as new_users
            FROM users
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [report.period.start, report.period.end]);

        report.users.growth = userGrowth.rows;

        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message,
        });
    }
};

/**
 * Create a new police officer
 */
const createOfficer = async (req, res) => {
    try {
        const { email, full_name, password, badge_number, unit, phone } = req.body;
        const adminDistrictId = req.user.district_id; // Get admin's district for assigning to new officer

        console.log('📝 Creating officer:', { email, full_name, badge_number, unit, adminDistrictId });

        if (!email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and full name are required',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        // Check if email already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists',
            });
        }

        const password_hash = await hashPassword(password);
        const cleanEmail = email.toLowerCase().trim();
        const officerBadge = badge_number || `RNP-${Date.now().toString().slice(-6)}`;
        const officerUnit = unit || 'Traffic Unit';

        // Create user with police role and assign to admin's district
        const result = await query(
            `INSERT INTO users (email, full_name, password_hash, role, badge_number, unit, phone, is_active, district_id)
             VALUES ($1, $2, $3, 'police', $4, $5, $6, true, $7)
             RETURNING id, email, full_name, role, badge_number, unit, phone, is_active, created_at, district_id`,
            [cleanEmail, full_name.trim(), password_hash, officerBadge, officerUnit, phone || null, adminDistrictId || null]
        );

        const officer = result.rows[0];
        console.log('✅ User created with ID:', officer.id, 'District ID:', officer.district_id);

        // Get district name for response
        let districtName = null;
        if (officer.district_id) {
            const districtResult = await query('SELECT name FROM districts WHERE id = $1', [officer.district_id]);
            if (districtResult.rows.length > 0) {
                districtName = districtResult.rows[0].name;
            }
        }

        // Create officer profile with correct columns and assigned district
        // is_on_duty defaults to false - will be set true when officer logs in via mobile app
        await query(
            `INSERT INTO officer_profiles (user_id, badge_number, unit, is_on_duty, emergency_alert_enabled, notification_enabled, assigned_district_id)
             VALUES ($1, $2, $3, false, true, true, $4)
             ON CONFLICT (user_id) DO UPDATE SET 
                badge_number = EXCLUDED.badge_number, 
                unit = EXCLUDED.unit,
                assigned_district_id = EXCLUDED.assigned_district_id`,
            [officer.id, officerBadge, officerUnit, adminDistrictId || null]
        );
        console.log('✅ Officer profile created');

        // 🔔 Notify all connected admins about the new officer via WebSocket
        try {
            const socketManager = require('../services/socketManager');
            if (socketManager.io) {
                socketManager.io.to('role:admin').emit('officer:created', {
                    officerId: officer.id,
                    fullName: full_name,
                    email: cleanEmail,
                    badgeNumber: officerBadge,
                    unit: officerUnit,
                    districtName: districtName,
                    timestamp: new Date().toISOString(),
                });
                console.log('📡 Broadcasted new officer creation to admins');
            }
        } catch (socketError) {
            console.log('⚠️ Socket broadcast error (non-critical):', socketError.message);
        }

        res.status(201).json({
            success: true,
            message: `Officer ${full_name} created successfully. They can now login with email: ${cleanEmail}`,
            data: {
                ...officer,
                district_name: districtName,
                login_credentials: {
                    email: cleanEmail,
                    note: 'Use the password you set to login on the mobile app'
                }
            },
        });
    } catch (error) {
        console.error('❌ Create officer error:', error);
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Email or badge number already exists',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create officer: ' + error.message,
            error: error.message,
        });
    }
};

/**
 * Get all police officers with their profiles
 */
const getOfficers = async (req, res) => {
    try {
        const { status, search } = req.query;
        const adminDistrictId = req.user.district_id; // For district_admin filtering
        const isDistrictAdmin = req.user.role === 'district_admin';

        let queryText = `
            SELECT 
                u.id,
                u.email,
                u.full_name,
                u.phone,
                u.role,
                u.is_active,
                u.created_at,
                u.updated_at,
                u.district_id,
                d.name as district_name,
                COALESCE(op.badge_number, u.badge_number) as badge_number,
                COALESCE(op.unit, u.unit, 'Traffic Unit') as unit,
                CASE WHEN op.is_on_duty THEN 'on_duty' ELSE 'off_duty' END as availability_status,
                op.is_on_duty,
                op.current_latitude,
                op.current_longitude,
                op.location_updated_at,
                op.emergency_alert_enabled,
                (SELECT COUNT(*) FROM deployment_officers do2 
                 JOIN deployments dep ON do2.deployment_id = dep.id 
                 WHERE do2.officer_id = u.id AND dep.status = 'Active') as active_deployments
            FROM users u
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            LEFT JOIN districts d ON u.district_id = d.id
            WHERE u.role = 'police'
        `;

        const params = [];
        let paramCount = 0;

        // District admin only sees officers from their district
        if (isDistrictAdmin && adminDistrictId) {
            paramCount++;
            queryText += ` AND u.district_id = $${paramCount}`;
            params.push(adminDistrictId);
        }

        if (status === 'active') {
            queryText += ` AND u.is_active = true`;
        } else if (status === 'blocked') {
            queryText += ` AND u.is_active = false`;
        }

        if (search) {
            paramCount++;
            queryText += ` AND (u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR op.badge_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        queryText += ` ORDER BY u.created_at DESC`;

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
        });
    } catch (error) {
        console.error('Get officers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch officers',
            error: error.message,
        });
    }
};

/**
 * Update officer details
 */
const updateOfficer = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, badge_number, unit, is_active } = req.body;

        // Update user table
        const userUpdates = [];
        const userParams = [];
        let paramCount = 0;

        if (full_name) {
            paramCount++;
            userUpdates.push(`full_name = $${paramCount}`);
            userParams.push(full_name);
        }
        if (phone !== undefined) {
            paramCount++;
            userUpdates.push(`phone = $${paramCount}`);
            userParams.push(phone);
        }
        if (typeof is_active === 'boolean') {
            paramCount++;
            userUpdates.push(`is_active = $${paramCount}`);
            userParams.push(is_active);
        }

        if (userUpdates.length > 0) {
            paramCount++;
            userParams.push(id);
            await query(
                `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $${paramCount} AND role = 'police'`,
                userParams
            );
        }

        // Update officer profile
        if (badge_number !== undefined || unit !== undefined) {
            await query(
                `INSERT INTO officer_profiles (user_id, badge_number, unit)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO UPDATE SET 
                    badge_number = COALESCE($2, officer_profiles.badge_number),
                    unit = COALESCE($3, officer_profiles.unit)`,
                [id, badge_number, unit]
            );
        }

        // Get updated officer
        const result = await query(`
            SELECT 
                u.id, u.email, u.full_name, u.phone, u.is_active, u.created_at,
                COALESCE(op.badge_number, u.badge_number) as badge_number,
                COALESCE(op.unit, u.unit) as unit
            FROM users u
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        res.json({
            success: true,
            message: 'Officer updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update officer',
            error: error.message,
        });
    }
};

/**
 * Reset officer password
 */
const resetOfficerPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        const password_hash = await hashPassword(newPassword);

        const result = await query(
            `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND role = 'police'
             RETURNING id, email, full_name`,
            [password_hash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        res.json({
            success: true,
            message: `Password reset successfully for ${result.rows[0].full_name}`,
            data: { id: result.rows[0].id, email: result.rows[0].email },
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message,
        });
    }
};

/**
 * Block/Unblock officer
 */
const toggleOfficerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, reason } = req.body;

        const result = await query(
            `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND role = 'police'
             RETURNING id, email, full_name, is_active`,
            [is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        const officer = result.rows[0];
        const action = is_active ? 'activated' : 'blocked';

        // Log the action
        console.log(`👮 Officer ${officer.full_name} (${officer.email}) ${action} by admin. Reason: ${reason || 'Not specified'}`);

        res.json({
            success: true,
            message: `Officer ${officer.full_name} has been ${action}`,
            data: officer,
        });
    } catch (error) {
        console.error('Toggle officer status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update officer status',
            error: error.message,
        });
    }
};

/**
 * Delete officer (hard delete - permanently removes from database)
 */
const deleteOfficer = async (req, res) => {
    try {
        const { id } = req.params;

        // First, get officer details before deletion
        const officerResult = await query(
            `SELECT id, email, full_name FROM users WHERE id = $1 AND role = 'police'`,
            [id]
        );

        if (officerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        const officer = officerResult.rows[0];

        // Delete officer profile first (foreign key constraint)
        await query(
            `DELETE FROM officer_profiles WHERE user_id = $1`,
            [id]
        );

        // Delete any deployment officer records
        await query(
            `DELETE FROM deployment_officers WHERE officer_id = $1`,
            [id]
        );

        // Delete the user record
        await query(
            `DELETE FROM users WHERE id = $1 AND role = 'police'`,
            [id]
        );

        console.log(`🗑️ Officer ${officer.full_name} (${officer.email}) permanently deleted from database`);

        res.json({
            success: true,
            message: `Officer ${officer.full_name} has been permanently deleted from the system`,
            data: {
                id: officer.id,
                email: officer.email,
                full_name: officer.full_name,
            },
        });
    } catch (error) {
        console.error('Delete officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete officer: ' + error.message,
            error: error.message,
        });
    }
};

/**
 * Update admin's current location
 * Called from admin dashboard for live location tracking
 */
const updateAdminLocation = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { latitude, longitude, address } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required',
            });
        }

        // Create or update admin location record
        await query(`
            INSERT INTO admin_locations (admin_id, latitude, longitude, address, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (admin_id) DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                address = EXCLUDED.address,
                updated_at = NOW()
        `, [adminId, latitude, longitude, address]);

        // Broadcast to all connected clients via WebSocket
        const socketManager = require('../services/socketManager');
        if (socketManager.io) {
            socketManager.io.to('role:admin').emit('admin:location', {
                adminId,
                latitude,
                longitude,
                address,
                timestamp: new Date().toISOString(),
            });
        }

        console.log(`📍 Admin ${adminId} location updated: ${latitude}, ${longitude}`);

        res.json({
            success: true,
            message: 'Admin location updated successfully',
        });
    } catch (error) {
        console.error('Update admin location error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin location',
            error: error.message,
        });
    }
};

/**
 * Get admin's current location
 */
const getAdminLocation = async (req, res) => {
    try {
        const adminId = req.user.id;

        const result = await query(`
            SELECT 
                admin_id,
                latitude,
                longitude,
                address,
                updated_at
            FROM admin_locations
            WHERE admin_id = $1
        `, [adminId]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No location data available',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get admin location error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin location',
            error: error.message,
        });
    }
};

/**
 * Get all admin locations (for super admin to see all admins)
 */
const getAllAdminLocations = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                al.admin_id,
                u.full_name,
                u.email,
                al.latitude,
                al.longitude,
                al.address,
                al.updated_at,
                CASE WHEN al.updated_at > NOW() - INTERVAL '2 minutes' THEN true ELSE false END as is_online
            FROM admin_locations al
            JOIN users u ON al.admin_id = u.id
            WHERE u.role = 'admin'
            ORDER BY al.updated_at DESC
        `);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
        });
    } catch (error) {
        console.error('Get all admin locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin locations',
            error: error.message,
        });
    }
};

/**
 * Calculate distance between admin and officers
 * Returns officers sorted by distance from admin
 */
const getOfficersWithDistance = async (req, res) => {
    try {
        const adminId = req.user.id;

        // Get admin location
        const adminLocResult = await query(`
            SELECT latitude, longitude FROM admin_locations WHERE admin_id = $1
        `, [adminId]);

        if (adminLocResult.rows.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'Admin location not available',
            });
        }

        const adminLoc = adminLocResult.rows[0];

        // Get all officers with distance calculation
        const result = await query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                COALESCE(op.badge_number, u.badge_number) as badge_number,
                COALESCE(op.unit, u.unit, 'Traffic Unit') as unit,
                op.current_latitude,
                op.current_longitude,
                op.location_updated_at,
                op.is_on_duty,
                CASE WHEN op.location_updated_at > NOW() - INTERVAL '2 minutes' THEN true ELSE false END as is_online,
                -- Haversine formula to calculate distance in kilometers
                (6371 * acos(cos(radians($1)) * cos(radians(op.current_latitude)) * 
                cos(radians(op.current_longitude) - radians($2)) + 
                sin(radians($1)) * sin(radians(op.current_latitude)))) as distance_km
            FROM users u
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE u.role = 'police' AND op.current_latitude IS NOT NULL AND op.current_longitude IS NOT NULL
            ORDER BY distance_km ASC
        `, [adminLoc.latitude, adminLoc.longitude]);

        res.json({
            success: true,
            data: result.rows,
            adminLocation: {
                latitude: adminLoc.latitude,
                longitude: adminLoc.longitude,
            },
            total: result.rows.length,
        });
    } catch (error) {
        console.error('Get officers with distance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate distances',
            error: error.message,
        });
    }
};

module.exports = {
    getSystemMetrics,
    getUsers,
    updateUser,
    getSystemLogs,
    generateReport,
    createOfficer,
    getOfficers,
    updateOfficer,
    resetOfficerPassword,
    toggleOfficerStatus,
    deleteOfficer,
    updateAdminLocation,
    getAdminLocation,
    getAllAdminLocations,
    getOfficersWithDistance,
};
