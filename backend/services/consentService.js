const pool = require('../config/database');
const customerModel = require('../models/customerModel');
const responseModel = require('../models/responseModel');
const consentModel = require('../models/consentModel');
const auditLogModel = require('../models/auditLogModel');
const { generateReferenceNumber } = require('../utils/reference');
const { logAuditEvent, buildAuditEntry } = require('./auditService');
const { sendConsentConfirmationEmail, sendAccountCreationEmail } = require('./emailService');
const { hashPassword, generateTemporaryPassword } = require('../utils/password');

async function submitConsent(customerId, email, action, clientContext) {
  const validActions = ['ACCEPT', 'REJECT', 'WITHDRAW'];
  if (!validActions.includes(action)) {
    const err = new Error(`Invalid action: ${action}. Must be one of ${validActions.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const consentStatusMap = {
    ACCEPT: 'allow',
    REJECT: 'deny',
    WITHDRAW: 'withdrawn',
  };
  const consentChoice = consentStatusMap[action];
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
      'CONSENT_ACTION',
      `Consent ${action.toLowerCase()}ed by ${email}`,
      clientContext,
    ),
  );

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (action === 'REJECT' || action === 'WITHDRAW') {
      await connection.query('DELETE FROM customer_response WHERE customer_id = ?', [customerId]);
      await connection.query(
        `UPDATE customer_master SET
          first_name = NULL, last_name = NULL, mobile = NULL,
          age = NULL, company_id = NULL, employee_code = NULL,
          password_hash = NULL, must_change_password = 1, last_password_change = NULL
         WHERE id = ?`,
        [customerId],
      );
    } else if (action === 'ACCEPT') {
      const needsPassword = !customer.password_hash;
      
      if (needsPassword) {
        const tempPassword = generateTemporaryPassword();
        const passwordHash = hashPassword(tempPassword);

        await connection.query(
          `UPDATE customer_master SET
            reference_number = ?,
            password_hash = ?,
            must_change_password = 1,
            last_password_change = NULL
           WHERE id = ?`,
          [referenceNumber, passwordHash, customerId],
        );
        clientContext._tempPassword = tempPassword;
      } else {
        await connection.query(
          'UPDATE customer_master SET reference_number = ? WHERE id = ?',
          [referenceNumber, customerId],
        );
      }
    }

    await connection.query(
      `INSERT INTO customer_consent
        (customer_id, consent_status, reference_number, submitted_at,
         ip_address, user_agent, browser, operating_system, device_type, audit_history)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        consentChoice,
        referenceNumber,
        submittedAt,
        clientContext.ipAddress,
        clientContext.userAgent,
        clientContext.browser,
        clientContext.operatingSystem,
        clientContext.deviceType,
        JSON.stringify(auditHistory),
      ],
    );

    // Track consent history
    await connection.query(
      `INSERT INTO consent_history (customer_id, action, performed_by, performed_at)
       VALUES (?, ?, ?, ?)`,
      [customerId, action, email, submittedAt],
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  await logAuditEvent({
    eventCode: 'CONSENT_ACTION',
    userIdentifier: email,
    customerId,
    description:
      action === 'ACCEPT'
        ? `Data storage consent granted (${referenceNumber})`
        : `Data storage consent ${action.toLowerCase()}ed — personal data purged (${referenceNumber})`,
    ...clientContext,
    metadata: { referenceNumber, action, consentStatus: consentChoice },
  });

  // Send confirmation email asynchronously (don't block the response)
  sendConsentConfirmationEmail(email, {
    customerName,
    referenceNumber,
    consentStatus: consentChoice,
  }).catch((err) => console.error('Failed to send consent confirmation email:', err.message));

  if (action === 'ACCEPT' && clientContext._tempPassword) {
    sendAccountCreationEmail(email, {
      customerName,
      temporaryPassword: clientContext._tempPassword,
    }).catch((err) => console.error('Failed to send account creation email:', err.message));
  }

  return {
    referenceNumber,
    consent: consentChoice,
    consentStatus: consentChoice === 'allow' ? 'Allowed' : 'Declined',
    submittedAt: submittedAt.toISOString(),
    dataRetained: consentChoice === 'allow',
  };
}

module.exports = { submitConsent };
