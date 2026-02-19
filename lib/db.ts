import Database from 'better-sqlite3';
import { Memory, Cluster, Attachment, Group, Goal, CanvasBlock, IngestItem, ActionProject } from '@/types';
import { nanoid } from 'nanoid';
import { mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

// 암호화 설정
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const keyString = String(process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only');
    const key = crypto.createHash('sha256').update(keyString).digest();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text;

    // 1. 시도: 환경변수 키
    const result = attemptDecrypt(text, String(process.env.NEXTAUTH_SECRET || ''));
    if (result) return result;

    // 2. 시도: 폴백 키
    const fallbackResult = attemptDecrypt(text, 'fallback-secret-for-development-only');
    if (fallbackResult) return fallbackResult;

    return text;
  } catch (error) {
    return text;
  }
}

function attemptDecrypt(text: string, keyString: string): string | null {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto.createHash('sha256').update(keyString).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null;
  }
}

// Railway 볼륨 또는 로컬 data 디렉토리 사용
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || join(process.cwd(), 'data');

// 디렉토리가 없으면 생성
try {
  mkdirSync(dataDir, { recursive: true });
} catch (err) {
  // 이미 존재하는 경우 무시
}

const dbPath = join(dataDir, 'workless.db');
const db = new Database(dbPath);

// WAL 모드 활성화 (동시 읽기/쓰기 향상)
try {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 30000'); // 30초로 늘림 (빌드 시 병렬 처리 대응)
  db.pragma('synchronous = NORMAL'); // 성능 향상
} catch (err) {
  console.warn('Failed to set pragmas:', err);
}

console.log(`📊 Database path: ${dbPath}`);

// 마이그레이션 도우미 함수: 중복 실행이나 잠금 발생 시 안전하게 처리
const runMigration = (name: string, fn: () => void) => {
  try {
    fn();
  } catch (error: any) {
    if (error.code === 'SQLITE_BUSY') {
      console.warn(`⚠️ 마이그레이션 "${name}" 건너뜀: 데이터베이스가 잠겨 있음 (다른 프로세스에서 실행 중일 수 있음)`);
    } else if (error.message?.includes('duplicate column name')) {
      // 이미 컬럼이 추가된 경우 무시
    } else {
      console.error(`❌ 마이그레이션 "${name}" 실패:`, error);
    }
  }
};

let memoryTableHasIngestId = false;

