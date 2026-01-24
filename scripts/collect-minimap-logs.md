# 미니맵 디버깅 로그 수집 가이드

로그인 후 미니맵 기능 문제를 디버깅하기 위한 로그 수집 방법입니다.

## 방법 1: 브라우저 콘솔에서 직접 수집

1. 로그인 후 메인 페이지로 이동
2. 브라우저 개발자 도구 열기 (F12 또는 Cmd+Option+I)
3. Console 탭에서 다음 명령어 실행:

```javascript
// 미니맵 관련 로그만 확인
getMinimapLogs()

// 미니맵 로그만 파일로 다운로드
downloadMinimapLogs()

// 모든 로그 확인
getConsoleLogs()

// 모든 로그 다운로드
downloadConsoleLogs()
```

## 방법 2: Puppeteer 스크립트로 자동 수집

**주의**: 로그인이 필요한 경우, 먼저 수동으로 로그인한 후 세션 쿠키를 사용하거나, 
스크립트를 수정하여 로그인 과정을 포함시켜야 합니다.

```bash
# 로컬 서버 모니터링 (로그인 필요 시 수동 로그인 후 실행)
npm run monitor:console -- http://localhost:3000 --timeout 30000
```

## 수집되는 미니맵 관련 로그

다음 키워드가 포함된 로그가 자동으로 필터링됩니다:
- `Minimap` / `minimap`
- `Scale Calculation`
- `DOM Actual Size`
- `Blob Debug`
- `Symbol Debug`
- `canvasBounds`
- `viewportBounds`
- `symbolItems`

## 로그 파일 위치

- 브라우저에서 다운로드: 브라우저의 기본 다운로드 폴더
- 서버로 전송: `logs/console/console-logs-*.json`
- Puppeteer 스크립트: `logs/monitor/monitor-*.json`

## 문제 해결

### 미니맵이 보이지 않는 경우
1. `getMinimapLogs()` 실행하여 에러 확인
2. `canvasBounds`, `scale`, `containerWidth/Height` 값 확인
3. `symbolItems count`가 0인지 확인

### 미니맵 위치가 이상한 경우
1. `offsetX/Y` 값 확인
2. `viewportBounds` 값 확인
3. `transformToMinimap` 함수 동작 확인

### 미니맵이 클리핑되는 경우
1. `DOM Actual Size Debug` 로그 확인
2. `finalBoardPixelWidth/Height` vs 실제 DOM 크기 비교
3. `Will overflow?` 로그 확인
