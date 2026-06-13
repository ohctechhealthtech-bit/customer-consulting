const questionnaireService = require('../services/questionnaireService');
const { success, error } = require('../utils/apiResponse');

async function getQuestions(req, res) {
  try {
    const result = await questionnaireService.getQuestions();
    return success(res, result);
  } catch (err) {
    return error(res, err.message || 'Failed to fetch questions', err.statusCode || 500);
  }
}

async function submitQuestionnaire(req, res) {
  try {
    const { responses } = req.body;
    const result = await questionnaireService.submitQuestionnaire(
      req.user.customerId,
      req.user.email,
      responses,
      req.clientContext,
    );
    return success(res, result, 'Questionnaire submitted successfully', 201);
  } catch (err) {
    return error(res, err.message || 'Failed to submit questionnaire', err.statusCode || 500);
  }
}

module.exports = { getQuestions, submitQuestionnaire };
