const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_FILE = path.join(__dirname, 'fabric_tracker.db');
const BACKUPS_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Generate backup filename based on current timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_FILE = path.join(BACKUPS_DIR, `fabric_tracker_backup_${timestamp}.db`);

try {
  if (fs.existsSync(DB_FILE)) {
    // Copy the database file
    fs.copyFileSync(DB_FILE, BACKUP_FILE);
    console.log(`✅ Backup successfully created at: ${BACKUP_FILE}`);
    
    // Optional: Keep only last 30 backups to save space
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // newest first
      
    if (files.length > 30) {
      const toDelete = files.slice(30);
      toDelete.forEach(f => {
        fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
        console.log(`Deleted old backup: ${f.name}`);
      });
    }
  } else {
    console.warn(`⚠️ Database file not found at ${DB_FILE}. Nothing to back up.`);
  }
} catch (error) {
  console.error(`❌ Backup failed: ${error.message}`);
  process.exit(1);
}
