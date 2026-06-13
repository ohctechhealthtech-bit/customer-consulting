const consentService = require('../services/consentService');
const { success, error } = require('../utils/apiResponse');

async function submitConsent(req, res) {
  try {
    const { consent } = req.body;
    const result = await consentService.submitConsent(
      req.user.customerId,
      req.user.email,
      consent,
      req.clientContext,
    );
    return success(res, result, 'Consent recorded successfully', 201);
  } catch (err) {
    return error(res, err.message || 'Failed to submit consent', err.statusCode || 500);
  }
}

module.exports = { submitConsent };
