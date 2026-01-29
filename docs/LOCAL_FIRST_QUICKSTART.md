# 🚀 로컬 우선 빠른 시작 가이드

## 1단계: 라이브러리 설치 (5분)

터미널에서 다음 명령어를 실행하세요:

```bash
npm install dexie dexie-react-hooks crypto-js file-saver
npm install -D @types/file-saver
```

설치가 완료되면:

```bash
npm run dev
```

## 2단계: 기존 코드 수정 (선택)

### 방법 A: 새 컴포넌트에서만 사용 (추천)

기존 코드는 그대로 두고, 새로운 페이지/컴포넌트에서만 로컬 DB를 사용합니다.

```tsx
// 예: app/test-local/page.tsx
'use client';

import { useLocalMemories } from '@/hooks/useLocalMemories';
import { useSession } from 'next-auth/react';

export default function TestLocalPage() {
  const { data: session } = useSession();
  const userId = session?.user?.email || 'test-user';
  
  const { memories, createMemory, isLoading } = useLocalMemories(userId);

  const handleAdd = async () => {
    await createMemory('테스트 메모리');
  };

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">로컬 메모리 테스트</h1>
      <button 
        onClick={handleAdd}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        메모리 추가
      </button>
      
      <div>
        <h2 className="font-bold mb-2">저장된 메모리 ({memories.length}개)</h2>
        {memories.map((m) => (
          <div key={m.id} className="border p-2 mb-2">
            {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 방법 B: 기존 훅 점진적 교체

```tsx
// 기존 코드 (서버 기반)
const { data: memories } = useSWR('/api/memories', fetcher);

// 새 코드 (로컬 우선)
const { memories } = useLocalMemories(userId);
```

## 3단계: 설정 페이지 접근

개발 서버를 시작한 후:

```
http://localhost:3000/settings/local-first
```

여기서 동기화 설정을 변경하고 데이터를 Export/Import 할 수 있습니다.

## 4단계: 브라우저 개발자 도구에서 확인

```javascript
// 콘솔에서 실행
localDB.memories.toArray().then(console.log)
localDB.getStats('your-user-id').then(console.log)
dataLayer.isSyncEnabled()
```

## 📖 사용 예시

### 예시 1: 메모리 생성

```tsx
const { createMemory } = useLocalMemories(userId);

const handleSubmit = async (content: string) => {
  await createMemory(content, {
    topic: 'work',
    nature: 'task',
  });
};
```

### 예시 2: 동기화 상태 표시

```tsx
const { isOnline, needsSync, performSync } = useLocalSync(userId);

return (
  <div>
    {!isOnline && <div>⚠️ 오프라인 모드</div>}
    {needsSync && (
      <button onClick={performSync}>
        동기화 필요 (클릭하여 동기화)
      </button>
    )}
  </div>
);
```

### 예시 3: 데이터 백업

```tsx
const { exportData, importData } = useLocalExport(userId);

return (
  <div>
    <button onClick={exportData}>
      📥 JSON 내보내기
    </button>
    
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) importData(file, false);
      }}
    />
  </div>
);
```

## 🧪 테스트 시나리오

### 1. 오프라인 동작 테스트

1. 개발자 도구 > Network > Offline 체크
2. 메모리 추가/수정/삭제 시도
3. 모든 작업이 정상 동작해야 함
4. Online으로 전환
5. 자동으로 동기화됨

### 2. Export/Import 테스트

1. 메모리 몇 개 추가
2. "JSON 파일로 내보내기" 클릭
3. 다운로드된 JSON 파일 확인
4. 브라우저 IndexedDB 삭제 (개발자 도구 > Application > IndexedDB > workless-local-db 삭제)
5. "가져오기"로 JSON 파일 업로드
6. 데이터가 복원되는지 확인

### 3. 동기화 테스트

1. 동기화 "수동 동기화" 모드 활성화
2. 메모리 추가
3. "지금 동기화" 버튼 클릭
4. 서버 API가 호출되는지 Network 탭에서 확인

## 🐛 문제 해결

### 에러: "Cannot find module 'dexie'"

```bash
npm install dexie dexie-react-hooks
```

### 에러: IndexedDB가 초기화되지 않음

브라우저 콘솔에서:

```javascript
await localDB.open()
await localDB.initialize('your-user-id')
```

### 데이터가 안 보임

```javascript
// 콘솔에서 확인
await localDB.memories.toArray()
```

비어있으면 서버에서 마이그레이션 필요:

```javascript
// 서버 데이터 → 로컬 DB로 복사
const res = await fetch('/api/memories');
const { memories } = await res.json();
await localDB.memories.bulkAdd(memories);
```

## 📚 다음 단계

1. **Phase 1 완료**: 모든 컴포넌트를 `useLocalMemories` 로 교체
2. **Phase 2 완료**: 오프라인 UI 추가
3. **Phase 3 진행**: 서버 동기화 API 구현 (`/api/sync/backup`, `/api/sync/restore`)
4. **Phase 4 진행**: 암호화 추가

## 💡 팁

- 개발 중에는 `syncMode`를 `disabled`로 설정하면 서버 의존성 없이 개발 가능
- 브라우저 IndexedDB는 개발자 도구 > Application > IndexedDB에서 확인 가능
- `localDB`와 `dataLayer`는 전역 객체로 노출되어 있어 콘솔에서 직접 접근 가능

## 🎯 목표 달성 확인

- [ ] 로컬 DB에 데이터 저장됨
- [ ] 오프라인에서도 작동
- [ ] Export/Import 작동
- [ ] 동기화 설정 페이지 작동
- [ ] 브라우저 새로고침 후에도 데이터 유지

모두 체크되면 Phase 1 완료! 🎉
