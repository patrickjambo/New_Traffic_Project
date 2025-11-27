const express = require('express');
const { validate, schemas } = require('../middleware/validator');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
    upload,
    reportIncident,
    getNearbyIncidents,
    getIncidentById,
    updateIncidentStatus,
} = require('../controllers/incidentController');

const router = express.Router();

/**
 * @route   POST /api/incidents/report
 * @desc    Report new incident with video
 * @access  Public (can be anonymous)
 */
router.post(
    '/report',
    optionalAuth,
    upload.single('video'),
    validate(schemas.reportIncident),
    reportIncident
);

/**
 * @route   GET /api/incidents
 * @desc    Get nearby incidents
 * @access  Public
 */
router.get('/', getNearbyIncidents);

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident by ID
 * @access  Public
 */
router.get('/:id', getIncidentById);

/**
 * @route   PATCH /api/incidents/:id/status
 * @desc    Update incident status
 * @access  Private (Police/Admin only)
 */
router.patch(
    '/:id/status',
    authenticate,
    authorize('police', 'admin'),
    validate(schemas.updateIncidentStatus),
    updateIncidentStatus
);

module.exports = router;
