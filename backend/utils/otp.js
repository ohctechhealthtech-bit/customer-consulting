const env = require('../config/env');

function generateOtp() {
  const max = 10 ** env.otp.length;
  const min = 10 ** (env.otp.length - 1);
  return String(Math.floor(min + Math.random() * (max - min)));
}

function getOtpExpiryDate() {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + env.otp.expiryMinutes);
  return expires;
}

function isOtpExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

module.exports = { generateOtp, getOtpExpiryDate, isOtpExpired };
