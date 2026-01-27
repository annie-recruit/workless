// board_card_colors 테이블 스키마 수정 스크립트
const Database = require('better-sqlite3');
const { join } = require('path');

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || join(process.cwd(), 'data');
const dbPath = join(dataDir, 'workless.db');

console.log(`📊 Database path: ${dbPath}`);

const db = new Database(dbPath);

try {
  console.log('🔄 board_card_colors 테이블 재생성 중...');
  
  // 기존 데이터 백업
  const existingData = db.prepare('SELECT * FROM board_card_colors').all();
  console.log(`📦 기존 데이터 ${existingData.length}개 백업 완료`);
  
  // 기존 테이블 삭제
  db.exec('DROP TABLE IF EXISTS board_card_colors');
  console.log('🗑️  기존 테이블 삭제 완료');
  
  // 새 스키마로 테이블 재생성
  db.exec(`
    CREATE TABLE board_card_colors (
      userId TEXT NOT NULL,
      groupId TEXT NOT NULL,
      memoryId TEXT NOT NULL,
      color TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (userId, groupId, memoryId)
    )
  `);
  console.log('✅ 새 테이블 생성 완료 (PRIMARY KEY 추가됨)');
  
  // 데이터 복원
  if (existingData.length > 0) {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO board_card_colors (userId, groupId, memoryId, color, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction((data) => {
      for (const row of data) {
        insert.run(row.userId, row.groupId, row.memoryId, row.color, row.updatedAt);
      }
    });
    
    transaction(existingData);
    console.log(`✅ 데이터 ${existingData.length}개 복원 완료`);
  }
  
  console.log('🎉 마이그레이션 완료!');
} catch (error) {
  console.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
} finally {
  db.close();
}
