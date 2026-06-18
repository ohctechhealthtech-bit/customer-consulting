const pool = require('./config/database');

async function fix() {
  try {
    console.log('Creating profile_update_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_update_history (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        customer_id INT UNSIGNED NOT NULL,
        field_name VARCHAR(80) NOT NULL,
        old_value TEXT DEFAULT NULL,
        new_value TEXT DEFAULT NULL,
        updated_by VARCHAR(255) NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_puh_customer (customer_id),
        KEY idx_puh_updated_at (updated_at),
        CONSTRAINT fk_puh_customer
          FOREIGN KEY (customer_id) REFERENCES customer_master (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table created or already exists.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create table:', err.message);
    process.exit(1);
  }
}

fix();
