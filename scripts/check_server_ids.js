const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

console.log('Checking for email-based userIds in memories table...');
const emails = db.prepare("SELECT DISTINCT userId FROM memories WHERE userId LIKE '%@%'").all();
console.log('Found userIds with @:', emails);

const all = db.prepare("SELECT DISTINCT userId FROM memories").all();
console.log('All unique userIds in memories:', all);
