# 🏗️ Workless Local-First 마이그레이션 플랜

## 목표: Obsidian 스타일 하이브리드 아키텍처

**핵심 철학**: "내 데이터는 내 소유" + "선택적으로 동기화"

---

## 📊 현재 vs 목표 아키텍처

### 현재 (서버 중심)
```
┌──────────┐                ┌──────────┐                ┌──────────┐
│브라우저   │──fetch API──→  │서버      │──────────→     │SQLite DB │
│          │                │Next.js   │                │          │
└──────────┘                └──────────┘                └──────────┘
   없음                        모든 로직                    데이터 원본
```

### 목표 (로컬 우선)
```
┌──────────────────────────────────┐
│         브라우저                  │
│  ┌──────────┐    ┌──────────┐   │       ┌──────────┐
│  │UI/React  │←→  │IndexedDB │   │←백업→ │서버      │
│  └──────────┘    └──────────┘   │       │(선택)    │
│                   ↑ 데이터 원본    │       └──────────┘
└──────────────────────────────────┘
```

---

## 🎯 Phase별 구현 계획

### Phase 0: 준비 (1일)
**목표**: 필요한 라이브러리 설치 및 개발 환경 세팅

```bash
# 로컬 DB 라이브러리
npm install dexie dexie-react-hooks

# 동기화 로직
npm install idb-keyval

# 암호화 (클라이언트 사이드)
npm install crypto-js

# Export/Import
npm install file-saver
```

**파일 생성**:
- `lib/localDB.ts` - IndexedDB 스키마 정의
- `lib/syncEngine.ts` - 동기화 로직
- `hooks/useLocalData.ts` - 로컬 데이터 훅

---

### Phase 1: 로컬 저장소 레이어 (3-5일)

#### 1.1 IndexedDB 스키마 설계

```typescript
// lib/localDB.ts
import Dexie, { Table } from 'dexie';
import type { Memory, Group, Goal, CanvasBlock } from '@/types';

export class WorklessDB extends Dexie {
  memories!: Table<Memory>;
  groups!: Table<Group>;
  goals!: Table<Goal>;
  boardBlocks!: Table<CanvasBlock>;
  boardPositions!: Table<BoardPosition>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super('workless-db');
    this.version(1).stores({
      memories: 'id, userId, createdAt, clusterTag, topic',
      groups: 'id, userId, updatedAt',
      goals: 'id, userId, status',
      boardBlocks: 'id, userId, type',
      boardPositions: '[userId+groupId+memoryId], groupId',
      syncMetadata: 'key, lastSyncedAt, version'
    });
  }
}

export const localDB = new WorklessDB();
```

#### 1.2 데이터 레이어 추상화

```typescript
// lib/dataLayer.ts
import { localDB } from './localDB';
import { memoryDb } from './db'; // 기존 서버 DB

type DataSource = 'local' | 'server';

export class DataLayer {
  private source: DataSource = 'local'; // 기본은 로컬
  
  // Memories
  async getMemories(userId: string) {
    if (this.source === 'local') {
      return await localDB.memories
        .where('userId').equals(userId)
        .toArray();
    } else {
      // 서버 폴백
      const res = await fetch('/api/memories');
      return res.json();
    }
  }

  async createMemory(userId: string, content: string) {
    // 1. 로컬에 먼저 저장
    const memory = {
      id: nanoid(),
      userId,
      content,
      createdAt: Date.now(),
      _localOnly: true, // 서버 동기화 안됨 플래그
    };
    
    await localDB.memories.add(memory);
    
    // 2. 백그라운드로 서버 동기화 (선택적)
    if (this.shouldSync()) {
      this.syncToServer(memory);
    }
    
    return memory;
  }

  private shouldSync(): boolean {
    // localStorage에서 사용자 설정 읽기
    return localStorage.getItem('workless:syncEnabled') === 'true';
  }
}

export const dataLayer = new DataLayer();
```

#### 1.3 기존 훅 수정

```typescript
// hooks/useMemories.ts (기존)
// AS-IS
const { data } = useSWR('/api/memories', fetcher);

// TO-BE
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/localDB';

export function useMemories(userId: string) {
  // IndexedDB에서 실시간으로 쿼리
  const memories = useLiveQuery(
    () => localDB.memories.where('userId').equals(userId).toArray(),
    [userId]
  );
  
  return { memories };
}
```

---

### Phase 2: 오프라인 모드 (2-3일)

#### 2.1 네트워크 감지

```typescript
// hooks/useOnlineStatus.ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
```

#### 2.2 오프라인 큐

