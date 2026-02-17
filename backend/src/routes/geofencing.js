/**
 * Geo-Fencing & Alert Routes
 * API endpoints for officer location tracking and targeted alerts
 */

const express = require('express');
const router = express.Router();
const geoFencingService = require('../services/geoFencingService');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================================
// OFFICER LOCATION ENDPOINTS
// ============================================================

/**
 * POST /api/geofencing/location
 * Update officer's current GPS location
 * Called by mobile app when location changes
 */
router.post('/location', authenticate, async (req, res) => {
    try {
        const { latitude, longitude, accuracy, speed, heading } = req.body;
        const userId = req.user.id;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        await geoFencingService.updateOfficerLocation(userId, latitude, longitude, {
            accuracy, speed, heading
        });

        res.json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/geofencing/fcm-token
 * Register/update FCM token for push notifications
 */
router.post('/fcm-token', authenticate, async (req, res) => {
    try {
        const { fcmToken, deviceId, deviceType } = req.body;
        const userId = req.user.id;

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: 'FCM token is required'
            });
        }

        await geoFencingService.updateOfficerFCMToken(userId, fcmToken, {
            deviceId, deviceType
        });

        res.json({
            success: true,
            message: 'FCM token registered successfully'
        });
    } catch (error) {
        console.error('Error updating FCM token:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/geofencing/duty-status
 * Update officer duty status
 */
router.put('/duty-status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.user.id;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        await geoFencingService.updateOfficerDutyStatus(userId, status);

        res.json({
            success: true,
            message: `Duty status updated to: ${status}`
        });
    } catch (error) {
        console.error('Error updating duty status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ALERT ENDPOINTS
// ============================================================

/**
 * POST /api/geofencing/alert
 * Create and send a targeted alert (admin/police only)
 */
router.post('/alert', authenticate, authorize(['admin', 'police']), async (req, res) => {
    try {
        const {
            incidentId,
            type,
            severity,
            latitude,
            longitude,
            address,
            description,
            isEmergency,
            mediaUrls,
            radiusKm
        } = req.body;

        // Validate required fields
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location (latitude, longitude) is required'
            });
        }

        // Validate coordinate ranges
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinate values'
            });
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: 'Coordinates out of valid range (lat: -90 to 90, lng: -180 to 180)'
            });
        }

        // Validate radius if provided
        if (radiusKm !== undefined && (parseFloat(radiusKm) < 0 || isNaN(parseFloat(radiusKm)))) {
            return res.status(400).json({
                success: false,
                message: 'Radius must be a positive number'
            });
        }

        // Validate description length (max 5000 chars to prevent abuse)
        if (description && description.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Description too long (max 5000 characters)'
            });
        }

        // Sanitize description - remove potential SQL/XSS but allow unicode
        const sanitizedDescription = description 
            ? description.substring(0, 5000).replace(/[<>]/g, '')
            : '';

        const result = await geoFencingService.createTargetedAlert({
            id: incidentId,
            type: type || 'general',
            severity: severity || 'medium',
            latitude: lat,
            longitude: lng,
            address,
            description: sanitizedDescription,
            media_urls: mediaUrls,
            reported_by: req.user.id
        }, isEmergency || false, {
            source: 'manual'
        });

        res.json({
            success: true,
            message: `Alert sent to ${result.targetedOfficers} officers`,
            data: result
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/geofencing/alert/emergency
 * Trigger emergency alert (highest priority)
 */
router.post('/alert/emergency', authenticate, async (req, res) => {
    try {
        const {
            type,
            latitude,
            longitude,
            address,
            description,
            mediaUrls
        } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Location (latitude, longitude) is required'
            });
        }

        const result = await geoFencingService.createTargetedAlert({
            type: type || 'emergency',
            severity: 'critical',
            latitude,
            longitude,
            address,
            description,
            location_name: address,
            media_urls: mediaUrls,
            reported_by: req.user.id
        }, true, { // isEmergency = true
            source: 'manual',
            detectedObject: type
        });

        res.json({
            success: true,
            message: `EMERGENCY alert sent to ${result.targetedOfficers} officers!`,
            data: result
        });
    } catch (error) {
        console.error('Error creating emergency alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/geofencing/alert/acknowledge
 * Officer acknowledges an alert
 */
router.post('/alert/acknowledge', authenticate, async (req, res) => {
    try {
        const { alertId, action, note } = req.body;
        const userId = req.user.id;

        if (!alertId) {
            return res.status(400).json({
                success: false,
                message: 'Alert ID is required'
            });
        }

        await geoFencingService.acknowledgeAlert(alertId, userId, action || 'acknowledged', note);

        res.json({
            success: true,
            message: 'Alert acknowledged'
        });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ADMIN/DASHBOARD ENDPOINTS
// ============================================================

/**
 * GET /api/geofencing/officers
 * Get all officers with their current locations (admin only)
 */
router.get('/officers', authenticate, authorize(['admin', 'police']), async (req, res) => {
    try {
        const officers = await geoFencingService.getAllOfficersWithLocations();

        res.json({
            success: true,
            data: officers
        });
    } catch (error) {
        console.error('Error getting officers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/geofencing/districts
 * Get districts with statistics
 */
router.get('/districts', authenticate, async (req, res) => {
    try {
        const districts = await geoFencingService.getDistrictsWithStats();

        res.json({
            success: true,
            data: districts
        });
    } catch (error) {
        console.error('Error getting districts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/geofencing/district/:lat/:lng
 * Get district for a specific location
 */
router.get('/district/:lat/:lng', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        const district = await geoFencingService.getDistrictFromLocation(
            parseFloat(lat),
            parseFloat(lng)
        );

        res.json({
            success: true,
            data: district
        });
    } catch (error) {
        console.error('Error getting district:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/geofencing/officers-nearby
 * Find officers near a location
 */
router.get('/officers-nearby', authenticate, authorize(['admin', 'police']), async (req, res) => {
    try {
        const { lat, lng, radius, districtId, includeOffDuty } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const officers = await geoFencingService.findOfficersInGeoFence(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius) || 5,
            districtId ? parseInt(districtId) : null,
            includeOffDuty === 'true'
        );

        res.json({
            success: true,
            data: officers,
            count: officers.length
        });
    } catch (error) {
        console.error('Error finding nearby officers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
