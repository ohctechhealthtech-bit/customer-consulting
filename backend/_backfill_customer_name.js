const pool = require('./config/database');

async function backfill() {
  // 1. Backfill accepted records from customer_master
  const [accepted] = await pool.query(`
    UPDATE customer_consent cc
    INNER JOIN customer_master cm ON cm.id = cc.customer_id
    SET cc.customer_name = CONCAT_WS(' ', cm.first_name, cm.last_name)
    WHERE cc.customer_name IS NULL
      AND (cm.first_name IS NOT NULL OR cm.last_name IS NOT NULL)
  `);
  console.log('Accepted records backfilled:', accepted.affectedRows);

  // 2. For rejected records where customer_name is still NULL,
  //    try to recover from audit_logs metadata
  const [rows] = await pool.query(`
    SELECT cc.id AS consentId, cc.customer_id, al.metadata
    FROM customer_consent cc
    LEFT JOIN audit_logs al ON al.customer_id = cc.customer_id
      AND al.event_code = 'PERSONAL_DATA_SUBMITTED'
    WHERE cc.customer_name IS NULL AND cc.consent_status = 'deny'
    GROUP BY cc.id
  `);
  let recovered = 0;
  for (const row of rows) {
    if (row.metadata) {
      try {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        const name = [meta.firstName, meta.lastName].filter(Boolean).join(' ');
        if (name) {
          await pool.query('UPDATE customer_consent SET customer_name = ? WHERE id = ?', [name, row.consentId]);
          recovered++;
        }
      } catch (e) { /* skip */ }
    }
  }
  console.log('Rejected records recovered from audit_logs:', recovered);
  process.exit(0);
}

backfill().catch((e) => { console.error(e.message); process.exit(1); });