const auditLogModel = require('../models/auditLogModel');

async function logAuditEvent(data) {
  return auditLogModel.create({
    eventCode: data.eventCode,
    userIdentifier: data.userIdentifier,
    customerId: data.customerId,
    description: data.description,
    ipAddress: data.ipAddress,
    browser: data.browser,
    operatingSystem: data.operatingSystem,
    deviceType: data.deviceType,
    userAgent: data.userAgent,
    metadata: data.metadata,
  });
}

function buildAuditEntry(eventCode, description, context = {}) {
  return {
    event: eventCode,
    description,
    timestamp: new Date().toISOString(),
    ipAddress: context.ipAddress || null,
    browser: context.browser || null,
    operatingSystem: context.operatingSystem || null,
    deviceType: context.deviceType || null,
  };
}

module.exports = { logAuditEvent, buildAuditEntry };
