const pool = require('../config/database');
const customerModel = require('../models/customerModel');
const responseModel = require('../models/responseModel');
const consentModel = require('../models/consentModel');
const auditLogModel = require('../models/auditLogModel');
const { generateReferenceNumber } = require('../utils/reference');
const { logAuditEvent, buildAuditEntry } = require('./auditService');
const { sendConsentConfirmationEmail } = require('./emailService');

async function submitConsent(customerId, email, consentChoice, clientContext) {
  if (!['allow', 'deny'].includes(consentChoice)) {
    const err = new Error('Consent must be either "allow" or "deny"');
    err.statusCode = 400;
    throw err;
  }

  // Every submission creates a new consent record (history), so we no longer return early
  // if an existing one is found for this customer.

  const referenceNumber = generateReferenceNumber();
  const submittedAt = new Date();

  const customer = await customerModel.findById(customerId);
  const customerName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ') || null;

  const priorAudit = await auditLogModel.getByCustomerId(customerId);
  const auditHistory = priorAudit.map((entry) => ({
    event: entry.event,
    description: entry.description,
    timestamp: entry.timestamp,
  }));

  auditHistory.push(
    buildAuditEntry(
      'CONSENT_SUBMITTED',
      `Consent ${consentChoice === 'allow' ? 'granted' : 'denied'} by ${email}`,
      clientContext,
    ),
  );

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (consentChoice === 'deny') {
      await connection.query('DELETE FROM customer_response WHERE customer_id = ?', [customerId]);
      await connection.query(
        `UPDATE customer_master SET
          first_name = NULL, last_name = NULL, mobile = NULL, date_of_birth = NULL
         WHERE id = ?`,
        [customerId],
      );
    } else {
      await connection.query(
        'UPDATE customer_master SET reference_number = ? WHERE id = ?',
        [referenceNumber, customerId],
      );
    }

    await connection.query(
      `INSERT INTO customer_consent
        (customer_id, consent_status, reference_number, customer_name, submitted_at,
         ip_address, user_agent, browser, operating_system, device_type, audit_history)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        consentChoice,
        referenceNumber,
        customerName,
        submittedAt,
        clientContext.ipAddress,
        clientContext.userAgent,
        clientContext.browser,
        clientContext.operatingSystem,
        clientContext.deviceType,
        JSON.stringify(auditHistory),
      ],
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  await logAuditEvent({
    eventCode: 'CONSENT_SUBMITTED',
    userIdentifier: email,
    customerId,
    description:
      consentChoice === 'allow'
        ? `Data storage consent granted (${referenceNumber})`
        : `Data storage consent denied — personal data purged (${referenceNumber})`,
    ...clientContext,
    metadata: { referenceNumber, consentStatus: consentChoice },
  });

  // Send confirmation email asynchronously (don't block the response)
  sendConsentConfirmationEmail(email, {
    customerName,
    referenceNumber,
    consentStatus: consentChoice,
  }).catch((err) => console.error('Failed to send consent confirmation email:', err.message));

  return {
    referenceNumber,
    consent: consentChoice,
    consentStatus: consentChoice === 'allow' ? 'Allowed' : 'Declined',
    submittedAt: submittedAt.toISOString(),
    dataRetained: consentChoice === 'allow',
  };
}

module.exports = { submitConsent };
