const { query } = require('../config/database');

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
                is_verified,
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

        if (status === 'verified') {
            queryText += ` AND is_verified = true`;
        } else if (status === 'unverified') {
            queryText += ` AND is_verified = false`;
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
        const { role, is_verified } = req.body;

        const updates = [];
        const params = [];
        let paramCount = 0;

        if (role) {
            paramCount++;
            updates.push(`role = $${paramCount}`);
            params.push(role);
        }

        if (typeof is_verified === 'boolean') {
            paramCount++;
            updates.push(`is_verified = $${paramCount}`);
            params.push(is_verified);
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
             RETURNING id, email, full_name, role, is_verified`,
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

module.exports = {
    getSystemMetrics,
    getUsers,
    updateUser,
    getSystemLogs,
    generateReport,
};
