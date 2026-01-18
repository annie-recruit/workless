const Database = require('better-sqlite3');
const db = new Database('workless.db');

console.log('📦 데이터베이스 마이그레이션 시작...');

try {
  // attachments 컬럼 추가
  db.exec(`
    ALTER TABLE memories ADD COLUMN attachments TEXT;
  `);
  
  console.log('✅ attachments 컬럼 추가 완료!');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('ℹ️ attachments 컬럼이 이미 존재합니다.');
  } else {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  }
}

db.close();
console.log('✅ 마이그레이션 완료!');
