const adminAuthService = require('../services/adminAuthService');
const { success, error } = require('../utils/apiResponse');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await adminAuthService.login(email, password, req.clientContext);
    return success(res, result, 'Admin login successful');
  } catch (err) {
    return error(res, err.message || 'Admin login failed', err.statusCode || 401);
  }
}

module.exports = { login };
