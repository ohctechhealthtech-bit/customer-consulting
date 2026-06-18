const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const consentController = require('../controllers/consentController');

const consentValidation = [
  body('action')
    .optional()
    .isIn(['ACCEPT', 'REJECT', 'WITHDRAW'])
    .withMessage('Invalid action'),
  body('consent')
    .optional()
    .isIn(['allow', 'deny'])
    .withMessage('Consent must be "allow" or "deny"'),
  validateRequest,
];

const router = require('express').Router();

router.post('/', authenticate, consentValidation, consentController.submitConsent);

module.exports = router;
