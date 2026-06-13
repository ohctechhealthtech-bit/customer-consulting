const pool = require('../config/database');

const customerModel = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM customer_master WHERE email = :email LIMIT 1',
      { email },
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM customer_master WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async create(email) {
    const [result] = await pool.query(
      'INSERT INTO customer_master (email) VALUES (:email)',
      { email },
    );
    return this.findById(result.insertId);
  },

  async findOrCreate(email) {
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    return this.create(email);
  },

  async updatePersonalData(id, data) {
    await pool.query(
      `UPDATE customer_master SET
        first_name = :firstName,
        last_name = :lastName,
        mobile = :mobile,
        date_of_birth = :dateOfBirth,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :id`,
      {
        id,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        mobile: data.mobile || null,
        dateOfBirth: data.dob || null,
      },
    );
  },

  async updateReference(id, referenceNumber) {
    await pool.query(
      'UPDATE customer_master SET reference_number = :referenceNumber WHERE id = :id',
      { id, referenceNumber },
    );
  },

  async purgePersonalData(id) {
    await pool.query(
      `UPDATE customer_master SET
        first_name = NULL,
        last_name = NULL,
        mobile = NULL,
        date_of_birth = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :id`,
      { id },
    );
  },

  async getAllWithConsent(filters = {}) {
    let sql = `
      SELECT
        cm.id,
        cm.email,
        cc.reference_number AS reference,
        COALESCE(cc.customer_name, CONCAT(COALESCE(cm.first_name, ''), ' ', COALESCE(cm.last_name, ''))) AS name,
        cm.mobile,
        cc.consent_status,
        cc.submitted_at AS submittedAt
      FROM customer_consent cc
      INNER JOIN customer_master cm ON cm.id = cc.customer_id
      WHERE 1=1
    `;
    const params = {};

    if (filters.consentStatus) {
      sql += ' AND cc.consent_status = :consentStatus';
      params.consentStatus = filters.consentStatus === 'Accepted' ? 'allow' : 'deny';
    }

    if (filters.search) {
      sql += ` AND (
        cm.email LIKE :search OR
        cc.reference_number LIKE :search OR
        cc.customer_name LIKE :search OR
        CONCAT(cm.first_name, ' ', cm.last_name) LIKE :search
      )`;
      params.search = `%${filters.search}%`;
    }

    if (filters.sort === 'date-asc') {
      sql += ' ORDER BY cc.submitted_at ASC';
    } else if (filters.sort === 'name') {
      sql += ' ORDER BY name ASC';
    } else {
      sql += ' ORDER BY cc.submitted_at DESC';
    }

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(formatCustomerRow);
  },

  async countWithConsent() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM customer_consent');
    return rows[0].total;
  },

  async getAllWithResponses(filters = {}) {
    let sql = `
      SELECT
        cm.id,
        cm.email,
        cc.reference_number AS reference,
        COALESCE(cc.customer_name, CONCAT(COALESCE(cm.first_name, ''), ' ', COALESCE(cm.last_name, ''))) AS name,
        cm.mobile,
        cc.consent_status,
        cc.submitted_at AS submittedAt
      FROM customer_consent cc
      INNER JOIN customer_master cm ON cm.id = cc.customer_id
      WHERE 1=1
    `;
    const params = {};

    if (filters.search) {
      sql += ` AND (
        cm.email LIKE :search OR
        cc.reference_number LIKE :search OR
        cc.customer_name LIKE :search OR
        CONCAT(cm.first_name, ' ', cm.last_name) LIKE :search
      )`;
      params.search = `%${filters.search}%`;
    }

    sql += ' ORDER BY cc.submitted_at DESC';

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [customers] = await pool.query(sql, params);
    if (customers.length === 0) return [];

    const customerIds = customers.map((c) => c.id);

    const [responses] = await pool.query(
      `SELECT cr.customer_id AS customerId, cr.response_value AS value,
              qm.question_key AS questionKey, qm.label, qm.section,
              qm.field_type AS fieldType
       FROM customer_response cr
       INNER JOIN question_master qm ON qm.id = cr.question_id
       WHERE cr.customer_id IN (:ids)
       ORDER BY qm.section, qm.display_order ASC`,
      { ids: customerIds },
    );

    const responseMap = {};
    responses.forEach((r) => {
      if (!responseMap[r.customerId]) responseMap[r.customerId] = [];
      responseMap[r.customerId].push({
        questionKey: r.questionKey,
        label: r.label,
        section: r.section,
        fieldType: r.fieldType,
        value: r.value,
      });
    });

    return customers.map((row) => ({
      id: row.id,
      reference: row.reference,
      name: (row.name || '').trim() || '—',
      email: row.email,
      mobile: row.mobile || '—',
      consent: row.consent_status === 'allow' ? 'Accepted' : 'Rejected',
      submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
      responses: responseMap[row.id] || [],
    }));
  },

  async getCustomerDetail(customerId) {
    const [customerRows] = await pool.query(
      `SELECT cm.id, cm.email,
              cc.reference_number AS reference,
              COALESCE(cc.customer_name, CONCAT(COALESCE(cm.first_name, ''), ' ', COALESCE(cm.last_name, ''))) AS name,
              cm.mobile, cm.date_of_birth AS dateOfBirth,
              cc.consent_status AS consentStatus, cc.submitted_at AS submittedAt
       FROM customer_master cm
       INNER JOIN customer_consent cc ON cc.customer_id = cm.id
       WHERE cm.id = :customerId
       LIMIT 1`,
      { customerId },
    );
    if (!customerRows[0]) return null;
    const customer = customerRows[0];

    const [responses] = await pool.query(
      `SELECT cr.response_value AS value, qm.question_key AS questionKey,
              qm.label, qm.section, qm.field_type AS fieldType
       FROM customer_response cr
       INNER JOIN question_master qm ON qm.id = cr.question_id
       WHERE cr.customer_id = :customerId
       ORDER BY qm.section, qm.display_order ASC`,
      { customerId },
    );

    return {
      id: customer.id,
      reference: customer.reference,
      name: customer.name || null,
      email: customer.email,
      mobile: customer.mobile || null,
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString() : null,
      consent: customer.consentStatus === 'allow' ? 'Accepted' : 'Rejected',
      submittedAt: customer.submittedAt ? new Date(customer.submittedAt).toISOString() : null,
      responses: responses.map((r) => ({
        questionKey: r.questionKey,
        label: r.label,
        section: r.section,
        fieldType: r.fieldType,
        value: r.value,
      })),
    };
  },
};

function formatCustomerRow(row) {
  const name = (row.name || '').trim() || '—';
  return {
    id: row.id,
    reference: row.reference,
    name,
    email: row.email,
    mobile: row.mobile || '—',
    consent: row.consent_status === 'allow' ? 'Accepted' : 'Rejected',
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
  };
}

module.exports = customerModel;
