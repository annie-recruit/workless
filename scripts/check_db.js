const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

console.log('Checking memories table for userId values...');
try {
  const userIds = db.prepare('SELECT DISTINCT userId FROM memories LIMIT 10').all();
  console.log('User IDs in memories table:', userIds);
} catch (e) {
  console.error('Error:', e);
}

try {
  const users = db.prepare('SELECT id, email FROM users LIMIT 10').all();
  console.log('Users in users table:', users);
} catch (e) {
  console.error('Error:', e);
}
