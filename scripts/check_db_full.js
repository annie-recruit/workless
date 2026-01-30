const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

for (const table of tables) {
  const count = db.prepare(`SELECT count(*) as count FROM ${table.name}`).get().count;
  console.log(`Table ${table.name}: ${count} rows`);
}
