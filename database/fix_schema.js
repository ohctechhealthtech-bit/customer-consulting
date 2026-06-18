const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'consentify_hub',
  });

  console.log('Checking database schema...');

  try {
    // Add columns to customer_master if they don't exist
    const [columns] = await connection.query('SHOW COLUMNS FROM customer_master');
    const columnNames = columns.map(c => c.Field);

    const additions = [
      { name: 'company_id', type: 'INT UNSIGNED DEFAULT NULL' },
      { name: 'employee_code', type: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'age', type: 'INT DEFAULT NULL' },
      { name: 'password_hash', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'must_change_password', type: 'TINYINT(1) NOT NULL DEFAULT 1' },
      { name: 'last_password_change', type: 'DATETIME DEFAULT NULL' }
    ];

    for (const col of additions) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await connection.query(`ALTER TABLE customer_master ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // Remove date_of_birth if it exists
    if (columnNames.includes('date_of_birth')) {
      console.log('Removing old date_of_birth column...');
      await connection.query('ALTER TABLE customer_master DROP COLUMN date_of_birth');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