```typescript
// lib/offlineQueue.ts
export class OfflineQueue {
  async addOperation(op: {
    type: 'create' | 'update' | 'delete';
    collection: string;
    data: any;
  }) {
    await localDB.syncQueue.add({
      id: nanoid(),
      ...op,
      createdAt: Date.now(),
      status: 'pending'
    });
  }

  async processQueue() {
    const pending = await localDB.syncQueue
      .where('status').equals('pending')
      .toArray();
    
    for (const op of pending) {
      try {
        await this.syncOperation(op);
        await localDB.syncQueue.update(op.id, { status: 'synced' });
      } catch (error) {
        await localDB.syncQueue.update(op.id, { 
          status: 'failed',
          error: error.message 
        });
      }
    }
  }
}
```

---

### Phase 3: 선택적 동기화 (3-5일)

#### 3.1 동기화 설정 UI

```tsx
// app/settings/sync/page.tsx
export default function SyncSettings() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  
  useEffect(() => {
    const enabled = localStorage.getItem('workless:syncEnabled') === 'true';
    setSyncEnabled(enabled);
  }, []);
  
  const handleToggle = async (enabled: boolean) => {
    localStorage.setItem('workless:syncEnabled', String(enabled));
    setSyncEnabled(enabled);
    
    if (enabled) {
      // 첫 동기화: 로컬 데이터를 서버로 업로드
      await syncEngine.initialSync();
    }
  };
  
  return (
    <div>
      <h1>동기화 설정</h1>
      <label>
        <input 
          type="checkbox" 
          checked={syncEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        서버 백업 활성화
      </label>
      
      {syncEnabled && (
        <div>
          <p>✅ 데이터가 암호화되어 서버에 백업됩니다</p>
          <button onClick={() => syncEngine.forceSync()}>
            지금 동기화
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 3.2 동기화 엔진

```typescript
// lib/syncEngine.ts
import CryptoJS from 'crypto-js';

export class SyncEngine {
  async initialSync() {
    // 1. 로컬 데이터 수집
    const memories = await localDB.memories.toArray();
    const groups = await localDB.groups.toArray();
    
    // 2. 암호화
    const encrypted = this.encrypt({
      memories,
      groups,
      version: Date.now()
    });
    
    // 3. 서버로 전송
    await fetch('/api/sync/upload', {
      method: 'POST',
      body: JSON.stringify({ data: encrypted })
    });
  }

  private encrypt(data: any): string {
    const key = this.getUserEncryptionKey();
    return CryptoJS.AES.encrypt(
      JSON.stringify(data), 
      key
    ).toString();
  }

  private getUserEncryptionKey(): string {
    // 사용자 고유 키 생성 (비밀번호 or 디바이스 ID)
    let key = localStorage.getItem('workless:encryptionKey');
    if (!key) {
      key = nanoid(32);
      localStorage.setItem('workless:encryptionKey', key);
    }
    return key;
  }

  async downloadFromServer() {
    const res = await fetch('/api/sync/download');
    const { data: encrypted } = await res.json();
    
    const decrypted = this.decrypt(encrypted);
    
    // 로컬에 복원
    await localDB.memories.bulkPut(decrypted.memories);
    await localDB.groups.bulkPut(decrypted.groups);
  }
}

export const syncEngine = new SyncEngine();
```

---

### Phase 4: Export/Import (1-2일)

#### 4.1 데이터 내보내기

```typescript
// lib/export.ts
import { saveAs } from 'file-saver';

