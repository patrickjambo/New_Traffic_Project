const express = require('express');
const router = express.Router();
const { getDeployments, createDeployment } = require('../controllers/deploymentController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getDeployments);
router.post('/', authenticate, createDeployment);

module.exports = router;
