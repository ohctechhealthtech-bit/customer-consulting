const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'consentify_hub',
  });

  try {
    console.log('Adding missing columns to customer_master...');
    const queries = [
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS company_id INT UNSIGNED DEFAULT NULL',
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS employee_code VARCHAR(100) DEFAULT NULL',
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS age INT DEFAULT NULL',
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 1',
      'ALTER TABLE customer_master ADD COLUMN IF NOT EXISTS last_password_change DATETIME DEFAULT NULL',
      // Ensure company_id has foreign key if missing
      'ALTER TABLE customer_master ADD CONSTRAINT fk_customer_company FOREIGN KEY IF NOT EXISTS (company_id) REFERENCES company_master (id) ON DELETE SET NULL ON UPDATE CASCADE'
    ];

    for (const q of queries) {
      try {
        await connection.query(q);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME') {
          console.warn(`Query failed: ${q} - ${err.message}`);
        }
      }
    }
    console.log('Done.');
  } finally {
    await connection.end();
  }
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