export async function exportAllData() {
  const data = {
    version: 1,
    exportedAt: Date.now(),
    memories: await localDB.memories.toArray(),
    groups: await localDB.groups.toArray(),
    goals: await localDB.goals.toArray(),
    boardBlocks: await localDB.boardBlocks.toArray(),
    boardPositions: await localDB.boardPositions.toArray(),
  };
  
  const blob = new Blob(
    [JSON.stringify(data, null, 2)], 
    { type: 'application/json' }
  );
  
  saveAs(blob, `workless-backup-${Date.now()}.json`);
}
```

#### 4.2 데이터 가져오기

```typescript
// lib/import.ts
export async function importData(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // 버전 체크
  if (data.version !== 1) {
    throw new Error('지원하지 않는 백업 파일 버전입니다');
  }
  
  // 충돌 확인
  const shouldMerge = confirm(
    '기존 데이터와 병합하시겠습니까? (취소 시 기존 데이터 삭제)'
  );
  
  if (!shouldMerge) {
    await localDB.delete();
    await localDB.open();
  }
  
  // 복원
  await localDB.memories.bulkPut(data.memories);
  await localDB.groups.bulkPut(data.groups);
  await localDB.goals.bulkPut(data.goals);
  await localDB.boardBlocks.bulkPut(data.boardBlocks);
  await localDB.boardPositions.bulkPut(data.boardPositions);
  
  alert('데이터가 복원되었습니다!');
}
```

---

## 🛡️ 충돌 해결 전략

### 전략 1: Last Write Wins (간단)
```typescript
function resolveConflict(local: Memory, server: Memory): Memory {
  return local.updatedAt > server.updatedAt ? local : server;
}
```

### 전략 2: 사용자 선택 (안전)
```typescript
function showConflictDialog(local: Memory, server: Memory) {
  return new Promise((resolve) => {
    // UI에 두 버전 표시하고 사용자가 선택
  });
}
```

---

## 📋 마이그레이션 체크리스트

### Phase 0: 준비
- [ ] `dexie` 설치
- [ ] `crypto-js` 설치
- [ ] `file-saver` 설치
- [ ] `lib/localDB.ts` 생성
- [ ] 테스트 환경 구축

### Phase 1: 로컬 저장소
- [ ] IndexedDB 스키마 완성
- [ ] DataLayer 클래스 구현
- [ ] `useMemories` 훅 수정
- [ ] `useGroups` 훅 수정
- [ ] `useBoardBlocks` 훅 수정
- [ ] 기존 API와의 호환성 테스트

### Phase 2: 오프라인
- [ ] `useOnlineStatus` 훅 구현
- [ ] OfflineQueue 구현
- [ ] 네트워크 재연결 시 자동 동기화
- [ ] 오프라인 상태 UI 표시

### Phase 3: 동기화
- [ ] 동기화 설정 페이지 구현
- [ ] SyncEngine 구현
- [ ] 암호화/복호화 로직
- [ ] `/api/sync/upload` API 구현
- [ ] `/api/sync/download` API 구현
- [ ] 충돌 해결 로직

### Phase 4: Export/Import
- [ ] Export 기능 구현
- [ ] Import 기능 구현
- [ ] 설정 페이지에 버튼 추가
- [ ] 백업 파일 검증

---

## 🚀 빠른 시작 (Quick Start)

현재 프로젝트에서 바로 시작하려면:

```bash
# 1. 라이브러리 설치
npm install dexie dexie-react-hooks crypto-js file-saver

# 2. 타입 정의 설치
npm install -D @types/file-saver

# 3. localDB.ts 생성 (위 코드 참고)
# 4. useMemories 훅부터 수정 시작
```

---

## 🎯 성공 기준

1. **로컬 우선**: 모든 데이터가 브라우저에 저장됨
2. **오프라인 작동**: 인터넷 없이도 모든 기능 사용 가능
3. **선택적 동기화**: 사용자가 켜지 않으면 서버에 데이터 안 감
4. **Export/Import**: JSON 파일로 백업/복원 가능
5. **암호화**: 서버로 가는 데이터는 암호화됨

---

## 💡 추가 고려사항

### 1. PWA 강화
```javascript
// public/manifest.json
{
  "name": "Workless",
  "short_name": "Workless",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000"
}
```

### 2. 서비스 워커
```javascript
// app/sw.ts
self.addEventListener('fetch', (event) => {
  // API 요청 캐싱
});
```

### 3. 멀티 디바이스 동기화
- QR 코드로 암호화 키 공유
- iCloud/Dropbox 연동 (선택)

---

## 📊 예상 효과

1. **신뢰도**: "서버 해킹되어도 내 데이터는 안전"
2. **성능**: 로컬 읽기 → 매우 빠름
3. **오프라인**: 비행기/지하철에서도 사용 가능
4. **프라이버시**: 동기화 안 켜면 서버에 데이터 없음
5. **차별화**: 노션/워크플로위와 차별점

---

## 🤔 FAQ

**Q: 기존 사용자 데이터는 어떻게 되나요?**
A: 첫 로그인 시 서버 → 로컬로 마이그레이션

**Q: IndexedDB 용량 제한은?**
A: 브라우저마다 다르지만 보통 50MB~수 GB. 충분함.

**Q: 여러 기기 간 동기화는?**
A: 동기화 켜면 서버가 중계. 끄면 Export/Import로 수동.

**Q: 개발 시간은?**
A: Phase 1~4 합쳐서 약 2~3주 예상

---

## 📝 다음 단계

이 문서를 읽고 동의하시면:

1. Phase 0부터 시작
2. 한 단계씩 PR로 리뷰
3. 기존 기능 깨지지 않게 점진적으로 전환

**궁금한 점이나 수정 사항 있으면 알려주세요!**
