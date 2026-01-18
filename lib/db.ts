import Database from 'better-sqlite3';
import { Memory, Cluster, Attachment, Group } from '@/types';
import { nanoid } from 'nanoid';

const db = new Database('workless.db');

// 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
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

  CREATE INDEX IF NOT EXISTS idx_memories_clusterTag ON memories(clusterTag);
  CREATE INDEX IF NOT EXISTS idx_memories_topic ON memories(topic);
  CREATE INDEX IF NOT EXISTS idx_groups_isAIGenerated ON groups(isAIGenerated);
`);

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
        id, content, createdAt, topic, nature, timeContext,
        relatedMemoryIds, clusterTag, repeatCount, lastMentionedAt, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
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

export default db;
