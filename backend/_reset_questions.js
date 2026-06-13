// This script drops and recreates the question_master and customer_response tables
// to fix the ENUM constraint issue, then re-runs the seed data.
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await conn.query('USE consentify_hub');

    // Drop dependent tables first (order matters for FK constraints)
    await conn.query('DROP TABLE IF EXISTS customer_response');
    await conn.query('DROP TABLE IF EXISTS customer_consent');
    await conn.query('DROP TABLE IF EXISTS audit_logs');
    await conn.query('DROP TABLE IF EXISTS login_history');
    await conn.query('DROP TABLE IF EXISTS question_master');
    console.log('Dropped old tables');

    // Re-run the migration SQL
    const fs = require('fs');
    const path = require('path');

    // Read and execute schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8')
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--'))
      .join('\n');
    await conn.query(schemaSql);
    console.log('Schema recreated');

    // Read and execute seed
    const seedSql = fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8')
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--'))
      .join('\n');
    await conn.query(seedSql);
    console.log('Seed data inserted');

    // Verify
    const [rows] = await conn.query(
      'SELECT section, COUNT(*) as cnt FROM consentify_hub.question_master WHERE is_active = 1 GROUP BY section ORDER BY section'
    );
    console.log('\nQuestions by section:');
    for (const r of rows) {
      console.log(`  ${r.section}: ${r.cnt}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  await conn.end();
  process.exit(0);
}

main();