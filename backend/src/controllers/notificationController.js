const { query } = require('../config/database');

/**
 * Get notifications
 */
const getNotifications = async (req, res) => {
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

        const result = await query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const result = await query(
            'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead
};
