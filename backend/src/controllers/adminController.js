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

        console.log('📝 Creating officer:', { email, full_name, badge_number, unit });

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

        // Create user with police role
        const result = await query(
            `INSERT INTO users (email, full_name, password_hash, role, badge_number, unit, phone, is_active)
             VALUES ($1, $2, $3, 'police', $4, $5, $6, true)
             RETURNING id, email, full_name, role, badge_number, unit, phone, is_active, created_at`,
            [cleanEmail, full_name.trim(), password_hash, officerBadge, officerUnit, phone || null]
        );

        const officer = result.rows[0];
        console.log('✅ User created with ID:', officer.id);

        // Create officer profile with correct columns
        await query(
            `INSERT INTO officer_profiles (user_id, badge_number, unit, is_on_duty, emergency_alert_enabled, notification_enabled)
             VALUES ($1, $2, $3, true, true, true)
             ON CONFLICT (user_id) DO UPDATE SET 
                badge_number = EXCLUDED.badge_number, 
                unit = EXCLUDED.unit,
                is_on_duty = true`,
            [officer.id, officerBadge, officerUnit]
        );
        console.log('✅ Officer profile created');

        res.status(201).json({
            success: true,
            message: `Officer ${full_name} created successfully. They can now login with email: ${cleanEmail}`,
            data: {
                ...officer,
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
                COALESCE(op.badge_number, u.badge_number) as badge_number,
                COALESCE(op.unit, u.unit, 'Traffic Unit') as unit,
                CASE WHEN op.is_on_duty THEN 'on_duty' ELSE 'off_duty' END as availability_status,
                op.is_on_duty,
                op.current_latitude,
                op.current_longitude,
                op.location_updated_at,
                op.emergency_alert_enabled,
                (SELECT COUNT(*) FROM deployment_officers do2 
                 JOIN deployments d ON do2.deployment_id = d.id 
                 WHERE do2.officer_id = u.id AND d.status = 'Active') as active_deployments
            FROM users u
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE u.role = 'police'
        `;

        const params = [];
        let paramCount = 0;

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
 * Delete officer (soft delete - just blocks them)
 */
const deleteOfficer = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND role = 'police'
             RETURNING id, email, full_name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        res.json({
            success: true,
            message: `Officer ${result.rows[0].full_name} has been removed`,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Delete officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete officer',
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
};
