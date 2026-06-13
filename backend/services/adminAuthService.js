const adminModel = require('../models/adminModel');
const { verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { logAuditEvent } = require('./auditService');

async function login(email, password, clientContext) {
  const admin = await adminModel.findByEmail(email);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

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
    admin: {
      id: admin.id,
      email: admin.email,
    },
  };
}

module.exports = { login };
