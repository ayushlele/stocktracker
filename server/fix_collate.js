const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'routes');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('COLLATE NOCASE')) {
    // Replace "name = ? COLLATE NOCASE" with "name ILIKE ?"
    content = content.replace(/name = \? COLLATE NOCASE/g, 'name ILIKE ?');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', file);
  }
}
