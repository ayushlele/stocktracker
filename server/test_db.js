const { getDbAsync } = require('./db/database');

async function test() {
  const db = await getDbAsync();
  const masters = await db.all('SELECT * FROM stock_masters');
  console.log('Stock masters:', masters);
  
  const accMasters = await db.all('SELECT * FROM accessory_masters');
  console.log('Accessory masters:', accMasters);
  
  process.exit(0);
}
test();
