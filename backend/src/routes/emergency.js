const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
    createEmergency,
    getEmergencies,
    getEmergencyById,
    updateEmergencyStatus,
    getUserEmergencies,
    getEmergencyStats,
    respondToEmergency,
    getNearbyOfficers,
} = require('../controllers/emergencyController');

const router = express.Router();

/**
 * Validation middleware
 */
const validateEmergency = [
    body('emergencyType')
        .notEmpty()
        .withMessage('Emergency type is required'),
    // Mapping will happen in controller
    body('severity')
        .notEmpty()
        .withMessage('Severity is required')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid severity level'),
    body('locationName')
        .notEmpty()
        .withMessage('Location name is required')
        .isLength({ min: 2, max: 1000 })
        .withMessage('Location name must be between 2 and 1000 characters'),
    body('latitude')
        .notEmpty()
        .withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    body('longitude')
        .notEmpty()
        .withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 2, max: 5000 })
        .withMessage('Description must be between 2 and 5000 characters'),
    body('contactPhone')
        .notEmpty()
        .withMessage('Contact phone is required'),
    // Relaxed validation to allow leading zeros and various formats
    body('casualtiesCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Casualties count must be a positive number'),
    body('vehiclesInvolved')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Vehicles involved must be a positive number'),
    body('servicesNeeded')
        .optional()
        .isArray()
        .withMessage('Services needed must be an array'),
];

const validateStatusUpdate = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['pending', 'active', 'dispatched', 'resolved', 'cancelled'])
        .withMessage('Invalid status'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes must not exceed 1000 characters'),
];

/**
 * @route   POST /api/emergency
 * @desc    Create new emergency request
 * @access  Public (with optional auth)
 */
router.post('/', optionalAuth, validateEmergency, createEmergency);

/**
 * @route   GET /api/emergency
 * @desc    Get all emergencies (with filters)
 * @access  Public (limited data) / Private (full data)
 */
router.get('/', optionalAuth, getEmergencies);

/**
 * @route   GET /api/emergency/my-emergencies
 * @desc    Get current user's emergency requests
 * @access  Private
 */
router.get('/my-emergencies', authenticate, getUserEmergencies);

/**
 * @route   GET /api/emergency/stats
 * @desc    Get emergency statistics
 * @access  Private (Police/Admin)
 */
router.get('/stats', authenticate, authorize('police', 'admin', 'hospital_admin'), getEmergencyStats);

/**
 * @route   GET /api/emergency/:id
 * @desc    Get emergency by ID
 * @access  Public
 */
router.get('/:id', getEmergencyById);

/**
 * @route   PUT /api/emergency/:id/status
 * @desc    Update emergency status
 * @access  Private (Police/Admin)
 */
router.put(
    '/:id/status',
    authenticate,
    authorize('police', 'admin'),
    validateStatusUpdate,
    updateEmergencyStatus
);

/**
 * @route   GET /api/emergency/:id/report
 * @desc    Generate and download emergency report
 * @access  Private (Police/Admin)
 */
router.get(
    '/:id/report',
    authenticate,
    authorize('police', 'admin'),
    require('../controllers/emergencyController').generateEmergencyReport
);

/**
 * @route   POST /api/emergency/:id/respond
 * @desc    Officer responds to emergency (accept/decline/forward)
 * @access  Private (Police)
 */
router.post(
    '/:id/respond',
    authenticate,
    authorize('police', 'admin'),
    [
        body('action')
            .notEmpty()
            .withMessage('Action is required')
            .isIn(['accept', 'decline', 'forward'])
            .withMessage('Invalid action'),
    ],
    respondToEmergency
);

/**
 * @route   GET /api/emergency/:id/nearby-officers
 * @desc    Get nearby officers for forwarding
 * @access  Private (Police)
 */
router.get(
    '/:id/nearby-officers',
    authenticate,
    authorize('police', 'admin'),
    getNearbyOfficers
);

module.exports = router;
