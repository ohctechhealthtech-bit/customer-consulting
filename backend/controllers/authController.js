const authService = require('../services/authService');
const { success, error } = require('../utils/apiResponse');

async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    const result = await authService.sendOtp(email, req.clientContext);
    return success(res, result, 'OTP sent successfully');
  } catch (err) {
    return error(res, err.message || 'Failed to send OTP', err.statusCode || 500);
  }
}

async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp, req.clientContext);
    return success(res, result, 'OTP verified successfully');
  } catch (err) {
    return error(res, err.message || 'OTP verification failed', err.statusCode || 401);
  }
}

async function logout(req, res) {
  try {
    const result = await authService.logout(
      req.user.loginHistoryId,
      req.user.email,
      req.clientContext,
    );
    return success(res, result, 'Logged out successfully');
  } catch (err) {
    return error(res, err.message || 'Logout failed', err.statusCode || 500);
  }
}

module.exports = { sendOtp, verifyOtp, logout };
