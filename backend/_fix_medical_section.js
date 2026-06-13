require('./config/env');
const pool = require('./config/database');

async function main() {
  try {
    // Check what the section values actually are for medical questions
    const [rows] = await pool.query(
      'SELECT id, question_key, CONCAT("[", section, "]") as section_raw, HEX(section) as hex FROM question_master WHERE question_key LIKE ?',
      ['medical.%']
    );
    console.log('Medical rows raw section values:');
    for (const r of rows) {
      console.log(`  id=${r.id}, key=${r.question_key}, section=[${r.section_raw}], hex=${r.hex}`);
    }

    // Force update by id directly
    for (const r of rows) {
      await pool.query('UPDATE question_master SET section = ? WHERE id = ?', ['medical', r.id]);
      console.log(`  Updated id=${r.id} (${r.question_key}) → section='medical'`);
    }

    // Verify
    const [verify] = await pool.query(
      'SELECT question_key, section FROM question_master WHERE question_key LIKE ? ORDER BY id',
      ['medical.%']
    );
    console.log('\nVerification:');
    for (const r of verify) {
      console.log(`  ${r.question_key} → section="${r.section}"`);
    }

    // Count by section
    const [counts] = await pool.query(
      'SELECT section, COUNT(*) as cnt FROM question_master WHERE is_active = 1 GROUP BY section'
    );
    console.log('\nActive questions by section:');
    for (const c of counts) {
      console.log(`  ${c.section || '(empty)'}: ${c.cnt}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

main();