// 테이블 초기화
runMigration('initial schema creation', () => {
  db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    derivedFromCardId TEXT,
    ingestId TEXT,
    topic TEXT,
    nature TEXT,
    timeContext TEXT,
    relatedMemoryIds TEXT,
    clusterTag TEXT,
    repeatCount INTEGER DEFAULT 0,
    lastMentionedAt INTEGER,
    attachments TEXT,
    source TEXT,
    sourceId TEXT,
    sourceLink TEXT,
    sourceSender TEXT,
    sourceSubject TEXT
  );

  CREATE TABLE IF NOT EXISTS ingest_items (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    rawText TEXT NOT NULL,
    rawMeta TEXT,
    source TEXT NOT NULL,
    sourceItemId TEXT,
    dedupeKey TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    memoryIds TEXT NOT NULL,
    summary TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    memoryIds TEXT NOT NULL,
    isAIGenerated INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    sourceMemoryIds TEXT NOT NULL,
    milestones TEXT,
    targetDate INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    completedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS board_positions (
    userId TEXT NOT NULL,
    groupId TEXT NOT NULL,
    memoryId TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (userId, groupId, memoryId)
  );

  CREATE TABLE IF NOT EXISTS board_settings (
    userId TEXT NOT NULL,
    groupId TEXT NOT NULL,
    cardSize TEXT,
    cardColor TEXT,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (userId, groupId)
  );

  CREATE TABLE IF NOT EXISTS board_card_colors (
    userId TEXT NOT NULL,
    groupId TEXT NOT NULL,
    memoryId TEXT NOT NULL,
    color TEXT NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (userId, groupId, memoryId)
  );

  CREATE TABLE IF NOT EXISTS board_blocks (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    config TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memory_links (
    userId TEXT NOT NULL,
    memoryId1 TEXT NOT NULL,
    memoryId2 TEXT NOT NULL,
    note TEXT,
    isAIGenerated INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (userId, memoryId1, memoryId2)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    expectedDuration TEXT NOT NULL,
    milestones TEXT NOT NULL,
    sourceMemoryIds TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    color TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    context TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    googleAccessToken TEXT,
    googleRefreshToken TEXT,
    googleTokenExpiresAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachment_cache (
    filepath TEXT PRIMARY KEY,
    parsedContent TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_api_keys (
    userId TEXT PRIMARY KEY,
    apiKey TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_memories_clusterTag ON memories(clusterTag);
  CREATE INDEX IF NOT EXISTS idx_memories_topic ON memories(topic);
  CREATE INDEX IF NOT EXISTS idx_groups_isAIGenerated ON groups(isAIGenerated);
  CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
  CREATE INDEX IF NOT EXISTS idx_board_positions_groupId ON board_positions(groupId);
  CREATE INDEX IF NOT EXISTS idx_board_card_colors_groupId ON board_card_colors(groupId);
  CREATE INDEX IF NOT EXISTS idx_memory_links_memoryId1 ON memory_links(memoryId1);
  CREATE INDEX IF NOT EXISTS idx_memory_links_memoryId2 ON memory_links(memoryId2);
  CREATE INDEX IF NOT EXISTS idx_ingest_items_user_dedupeKey ON ingest_items(userId, dedupeKey);
  CREATE INDEX IF NOT EXISTS idx_user_api_keys_apiKey ON user_api_keys(apiKey);
  `);
});

// ingest_items: (userId, dedupeKey) 유니크 (dedupeKey가 있을 때만)
runMigration('ingest_items unique index', () => {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ingest_items_user_dedupeKey
    ON ingest_items(userId, dedupeKey)
    WHERE dedupeKey IS NOT NULL;
  `);
});

// 마이그레이션: memories 테이블에 title 컬럼 추가 (없으면)
runMigration('memories title/derivedFrom/ingestId', () => {
  const columns = db.prepare("PRAGMA table_info(memories)").all() as any[];
  const hasTitle = columns.some((col: any) => col.name === 'title');
  if (!hasTitle) {
    console.log('📊 Adding title column to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN title TEXT');
  }
  const hasDerivedFrom = columns.some((col: any) => col.name === 'derivedFromCardId');
  if (!hasDerivedFrom) {
    console.log('📊 Adding derivedFromCardId column to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN derivedFromCardId TEXT');
  }
  const hasIngestId = columns.some((col: any) => col.name === 'ingestId');
  memoryTableHasIngestId = hasIngestId;
  if (!hasIngestId) {
    console.log('📊 Adding ingestId column to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN ingestId TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_ingestId ON memories(ingestId)');
    memoryTableHasIngestId = true;
  }
});

runMigration('memories ingestId index', () => {
  db.exec('CREATE INDEX IF NOT EXISTS idx_memories_ingestId ON memories(ingestId)');
});


// 마이그레이션: 모든 테이블에 userId 컬럼 추가 (없으면)
runMigration('add userId to all tables', () => {
  const tables = ['memories', 'groups', 'goals', 'personas', 'board_positions', 'board_settings', 'board_card_colors', 'memory_links'];
  tables.forEach(tableName => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const hasUserId = columns.some((col: any) => col.name === 'userId');
    if (!hasUserId) {
      console.log(`📊 Adding userId column to ${tableName} table...`);
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN userId TEXT NOT NULL DEFAULT ''`);
    }
  });
});

// board_settings 테이블의 PRIMARY KEY 수정 (기존 테이블이 groupId만 PRIMARY KEY인 경우)
runMigration('fix board_settings PK', () => {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='board_settings'").get() as any;
  if (tableInfo && tableInfo.sql && tableInfo.sql.includes('groupId TEXT PRIMARY KEY')) {
    console.log('📊 Fixing board_settings PRIMARY KEY...');
    // 기존 데이터 백업
    const oldData = db.prepare('SELECT * FROM board_settings').all() as any[];

    // 테이블 재생성
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_settings_new (
        userId TEXT NOT NULL,
        groupId TEXT NOT NULL,
        cardSize TEXT,
        cardColor TEXT,
        updatedAt INTEGER NOT NULL,
        PRIMARY KEY (userId, groupId)
      );
    `);

    // 데이터 마이그레이션 (userId가 없는 경우 빈 문자열로)
    oldData.forEach(row => {
      const userId = row.userId || '';
      db.prepare(`
        INSERT INTO board_settings_new (userId, groupId, cardSize, cardColor, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, row.groupId, row.cardSize, row.cardColor, row.updatedAt);
    });

    // 기존 테이블 삭제 및 새 테이블로 교체
    db.exec('DROP TABLE board_settings');
    db.exec('ALTER TABLE board_settings_new RENAME TO board_settings');
  }
});

// board_positions 테이블의 PRIMARY KEY 수정 (기존 테이블이 userId가 없는 경우)
runMigration('fix board_positions PK', () => {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='board_positions'").get() as any;
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('PRIMARY KEY (userId, groupId, memoryId)')) {
    console.log('📊 Fixing board_positions PRIMARY KEY...');
    // 기존 데이터 백업
    const oldData = db.prepare('SELECT * FROM board_positions').all() as any[];

    // 테이블 재생성
    db.exec(`
      CREATE TABLE IF NOT EXISTS board_positions_new (
        userId TEXT NOT NULL,
        groupId TEXT NOT NULL,
        memoryId TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        PRIMARY KEY (userId, groupId, memoryId)
      );
    `);

    // 데이터 마이그레이션 (userId가 없는 경우 빈 문자열로)
    oldData.forEach(row => {
      const userId = row.userId || '';
      db.prepare(`
        INSERT INTO board_positions_new (userId, groupId, memoryId, x, y, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, row.groupId, row.memoryId, row.x, row.y, row.updatedAt);
    });

    // 기존 테이블 삭제 및 새 테이블로 교체
    db.exec('DROP TABLE board_positions');
    db.exec('ALTER TABLE board_positions_new RENAME TO board_positions');
  }
});

// 마이그레이션: memory_links 테이블에 isAIGenerated 컬럼 추가 (없으면)
runMigration('memory_links isAIGenerated', () => {
  const columns = db.prepare("PRAGMA table_info(memory_links)").all() as any[];
  const hasIsAIGenerated = columns.some((col: any) => col.name === 'isAIGenerated');
  if (!hasIsAIGenerated) {
    console.log('📊 Adding isAIGenerated column to memory_links table...');
    db.exec('ALTER TABLE memory_links ADD COLUMN isAIGenerated INTEGER NOT NULL DEFAULT 0');
  }
});

// 마이그레이션: memory_links 테이블에 linkType, fromMemoryId 컬럼 추가
runMigration('memory_links linkType fromMemoryId', () => {
  const columns = db.prepare("PRAGMA table_info(memory_links)").all() as any[];
  const hasLinkType = columns.some((col: any) => col.name === 'linkType');
  if (!hasLinkType) {
    console.log('📊 Adding linkType column to memory_links table...');
    db.exec("ALTER TABLE memory_links ADD COLUMN linkType TEXT NOT NULL DEFAULT 'related'");
  }
  const hasFromMemoryId = columns.some((col: any) => col.name === 'fromMemoryId');
  if (!hasFromMemoryId) {
    console.log('📊 Adding fromMemoryId column to memory_links table...');
    db.exec('ALTER TABLE memory_links ADD COLUMN fromMemoryId TEXT');
  }
});

// 마이그레이션: memories 테이블에 source 관련 컬럼 추가
runMigration('memories source columns', () => {
  const columns = db.prepare("PRAGMA table_info(memories)").all() as any[];
  const hasSource = columns.some((col: any) => col.name === 'source');
  if (!hasSource) {
    console.log('📊 Adding source columns to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN source TEXT');
    db.exec('ALTER TABLE memories ADD COLUMN sourceId TEXT');
    db.exec('ALTER TABLE memories ADD COLUMN sourceLink TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_sourceId ON memories(sourceId)');
  }

  const hasSourceSender = columns.some((col: any) => col.name === 'sourceSender');
  if (!hasSourceSender) {
    console.log('📊 Adding sourceSender/sourceSubject columns to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN sourceSender TEXT');
    db.exec('ALTER TABLE memories ADD COLUMN sourceSubject TEXT');
  }

  const hasDedupeKey = columns.some((col: any) => col.name === 'dedupeKey');
  if (!hasDedupeKey) {
    console.log('📊 Adding dedupeKey column to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN dedupeKey TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_dedupeKey ON memories(dedupeKey)');
  }
});

// 마이그레이션: users 테이블에 OAuth 토큰 관련 컬럼 추가
runMigration('users oauth tokens', () => {
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasAccessToken = columns.some((col: any) => col.name === 'googleAccessToken');
  if (!hasAccessToken) {
    console.log('📊 Adding OAuth columns to users table...');
    db.exec('ALTER TABLE users ADD COLUMN googleAccessToken TEXT');
    db.exec('ALTER TABLE users ADD COLUMN googleRefreshToken TEXT');
    db.exec('ALTER TABLE users ADD COLUMN googleTokenExpiresAt INTEGER');
  }
});

// Memory CRUD
export const memoryDb = {
  // 생성
  create(content: string, userId: string, classification?: Partial<Memory>): Memory {
    const memory: Memory = {
      id: nanoid(),
      content,
      createdAt: Date.now(),
      repeatCount: 0,
      ...classification,
    };

    const columns = [
      'id',
      'userId',
      'title',
      'content',
      'createdAt',
      'derivedFromCardId',
      ...(memoryTableHasIngestId ? ['ingestId'] : []),
      'topic',
      'nature',
      'timeContext',
      'relatedMemoryIds',
      'clusterTag',
      'repeatCount',
      'lastMentionedAt',
      'attachments',
      'source',
      'sourceId',
      'sourceLink',
      'sourceSender',
      'sourceSubject',
      'dedupeKey',
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO memories (${columns.join(', ')}) VALUES (${placeholders})`);

    const values = [
      memory.id,
      userId,
      memory.title ? encrypt(memory.title) : null,
      encrypt(memory.content),
      memory.createdAt,
      memory.derivedFromCardId || null,
      ...(memoryTableHasIngestId ? [memory.ingestId || null] : []),
      memory.topic || null,
      memory.nature || null,
      memory.timeContext || null,
      memory.relatedMemoryIds ? JSON.stringify(memory.relatedMemoryIds) : null,
      memory.clusterTag || null,
      memory.repeatCount || 0,
      memory.lastMentionedAt || null,
      memory.attachments ? JSON.stringify(memory.attachments) : null,
      memory.source || 'manual',
      memory.sourceId || null,
      memory.sourceLink || null,
      memory.sourceSender || null,
      memory.sourceSubject || null,
      (memory as any).dedupeKey || null,
    ];

    stmt.run(...values);

    return memory;
  },

  // 조회
  getById(id: string, userId?: string): Memory | null {
    const stmt = userId
      ? db.prepare('SELECT * FROM memories WHERE id = ? AND userId = ?')
      : db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = userId ? stmt.get(id, userId) : stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // ID 리스트로 조회
  getAllByIds(ids: string[], userId?: string): Memory[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const sql = userId
      ? `SELECT * FROM memories WHERE id IN (${placeholders}) AND userId = ?`
      : `SELECT * FROM memories WHERE id IN (${placeholders})`;
    const stmt = db.prepare(sql);
    const rows = userId ? stmt.all(...ids, userId) : stmt.all(...ids) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 전체 조회
  getAll(userId?: string): Memory[] {
    const stmt = userId
      ? db.prepare('SELECT * FROM memories WHERE userId = ? ORDER BY createdAt DESC')
      : db.prepare('SELECT * FROM memories ORDER BY createdAt DESC');
    const rows = userId ? stmt.all(userId) : stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 클러스터별 조회
  getByCluster(clusterTag: string, userId?: string): Memory[] {
    const stmt = userId
      ? db.prepare('SELECT * FROM memories WHERE clusterTag = ? AND userId = ? ORDER BY createdAt DESC')
      : db.prepare('SELECT * FROM memories WHERE clusterTag = ? ORDER BY createdAt DESC');
    const rows = userId ? stmt.all(clusterTag, userId) : stmt.all(clusterTag) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 주제별 조회
  getByTopic(topic: string, userId?: string): Memory[] {
    const stmt = userId
      ? db.prepare('SELECT * FROM memories WHERE topic = ? AND userId = ? ORDER BY createdAt DESC')
      : db.prepare('SELECT * FROM memories WHERE topic = ? ORDER BY createdAt DESC');
    const rows = userId ? stmt.all(topic, userId) : stmt.all(topic) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 업데이트
  update(id: string, updates: Partial<Memory>): void {
    const fields = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt') continue;
      fields.push(`${key} = ?`);
      if (key === 'relatedMemoryIds' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (key === 'attachments' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if ((key === 'content' || key === 'title') && typeof value === 'string') {
        values.push(encrypt(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    const stmt = db.prepare(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
  },

  // 삭제
  delete(id: string): void {
    const transaction = db.transaction(() => {
      // 1. 링크 삭제
      db.prepare('DELETE FROM memory_links WHERE memoryId1 = ? OR memoryId2 = ?').run(id, id);
      // 2. 보드 위치 삭제
      db.prepare('DELETE FROM board_positions WHERE memoryId = ?').run(id);
      // 3. 카드 색상 삭제
      db.prepare('DELETE FROM board_card_colors WHERE memoryId = ?').run(id);
      // 4. 기억 삭제
      db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    });
    transaction();
  },

  // sourceId로 조회 (중복 방지용)
  getBySourceId(sourceId: string, userId: string): Memory | null {
    const stmt = db.prepare('SELECT * FROM memories WHERE sourceId = ? AND userId = ?');
    const row = stmt.get(sourceId, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 벌크 업서트 (동기화용)
  upsertMany(userId: string, memories: Memory[]): void {
    const now = Date.now();
    const columns = [
      'id', 'userId', 'title', 'content', 'createdAt', 'derivedFromCardId',
      'topic', 'nature', 'timeContext', 'relatedMemoryIds', 'clusterTag',
      'repeatCount', 'lastMentionedAt', 'attachments', 'source',
      'sourceId', 'sourceLink', 'sourceSender', 'sourceSubject', 'dedupeKey'
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const updateSet = columns
      .filter(c => c !== 'id' && c !== 'userId' && c !== 'createdAt')
      .map(c => `${c} = excluded.${c}`)
      .join(', ');

    const stmt = db.prepare(`
      INSERT INTO memories (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateSet}
    `);

    const transaction = db.transaction((rows: Memory[]) => {
      for (const m of rows) {
        stmt.run(
          m.id,
          userId,
          m.title ? encrypt(m.title) : null,
          encrypt(m.content),
          m.createdAt || now,
          m.derivedFromCardId || null,
          m.topic || null,
          m.nature || null,
          m.timeContext || null,
          m.relatedMemoryIds ? JSON.stringify(m.relatedMemoryIds) : null,
          m.clusterTag || null,
          m.repeatCount || 0,
          m.lastMentionedAt || null,
          m.attachments ? JSON.stringify(m.attachments) : null,
          m.source || 'manual',
          m.sourceId || null,
          m.sourceLink || null,
          m.sourceSender || null,
          m.sourceSubject || null,
          (m as any).dedupeKey || null
        );
      }
    });

    transaction(memories);
  },

  // dedupeKey로 조회 (중복 방지용)
  getByDedupeKey(dedupeKey: string, userId: string): Memory | null {
    const stmt = db.prepare('SELECT * FROM memories WHERE dedupeKey = ? AND userId = ?');
    const row = stmt.get(dedupeKey, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // ingestId로 조회 (원문-카드 연결)
  getByIngestId(ingestId: string, userId: string): Memory | null {
    if (!memoryTableHasIngestId) return null;
    const stmt = db.prepare('SELECT * FROM memories WHERE ingestId = ? AND userId = ?');
    const row = stmt.get(ingestId, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 헬퍼: row 파싱
  parseRow(row: any): Memory {
    const memory = {
      ...row,
      title: row.title ? decrypt(row.title) : undefined,
      content: decrypt(row.content),
      relatedMemoryIds: row.relatedMemoryIds ? JSON.parse(row.relatedMemoryIds) : undefined,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
    };
    return memory;
  },
};

export const ingestDb = {
  create(input: Omit<IngestItem, 'id'>): IngestItem {
    const ingest: IngestItem = {
      id: nanoid(),
      ...input,
    };

    const stmt = db.prepare(`
      INSERT INTO ingest_items (
        id, userId, rawText, rawMeta, source, sourceItemId, dedupeKey, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ingest.id,
      ingest.userId,
      ingest.rawText,
      ingest.rawMeta ? JSON.stringify(ingest.rawMeta) : null,
      ingest.source,
      ingest.sourceItemId || null,
      ingest.dedupeKey || null,
      ingest.createdAt
    );

    return ingest;
  },

  getById(id: string, userId: string): IngestItem | null {
    const stmt = db.prepare('SELECT * FROM ingest_items WHERE id = ? AND userId = ?');
    const row = stmt.get(id, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  getByDedupeKey(dedupeKey: string, userId: string): IngestItem | null {
    const stmt = db.prepare('SELECT * FROM ingest_items WHERE dedupeKey = ? AND userId = ?');
    const row = stmt.get(dedupeKey, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  parseRow(row: any): IngestItem {
    return {
      ...row,
      rawMeta: row.rawMeta ? JSON.parse(row.rawMeta) : undefined,
    };
  },
};

// Cluster CRUD
export const clusterDb = {
  // 생성
  create(name: string, memoryIds: string[], summary?: string): Cluster {
    const cluster: Cluster = {
      id: nanoid(),
      name,
      memoryIds,
      summary,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO clusters (id, name, memoryIds, summary, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cluster.id,
      cluster.name,
      JSON.stringify(cluster.memoryIds),
      cluster.summary || null,
      cluster.createdAt,
      cluster.updatedAt
    );

    return cluster;
  },

  // 조회
  getById(id: string): Cluster | null {
    const stmt = db.prepare('SELECT * FROM clusters WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(): Cluster[] {
    const stmt = db.prepare('SELECT * FROM clusters ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 업데이트
  update(id: string, updates: Partial<Cluster>): void {
    const fields = ['updatedAt = ?'];
    const values: any[] = [Date.now()];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      fields.push(`${key} = ?`);
      if (key === 'memoryIds' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    const stmt = db.prepare(`UPDATE clusters SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
  },

  // 삭제
  delete(id: string): void {
    const stmt = db.prepare('DELETE FROM clusters WHERE id = ?');
    stmt.run(id);
  },

  // 헬퍼: row 파싱
  parseRow(row: any): Cluster {
    return {
      ...row,
      memoryIds: JSON.parse(row.memoryIds),
    };
  },
};

// Group CRUD
export const groupDb = {
  // 생성
  create(userId: string, name: string, memoryIds: string[], isAIGenerated: boolean = false, color?: string): Group {
    const group: Group = {
      id: nanoid(),
      userId,
      name,
      color,
      memoryIds,
      isAIGenerated,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO groups (id, userId, name, color, memoryIds, isAIGenerated, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.userId,
      group.name,
      group.color || null,
      JSON.stringify(group.memoryIds),
      group.isAIGenerated ? 1 : 0,
      group.createdAt,
      group.updatedAt
    );

    return group;
  },

  // 조회
  getById(id: string, userId?: string): Group | null {
    const stmt = userId
      ? db.prepare('SELECT * FROM groups WHERE id = ? AND userId = ?')
      : db.prepare('SELECT * FROM groups WHERE id = ?');
    const row = userId ? stmt.get(id, userId) : stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(userId: string): Group[] {
    const stmt = db.prepare('SELECT * FROM groups WHERE userId = ? ORDER BY updatedAt DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // AI 생성 그룹만 조회
  getAIGenerated(userId: string): Group[] {
    const stmt = db.prepare('SELECT * FROM groups WHERE userId = ? AND isAIGenerated = 1 ORDER BY updatedAt DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 사용자 생성 그룹만 조회
  getUserCreated(userId: string): Group[] {
    const stmt = db.prepare('SELECT * FROM groups WHERE userId = ? AND isAIGenerated = 0 ORDER BY updatedAt DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 벌크 업서트 (동기화용)
  upsertMany(userId: string, groups: Group[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO groups (id, userId, name, color, memoryIds, isAIGenerated, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        color = excluded.color,
        memoryIds = excluded.memoryIds,
        isAIGenerated = excluded.isAIGenerated,
        updatedAt = excluded.updatedAt
    `);

    const transaction = db.transaction((rows: Group[]) => {
      for (const g of rows) {
        stmt.run(
          g.id,
          userId,
          g.name,
          g.color || null,
          JSON.stringify(g.memoryIds),
          g.isAIGenerated ? 1 : 0,
          g.createdAt || now,
          g.updatedAt || now
        );
      }
    });

    transaction(groups);
  },

  // 업데이트
  update(id: string, userId: string, updates: Partial<Group>): void {
    const fields = ['updatedAt = ?'];
    const values: any[] = [Date.now()];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'userId') continue;
      fields.push(`${key} = ?`);
      if (key === 'memoryIds' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (key === 'isAIGenerated') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    const stmt = db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
    stmt.run(...values, id, userId);
  },

  // 삭제
  delete(id: string): void {
    const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
    stmt.run(id);
  },

  // 헬퍼: row 파싱
  parseRow(row: any): Group {
    return {
      ...row,
      memoryIds: JSON.parse(row.memoryIds),
      isAIGenerated: row.isAIGenerated === 1,
    };
  },
};

// Goal CRUD
export const goalDb = {
  // 생성
  create(userId: string, title: string, sourceMemoryIds: string[], category: 'idea' | 'request' | 'habit', description?: string): Goal {
    const goal: Goal = {
      id: nanoid(),
      userId,
      title,
      description,
      category,
      status: 'active',
      progress: 0,
      sourceMemoryIds,
      milestones: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO goals (id, userId, title, description, category, status, progress, sourceMemoryIds, milestones, targetDate, createdAt, updatedAt, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
      goal.userId,
      goal.title,
      goal.description || null,
      goal.category,
      goal.status,
      goal.progress,
      JSON.stringify(goal.sourceMemoryIds),
      goal.milestones ? JSON.stringify(goal.milestones) : null,
      goal.targetDate || null,
      goal.createdAt,
      goal.updatedAt,
      goal.completedAt || null
    );

    return goal;
  },

  // 조회
  getById(id: string, userId?: string): Goal | null {
    const stmt = userId
      ? db.prepare('SELECT * FROM goals WHERE id = ? AND userId = ?')
      : db.prepare('SELECT * FROM goals WHERE id = ?');
    const row = userId ? stmt.get(id, userId) : stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(userId: string): Goal[] {
    const stmt = db.prepare('SELECT * FROM goals WHERE userId = ? ORDER BY updatedAt DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 상태별 조회
  getByStatus(userId: string, status: 'active' | 'completed' | 'archived'): Goal[] {
    const stmt = db.prepare('SELECT * FROM goals WHERE userId = ? AND status = ? ORDER BY updatedAt DESC');
    const rows = stmt.all(userId, status) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 벌크 업서트 (동기화용)
  upsertMany(userId: string, goals: Goal[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO goals (
        id, userId, title, description, category, status, progress, 
        sourceMemoryIds, milestones, targetDate, createdAt, updatedAt, completedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        status = excluded.status,
        progress = excluded.progress,
        sourceMemoryIds = excluded.sourceMemoryIds,
        milestones = excluded.milestones,
        targetDate = excluded.targetDate,
        updatedAt = excluded.updatedAt,
        completedAt = excluded.completedAt
    `);

    const transaction = db.transaction((rows: Goal[]) => {
      for (const g of rows) {
        stmt.run(
          g.id,
          userId,
          g.title,
          g.description || null,
          g.category,
          g.status,
          g.progress || 0,
          JSON.stringify(g.sourceMemoryIds),
          g.milestones ? JSON.stringify(g.milestones) : null,
          g.targetDate || null,
          g.createdAt || now,
          g.updatedAt || now,
          g.completedAt || null
        );
      }
    });

    transaction(goals);
  },

  // 업데이트
  update(id: string, userId: string, updates: Partial<Goal>) {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'userId') {
        fields.push(`${key} = ?`);
        if (key === 'sourceMemoryIds' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (key === 'milestones' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id);
    values.push(userId);

    const stmt = db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
    stmt.run(...(values as any[]));
  },

  // 삭제
  delete(id: string, userId?: string) {
    const stmt = userId
      ? db.prepare('DELETE FROM goals WHERE id = ? AND userId = ?')
      : db.prepare('DELETE FROM goals WHERE id = ?');
    if (userId) {
      stmt.run(id, userId);
    } else {
      stmt.run(id);
    }
  },

  // Row 파싱
  parseRow(row: any): Goal {
    return {
      ...row,
      sourceMemoryIds: JSON.parse(row.sourceMemoryIds),
      milestones: row.milestones ? JSON.parse(row.milestones) : [],
    };
  },
};

// Board Position CRUD
export const boardPositionDb = {
  getByGroup(userId: string, groupId: string): { memoryId: string; x: number; y: number; updatedAt: number }[] {
    const stmt = db.prepare('SELECT * FROM board_positions WHERE userId = ? AND groupId = ?');
    return stmt.all(userId, groupId) as any[];
  },

  upsertMany(userId: string, groupId: string, positions: { memoryId: string; x: number; y: number }[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_positions (userId, groupId, memoryId, x, y, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId, groupId, memoryId) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        updatedAt = excluded.updatedAt
    `);
    const transaction = db.transaction((rows: typeof positions) => {
      rows.forEach(row => {
        stmt.run(userId, groupId, row.memoryId, Math.round(row.x), Math.round(row.y), now);
      });
    });
    transaction(positions);
  },
};

export const boardSettingsDb = {
  getByGroup(userId: string, groupId: string): { groupId: string; cardSize?: string; cardColor?: string; updatedAt: number } | null {
    const stmt = db.prepare('SELECT * FROM board_settings WHERE userId = ? AND groupId = ?');
    return (stmt.get(userId, groupId) as any) || null;
  },

  upsert(userId: string, groupId: string, cardSize?: string, cardColor?: string): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_settings (userId, groupId, cardSize, cardColor, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId, groupId) DO UPDATE SET
        cardSize = excluded.cardSize,
        cardColor = excluded.cardColor,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(userId, groupId, cardSize || null, cardColor || null, now);
  },
};

export const boardCardColorDb = {
  getByGroup(userId: string, groupId: string): { memoryId: string; color: string; updatedAt: number }[] {
    const stmt = db.prepare('SELECT * FROM board_card_colors WHERE userId = ? AND groupId = ?');
    return stmt.all(userId, groupId) as any[];
  },

  upsertMany(userId: string, groupId: string, colors: { memoryId: string; color: string }[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_card_colors (userId, groupId, memoryId, color, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId, groupId, memoryId) DO UPDATE SET
        color = excluded.color,
        updatedAt = excluded.updatedAt
    `);
    const transaction = db.transaction((rows: typeof colors) => {
      rows.forEach(row => {
        stmt.run(userId, groupId, row.memoryId, row.color, now);
      });
    });
    transaction(colors);
  },
};

export const memoryLinkDb = {
  upsert(memoryId1: string, memoryId2: string, note?: string, isAIGenerated?: boolean, userId?: string, linkType?: string): void {
    const [a, b] = memoryId1 < memoryId2 ? [memoryId1, memoryId2] : [memoryId2, memoryId1];

    // userId가 없는 경우, memoryId1으로부터 userId를 추출
    if (!userId) {
      const memory = memoryDb.getAllByIds([memoryId1])[0];
      userId = memory?.userId || '';
    }

    const stmt = db.prepare(`
      INSERT INTO memory_links (userId, memoryId1, memoryId2, note, isAIGenerated, linkType, fromMemoryId, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId, memoryId1, memoryId2) DO UPDATE SET
        note = excluded.note,
        isAIGenerated = excluded.isAIGenerated,
        linkType = excluded.linkType,
        fromMemoryId = excluded.fromMemoryId,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(userId, a, b, note || null, isAIGenerated ? 1 : 0, linkType || 'related', memoryId1, Date.now());
  },

  delete(memoryId1: string, memoryId2: string): void {
    const [a, b] = memoryId1 < memoryId2 ? [memoryId1, memoryId2] : [memoryId2, memoryId1];
    const stmt = db.prepare('DELETE FROM memory_links WHERE memoryId1 = ? AND memoryId2 = ?');
    stmt.run(a, b);
  },

  getByMemoryIds(memoryIds: string[]): { memoryId1: string; memoryId2: string; note: string | null; isAIGenerated: number; linkType: string; fromMemoryId: string | null }[] {
    if (memoryIds.length === 0) return [];
    const placeholders = memoryIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT * FROM memory_links
      WHERE memoryId1 IN (${placeholders}) OR memoryId2 IN (${placeholders})
    `);
    return stmt.all(...memoryIds, ...memoryIds) as any[];
  },
};

// Persona CRUD
export interface Persona {
  id: string;
  name: string;
  icon: string;
  description?: string;
  context?: string;
  createdAt: number;
  updatedAt: number;
}

export const personaDb = {
  create(name: string, userId: string, icon: string, description?: string, context?: string): Persona {
    const persona: Persona = {
      id: nanoid(),
      name,
      icon,
      description,
      context,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO personas (id, userId, name, icon, description, context, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(persona.id, userId, persona.name, persona.icon, persona.description || null, persona.context || null, persona.createdAt, persona.updatedAt);
    return persona;
  },

  getAll(userId?: string): Persona[] {
    const stmt = userId
      ? db.prepare('SELECT * FROM personas WHERE userId = ? ORDER BY createdAt ASC')
      : db.prepare('SELECT * FROM personas ORDER BY createdAt ASC');
    return (userId ? stmt.all(userId) : stmt.all()) as Persona[];
  },

  getById(id: string, userId?: string): Persona | null {
    const stmt = userId
      ? db.prepare('SELECT * FROM personas WHERE id = ? AND userId = ?')
      : db.prepare('SELECT * FROM personas WHERE id = ?');
    return (userId ? stmt.get(id, userId) : stmt.get(id)) as Persona | null;
  },

  update(id: string, updates: Partial<Persona>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE personas SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  delete(id: string): void {
    const stmt = db.prepare('DELETE FROM personas WHERE id = ?');
    stmt.run(id);
  },
};

// User CRUD
export const userDb = {
  // 생성 또는 업데이트
  upsert(id: string, email: string, name?: string, image?: string): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, name, image, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(id, email, name || null, image || null, now, now);
  },

  // 조회
  getById(id: string): {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    googleAccessToken: string | null;
    googleRefreshToken: string | null;
    googleTokenExpiresAt: number | null;
    createdAt: number;
    updatedAt: number
  } | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id) as any;
    if (user) {
      if (user.googleAccessToken) user.googleAccessToken = decrypt(user.googleAccessToken);
      if (user.googleRefreshToken) user.googleRefreshToken = decrypt(user.googleRefreshToken);
    }
    return user;
  },

  // 이메일로 조회
  getByEmail(email: string): {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    googleAccessToken: string | null;
    googleRefreshToken: string | null;
    googleTokenExpiresAt: number | null;
    createdAt: number;
    updatedAt: number
  } | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;
    if (user) {
      if (user.googleAccessToken) user.googleAccessToken = decrypt(user.googleAccessToken);
      if (user.googleRefreshToken) user.googleRefreshToken = decrypt(user.googleRefreshToken);
    }
    return user;
  },

  // OAuth 토큰 업데이트
  updateTokens(id: string, accessToken: string, refreshToken?: string, expiresAt?: number): void {
    const now = Date.now();
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

    let stmt;
    if (encryptedRefreshToken) {
      stmt = db.prepare(`
        UPDATE users SET 
          googleAccessToken = ?, 
          googleRefreshToken = ?, 
          googleTokenExpiresAt = ?, 
          updatedAt = ? 
        WHERE id = ?
      `);
      stmt.run(encryptedAccessToken, encryptedRefreshToken, expiresAt || null, now, id);
    } else {
      stmt = db.prepare(`
        UPDATE users SET 
          googleAccessToken = ?, 
          googleTokenExpiresAt = ?, 
          updatedAt = ? 
        WHERE id = ?
      `);
      stmt.run(encryptedAccessToken, expiresAt || null, now, id);
    }
  },

  // 사용자 탈퇴 및 데이터 전체 삭제 (법적 준수 사항)
  deleteUser(userId: string): void {
    const tables = [
      'memories', 'groups', 'goals', 'personas', 'board_positions',
      'board_settings', 'board_card_colors', 'board_blocks',
      'memory_links', 'projects', 'clusters', 'ingest_items',
      'user_api_keys'
    ];

    const deleteTransaction = db.transaction(() => {
      // 1. 모든 관련 테이블 데이터 삭제
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM ${table} WHERE userId = ?`).run(userId);
        } catch (err) {
          console.error(`Failed to delete data from ${table}:`, err);
        }
      }

      // 2. 사용자 계정 정보 삭제
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    deleteTransaction();
  },
};

// Attachment Cache CRUD
export const attachmentCacheDb = {
  // 조회
  get(filepath: string): string | null {
    const stmt = db.prepare('SELECT parsedContent FROM attachment_cache WHERE filepath = ?');
    const row = stmt.get(filepath) as { parsedContent: string } | undefined;
    return row ? row.parsedContent : null;
  },

  // 저장 또는 업데이트
  set(filepath: string, parsedContent: string): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO attachment_cache (filepath, parsedContent, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(filepath) DO UPDATE SET
        parsedContent = excluded.parsedContent,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(filepath, parsedContent, now, now);
  },

  // 삭제
  delete(filepath: string): void {
    const stmt = db.prepare('DELETE FROM attachment_cache WHERE filepath = ?');
    stmt.run(filepath);
  },
};

// Board Blocks CRUD
export const boardBlocksDb = {
  // 생성
  create(userId: string, block: Omit<CanvasBlock, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): CanvasBlock {
    const id = nanoid();
    const now = Date.now();
    const newBlock: CanvasBlock = {
      id,
      userId,
      ...block,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = db.prepare(`
      INSERT INTO board_blocks (id, userId, type, x, y, width, height, config, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      block.type,
      block.x,
      block.y,
      block.width || null,
      block.height || null,
      JSON.stringify(block.config),
      now,
      now
    );
    return newBlock;
  },

  // 조회 (사용자별)
  getAll(userId: string): CanvasBlock[] {
    const stmt = db.prepare('SELECT * FROM board_blocks WHERE userId = ? ORDER BY createdAt ASC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      config: JSON.parse(row.config || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  // ID로 조회
  getById(id: string, userId: string): CanvasBlock | null {
    const stmt = db.prepare('SELECT * FROM board_blocks WHERE id = ? AND userId = ?');
    const row = stmt.get(id, userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      config: JSON.parse(row.config || '{}'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  // 벌크 업서트 (동기화용)
  upsertMany(userId: string, blocks: CanvasBlock[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_blocks (id, userId, type, x, y, width, height, config, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        x = excluded.x,
        y = excluded.y,
        width = excluded.width,
        height = excluded.height,
        config = excluded.config,
        updatedAt = excluded.updatedAt
    `);

    const transaction = db.transaction((rows: CanvasBlock[]) => {
      for (const b of rows) {
        stmt.run(
          b.id,
          userId,
          b.type,
          b.x,
          b.y,
          b.width || null,
          b.height || null,
          JSON.stringify(b.config),
          b.createdAt || now,
          b.updatedAt || now
        );
      }
    });

    transaction(blocks);
  },

  // 업데이트
  update(id: string, userId: string, updates: Partial<Omit<CanvasBlock, 'id' | 'userId' | 'createdAt'>>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'userId' && key !== 'createdAt') {
        if (key === 'config') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id, userId);

    const stmt = db.prepare(`UPDATE board_blocks SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
    stmt.run(...values);
  },

  // 삭제
  delete(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM board_blocks WHERE id = ? AND userId = ?');
    stmt.run(id, userId);
  },
};

// Action Project CRUD
export const projectDb = {
  // 생성
  create(userId: string, project: Omit<ActionProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): ActionProject {
    const id = nanoid();
    const now = Date.now();
    const newProject: ActionProject = {
      id,
      userId,
      ...project,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = db.prepare(`
      INSERT INTO projects (id, userId, title, summary, expectedDuration, milestones, sourceMemoryIds, x, y, color, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      project.title,
      project.summary,
      project.expectedDuration,
      JSON.stringify(project.milestones),
      JSON.stringify(project.sourceMemoryIds),
      project.x,
      project.y,
      project.color,
      now,
      now
    );

    return newProject;
  },

  // 모든 프로젝트 조회
  getAll(userId: string): ActionProject[] {
    const stmt = db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // ID로 조회
  getById(id: string, userId: string): ActionProject | null {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ? AND userId = ?');
    const row = stmt.get(id, userId) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 업데이트
  update(id: string, userId: string, updates: Partial<Omit<ActionProject, 'id' | 'userId' | 'createdAt'>>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'userId' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        if (key === 'milestones' || key === 'sourceMemoryIds') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id, userId);

    const stmt = db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
    stmt.run(...values);
  },

  // 삭제
  delete(id: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ? AND userId = ?');
    stmt.run(id, userId);
  },

  // 헬퍼: row 파싱
  parseRow(row: any): ActionProject {
    return {
      ...row,
      milestones: JSON.parse(row.milestones),
      sourceMemoryIds: JSON.parse(row.sourceMemoryIds),
    };
  },
};

export default db;
