const customerModel = require('../models/customerModel');
const adminModel = require('../models/adminModel');
const otpModel = require('../models/otpModel');
const loginHistoryModel = require('../models/loginHistoryModel');
const { generateOtp, getOtpExpiryDate, isOtpExpired } = require('../utils/otp');
const { signToken } = require('../utils/jwt');
const env = require('../config/env');
const { sendOtpEmail } = require('./emailService');
const { logAuditEvent } = require('./auditService');
const { hashPassword, verifyPassword, generateTemporaryPassword } = require('../utils/password');

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
      mustChangePassword: !!(customer.password_hash && customer.must_change_password),
      registered: !!(customer.first_name || customer.reference_number),
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

async function changePassword(customerId, newPassword, email, clientContext) {
  const { hashPassword } = require('../utils/password');
  const passwordHash = hashPassword(newPassword);
  
  await customerModel.updatePassword(customerId, passwordHash);

  await logAuditEvent({
    eventCode: 'PASSWORD_CHANGED',
    userIdentifier: email,
    customerId,
    description: 'Password updated by user',
    ...clientContext,
  });
}

async function login(email, password, clientContext) {
  // 1. Try Admin Login first
  const admin = await adminModel.findByEmail(email);
  if (admin && verifyPassword(password, admin.password_hash)) {
    await adminModel.updateLastLogin(admin.id);
    await logAuditEvent({
      eventCode: 'ADMIN_LOGIN',
      userIdentifier: admin.email,
      description: `Admin login from ${clientContext.deviceType || 'unknown device'}`,
      ...clientContext,
      metadata: { adminId: admin.id },
    });

    const token = signToken({
      adminId: admin.id,
      email: admin.email,
      role: 'admin',
    });

    return {
      token,
      role: 'admin',
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  // 2. Try Customer Login
  const customer = await customerModel.findByEmail(email);
  if (!customer || !customer.password_hash) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isValid = verifyPassword(password, customer.password_hash);
  if (!isValid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const loginRecord = await loginHistoryModel.create({
    customerId: customer.id,
    email,
    ...clientContext,
    loginTime: new Date(),
  });

  await logAuditEvent({
    eventCode: 'LOGIN',
    userIdentifier: email,
    customerId: customer.id,
    description: `Customer password login from ${clientContext.deviceType || 'unknown device'}`,
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
    role: 'customer',
    customer: {
      id: customer.id,
      email: customer.email,
      mustChangePassword: !!customer.must_change_password,
      registered: !!(customer.first_name || customer.reference_number),
    },
    loginHistoryId: loginRecord.id,
  };
}

module.exports = { sendOtp, verifyOtp, login, logout, changePassword };
