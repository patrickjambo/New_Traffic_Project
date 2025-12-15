const express = require('express');
const router = express.Router();
const { updateTrafficData, getTrafficHeatmap } = require('../controllers/trafficController');
const { authenticate } = require('../middleware/auth');

router.post('/update', authenticate, updateTrafficData);
router.get('/heatmap', authenticate, getTrafficHeatmap);

module.exports = router;
