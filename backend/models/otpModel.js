const pool = require('../config/database');
const env = require('../config/env');

const otpModel = {
  async invalidatePrevious(email) {
    await pool.query(
      'UPDATE otp_verification SET is_verified = 1 WHERE email = :email AND is_verified = 0',
      { email },
    );
  },

  async create(email, otpCode, expiresAt) {
    await this.invalidatePrevious(email);
    const [result] = await pool.query(
      `INSERT INTO otp_verification (email, otp_code, expires_at, max_attempts)
       VALUES (:email, :otpCode, :expiresAt, :maxAttempts)`,
      {
        email,
        otpCode,
        expiresAt,
        maxAttempts: env.otp.maxAttempts,
      },
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM otp_verification WHERE id = :id LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async findLatestActive(email) {
    const [rows] = await pool.query(
      `SELECT * FROM otp_verification
       WHERE email = :email AND is_verified = 0
       ORDER BY created_at DESC LIMIT 1`,
      { email },
    );
    return rows[0] || null;
  },

  async incrementAttempts(id) {
    await pool.query(
      'UPDATE otp_verification SET attempts = attempts + 1 WHERE id = :id',
      { id },
    );
  },

  async markVerified(id) {
    await pool.query(
      'UPDATE otp_verification SET is_verified = 1 WHERE id = :id',
      { id },
    );
  },
};

module.exports = otpModel;
