const { query } = require('../config/database');

/**
 * Update traffic data
 */
const updateTrafficData = async (req, res) => {
    try {
        const { region, congestionLevel, vehicleCount, averageSpeed } = req.body;

        const result = await query(
            `INSERT INTO traffic_data (region, congestion_level, vehicle_count, average_speed, timestamp)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [region, congestionLevel, vehicleCount, averageSpeed]
        );

        if (req.app.get('io')) {
            req.app.get('io').emit('traffic_update', result.rows[0]);
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Traffic update error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get traffic heatmap data
 */
const getTrafficHeatmap = async (req, res) => {
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

        const result = await query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Traffic heatmap error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    updateTrafficData,
    getTrafficHeatmap
};
