const profileService = require('../services/profileService');
const { success, error } = require('../utils/apiResponse');

async function getProfile(req, res) {
  try {
    const profile = await profileService.getProfileForEdit(req.user.customerId);
    if (!profile) return error(res, 'Customer not found', 404);
    return success(res, profile, 'Profile retrieved');
  } catch (err) {
    console.error('[ProfileController.getProfile]', err);
    return error(res, err.message || 'Failed to retrieve profile', err.statusCode || 500);
  }
}

async function updateProfile(req, res) {
  try {
    const result = await profileService.updateProfile(
      req.user.customerId,
      req.body,
      req.user.email,
      req.clientContext,
    );
    return success(res, result, result.message || 'Profile updated successfully.');
  } catch (err) {
    console.error('[ProfileController.updateProfile]', err);
    return error(res, err.message || 'Failed to update profile', err.statusCode || 500);
  }
}

async function getProfileHistory(req, res) {
  try {
    const history = await profileService.getProfileHistory(req.user.customerId);
    return success(res, history, 'Profile history retrieved');
  } catch (err) {
    console.error('[ProfileController.getProfileHistory]', err);
    return error(res, err.message || 'Failed to retrieve profile history', 500);
  }
}

module.exports = { getProfile, updateProfile, getProfileHistory };
