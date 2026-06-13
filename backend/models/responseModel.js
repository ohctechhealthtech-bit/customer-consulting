const pool = require('../config/database');

const responseModel = {
  async upsertMany(customerId, responses) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const { questionId, value } of responses) {
        await connection.query(
          `INSERT INTO customer_response (customer_id, question_id, response_value)
           VALUES (:customerId, :questionId, :value)
           ON DUPLICATE KEY UPDATE response_value = VALUES(response_value), updated_at = CURRENT_TIMESTAMP`,
          { customerId, questionId, value: String(value) },
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async deleteByCustomerId(customerId) {
    await pool.query('DELETE FROM customer_response WHERE customer_id = :customerId', { customerId });
  },

  async getByCustomerId(customerId) {
    const [rows] = await pool.query(
      `SELECT cr.question_id AS questionId, qm.question_key AS questionKey,
              cr.response_value AS value, qm.section
       FROM customer_response cr
       INNER JOIN question_master qm ON qm.id = cr.question_id
       WHERE cr.customer_id = :customerId`,
      { customerId },
    );
    return rows;
  },
};

module.exports = responseModel;
