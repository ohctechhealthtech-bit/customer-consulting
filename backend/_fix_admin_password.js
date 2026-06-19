const mysql = require('mysql2/promise');

async function fixAdminPassword() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'consentify_hub',
  });

  const newHash = '2823697d11b89c2dce01f17f9cadaffe:a6cafe1b5902f7230f74d7bf62f66c29062862f7b9159375672d5bce640f8e4cdc6bbb10f7973f6837460b045c528a5ef5d98c0e46d25fbd9f9152d1a1495511';

  const [result] = await conn.execute(
    'UPDATE admin_users SET password_hash = ? WHERE email = ?',
    [newHash, 'admin@ohctech.com']
  );

  console.log(`Updated ${result.affectedRows} row(s). Admin password reset to Admin@123`);
  await conn.end();
}

fixAdminPassword().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
