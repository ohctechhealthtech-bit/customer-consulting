const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const profileController = require('../controllers/profileController');

router.get('/dashboard', authenticate, dashboardController.getDashboardData);
router.get('/history', authenticate, dashboardController.getHistory);

// Profile management
router.get('/profile', authenticate, profileController.getProfile);
router.put('/profile', authenticate, profileController.updateProfile);
router.get('/profile/history', authenticate, profileController.getProfileHistory);

module.exports = router;
