const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

console.log('--- DB Check ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
  const rows = db.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();
  console.log(`Table ${table.name}:`, rows);
}
