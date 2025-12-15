const express = require('express');
const router = express.Router();
const { getDashboardData, getRegionalOverview, testDashboard } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, getDashboardData);
router.get('/regions/overview', authenticate, getRegionalOverview);
router.get('/test', testDashboard);

module.exports = router;
