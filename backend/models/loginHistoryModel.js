const pool = require('../config/database');

const loginHistoryModel = {
  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO login_history
        (customer_id, email, ip_address, browser, operating_system, device_type, user_agent, login_time)
       VALUES
        (:customerId, :email, :ipAddress, :browser, :operatingSystem, :deviceType, :userAgent, :loginTime)`,
      {
        customerId: data.customerId || null,
        email: data.email,
        ipAddress: data.ipAddress,
        browser: data.browser,
        operatingSystem: data.operatingSystem,
        deviceType: data.deviceType,
        userAgent: data.userAgent,
        loginTime: data.loginTime || new Date(),
      },
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM login_history WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async updateLogout(id, logoutTime = new Date()) {
    await pool.query(
      'UPDATE login_history SET logout_time = :logoutTime WHERE id = :id',
      { id, logoutTime },
    );
  },

  async getAll(filters = {}) {
    let sql = 'SELECT * FROM login_history WHERE 1=1';
    const params = {};

    if (filters.search) {
      sql += ' AND (email LIKE :search OR ip_address LIKE :search)';
      params.search = `%${filters.search}%`;
    }

    if (filters.device && filters.device !== 'all') {
      sql += ' AND device_type = :device';
      params.device = filters.device;
    }

    sql += ' ORDER BY login_time DESC';

    if (filters.limit) {
      sql += ' LIMIT :limit OFFSET :offset';
      params.limit = filters.limit;
      params.offset = filters.offset || 0;
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(formatLoginRow);
  },

  async countTodayLogins() {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM login_history WHERE DATE(login_time) = CURDATE()',
    );
    return rows[0].total;
  },

  async getDeviceDistribution() {
    const [rows] = await pool.query(
      `SELECT device_type AS name, COUNT(*) AS value
       FROM login_history
       WHERE device_type IS NOT NULL
       GROUP BY device_type`,
    );
    return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
  },

  async getBrowserUsage() {
    const [rows] = await pool.query(
      `SELECT
        SUBSTRING_INDEX(browser, ' ', 1) AS name,
        COUNT(*) AS value
       FROM login_history
       WHERE browser IS NOT NULL
       GROUP BY name
       ORDER BY value DESC`,
    );
    return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
  },
};

function formatLoginRow(row) {
  return {
    id: row.id,
    email: row.email,
    loginTime: new Date(row.login_time).toISOString(),
    logoutTime: row.logout_time ? new Date(row.logout_time).toISOString() : null,
    ip: row.ip_address,
    browser: row.browser,
    os: row.operating_system,
    device: row.device_type,
    userAgent: row.user_agent,
  };
}

module.exports = loginHistoryModel;
