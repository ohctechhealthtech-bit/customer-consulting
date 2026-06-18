const pool = require('../config/database');

const consentModel = {
  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO customer_consent
        (customer_id, consent_status, reference_number, submitted_at,
         ip_address, user_agent, browser, operating_system, device_type, audit_history)
       VALUES
        (:customerId, :consentStatus, :referenceNumber, :submittedAt,
         :ipAddress, :userAgent, :browser, :operatingSystem, :deviceType, :auditHistory)`,
      {
        customerId: data.customerId,
        consentStatus: data.consentStatus,
        referenceNumber: data.referenceNumber,
        submittedAt: data.submittedAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        browser: data.browser,
        operatingSystem: data.operatingSystem,
        deviceType: data.deviceType,
        auditHistory: JSON.stringify(data.auditHistory || []),
      },
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM customer_consent WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async findByCustomerId(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM customer_consent WHERE customer_id = :customerId ORDER BY submitted_at DESC LIMIT 1',
      { customerId },
    );
    return rows[0] || null;
  },

  async getHistoryByCustomerId(customerId) {
    const [rows] = await pool.query(
      `SELECT * FROM consent_history
       WHERE customer_id = :customerId
       ORDER BY performed_at DESC`,
      { customerId },
    );
    return rows;
  },

  async getAll(filters = {}) {
    let sql = `
      SELECT cc.*, cm.email
      FROM customer_consent cc
      INNER JOIN customer_master cm ON cm.id = cc.customer_id
      WHERE 1=1
    `;
    const params = {};

    if (filters.consentStatus) {
      sql += ' AND cc.consent_status = :consentStatus';
      params.consentStatus = filters.consentStatus;
    }

    sql += ' ORDER BY cc.submitted_at DESC';

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(formatConsentRow);
  },

  async getStats() {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN consent_status = 'allow' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN consent_status = 'deny' THEN 1 ELSE 0 END) AS rejected
      FROM customer_consent
    `);
    return rows[0];
  },

  async getDailySubmissions(days = 14) {
    const [rows] = await pool.query(
      `SELECT
        DATE(submitted_at) AS day,
        COUNT(*) AS submissions,
        SUM(CASE WHEN consent_status = 'allow' THEN 1 ELSE 0 END) AS accepted
       FROM customer_consent
       WHERE submitted_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY DATE(submitted_at)
       ORDER BY day ASC`,
      { days },
    );
    return rows;
  },

  async getMonthlyTrend(months = 12) {
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(submitted_at, '%Y-%m') AS monthKey,
        DATE_FORMAT(submitted_at, '%b') AS month,
        SUM(CASE WHEN consent_status = 'allow' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN consent_status = 'deny' THEN 1 ELSE 0 END) AS rejected
       FROM customer_consent
       WHERE submitted_at >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
       GROUP BY monthKey, month
       ORDER BY monthKey ASC`,
      { months },
    );
    return rows;
  },

  async logHistory(data) {
    await pool.query(
      `INSERT INTO consent_history
        (customer_id, action, performed_by, performed_at)
       VALUES
        (:customerId, :action, :performedBy, :performedAt)`,
      {
        customerId: data.customerId,
        action: data.action,
        performedBy: data.performedBy,
        performedAt: data.performedAt || new Date(),
      },
    );
  },
};

function formatConsentRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    email: row.email,
    consentStatus: row.consent_status,
    consent: row.consent_status === 'allow' ? 'Accepted' : 'Rejected',
    referenceNumber: row.reference_number,
    submittedAt: new Date(row.submitted_at).toISOString(),
    ipAddress: row.ip_address,
    browser: row.browser,
    operatingSystem: row.operating_system,
    deviceType: row.device_type,
    auditHistory: row.audit_history
      ? typeof row.audit_history === 'string'
        ? JSON.parse(row.audit_history)
        : row.audit_history
      : [],
  };
}

module.exports = consentModel;
