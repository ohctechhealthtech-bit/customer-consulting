const pool = require('../config/database');

const auditLogModel = {
  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO audit_logs
        (event_code, user_identifier, customer_id, description,
         ip_address, browser, operating_system, device_type, user_agent, metadata)
       VALUES
        (:eventCode, :userIdentifier, :customerId, :description,
         :ipAddress, :browser, :operatingSystem, :deviceType, :userAgent, :metadata)`,
      {
        eventCode: data.eventCode,
        userIdentifier: data.userIdentifier,
        customerId: data.customerId || null,
        description: data.description || null,
        ipAddress: data.ipAddress || null,
        browser: data.browser || null,
        operatingSystem: data.operatingSystem || null,
        deviceType: data.deviceType || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async getAll(filters = {}) {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = {};

    if (filters.search) {
      sql += ' AND (description LIKE :search OR user_identifier LIKE :search OR event_code LIKE :search)';
      params.search = `%${filters.search}%`;
    }

    if (filters.event && filters.event !== 'all') {
      sql += ' AND event_code = :event';
      params.event = filters.event;
    }

    if (filters.days) {
      sql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)';
      params.days = parseInt(filters.days, 10);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(formatAuditRow);
  },

  async getByCustomerId(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE customer_id = :customerId ORDER BY created_at ASC',
      { customerId },
    );
    return rows.map(formatAuditRow);
  },

  async getLoginHistory(filters = {}) {
    let sql = `SELECT * FROM audit_logs WHERE event_code IN ('ADMIN_LOGIN', 'LOGIN', 'OTP_VERIFIED')`;
    const params = {};

    if (filters.search) {
      sql += ' AND (user_identifier LIKE :search OR ip_address LIKE :search)';
      params.search = `%${filters.search}%`;
    }

    if (filters.device && filters.device !== 'all') {
      sql += ' AND device_type = :device';
      params.device = filters.device;
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [rows] = await pool.query(sql, params);

    if (rows.length === 0) return [];

    const userIdentifiers = [...new Set(rows.map((r) => r.user_identifier))];

    const [logoutRows] = await pool.query(
      `SELECT * FROM audit_logs WHERE event_code = 'LOGOUT' AND user_identifier IN (:identifiers) ORDER BY created_at DESC`,
      { identifiers: userIdentifiers },
    );

    const logoutMap = {};
    logoutRows.forEach((l) => {
      if (!logoutMap[l.user_identifier]) logoutMap[l.user_identifier] = [];
      logoutMap[l.user_identifier].push(l);
    });

    return rows.map((login) => {
      const userLogouts = logoutMap[login.user_identifier] || [];
      const loginTime = new Date(login.created_at);
      const matchingLogout = userLogouts.find((l) => new Date(l.created_at) > loginTime);

      return {
        id: login.id,
        email: login.user_identifier,
        loginTime: new Date(login.created_at).toISOString(),
        logoutTime: matchingLogout ? new Date(matchingLogout.created_at).toISOString() : null,
        ip: login.ip_address,
        browser: login.browser,
        os: login.operating_system,
        device: login.device_type,
      };
    });
  },

  async countTodayLogins() {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs
       WHERE event_code IN ('ADMIN_LOGIN', 'LOGIN', 'OTP_VERIFIED')
       AND DATE(created_at) = CURDATE()`,
    );
    return rows[0].total;
  },

  async getDeviceDistribution() {
    const [rows] = await pool.query(
      `SELECT device_type AS name, COUNT(*) AS value
       FROM audit_logs
       WHERE event_code IN ('ADMIN_LOGIN', 'LOGIN', 'OTP_VERIFIED')
       AND device_type IS NOT NULL
       GROUP BY device_type`,
    );
    return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
  },

  async getBrowserUsage() {
    const [rows] = await pool.query(
      `SELECT
        SUBSTRING_INDEX(browser, ' ', 1) AS name,
        COUNT(*) AS value
       FROM audit_logs
       WHERE event_code IN ('ADMIN_LOGIN', 'LOGIN', 'OTP_VERIFIED')
       AND browser IS NOT NULL
       GROUP BY name
       ORDER BY value DESC`,
    );
    return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
  },
};

function formatAuditRow(row) {
  return {
    id: `EVT-${String(10000 + row.id)}`,
    event: row.event_code,
    user: row.user_identifier,
    timestamp: new Date(row.created_at).toISOString(),
    description: row.description,
    ipAddress: row.ip_address,
    browser: row.browser,
    operatingSystem: row.operating_system,
    deviceType: row.device_type,
    metadata: row.metadata
      ? typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
      : null,
  };
}

module.exports = auditLogModel;
