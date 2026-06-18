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

async function changePassword(req, res) {
  try {
    const { password } = req.body;
    const result = await authService.changePassword(
      req.user.customerId,
      password,
      req.user.email,
      req.clientContext,
    );
    return success(res, result, 'Password updated successfully');
  } catch (err) {
    return error(res, err.message || 'Password update failed', err.statusCode || 500);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, req.clientContext);
    return success(res, result, 'Signed in successfully');
  } catch (err) {
    return error(res, err.message || 'Login failed', err.statusCode || 401);
  }
}

module.exports = { sendOtp, verifyOtp, login, logout, changePassword };
