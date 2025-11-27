const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
    getPoliceIncidents,
    assignIncident,
    broadcastAlert,
    getPoliceStats,
} = require('../controllers/policeController');

const router = express.Router();

// All routes require police authentication
router.use(authenticate);
router.use(authorize('police', 'admin'));

/**
 * @route   GET /api/police/incidents
 * @desc    Get incidents for police dashboard
 * @access  Private (Police/Admin)
 */
router.get('/incidents', getPoliceIncidents);

/**
 * @route   PUT /api/police/incidents/:id/assign
 * @desc    Assign incident to self
 * @access  Private (Police/Admin)
 */
router.put('/incidents/:id/assign', assignIncident);

/**
 * @route   POST /api/police/broadcast
 * @desc    Broadcast alert to all users
 * @access  Private (Police/Admin)
 */
router.post('/broadcast', broadcastAlert);

/**
 * @route   GET /api/police/stats
 * @desc    Get police dashboard statistics
 * @access  Private (Police/Admin)
 */
router.get('/stats', getPoliceStats);

module.exports = router;
