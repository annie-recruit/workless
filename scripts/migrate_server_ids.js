const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

console.log('Starting server-side ID migration (email -> numeric ID)...');

// 1. Get all users to create a mapping
const users = db.prepare('SELECT id, email FROM users').all();
const emailToId = new Map();
users.forEach(u => {
  if (u.email && u.id) {
    emailToId.set(u.email.toLowerCase(), u.id);
  }
});

console.log(`Found ${emailToId.size} users for mapping.`);

const tables = [
  'memories', 'groups', 'goals', 'personas', 'board_positions',
  'board_settings', 'board_card_colors', 'board_blocks',
  'memory_links', 'projects', 'clusters', 'ingest_items',
  'user_api_keys'
];

db.transaction(() => {
  for (const table of tables) {
    try {
      // check if table exists
      const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get();
      if (!tableExists) continue;

      // Find records with email as userId
      const rows = db.prepare(`SELECT DISTINCT userId FROM ${table} WHERE userId LIKE '%@%'`).all();
      
      let migratedCount = 0;
      for (const row of rows) {
        const email = row.userId.toLowerCase();
        const numericId = emailToId.get(email);
        
        if (numericId) {
          const stmt = db.prepare(`UPDATE ${table} SET userId = ? WHERE userId = ?`);
          const result = stmt.run(numericId, row.userId);
          migratedCount += result.changes;
          console.log(`Migrated ${result.changes} rows in ${table} for ${email} -> ${numericId}`);
        } else {
          console.warn(`No numeric ID found for email ${email} in ${table}`);
        }
      }
      if (migratedCount > 0) {
        console.log(`Total migrated in ${table}: ${migratedCount}`);
      }
    } catch (err) {
      console.error(`Failed to migrate table ${table}:`, err.message);
    }
  }
})();

console.log('Migration completed!');
