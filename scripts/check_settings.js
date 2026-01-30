const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

console.log('Checking board_settings table...');
const settings = db.prepare('SELECT * FROM board_settings').all();
console.log(settings);
