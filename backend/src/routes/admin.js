const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
    getSystemMetrics,
    getUsers,
    updateUser,
    getSystemLogs,
    generateReport,
} = require('../controllers/adminController');

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/metrics
 * @desc    Get system metrics for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/metrics', getSystemMetrics);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 * @access  Private (Admin only)
 */
router.get('/users', getUsers);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Private (Admin only)
 */
router.put('/users/:id', updateUser);

/**
 * @route   GET /api/admin/logs
 * @desc    Get system activity logs
 * @access  Private (Admin only)
 */
router.get('/logs', getSystemLogs);

/**
 * @route   GET /api/admin/reports/generate
 * @desc    Generate analytics report
 * @access  Private (Admin only)
 */
router.get('/reports/generate', generateReport);

module.exports = router;
