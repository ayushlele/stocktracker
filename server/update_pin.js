const { getDbAsync, saveDb, closeDb } = require('./db/database.js');
const bcrypt = require('bcryptjs');

async function main() {
  const db = await getDbAsync();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('0709', salt);
  db.run('UPDATE users SET pin_hash = ?', [hash]);
  saveDb();
  console.log('PIN updated for all users to 0709');
  closeDb();
  process.exit(0);
}

main();
