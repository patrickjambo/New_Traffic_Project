const { query, transaction } = require('../config/database');
const socketManager = require('../services/socketManager');
const fcmService = require('../services/fcmService');

/**
 * Get all deployments
 */
const getDeployments = async (req, res) => {
    try {
        const { status, incidentId, emergencyId, officerId } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        let queryText = `
            SELECT d.*, 
                   json_agg(json_build_object(
                     'id', u.id,
                     'fullName', u.full_name,
                     'badgeNumber', op.badge_number,
                     'acknowledged', d_o.acknowledged,
                     'acknowledgedAt', d_o.acknowledged_at,
                     'status', d_o.status
                   ) ORDER BY u.full_name) FILTER (WHERE u.id IS NOT NULL) as officers
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        // If police officer, only show their deployments
        if (userRole === 'police') {
            paramCount++;
            queryText += ` AND d.id IN (SELECT deployment_id FROM deployment_officers WHERE officer_id = $${paramCount})`;
            params.push(userId);
        }

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

        queryText += ` GROUP BY d.id ORDER BY d.created_at DESC`;

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
 * Get single deployment by ID
 */
const getDeploymentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT d.*, 
                   json_agg(json_build_object(
                     'id', u.id,
                     'fullName', u.full_name,
                     'badgeNumber', op.badge_number,
                     'phone', u.phone,
                     'acknowledged', d_o.acknowledged,
                     'acknowledgedAt', d_o.acknowledged_at,
                     'status', d_o.status,
                     'notes', d_o.notes,
                     'currentLatitude', op.current_latitude,
                     'currentLongitude', op.current_longitude
                   ) ORDER BY u.full_name) FILTER (WHERE u.id IS NOT NULL) as officers,
                   i.type as incident_type,
                   i.severity as incident_severity,
                   e.type as emergency_type,
                   e.severity as emergency_severity
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            LEFT JOIN incidents i ON d.incident_id = i.id
            LEFT JOIN emergencies e ON d.emergency_id = e.id
            WHERE d.id = $1
            GROUP BY d.id, i.type, i.severity, e.type, e.severity
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deployment not found',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get deployment by ID error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create a new deployment
 */
const createDeployment = async (req, res) => {
    try {
        const { 
            unitName, 
            location, 
            officers, 
            status, 
            incidentId, 
            emergencyId,
            priority,
            instructions,
            scheduledTime,
            estimatedDuration
        } = req.body;

        const createdBy = req.user.id;

        const deployment = await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO deployments 
                 (unit_name, address, latitude, longitude, status, start_time, 
                  incident_id, emergency_id, priority, instructions, 
                  scheduled_time, estimated_duration, created_by)
                 VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [
                    unitName,
                    location?.address,
                    location?.latitude,
                    location?.longitude,
                    status || 'Pending',
                    incidentId || null,
                    emergencyId || null,
                    priority || 'normal',
                    instructions || null,
                    scheduledTime || null,
                    estimatedDuration || null,
                    createdBy
                ]
            );

            const newDeployment = result.rows[0];

            // Add officers to deployment
            if (officers && officers.length > 0) {
                for (const officerId of officers) {
                    await client.query(
                        `INSERT INTO deployment_officers 
                         (deployment_id, officer_id, acknowledged, status, assigned_at) 
                         VALUES ($1, $2, FALSE, 'assigned', NOW())`,
                        [newDeployment.id, officerId]
                    );
                }
            }

            return newDeployment;
        });

        // Fetch complete deployment with officers
        const fullDeployment = await query(`
            SELECT d.*, 
                   json_agg(json_build_object(
                     'id', u.id,
                     'fullName', u.full_name,
                     'badgeNumber', op.badge_number
                   )) FILTER (WHERE u.id IS NOT NULL) as officers
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE d.id = $1
            GROUP BY d.id
        `, [deployment.id]);

        const deploymentWithOfficers = fullDeployment.rows[0];

        // Emit socket event to all police and admin
        socketManager.emitDeploymentNew({
            ...deploymentWithOfficers,
            type: incidentId ? 'incident' : (emergencyId ? 'emergency' : 'patrol'),
            officer_ids: officers,
        });

        // Send targeted notifications to each assigned officer
        if (officers && officers.length > 0) {
            const deploymentType = incidentId ? 'incident' : (emergencyId ? 'emergency' : 'patrol');
            
            for (const officerId of officers) {
                // Socket notification (for when app is open)
                socketManager.emitToUser(officerId, 'deployment:assigned', {
                    id: deployment.id,
                    deploymentId: deployment.id,
                    unit_name: deployment.unit_name,
                    unitName: deployment.unit_name,
                    address: deployment.address,
                    latitude: deployment.latitude,
                    longitude: deployment.longitude,
                    priority: priority || 'normal',
                    instructions: instructions || null,
                    status: 'Pending',
                    acknowledged: false,
                    created_at: deployment.created_at,
                    assignedAt: new Date().toISOString(),
                    type: deploymentType,
                    incident_id: incidentId || null,
                    emergency_id: emergencyId || null,
                    requiresAcknowledgment: true
                });

                // Socket notification popup
                socketManager.emitNotificationToUser(officerId, {
                    id: `deploy_${deployment.id}_${Date.now()}`,
                    title: '📍 New Deployment Assignment',
                    message: `You have been assigned to ${deployment.unit_name} at ${deployment.address || 'assigned location'}. Please acknowledge.`,
                    type: 'deployment',
                    created_at: new Date().toISOString()
                });

                // 🔔 FCM Push Notification (works when app is closed/background)
                // This ensures officers receive notification with sound/vibration
                try {
                    await fcmService.sendDeploymentToOfficer(officerId, {
                        id: deployment.id,
                        unitName: deployment.unit_name,
                        address: deployment.address,
                        latitude: deployment.latitude,
                        longitude: deployment.longitude,
                        priority: priority || 'normal',
                        instructions: instructions || null,
                        type: deploymentType,
                        incidentId: incidentId || null,
                        emergencyId: emergencyId || null,
                    });
                } catch (fcmError) {
                    console.error(`⚠️ FCM error for officer ${officerId}:`, fcmError.message);
                    // Don't fail the request if FCM fails
                }
            }
        }

        res.status(201).json({
            success: true,
            data: deploymentWithOfficers,
        });
    } catch (error) {
        console.error('Create deployment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Officer acknowledges deployment
 */
const acknowledgeDeployment = async (req, res) => {
    try {
        const { id } = req.params;
        const officerId = req.user.id;
        const { notes, estimatedArrival, latitude, longitude, currentAddress } = req.body;

        // Update acknowledgment with location
        const result = await query(
            `UPDATE deployment_officers 
             SET acknowledged = TRUE, 
                 acknowledged_at = NOW(),
                 status = 'en_route',
                 notes = $3,
                 estimated_arrival = $4,
                 last_location_lat = $5,
                 last_location_lng = $6,
                 last_location_time = NOW()
             WHERE deployment_id = $1 AND officer_id = $2
             RETURNING *`,
            [id, officerId, notes || null, estimatedArrival || null, latitude || null, longitude || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deployment assignment not found',
            });
        }

        // Also update officer profile location
        if (latitude && longitude) {
            await query(
                `UPDATE officer_profiles 
                 SET current_latitude = $1, current_longitude = $2, current_address = $3, last_location_update = NOW(), location_updated_at = NOW(), is_online = TRUE
                 WHERE user_id = $4`,
                [latitude, longitude, currentAddress || null, officerId]
            ).catch(err => console.error('Error updating officer profile location:', err));
        }

        // Get officer details
        const officerResult = await query(
            `SELECT u.full_name, op.badge_number 
             FROM users u 
             LEFT JOIN officer_profiles op ON u.id = op.user_id 
             WHERE u.id = $1`,
            [officerId]
        );

        const officer = officerResult.rows[0];

        // Check if all officers have acknowledged
        const ackStatus = await query(
            `SELECT 
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE acknowledged = TRUE) as acknowledged
             FROM deployment_officers 
             WHERE deployment_id = $1`,
            [id]
        );

        const { total, acknowledged } = ackStatus.rows[0];
        const allAcknowledged = parseInt(total) === parseInt(acknowledged);

        // Update deployment status if all acknowledged
        if (allAcknowledged) {
            await query(
                `UPDATE deployments SET status = 'Active', updated_at = NOW() WHERE id = $1`,
                [id]
            );
        }

        // Get full deployment for socket emission
        const deploymentResult = await query(
            `SELECT d.*, created_by FROM deployments d WHERE d.id = $1`,
            [id]
        );
        const deployment = deploymentResult.rows[0];

        // Emit acknowledgment event to admin dashboard
        socketManager.emitToRole('admin', 'deployment:acknowledged', {
            deploymentId: parseInt(id),
            officerId: officerId,
            officerName: officer?.full_name,
            badgeNumber: officer?.badge_number,
            acknowledgedAt: new Date().toISOString(),
            notes: notes || null,
            estimatedArrival: estimatedArrival || null,
            allAcknowledged: allAcknowledged,
            acknowledgmentStatus: {
                total: parseInt(total),
                acknowledged: parseInt(acknowledged)
            },
            // Include location in real-time event
            location: latitude && longitude ? {
                latitude,
                longitude,
                address: currentAddress || null,
            } : null,
        });

        // Also emit deployment update
        socketManager.emitDeploymentUpdate({
            ...deployment,
            status: allAcknowledged ? 'Active' : deployment.status
        });

        res.json({
            success: true,
            message: 'Deployment acknowledged successfully',
            data: {
                acknowledged: true,
                acknowledgedAt: result.rows[0].acknowledged_at,
                allOfficersAcknowledged: allAcknowledged,
                acknowledgmentStatus: {
                    total: parseInt(total),
                    acknowledged: parseInt(acknowledged)
                }
            },
        });
    } catch (error) {
        console.error('Acknowledge deployment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Officer updates their deployment status
 */
const updateOfficerDeploymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const officerId = req.user.id;
        const { status, notes, latitude, longitude, currentAddress } = req.body;

        const validStatuses = ['assigned', 'en_route', 'on_scene', 'completed', 'unable'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        // Update officer's deployment status
        const result = await query(
            `UPDATE deployment_officers 
             SET status = $3, 
                 notes = COALESCE($4, notes),
                 last_location_lat = $5,
                 last_location_lng = $6,
                 last_location_time = NOW()
             WHERE deployment_id = $1 AND officer_id = $2
             RETURNING *`,
            [id, officerId, status, notes, latitude || null, longitude || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deployment assignment not found',
            });
        }

        // Also update officer profile location for real-time tracking
        if (latitude && longitude) {
            await query(
                `UPDATE officer_profiles 
                 SET current_latitude = $1, current_longitude = $2, current_address = $3, last_location_update = NOW(), location_updated_at = NOW(), is_online = TRUE
                 WHERE user_id = $4`,
                [latitude, longitude, currentAddress || null, officerId]
            ).catch(err => console.error('Error updating officer profile location:', err));
        }

        // Get officer details
        const officerResult = await query(
            `SELECT u.full_name, op.badge_number 
             FROM users u 
             LEFT JOIN officer_profiles op ON u.id = op.user_id 
             WHERE u.id = $1`,
            [officerId]
        );

        const officer = officerResult.rows[0];

        // Check deployment completion
        if (status === 'completed') {
            const completionCheck = await query(
                `SELECT COUNT(*) as remaining 
                 FROM deployment_officers 
                 WHERE deployment_id = $1 AND status != 'completed' AND status != 'unable'`,
                [id]
            );

            if (parseInt(completionCheck.rows[0].remaining) === 0) {
                await query(
                    `UPDATE deployments SET status = 'Completed', end_time = NOW(), updated_at = NOW() WHERE id = $1`,
                    [id]
                );
            }
        }

        // 🔔 INSTANT: Emit multiple events to ensure admin dashboard updates immediately
        const statusPayload = {
            deploymentId: parseInt(id),
            officerId: officerId,
            officerName: officer?.full_name,
            officer_name: officer?.full_name,
            badgeNumber: officer?.badge_number,
            status: status,
            notes: notes || null,
            location: latitude && longitude ? { latitude, longitude } : null,
            updatedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
        };

        // Emit to admin room - primary event
        socketManager.emitToRole('admin', 'deployment:officer_status', statusPayload);
        
        // Also emit general deployment:update for dashboard
        socketManager.io.to('role:admin').emit('deployment:update', statusPayload);
        
        // Emit to all clients for real-time sync
        socketManager.io.emit('deployment:status_changed', statusPayload);

        console.log(`👮 INSTANT: Officer ${officer?.full_name} status → ${status} on deployment #${id}`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update officer deployment status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update deployment status (admin)
 */
const updateDeploymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        // Determine if we should set end_time
        const shouldSetEndTime = status === 'Completed' || status === 'Cancelled';
        
        const result = await query(
            `UPDATE deployments 
             SET status = $1, 
                 updated_at = NOW(),
                 end_time = CASE WHEN $3 THEN NOW() ELSE end_time END
             WHERE id = $2
             RETURNING *`,
            [status, id, shouldSetEndTime]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deployment not found',
            });
        }

        const deployment = result.rows[0];

        // Get officers for this deployment
        const officersResult = await query(
            `SELECT officer_id FROM deployment_officers WHERE deployment_id = $1`,
            [id]
        );

        // Emit socket event to all
        socketManager.emitDeploymentUpdate(deployment);

        // Notify assigned officers of status change
        for (const row of officersResult.rows) {
            socketManager.emitToUser(row.officer_id, 'deployment:status_changed', {
                deploymentId: deployment.id,
                newStatus: status,
                updatedAt: new Date().toISOString()
            });
        }

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
            `SELECT u.id, u.full_name as name, op.badge_number 
             FROM users u 
             LEFT JOIN officer_profiles op ON u.id = op.user_id 
             WHERE u.id = $1`,
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
            targetResult = await query(
                `UPDATE incidents 
                 SET verified_by = $1, status = 'in_progress', updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, type, severity, address as location, latitude, longitude`,
                [officerId, incidentId]
            );
        } else if (emergencyId) {
            targetResult = await query(
                `UPDATE emergencies 
                 SET assigned_to = $1, status = 'dispatched', updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, emergency_type as type, severity, location_name as location, latitude, longitude`,
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

        // Send direct notification to officer
        socketManager.emitToUser(officerId, 'assignment:new', {
            type: incidentId ? 'incident' : 'emergency',
            targetId: target.id,
            targetType: target.type,
            severity: target.severity,
            location: {
                address: target.location,
                latitude: target.latitude,
                longitude: target.longitude
            },
            assignedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Officer ${officer.name} assigned successfully`,
            data: { officer, target },
        });
    } catch (error) {
        console.error('Assign officer error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get available officers
 */
const getAvailableOfficers = async (req, res) => {
    try {
        // Use DISTINCT ON to prevent duplicate officers
        // An officer with multiple active deployments would appear once (as 'Deployed')
        const result = await query(`
            SELECT DISTINCT ON (u.id)
                u.id, 
                u.full_name, 
                op.badge_number, 
                op.rank,
                op.unit,
                CASE WHEN op.is_on_duty THEN 'on_duty' ELSE 'off_duty' END as availability_status,
                op.is_on_duty,
                op.current_latitude,
                op.current_longitude,
                op.current_address,
                op.location_updated_at,
                COALESCE(op.is_online, false) as is_online,
                CASE 
                    WHEN active_dep.deployment_id IS NOT NULL THEN 'Deployed'
                    ELSE 'Available'
                END as deployment_status,
                active_dep.unit_name as current_deployment,
                active_dep.address as deployment_location
            FROM users u
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            LEFT JOIN LATERAL (
                SELECT d_o.deployment_id, d.unit_name, d.address
                FROM deployment_officers d_o
                JOIN deployments d ON d_o.deployment_id = d.id
                WHERE d_o.officer_id = u.id
                  AND d.status IN ('Active', 'Pending', 'En Route', 'On Scene')
                ORDER BY d.created_at DESC
                LIMIT 1
            ) active_dep ON true
            WHERE u.role = 'police' AND u.is_active = true
            ORDER BY u.id, active_dep.deployment_id NULLS FIRST
        `);

        // Re-sort: Available officers first, then by name
        const sorted = result.rows.sort((a, b) => {
            if (a.deployment_status === 'Available' && b.deployment_status !== 'Available') return -1;
            if (a.deployment_status !== 'Available' && b.deployment_status === 'Available') return 1;
            return (a.full_name || '').localeCompare(b.full_name || '');
        });

        res.json({
            success: true,
            data: sorted,
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

        // Get officers before deletion for notification
        const officersResult = await query(
            `SELECT officer_id FROM deployment_officers WHERE deployment_id = $1`,
            [id]
        );

        await transaction(async (client) => {
            await client.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [id]);
            const result = await client.query('DELETE FROM deployments WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                throw new Error('Deployment not found');
            }
        });

        // Emit socket event
        socketManager.emitDeploymentDelete(id);

        // Notify officers that deployment was cancelled
        for (const row of officersResult.rows) {
            socketManager.emitToUser(row.officer_id, 'deployment:cancelled', {
                deploymentId: parseInt(id),
                cancelledAt: new Date().toISOString()
            });
        }

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
                COUNT(*) FILTER (WHERE status = 'Pending') as pending_deployments,
                COUNT(*) FILTER (WHERE status = 'Standby') as standby_deployments,
                COUNT(*) FILTER (WHERE status = 'Completed' AND DATE(end_time) = CURRENT_DATE) as completed_today,
                (SELECT COUNT(*) FROM deployment_officers WHERE acknowledged = TRUE) as acknowledged_count,
                (SELECT COUNT(*) FROM deployment_officers WHERE acknowledged = FALSE 
                 AND deployment_id IN (SELECT id FROM deployments WHERE status IN ('Active', 'Pending'))) as pending_acknowledgments,
                (SELECT COUNT(DISTINCT officer_id) FROM deployment_officers 
                 WHERE deployment_id IN (SELECT id FROM deployments WHERE status IN ('Active', 'Pending'))) as total_officers_deployed
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

        // Get current officers for comparison
        const currentOfficers = await query(
            `SELECT officer_id FROM deployment_officers WHERE deployment_id = $1`,
            [id]
        );
        const currentIds = currentOfficers.rows.map(r => r.officer_id);
        const newIds = officers || [];

        // Find added and removed officers
        const addedOfficers = newIds.filter(id => !currentIds.includes(id));
        const removedOfficers = currentIds.filter(id => !newIds.includes(id));

        await transaction(async (client) => {
            // Remove existing officers
            await client.query('DELETE FROM deployment_officers WHERE deployment_id = $1', [id]);

            // Add new officers
            if (officers && officers.length > 0) {
                for (const officerId of officers) {
                    await client.query(
                        `INSERT INTO deployment_officers 
                         (deployment_id, officer_id, acknowledged, status, assigned_at) 
                         VALUES ($1, $2, FALSE, 'assigned', NOW())`,
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
                     'badgeNumber', op.badge_number,
                     'acknowledged', d_o.acknowledged
                   )) FILTER (WHERE u.id IS NOT NULL) as officers
            FROM deployments d
            LEFT JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN users u ON d_o.officer_id = u.id
            LEFT JOIN officer_profiles op ON u.id = op.user_id
            WHERE d.id = $1
            GROUP BY d.id
        `, [id]);

        const updatedDeployment = result.rows[0];

        // Emit socket event
        socketManager.emitDeploymentUpdate(updatedDeployment);

        // Notify newly added officers
        for (const officerId of addedOfficers) {
            socketManager.emitToUser(officerId, 'deployment:assigned', {
                deploymentId: parseInt(id),
                unitName: updatedDeployment.unit_name,
                address: updatedDeployment.address,
                latitude: updatedDeployment.latitude,
                longitude: updatedDeployment.longitude,
                status: updatedDeployment.status,
                assignedAt: new Date().toISOString(),
                requiresAcknowledgment: true
            });
        }

        // Notify removed officers
        for (const officerId of removedOfficers) {
            socketManager.emitToUser(officerId, 'deployment:removed', {
                deploymentId: parseInt(id),
                removedAt: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: updatedDeployment,
        });
    } catch (error) {
        console.error('Update deployment officers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get officer's active deployments
 */
const getMyDeployments = async (req, res) => {
    try {
        const officerId = req.user.id;
        const { status } = req.query;

        let queryText = `
            SELECT d.*, 
                   d_o.acknowledged,
                   d_o.acknowledged_at,
                   d_o.status as officer_status,
                   d_o.notes as officer_notes,
                   i.type as incident_type,
                   i.severity as incident_severity,
                   i.description as incident_description,
                   e.type as emergency_type,
                   e.severity as emergency_severity,
                   e.description as emergency_description
            FROM deployments d
            JOIN deployment_officers d_o ON d.id = d_o.deployment_id
            LEFT JOIN incidents i ON d.incident_id = i.id
            LEFT JOIN emergencies e ON d.emergency_id = e.id
            WHERE d_o.officer_id = $1
        `;

        const params = [officerId];

        if (status === 'active') {
            queryText += ` AND d_o.acknowledged = TRUE AND d.status IN ('Active', 'Pending', 'En Route', 'On Scene')`;
        } else if (status === 'pending') {
            queryText += ` AND d_o.acknowledged = FALSE AND d.status NOT IN ('Completed', 'Cancelled')`;
        } else if (status === 'completed') {
            queryText += ` AND d.status IN ('Completed', 'Cancelled')`;
        }

        queryText += ` ORDER BY d.created_at DESC`;

        const result = await query(queryText, params);

        console.log(`📋 getMyDeployments for officer ${officerId} (status=${status}): ${result.rows.length} results`);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get my deployments error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getDeployments,
    getDeploymentById,
    createDeployment,
    acknowledgeDeployment,
    updateOfficerDeploymentStatus,
    updateDeploymentStatus,
    assignOfficer,
    getAvailableOfficers,
    deleteDeployment,
    getDeploymentStats,
    updateDeploymentOfficers,
    getMyDeployments,
};
