const express = require('express');
const router = express.Router();
const {
    getDeployments,
    createDeployment,
    updateDeploymentStatus,
    assignOfficer,
    getAvailableOfficers,
    deleteDeployment,
    getDeploymentStats,
    updateDeploymentOfficers
} = require('../controllers/deploymentController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get deployment statistics (admin only)
router.get('/stats', authorize('admin'), getDeploymentStats);

// Get deployments (police and admin)
router.get('/', getDeployments);

// Get available officers (admin only)
router.get('/officers/available', authorize('admin'), getAvailableOfficers);

// Create deployment (admin only)
router.post('/', authorize('admin'), createDeployment);

// Update deployment status
router.put('/:id/status', updateDeploymentStatus);

// Delete deployment (admin only)
router.delete('/:id', authorize('admin'), deleteDeployment);

// Update deployment officers (admin only)
router.put('/:id/officers', authorize('admin'), updateDeploymentOfficers);

// Assign officer to incident/emergency
router.post('/assign', authorize('admin'), assignOfficer);

module.exports = router;
