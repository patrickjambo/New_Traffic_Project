const { query, transaction } = require('../config/database');
const socketManager = require('../services/socketManager');

/**
 * Get all deployments
 */
const getDeployments = async (req, res) => {
    try {
        const { status, incidentId, emergencyId, officerId } = req.query;

        let queryText = `
            SELECT d.*, 
                   json_agg(json_build_object(
                     'id', u.id,
                     'fullName', u.full_name,
                     'badgeNumber', u.badge_number
                   )) FILTER (WHERE u.id IS NOT NULL) as officers
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            queryText += ` AND d.status = $${paramCount}`;
            params.push(status);
        }

        if (incidentId) {
            paramCount++;
            queryText += ` AND d.incident_id = $${paramCount}`;
            params.push(incidentId);
        }

        if (emergencyId) {
            paramCount++;
            queryText += ` AND d.emergency_id = $${paramCount}`;
            params.push(emergencyId);
        }

        queryText += ` GROUP BY d.id ORDER BY d.start_time DESC`;

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get deployments error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create a new deployment
 */
const createDeployment = async (req, res) => {
    try {
        const { unitName, location, officers, status, incidentId, emergencyId } = req.body;

        const deployment = await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO deployments 
                 (unit_name, address, latitude, longitude, status, start_time, incident_id, emergency_id)
                 VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
                 RETURNING *`,
                [
                    unitName,
                    location?.address,
                    location?.latitude,
                    location?.longitude,
                    status || 'Standby',
                    incidentId || null,
                    emergencyId || null
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

        // Emit socket event using socketManager
        socketManager.emitDeploymentNew({
            ...deployment,
            type: incidentId ? 'incident' : (emergencyId ? 'emergency' : 'patrol'),
            officer_ids: officers,
        });

        res.status(201).json({
            success: true,
            data: deployment,
        });
    } catch (error) {
        console.error('Create deployment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update deployment status
 */
const updateDeploymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const result = await query(
            `UPDATE deployments 
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deployment not found',
            });
        }

        const deployment = result.rows[0];

        // Emit socket event
        socketManager.emitDeploymentUpdate(deployment);

        res.json({
            success: true,
            data: deployment,
        });
    } catch (error) {
        console.error('Update deployment status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Assign officer to incident/emergency
 */
const assignOfficer = async (req, res) => {
    try {
        const { officerId, incidentId, emergencyId } = req.body;

        if (!officerId || (!incidentId && !emergencyId)) {
            return res.status(400).json({
                success: false,
                message: 'Officer ID and either incident ID or emergency ID required',
            });
        }

        // Get officer details
        const officerResult = await query(
            'SELECT id, full_name as name, badge_number FROM users WHERE id = $1',
            [officerId]
        );

        if (officerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found',
            });
        }

        const officer = officerResult.rows[0];
        let targetResult;

        if (incidentId) {
            // Update incident with assigned officer
            targetResult = await query(
                `UPDATE incidents 
                 SET verified_by = $1, status = 'in_progress', updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, type, severity, address as location`,
                [officerId, incidentId]
            );
        } else if (emergencyId) {
            // Update emergency with assigned officer
            targetResult = await query(
                `UPDATE emergencies 
                 SET assigned_to = $1, status = 'dispatched', updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, emergency_type as type, severity, location_name as location`,
                [officerId, emergencyId]
            );
        }

        if (targetResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: incidentId ? 'Incident not found' : 'Emergency not found',
            });
        }

        const target = targetResult.rows[0];

        // Emit officer assignment event
        socketManager.emitOfficerAssigned(officer, target);

        res.json({
            success: true,
            message: `Officer ${officer.name} assigned successfully`,
            data: {
                officer,
                target,
            },
        });
    } catch (error) {
        console.error('Assign officer error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get available officers (not currently deployed)
 */
const getAvailableOfficers = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id, 
                u.full_name, 
                u.badge_number, 
                u.phone, 
                u.unit,
                CASE 
                    WHEN d.id IS NOT NULL THEN 'Deployed'
                    ELSE 'Available'
                END as status,
                d.unit_name as current_deployment,
                d.address as deployment_location
            FROM users u
            LEFT JOIN (
                SELECT d_o.officer_id, d.id, d.unit_name, d.address
                FROM deployment_officers d_o
                JOIN deployments d ON d_o.deployment_id = d.id
                WHERE d.status IN ('Active', 'En Route', 'On Scene')
            ) d ON u.id = d.officer_id
            WHERE u.role = 'police'
            ORDER BY u.full_name
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get available officers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Delete a deployment
 */
const deleteDeployment = async (req, res) => {
    try {
        const { id } = req.params;

        await transaction(async (client) => {
            // Delete officer assignments first
            await client.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [id]);
            // Delete the deployment
            const result = await client.query('DELETE FROM deployments WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                throw new Error('Deployment not found');
            }
        });

        // Emit socket event
        socketManager.emitDeploymentDelete(id);

        res.json({
            success: true,
            message: 'Deployment deleted successfully',
        });
    } catch (error) {
        console.error('Delete deployment error:', error);
        res.status(error.message === 'Deployment not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get deployment statistics
 */
const getDeploymentStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_deployments,
                COUNT(*) FILTER (WHERE status = 'Active') as active_deployments,
                COUNT(*) FILTER (WHERE status = 'Standby') as standby_deployments,
                (SELECT COUNT(*) FROM deployment_officers) as total_officers_deployed
            FROM deployments
        `;

        const result = await query(statsQuery);

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get deployment stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update officers assigned to a deployment
 */
const updateDeploymentOfficers = async (req, res) => {
    try {
        const { id } = req.params;
        const { officers } = req.body;

        await transaction(async (client) => {
            // Remove existing officers
            await client.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [id]);

            // Add new officers
            if (officers && officers.length > 0) {
                for (const officerId of officers) {
                    await client.query(
                        'INSERT INTO deployment_officers (deployment_id, officer_id) VALUES ($1, $2)',
                        [id, officerId]
                    );
                }
            }
        });

        // Fetch updated deployment with officers
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
            WHERE d.id = $1
            GROUP BY d.id
        `, [id]);

        const updatedDeployment = result.rows[0];

        // Emit socket event
        socketManager.emitDeploymentUpdate(updatedDeployment);

        res.json({
            success: true,
            data: updatedDeployment,
        });
    } catch (error) {
        console.error('Update deployment officers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getDeployments,
    createDeployment,
    updateDeploymentStatus,
    assignOfficer,
    getAvailableOfficers,
    deleteDeployment,
    getDeploymentStats,
    updateDeploymentOfficers,
};
