const express = require('express');
const { validate, schemas } = require('../middleware/validator');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
    upload,
    reportIncident,
    getNearbyIncidents,
    getIncidentById,
    updateIncidentStatus,
    getUserIncidents,
    getIncidentStatistics,
} = require('../controllers/incidentController');
const { analyzeVideoAndCreateIncident, testIncidentDetection } = require('../controllers/aiAnalysisController');

const router = express.Router();

/**
 * @route   POST /api/incidents/test-detection
 * @desc    Test endpoint to simulate incident detection (bypasses AI)
 * @access  Public (for testing only)
 */
router.post('/test-detection', testIncidentDetection);

/**
 * @route   GET /api/incidents/my-history
 * @desc    Get incidents reported by current user
 * @access  Private
 */
router.get('/my-history', authenticate, getUserIncidents);

/**
 * @route   POST /api/incidents/analyze-video
 * @desc    Upload video for AI analysis and automatic incident creation
 * @access  Public (can be anonymous)
 */
router.post(
    '/analyze-video',
    optionalAuth,
    upload.single('video'),
    analyzeVideoAndCreateIncident
);

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
 * @route   GET /api/incidents/statistics
 * @desc    Get incident statistics
 * @access  Public
 */
router.get('/statistics', getIncidentStatistics);

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
