const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

/**
 * DatabaseInitializer - A migration-based database initialization mechanism
 * similar to Flyway/Liquibase, designed for Node.js.
 */
async function initializeDatabase() {
  console.log('🚀 Starting Database Initialization...');

  let connection;
  try {
    // 1. Connect without DB first to ensure DB exists
    connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      multipleStatements: true,
    });

    const dbName = env.db.database;
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);

    // 2. Ensure schema_migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INT UNSIGNED,
        status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS',
        PRIMARY KEY (version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Get all migration files from database/migrations
    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.startsWith('V') && f.endsWith('.sql'))
      .sort((a, b) => {
        const vA = parseInt(a.substring(1).split('__')[0]);
        const vB = parseInt(b.substring(1).split('__')[0]);
        return vA - vB;
      });

    // 4. Get applied migrations
    const [appliedRows] = await connection.query('SELECT version FROM schema_migrations WHERE status = "SUCCESS"');
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    // 5. Execute pending migrations
    for (const file of files) {
      const match = file.match(/^V(\d+)__(.+)\.sql$/);
      if (!match) continue;

      const version = parseInt(match[1]);
      const name = match[2].replace(/_/g, ' ');

      if (appliedVersions.has(version)) {
        console.log(`  [SKIP] Migration V${version}: ${name} (Already applied)`);
        continue;
      }

      console.log(`  [EXEC] Migration V${version}: ${name}...`);
      const startTime = Date.now();
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        // Execute migration within a transaction if possible (SQL files might have multiple statements)
        // Note: CREATE TABLE etc. in MySQL often cause implicit commits, so real transactions are limited.
        await connection.query(sql);

        const executionTime = Date.now() - startTime;
        await connection.query(
          'INSERT INTO schema_migrations (version, name, execution_time_ms, status) VALUES (?, ?, ?, "SUCCESS")',
          [version, name, executionTime]
        );
        console.log(`  [OK]   Migration V${version} completed in ${executionTime}ms`);
      } catch (err) {
        console.error(`  [FAIL] Migration V${version} failed:`, err.message);
        throw err;
      }
    }

    console.log('✅ Startup database initialization completed.');
  } catch (err) {
    console.error('❌ Database Initialization Failed!');
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = { initializeDatabase };
