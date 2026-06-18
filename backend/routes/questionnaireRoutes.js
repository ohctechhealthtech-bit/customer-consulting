const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const questionnaireController = require('../controllers/questionnaireController');

const submitValidation = [
  body('responses').isArray({ min: 1 }).withMessage('Responses must be a non-empty array'),
  body('responses.*.questionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('questionId must be a positive integer'),
  body('responses.*.question_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('question_id must be a positive integer'),
  body('responses.*.value').optional().isString().withMessage('value must be a string'),
  validateRequest,
];

const router = require('express').Router();

router.get('/', questionnaireController.getQuestions);
router.post(
  '/submit',
  authenticate,
  submitValidation,
  questionnaireController.submitQuestionnaire,
);

module.exports = router;
