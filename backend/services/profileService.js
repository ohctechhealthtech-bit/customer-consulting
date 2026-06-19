const pool = require('../config/database');
const { logAuditEvent } = require('./auditService');
const { sendEmail } = require('./emailService');
const env = require('../config/env');

/**
 * Fetches a customer's full profile for the edit form.
 */
async function getProfileForEdit(customerId) {
  const [rows] = await pool.query(
    `SELECT
       cm.id, cm.email,
       cm.first_name AS firstName, cm.last_name AS lastName,
       cm.mobile, cm.age, cm.employee_code AS employeeCode,
       com.id AS companyId, com.company_name AS companyName
     FROM customer_master cm
     LEFT JOIN company_master com ON com.id = cm.company_id
     WHERE cm.id = :customerId
     LIMIT 1`,
    { customerId },
  );
  return rows[0] || null;
}

/**
 * Updates a patient's profile.
 */
async function updateProfile(customerId, updates, performedByEmail, clientContext) {
  const current = await getProfileForEdit(customerId);
  if (!current) throw Object.assign(new Error('Customer not found'), { statusCode: 404 });

  // Email duplicate check
  if (updates.email && updates.email !== current.email) {
    const [dup] = await pool.query(
      'SELECT id FROM customer_master WHERE email = ? AND id <> ? LIMIT 1',
      [updates.email, customerId],
    );
    if (dup.length > 0) {
      throw Object.assign(new Error('This email address is already in use.'), { statusCode: 409 });
    }
  }

  // Resolve companyId
  let companyId = current.companyId;
  if (updates.companyName !== undefined) {
    const trimmed = (updates.companyName || '').trim();
    if (trimmed) {
      const [existing] = await pool.query(
        'SELECT id FROM company_master WHERE company_name = ? LIMIT 1',
        [trimmed],
      );
      companyId = existing.length > 0 ? existing[0].id : current.companyId;
    } else {
      companyId = null;
    }
  }

  const fieldMap = {
    firstName:    { col: 'first_name',   label: 'First Name' },
    lastName:     { col: 'last_name',    label: 'Last Name' },
    email:        { col: 'email',        label: 'Email Address' },
    mobile:       { col: 'mobile',       label: 'Mobile Number' },
    age:          { col: 'age',          label: 'Age' },
    employeeCode: { col: 'employee_code', label: 'Employee Code' },
  };

  const changes = [];
  for (const [key, meta] of Object.entries(fieldMap)) {
    if (updates[key] === undefined) continue;
    const oldVal = String(current[key] ?? '');
    const newVal = String(updates[key] ?? '');
    if (oldVal !== newVal) {
      changes.push({ fieldName: meta.label, dbCol: meta.col, oldValue: oldVal, newValue: newVal });
    }
  }

  if (updates.companyName !== undefined && (updates.companyName || '') !== (current.companyName || '')) {
    changes.push({
      fieldName: 'Company Name',
      dbCol: null,
      oldValue: current.companyName || '',
      newValue: updates.companyName || '',
    });
  }

  const emailChange = changes.find((c) => c.fieldName === 'Email Address');

  if (changes.length === 0) {
    return { message: 'No changes detected.', changes: [] };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const setClauses = [];
    const namedParams = {};
    for (const ch of changes) {
      if (ch.dbCol) { 
        setClauses.push(`${ch.dbCol} = :${ch.dbCol}`); 
        namedParams[ch.dbCol] = ch.newValue || null; 
      }
    }
    setClauses.push('company_id = :companyId');
    namedParams.companyId = companyId;
    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    await conn.query(
      `UPDATE customer_master SET ${setClauses.join(', ')} WHERE id = :customerId`,
      { ...namedParams, customerId },
    );

    if (emailChange) {
      await conn.query('UPDATE login_history SET email = :email WHERE customer_id = :customerId', { email: emailChange.newValue, customerId });
      await conn.query('UPDATE audit_logs SET user_identifier = :email WHERE customer_id = :customerId', { email: emailChange.newValue, customerId });
    }

    const now = new Date();
    for (const ch of changes) {
      await conn.query(
        `INSERT INTO profile_update_history
           (customer_id, field_name, old_value, new_value, updated_by, updated_at)
         VALUES (:customerId, :fieldName, :oldValue, :newValue, :updatedBy, :updatedAt)`,
        {
          customerId,
          fieldName: ch.fieldName,
          oldValue: ch.oldValue || null,
          newValue: ch.newValue || null,
          updatedBy: performedByEmail,
          updatedAt: now
        },
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const changedFields = changes.map((c) => c.fieldName).join(', ');
  await logAuditEvent({
    eventCode: 'PROFILE_UPDATED',
    userIdentifier: performedByEmail,
    customerId,
    description: `Patient profile updated. Changed fields: ${changedFields}`,
    ...clientContext,
    metadata: { changedFields, changes: changes.map((c) => ({ field: c.fieldName, from: c.oldValue, to: c.newValue })) },
  }).catch(e => console.error(e));

  if (emailChange) {
    const loginUrl = env.portalUrl;
    const notifyChange = async (to, isOld) => {
      const subject = 'OHCTECH: Email Address Updated';
      const html = `<div style="font-family:sans-serif;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2>Email Updated</h2>
        <p>Hello,</p>
        <p>${isOld ? `Your email has been changed to <strong>${emailChange.newValue}</strong>.` : `Your account email has been set to this address.`}</p>
        <p>If you didn't do this, contact support.</p>
        <a href="${loginUrl}" style="background:#1e3a8a;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">Portal</a>
      </div>`;
      return sendEmail({ to, subject, text: subject, html });
    };
    notifyChange(emailChange.oldValue, true).catch(e => console.error(e));
    notifyChange(emailChange.newValue, false).catch(e => console.error(e));
  }

  return { message: 'Profile updated successfully.', changes };
}

async function getProfileHistory(customerId) {
  const [rows] = await pool.query(
    `SELECT id, field_name AS fieldName, old_value AS oldValue, new_value AS newValue,
            updated_by AS updatedBy, updated_at AS updatedAt
     FROM profile_update_history
     WHERE customer_id = :customerId
     ORDER BY updated_at DESC
     LIMIT 300`,
    { customerId },
  );

  // Group individual field changes by timestamp and performer
  const groups = [];
  rows.forEach(row => {
    const ts = new Date(row.updatedAt).getTime();
    // We allow a 1-second window just in case SQL and JS have micro-drifts, 
    // although they should be identical due to our updateProfile fix.
    const last = groups[groups.length - 1];
    if (last && Math.abs(new Date(last.updatedAt).getTime() - ts) < 1000 && last.updatedBy === row.updatedBy) {
      last.changes.push({
        id: row.id,
        fieldName: row.fieldName,
        oldValue: row.oldValue,
        newValue: row.newValue
      });
    } else {
      groups.push({
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
        changes: [{
          id: row.id,
          fieldName: row.fieldName,
          oldValue: row.oldValue,
          newValue: row.newValue
        }]
      });
    }
  });

  return groups;
}

module.exports = { getProfileForEdit, updateProfile, getProfileHistory };
