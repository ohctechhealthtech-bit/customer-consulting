const pool = require('../config/database');

const adminModel = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE email = :email AND is_active = 1 LIMIT 1',
      { email },
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, email, full_name, is_active, last_login_at, created_at FROM admin_users WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async updateLastLogin(id) {
    await pool.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = :id',
      { id },
    );
  },
};

module.exports = adminModel;
