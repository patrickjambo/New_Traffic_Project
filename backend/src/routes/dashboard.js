const express = require('express');
const router = express.Router();
const { getDashboardData, testDashboard } = require('../controllers/dashboardController');

router.get('/', getDashboardData);
router.get('/test', testDashboard);

module.exports = router;
