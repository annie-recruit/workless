import Database from 'better-sqlite3';
import { Memory, Cluster, Attachment, Group, Goal } from '@/types';
import { nanoid } from 'nanoid';
import { mkdirSync } from 'fs';
import { join } from 'path';

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

console.log(`📊 Database path: ${dbPath}`);

// 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    topic TEXT,
    nature TEXT,
    timeContext TEXT,
    relatedMemoryIds TEXT,
    clusterTag TEXT,
    repeatCount INTEGER DEFAULT 0,
    lastMentionedAt INTEGER,
    attachments TEXT
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
    name TEXT NOT NULL,
    color TEXT,
    memoryIds TEXT NOT NULL,
    isAIGenerated INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
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
    groupId TEXT NOT NULL,
    memoryId TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (groupId, memoryId)
  );

  CREATE TABLE IF NOT EXISTS board_settings (
    groupId TEXT PRIMARY KEY,
    cardSize TEXT,
    cardColor TEXT,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_card_colors (
    groupId TEXT NOT NULL,
    memoryId TEXT NOT NULL,
    color TEXT NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (groupId, memoryId)
  );

  CREATE TABLE IF NOT EXISTS memory_links (
    memoryId1 TEXT NOT NULL,
    memoryId2 TEXT NOT NULL,
    note TEXT,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (memoryId1, memoryId2)
  );

  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    context TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_memories_clusterTag ON memories(clusterTag);
  CREATE INDEX IF NOT EXISTS idx_memories_topic ON memories(topic);
  CREATE INDEX IF NOT EXISTS idx_groups_isAIGenerated ON groups(isAIGenerated);
  CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
  CREATE INDEX IF NOT EXISTS idx_board_positions_groupId ON board_positions(groupId);
  CREATE INDEX IF NOT EXISTS idx_board_card_colors_groupId ON board_card_colors(groupId);
  CREATE INDEX IF NOT EXISTS idx_memory_links_memoryId1 ON memory_links(memoryId1);
  CREATE INDEX IF NOT EXISTS idx_memory_links_memoryId2 ON memory_links(memoryId2);
`);

// 마이그레이션: memories 테이블에 title 컬럼 추가 (없으면)
try {
  const columns = db.prepare("PRAGMA table_info(memories)").all() as any[];
  const hasTitle = columns.some((col: any) => col.name === 'title');
  if (!hasTitle) {
    console.log('📊 Adding title column to memories table...');
    db.exec('ALTER TABLE memories ADD COLUMN title TEXT');
  }
} catch (error) {
  console.error('Migration error:', error);
}

// Memory CRUD
export const memoryDb = {
  // 생성
  create(content: string, classification?: Partial<Memory>): Memory {
    const memory: Memory = {
      id: nanoid(),
      content,
      createdAt: Date.now(),
      repeatCount: 0,
      ...classification,
    };

    const stmt = db.prepare(`
      INSERT INTO memories (
        id, title, content, createdAt, topic, nature, timeContext,
        relatedMemoryIds, clusterTag, repeatCount, lastMentionedAt, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.title || null,
      memory.content,
      memory.createdAt,
      memory.topic || null,
      memory.nature || null,
      memory.timeContext || null,
      memory.relatedMemoryIds ? JSON.stringify(memory.relatedMemoryIds) : null,
      memory.clusterTag || null,
      memory.repeatCount || 0,
      memory.lastMentionedAt || null,
      memory.attachments ? JSON.stringify(memory.attachments) : null
    );

    return memory;
  },

  // 조회
  getById(id: string): Memory | null {
    const stmt = db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(): Memory[] {
    const stmt = db.prepare('SELECT * FROM memories ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 클러스터별 조회
  getByCluster(clusterTag: string): Memory[] {
    const stmt = db.prepare('SELECT * FROM memories WHERE clusterTag = ? ORDER BY createdAt DESC');
    const rows = stmt.all(clusterTag) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 주제별 조회
  getByTopic(topic: string): Memory[] {
    const stmt = db.prepare('SELECT * FROM memories WHERE topic = ? ORDER BY createdAt DESC');
    const rows = stmt.all(topic) as any[];
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
    const stmt = db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
  },

  // 헬퍼: row 파싱
  parseRow(row: any): Memory {
    return {
      ...row,
      relatedMemoryIds: row.relatedMemoryIds ? JSON.parse(row.relatedMemoryIds) : undefined,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
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
  create(name: string, memoryIds: string[], isAIGenerated: boolean = false, color?: string): Group {
    const group: Group = {
      id: nanoid(),
      name,
      color,
      memoryIds,
      isAIGenerated,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      INSERT INTO groups (id, name, color, memoryIds, isAIGenerated, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
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
  getById(id: string): Group | null {
    const stmt = db.prepare('SELECT * FROM groups WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(): Group[] {
    const stmt = db.prepare('SELECT * FROM groups ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // AI 생성 그룹만 조회
  getAIGenerated(): Group[] {
    const stmt = db.prepare('SELECT * FROM groups WHERE isAIGenerated = 1 ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 사용자 생성 그룹만 조회
  getUserCreated(): Group[] {
    const stmt = db.prepare('SELECT * FROM groups WHERE isAIGenerated = 0 ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 업데이트
  update(id: string, updates: Partial<Group>): void {
    const fields = ['updatedAt = ?'];
    const values: any[] = [Date.now()];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      fields.push(`${key} = ?`);
      if (key === 'memoryIds' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else if (key === 'isAIGenerated') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    const stmt = db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
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
  create(title: string, sourceMemoryIds: string[], category: 'idea' | 'request' | 'habit', description?: string): Goal {
    const goal: Goal = {
      id: nanoid(),
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
      INSERT INTO goals (id, title, description, category, status, progress, sourceMemoryIds, milestones, targetDate, createdAt, updatedAt, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
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
  getById(id: string): Goal | null {
    const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.parseRow(row);
  },

  // 전체 조회
  getAll(): Goal[] {
    const stmt = db.prepare('SELECT * FROM goals ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 상태별 조회
  getByStatus(status: 'active' | 'completed' | 'archived'): Goal[] {
    const stmt = db.prepare('SELECT * FROM goals WHERE status = ? ORDER BY updatedAt DESC');
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.parseRow(row));
  },

  // 업데이트
  update(id: string, updates: Partial<Goal>) {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
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

    const stmt = db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...(values as any[]));
  },

  // 삭제
  delete(id: string) {
    const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
    stmt.run(id);
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
  getByGroup(groupId: string): { memoryId: string; x: number; y: number; updatedAt: number }[] {
    const stmt = db.prepare('SELECT * FROM board_positions WHERE groupId = ?');
    return stmt.all(groupId) as any[];
  },

  upsertMany(groupId: string, positions: { memoryId: string; x: number; y: number }[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_positions (groupId, memoryId, x, y, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(groupId, memoryId) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        updatedAt = excluded.updatedAt
    `);
    const transaction = db.transaction((rows: typeof positions) => {
      rows.forEach(row => {
        stmt.run(groupId, row.memoryId, Math.round(row.x), Math.round(row.y), now);
      });
    });
    transaction(positions);
  },
};

export const boardSettingsDb = {
  getByGroup(groupId: string): { groupId: string; cardSize?: string; cardColor?: string; updatedAt: number } | null {
    const stmt = db.prepare('SELECT * FROM board_settings WHERE groupId = ?');
    return (stmt.get(groupId) as any) || null;
  },

  upsert(groupId: string, cardSize?: string, cardColor?: string): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_settings (groupId, cardSize, cardColor, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(groupId) DO UPDATE SET
        cardSize = excluded.cardSize,
        cardColor = excluded.cardColor,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(groupId, cardSize || null, cardColor || null, now);
  },
};

export const boardCardColorDb = {
  getByGroup(groupId: string): { memoryId: string; color: string; updatedAt: number }[] {
    const stmt = db.prepare('SELECT * FROM board_card_colors WHERE groupId = ?');
    return stmt.all(groupId) as any[];
  },

  upsertMany(groupId: string, colors: { memoryId: string; color: string }[]): void {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO board_card_colors (groupId, memoryId, color, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(groupId, memoryId) DO UPDATE SET
        color = excluded.color,
        updatedAt = excluded.updatedAt
    `);
    const transaction = db.transaction((rows: typeof colors) => {
      rows.forEach(row => {
        stmt.run(groupId, row.memoryId, row.color, now);
      });
    });
    transaction(colors);
  },
};

export const memoryLinkDb = {
  upsert(memoryId1: string, memoryId2: string, note?: string): void {
    const [a, b] = memoryId1 < memoryId2 ? [memoryId1, memoryId2] : [memoryId2, memoryId1];
    const stmt = db.prepare(`
      INSERT INTO memory_links (memoryId1, memoryId2, note, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(memoryId1, memoryId2) DO UPDATE SET
        note = excluded.note,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(a, b, note || null, Date.now());
  },

  delete(memoryId1: string, memoryId2: string): void {
    const [a, b] = memoryId1 < memoryId2 ? [memoryId1, memoryId2] : [memoryId2, memoryId1];
    const stmt = db.prepare('DELETE FROM memory_links WHERE memoryId1 = ? AND memoryId2 = ?');
    stmt.run(a, b);
  },

  getByMemoryIds(memoryIds: string[]): { memoryId1: string; memoryId2: string; note: string | null }[] {
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
  create(name: string, icon: string, description?: string, context?: string): Persona {
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
      INSERT INTO personas (id, name, icon, description, context, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(persona.id, persona.name, persona.icon, persona.description || null, persona.context || null, persona.createdAt, persona.updatedAt);
    return persona;
  },

  getAll(): Persona[] {
    const stmt = db.prepare('SELECT * FROM personas ORDER BY createdAt ASC');
    return stmt.all() as Persona[];
  },

  getById(id: string): Persona | null {
    const stmt = db.prepare('SELECT * FROM personas WHERE id = ?');
    return stmt.get(id) as Persona | null;
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

export default db;
