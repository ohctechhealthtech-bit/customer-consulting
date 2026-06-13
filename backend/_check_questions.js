require('./config/env');
const pool = require('./config/database');

async function main() {
  try {
    const [rows] = await pool.query(
      'SELECT id, question_key, section, field_type, is_active FROM question_master ORDER BY section, display_order'
    );
    console.log('All questions in question_master:');
    console.log(JSON.stringify(rows, null, 2));

    const active = rows.filter(r => r.is_active === 1);
    const bySection = {};
    for (const r of active) {
      if (!bySection[r.section]) bySection[r.section] = [];
      bySection[r.section].push(r.question_key);
    }

    console.log('\n----- Section Summary -----');
    for (const [sec, keys] of Object.entries(bySection)) {
      console.log(`  ${sec}: ${keys.length} questions`);
      keys.forEach(k => console.log(`    - ${k}`));
    }
    console.log('---------------------------');
    console.log(`Total active: ${active.length}`);
  } catch (err) {
    console.error('Database error:', err.message);
  }
  process.exit(0);
}

main();