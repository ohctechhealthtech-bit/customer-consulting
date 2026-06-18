const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

const sendOtpValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  validateRequest,
];

const verifyOtpValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code'),
  validateRequest,
];

const router = require('express').Router();

router.post('/send-otp', otpLimiter, sendOtpValidation, authController.sendOtp);
router.post('/verify-otp', verifyOtpValidation, authController.verifyOtp);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
