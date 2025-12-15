const { query, transaction } = require('../config/database');

/**
 * Get all deployments
 */
const getDeployments = async (req, res) => {
    try {
        const result = await query(`
            SELECT d.*, 
                   json_agg(json_build_object(
                     'id', u.id,
                     'fullName', u.full_name,
                     'badgeNumber', u.badge_number
                   )) FILTER (WHERE u.id IS NOT NULL) as officers
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            GROUP BY d.id
            ORDER BY d.start_time DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get deployments error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create a new deployment
 */
const createDeployment = async (req, res) => {
    try {
        const { unitName, location, officers, status, incidentId } = req.body;

        const deployment = await transaction(async (client) => {
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

            const newDeployment = result.rows[0];

            // Add officers to deployment
            if (officers && officers.length > 0) {
                for (const officerId of officers) {
                    await client.query(
                        'INSERT INTO deployment_officers (deployment_id, officer_id) VALUES ($1, $2)',
                        [newDeployment.id, officerId]
                    );
                }
            }

            return newDeployment;
        });

        // Emit socket event if io is available
        if (req.app.get('io')) {
            req.app.get('io').emit('new_deployment', deployment);
        }

        res.status(201).json(deployment);
    } catch (error) {
        console.error('Create deployment error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getDeployments,
    createDeployment
};
