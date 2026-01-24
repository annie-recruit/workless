# 브라우저 콘솔 로그 자동 수집 가이드

이 프로젝트에는 브라우저 콘솔 로그를 자동으로 수집하는 두 가지 방법이 포함되어 있습니다.

## 1. 개발 중 자동 수집 (ConsoleLogger 컴포넌트)

개발 환경에서 실행 중인 앱의 모든 콘솔 로그를 자동으로 수집합니다.

### 기능

- ✅ 모든 `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug` 자동 수집
- ✅ 타임스탬프 자동 추가
- ✅ 로그를 파일로 다운로드
- ✅ 로그를 서버로 전송하여 저장
- ✅ 키보드 단축키 지원

### 사용법

개발 서버를 실행하면 자동으로 활성화됩니다:

```bash
npm run dev
```

브라우저 콘솔에서 다음 함수들을 사용할 수 있습니다:

#### 로그 다운로드
```javascript
downloadConsoleLogs()
```
수집된 모든 로그를 텍스트 파일로 다운로드합니다.

#### 로그 서버 전송
```javascript
sendConsoleLogsToServer()
```
수집된 로그를 서버로 전송하여 `logs/console/` 디렉토리에 저장합니다.

#### 로그 확인
```javascript
getConsoleLogs()
```
수집된 로그를 콘솔에 출력하고 배열로 반환합니다.

#### 키보드 단축키
- `Ctrl + Shift + L`: 로그 다운로드

### 저장 위치

서버로 전송한 로그는 다음 위치에 저장됩니다:
```
logs/console/console-logs-YYYY-MM-DDTHH-MM-SS.json
```

## 2. Puppeteer 기반 모니터링 스크립트

특정 URL을 모니터링하고 콘솔 로그를 수집하는 스크립트입니다.

### 설치

먼저 의존성을 설치하세요:

```bash
npm install
```

### 사용법

#### 기본 사용
```bash
npm run monitor:console -- http://localhost:3000
```

#### 옵션

- `--timeout <ms>`: 타임아웃 설정 (기본값: 30000ms)
- `--output <filename>`: 출력 파일명 지정
- `--no-headless`: 헤드리스 모드 비활성화 (브라우저 창 표시)

#### 예제

```bash
# 로컬 개발 서버 모니터링
npm run monitor:console -- http://localhost:3000

# 프로덕션 사이트 모니터링 (60초 타임아웃)
npm run monitor:console -- https://workless.app --timeout 60000

# 브라우저 창을 보면서 모니터링
npm run monitor:console -- http://localhost:3000 --no-headless

# 특정 파일명으로 저장
npm run monitor:console -- http://localhost:3000 --output my-logs.json
```

### 수집되는 정보

- ✅ 모든 콘솔 메시지 (log, error, warn, info, debug)
- ✅ 페이지 에러 (pageerror)
- ✅ 실패한 네트워크 요청 (requestfailed)
- ✅ 각 로그의 타임스탬프
- ✅ 로그 발생 위치 (URL, 라인 번호, 컬럼 번호)

### 출력 형식

스크립트는 다음 정보를 포함한 JSON 파일을 생성합니다:

```json
{
  "url": "http://localhost:3000",
  "timestamp": "2026-01-24T12:00:00.000Z",
  "summary": {
    "total": 150,
    "errors": 5,
    "warnings": 10,
    "info": 135
  },
  "logs": [...],
  "errors": [...],
  "warnings": [...]
}
```

### 저장 위치

모니터링 로그는 다음 위치에 저장됩니다:
```
logs/monitor/monitor-YYYY-MM-DDTHH-MM-SS.json
```

### 종료 코드

- `0`: 성공 (에러 없음)
- `1`: 실패 (에러 발견 또는 스크립트 오류)

CI/CD 파이프라인에서 사용할 수 있습니다:

```yaml
- name: Monitor Console Logs
  run: npm run monitor:console -- https://workless.app
```

## 주의사항

1. **개발 환경 전용**: `ConsoleLogger` 컴포넌트는 개발 환경에서만 동작합니다.
2. **메모리 사용**: 로그는 최대 1000개까지만 메모리에 저장됩니다.
3. **로그 파일 크기**: 많은 로그가 쌓이면 파일 크기가 커질 수 있습니다.
4. **Git 제외**: `logs/` 디렉토리는 `.gitignore`에 포함되어 있습니다.

## 문제 해결

### tsx 명령어를 찾을 수 없음
```bash
npm install --save-dev tsx
```

### Puppeteer 실행 오류
Puppeteer는 Chromium을 다운로드하므로 첫 실행 시 시간이 걸릴 수 있습니다.

### 로그가 저장되지 않음
`logs/` 디렉토리에 쓰기 권한이 있는지 확인하세요.
