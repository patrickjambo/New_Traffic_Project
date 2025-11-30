const express = require('express');
const router = express.Router();
const { upload, analyzeAutoCapture, getAutoCaptureStats } = require('../controllers/autoAnalysisController');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * @route   POST /api/auto-analysis/analyze
 * @desc    Analyze auto-captured video
 * @access  Private (optional - can work for guests)
 */
router.post(
    '/analyze',
    optionalAuth,
    upload.single('video'),
    analyzeAutoCapture
);

/**
 * @route   GET /api/auto-analysis/stats
 * @desc    Get user's auto-capture statistics
 * @access  Private
 */
router.get('/stats', protect, getAutoCaptureStats);

module.exports = router;
