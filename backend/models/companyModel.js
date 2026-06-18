const pool = require('../config/database');

const companyModel = {
  async findByName(name) {
    const [rows] = await pool.query(
      'SELECT * FROM company_master WHERE company_name = :name LIMIT 1',
      { name },
    );
    return rows[0] || null;
  },

  async create(name) {
    const [result] = await pool.query(
      'INSERT INTO company_master (company_name) VALUES (:name)',
      { name },
    );
    return result.insertId;
  },

  async findOrCreateByName(name) {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = await this.findByName(trimmed);
    if (existing) return existing.id;

    return await this.create(trimmed);
  },
};

module.exports = companyModel;
