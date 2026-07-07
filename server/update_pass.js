const bcrypt = require('bcryptjs');
const { getDbAsync } = require('./db/database');

async function updatePassword() {
  const db = await getDbAsync();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('0709', salt);
  
  await db.run('UPDATE users SET pin_hash = $1 WHERE name = $2', [hash, 'Admin']);
  console.log('Password updated successfully to 0709 for Admin');
  process.exit(0);
}

updatePassword().catch(err => {
  console.error(err);
  process.exit(1);
});
