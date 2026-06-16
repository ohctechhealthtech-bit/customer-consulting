const customerModel = require('../models/customerModel');
const otpModel = require('../models/otpModel');
const loginHistoryModel = require('../models/loginHistoryModel');
const { generateOtp, getOtpExpiryDate, isOtpExpired } = require('../utils/otp');
const { signToken } = require('../utils/jwt');
const env = require('../config/env');
const { sendOtpEmail } = require('./emailService');
const { logAuditEvent } = require('./auditService');

async function sendOtp(email, clientContext) {
  const customer = await customerModel.findOrCreate(email);
  const otpCode = generateOtp();
  const expiresAt = getOtpExpiryDate();

  const patientName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ') || null;

  await otpModel.create(email, otpCode, expiresAt);

  // Send email and log audit event in background to minimize response time
  sendOtpEmail(email, otpCode, patientName).catch((err) =>
    console.error(`[Background Email Error] ${err.message}`),
  );

  logAuditEvent({
    eventCode: 'OTP_SENT',
    userIdentifier: email,
    customerId: customer.id,
    description: `OTP sent to ${email}`,
    ...clientContext,
  }).catch((err) => console.error(`[Background Audit Error] ${err.message}`));

  return {
    email,
    expiresInMinutes: env.otp.expiryMinutes,
    message: 'OTP sent successfully',
  };
}

async function verifyOtp(email, otpCode, clientContext) {
  const otpRecord = await otpModel.findLatestActive(email);

  if (!otpRecord) {
    const err = new Error('No active OTP found. Please request a new code.');
    err.statusCode = 404;
    throw err;
  }

  if (isOtpExpired(otpRecord.expires_at)) {
    const err = new Error('OTP has expired. Please request a new code.');
    err.statusCode = 410;
    throw err;
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    const err = new Error('Maximum OTP attempts exceeded. Please request a new code.');
    err.statusCode = 429;
    throw err;
  }

  if (otpRecord.otp_code !== otpCode) {
    await otpModel.incrementAttempts(otpRecord.id);
    const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
    const err = new Error(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Invalid OTP. Maximum attempts exceeded.',
    );
    err.statusCode = 401;
    throw err;
  }

  await otpModel.markVerified(otpRecord.id);

  const customer = await customerModel.findOrCreate(email);
  const loginRecord = await loginHistoryModel.create({
    customerId: customer.id,
    email,
    ...clientContext,
    loginTime: new Date(),
  });

  await logAuditEvent({
    eventCode: 'OTP_VERIFIED',
    userIdentifier: email,
    customerId: customer.id,
    description: `OTP verified for ${email}`,
    ...clientContext,
    metadata: { loginHistoryId: loginRecord.id },
  });

  await logAuditEvent({
    eventCode: 'LOGIN',
    userIdentifier: email,
    customerId: customer.id,
    description: `Customer login from ${clientContext.deviceType || 'unknown device'}`,
    ...clientContext,
    metadata: { loginHistoryId: loginRecord.id },
  });

  const token = signToken({
    customerId: customer.id,
    email: customer.email,
    loginHistoryId: loginRecord.id,
    role: 'customer',
  });

  return {
    token,
    customer: {
      id: customer.id,
      email: customer.email,
    },
    loginHistoryId: loginRecord.id,
  };
}

async function logout(loginHistoryId, email, clientContext) {
  if (loginHistoryId) {
    await loginHistoryModel.updateLogout(loginHistoryId);
  }

  await logAuditEvent({
    eventCode: 'LOGOUT',
    userIdentifier: email,
    description: `Customer logout`,
    ...clientContext,
    metadata: { loginHistoryId },
  });

  return { message: 'Logged out successfully' };
}

module.exports = { sendOtp, verifyOtp, logout };
