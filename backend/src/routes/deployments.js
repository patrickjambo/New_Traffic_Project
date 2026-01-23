const express = require('express');
const router = express.Router();
const {
    getDeployments,
    getDeploymentById,
    createDeployment,
    acknowledgeDeployment,
    updateOfficerDeploymentStatus,
    updateDeploymentStatus,
    assignOfficer,
    getAvailableOfficers,
    deleteDeployment,
    getDeploymentStats,
    updateDeploymentOfficers,
    getMyDeployments
} = require('../controllers/deploymentController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get deployment statistics (admin only)
router.get('/stats', authorize('admin'), getDeploymentStats);

// Get officer's own deployments (police only)
router.get('/my-deployments', authorize('police'), getMyDeployments);

// Get deployments (police and admin)
router.get('/', getDeployments);

// Get single deployment by ID
router.get('/:id', getDeploymentById);

// Get available officers (admin only)
router.get('/officers/available', authorize('admin'), getAvailableOfficers);

// Create deployment (admin only)
router.post('/', authorize('admin'), createDeployment);

// Officer acknowledges deployment (police only)
router.post('/:id/acknowledge', authorize('police'), acknowledgeDeployment);

// Officer updates their deployment status (police only)
router.put('/:id/officer-status', authorize('police'), updateOfficerDeploymentStatus);

// Update deployment status (admin)
router.put('/:id/status', authorize('admin'), updateDeploymentStatus);

// Delete deployment (admin only)
router.delete('/:id', authorize('admin'), deleteDeployment);

// Update deployment officers (admin only)
router.put('/:id/officers', authorize('admin'), updateDeploymentOfficers);

// Assign officer to incident/emergency
router.post('/assign', authorize('admin'), assignOfficer);

module.exports = router;
