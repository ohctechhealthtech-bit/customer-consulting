const pool = require('../config/database');

const questionModel = {
  async getAllActive() {
    const [rows] = await pool.query(
      `SELECT id, question_key AS questionKey, section, label, field_type AS fieldType,
              placeholder, options, display_order AS displayOrder, is_required AS isRequired,
              validation_rules AS validationRules
       FROM question_master
       WHERE is_active = 1
       ORDER BY section, display_order ASC`,
    );
    return rows.map((row) => ({
      ...row,
      options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
      validationRules: row.validationRules
        ? typeof row.validationRules === 'string'
          ? JSON.parse(row.validationRules)
          : row.validationRules
        : null,
      isRequired: Boolean(row.isRequired),
    }));
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM question_master WHERE id = :id AND is_active = 1 LIMIT 1',
      { id },
    );
    return rows[0] || null;
  },

  async findByKey(questionKey) {
    const [rows] = await pool.query(
      'SELECT * FROM question_master WHERE question_key = :questionKey LIMIT 1',
      { questionKey },
    );
    return rows[0] || null;
  },

  async getAllActiveMap() {
    const questions = await this.getAllActive();
    return new Map(questions.map((q) => [q.id, q]));
  },
};

module.exports = questionModel;
