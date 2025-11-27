const { query } = require('../config/database');

/**
 * Get incidents for police dashboard
 * Shows both assigned and unassigned incidents
 */
const getPoliceIncidents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, type, assigned } = req.query;

        let queryText = `
            SELECT 
                i.id,
                i.type,
                i.severity,
                i.status,
                ST_Y(i.location::geometry) as latitude,
                ST_X(i.location::geometry) as longitude,
                i.address as location,
                i.description,
                i.created_at,
                i.updated_at,
                i.verified_by,
                u.full_name as assigned_to_name,
                CASE WHEN i.verified_by = $1 THEN true ELSE false END as is_assigned_to_me
            FROM incidents i
            LEFT JOIN users u ON i.verified_by = u.id
            WHERE i.status != 'resolved'
        `;

        const params = [userId];
        let paramCount = 1;

        // Filter by assignment
        if (assigned === 'me') {
            queryText += ` AND i.verified_by = $1`;
        } else if (assigned === 'unassigned') {
            queryText += ` AND i.verified_by IS NULL`;
        }

        // Filter by status
        if (status) {
            paramCount++;
            queryText += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        // Filter by type
        if (type) {
            paramCount++;
            queryText += ` AND i.type = $${paramCount}`;
            params.push(type);
        }

        queryText += ` ORDER BY 
            CASE i.severity 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END,
            i.created_at DESC
        `;

        const result = await query(queryText, params);

        // Get statistics
        const statsQuery = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE verified_by IS NULL) as unassigned_count,
                COUNT(*) FILTER (WHERE verified_by = $1) as assigned_to_me_count,
                COUNT(*) FILTER (WHERE severity = 'high' AND status != 'resolved') as high_priority_count
            FROM incidents
            WHERE status != 'resolved'
        `, [userId]);

        res.json({
            success: true,
            data: result.rows,
            stats: statsQuery.rows[0],
        });
    } catch (error) {
        console.error('Get police incidents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch incidents',
            error: error.message,
        });
    }
};

/**
 * Assign incident to police officer
 */
const assignIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            `UPDATE incidents 
             SET verified_by = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND (verified_by IS NULL OR verified_by = $1)
             RETURNING id, status, verified_by`,
            [userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incident not found or already assigned to another officer',
            });
        }

        // Add update to history
        await query(
            'INSERT INTO incident_updates (incident_id, user_id, status, comment) VALUES ($1, $2, $3, $4)',
            [id, userId, 'in_progress', 'Incident assigned to officer']
        );

        // Emit WebSocket event
        if (req.app.get('io')) {
            req.app.get('io').emit('incident_updated', {
                incidentId: id,
                status: 'in_progress',
                updates: result.rows[0],
            });
        }

        res.json({
            success: true,
            message: 'Incident assigned successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Assign incident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign incident',
            error: error.message,
        });
    }
};

/**
 * Broadcast alert to all users
 */
const broadcastAlert = async (req, res) => {
    try {
        const { message, type } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Alert message is required',
            });
        }

        // Store alert in database
        await query(
            `INSERT INTO system_alerts (user_id, message, type) 
             VALUES ($1, $2, $3)`,
            [userId, message, type || 'warning']
        );

        // Broadcast via WebSocket
        if (req.app.get('io')) {
            req.app.get('io').emit('broadcast_alert', {
                message,
                type: type || 'warning',
                timestamp: new Date().toISOString(),
                from: req.user.full_name || 'Police Department',
            });
        }

        res.json({
            success: true,
            message: 'Alert broadcasted successfully',
        });
    } catch (error) {
        console.error('Broadcast alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to broadcast alert',
            error: error.message,
        });
    }
};

/**
 * Get police dashboard statistics
 */
const getPoliceStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE verified_by = $1 AND status != 'resolved') as my_active_incidents,
                COUNT(*) FILTER (WHERE verified_by IS NULL AND status != 'resolved') as unassigned_incidents,
                COUNT(*) FILTER (WHERE verified_by = $1 AND status = 'resolved' AND DATE(updated_at) = CURRENT_DATE) as resolved_today,
                COUNT(*) FILTER (WHERE severity = 'high' AND status != 'resolved') as high_priority
            FROM incidents
        `, [userId]);

        res.json({
            success: true,
            data: stats.rows[0],
        });
    } catch (error) {
        console.error('Get police stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message,
        });
    }
};

module.exports = {
    getPoliceIncidents,
    assignIncident,
    broadcastAlert,
    getPoliceStats,
};
