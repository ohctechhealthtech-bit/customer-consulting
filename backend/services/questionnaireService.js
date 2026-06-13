const questionModel = require('../models/questionModel');
const responseModel = require('../models/responseModel');
const customerModel = require('../models/customerModel');
const { logAuditEvent } = require('./auditService');

function groupQuestionsBySection(questions) {
  const sections = {
    personal: [],
    address: [],
    medical: [],
    additional: [],
  };

  for (const question of questions) {
    if (sections[question.section]) {
      sections[question.section].push(question);
    }
  }

  return sections;
}

async function getQuestions() {
  const questions = await questionModel.getAllActive();
  return {
    questions,
    sections: groupQuestionsBySection(questions),
  };
}

async function submitQuestionnaire(customerId, email, responses, clientContext) {
  const questionMap = await questionModel.getAllActiveMap();
  const normalized = [];

  if (!Array.isArray(responses) || responses.length === 0) {
    const err = new Error('At least one response is required');
    err.statusCode = 400;
    throw err;
  }

  for (const item of responses) {
    const questionId = item.questionId || item.question_id;
    const value = item.value ?? item.response_value;

    if (!questionId || value === undefined || value === null || String(value).trim() === '') {
      continue;
    }

    const question = questionMap.get(Number(questionId));
    if (!question) {
      const err = new Error(`Invalid question ID: ${questionId}`);
      err.statusCode = 400;
      throw err;
    }

    if (question.isRequired && String(value).trim() === '') {
      const err = new Error(`${question.label} is required`);
      err.statusCode = 422;
      throw err;
    }

    normalized.push({ questionId: Number(questionId), value: String(value).trim() });
  }

  if (normalized.length === 0) {
    const err = new Error('No valid responses provided');
    err.statusCode = 400;
    throw err;
  }

  await responseModel.upsertMany(customerId, normalized);

  const personalFields = {};
  for (const item of normalized) {
    const question = questionMap.get(item.questionId);
    if (!question) continue;
    if (question.questionKey === 'personal.firstName') personalFields.firstName = item.value;
    if (question.questionKey === 'personal.lastName') personalFields.lastName = item.value;
    if (question.questionKey === 'personal.mobile') personalFields.mobile = item.value;
    if (question.questionKey === 'personal.dob') personalFields.dob = item.value;
  }

  if (Object.keys(personalFields).length > 0) {
    await customerModel.updatePersonalData(customerId, personalFields);
  }

  await logAuditEvent({
    eventCode: 'QUESTIONNAIRE_SUBMITTED',
    userIdentifier: email,
    customerId,
    description: `Questionnaire submitted with ${normalized.length} responses`,
    ...clientContext,
  });

  const savedResponses = await responseModel.getByCustomerId(customerId);

  return {
    customerId,
    responseCount: normalized.length,
    responses: savedResponses,
  };
}

module.exports = { getQuestions, submitQuestionnaire };
