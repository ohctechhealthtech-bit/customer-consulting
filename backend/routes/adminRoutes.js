const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate');
const { authenticateAdmin } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

const router = require('express').Router();
// Admin login is now handled via the central /api/auth/login endpoint
// router.post('/login', loginValidation, adminAuthController.login);

router.use(authenticateAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerDetail);
router.get('/customers-with-responses', adminController.getCustomersWithResponses);
router.get('/customers-with-responses/export', adminController.exportResponsesCsv);
router.get('/consents', adminController.getConsents);
router.get('/login-history', adminController.getLoginHistory);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;