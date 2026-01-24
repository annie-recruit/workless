# 미니맵 로그 수집 가이드

로그인 후 미니맵 문제를 디버깅하기 위한 로그 수집 방법입니다.

## 🎯 가장 간단한 방법: 브라우저 콘솔에서 직접 수집

이미 로그인된 상태에서 브라우저 콘솔을 사용하는 것이 가장 안전하고 간단합니다.

### 단계별 가이드

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **브라우저에서 로그인**
   - http://localhost:3000 접속
   - Google 로그인 완료
   - 미니맵이 표시되는 페이지로 이동

3. **브라우저 개발자 도구 열기**
   - **Mac**: `Cmd + Option + I` 또는 `F12`
   - **Windows/Linux**: `Ctrl + Shift + I` 또는 `F12`
   - **Console** 탭 선택

4. **콘솔에서 다음 명령어 실행**

   ```javascript
   // 미니맵 관련 로그만 확인 (최근 20개)
   getMinimapLogs()

   // 미니맵 로그만 파일로 다운로드
   downloadMinimapLogs()

   // 모든 로그 확인
   getConsoleLogs()

   // 모든 로그 다운로드
   downloadConsoleLogs()

   // 로그를 서버로 전송 (logs/console/ 폴더에 저장)
   sendConsoleLogsToServer()
   ```

### 키보드 단축키

- `Ctrl + Shift + L` (Mac: `Cmd + Shift + L`): 모든 로그 다운로드

## 📊 수집되는 미니맵 관련 로그

다음 키워드가 포함된 로그가 자동으로 필터링됩니다:

- `Minimap` / `minimap`
- `Scale Calculation`
- `DOM Actual Size`
- `Blob Debug`
- `Symbol Debug`
- `canvasBounds`
- `viewportBounds`
- `symbolItems`
- `viewportRect`
- `centerX` / `centerY`
- `offsetX` / `offsetY`
- `scale`

## 🔍 문제 해결 가이드

### 미니맵이 보이지 않는 경우

```javascript
// 1. 미니맵 로그 확인
getMinimapLogs()

// 2. 에러 로그 확인
getConsoleLogs().filter(log => log.level === 'error')
```

확인할 값:
- `canvasBounds`가 올바른지
- `scale`이 0보다 큰지
- `containerWidth/Height`가 올바른지
- `symbolItems count`가 0보다 큰지

### 미니맵 위치가 이상한 경우

```javascript
// viewportRect 관련 로그 확인
getMinimapLogs().filter(log => log.message.includes('viewportRect'))
```

확인할 값:
- `viewportBounds` 값
- `offsetX/Y` 값
- `transformToMinimap` 함수 동작

### 미니맵이 클리핑되는 경우

```javascript
// overflow 관련 로그 확인
getMinimapLogs().filter(log => log.message.includes('overflow') || log.message.includes('Will overflow'))
```

확인할 값:
- `finalBoardPixelWidth/Height` vs 실제 DOM 크기
- `containerWidth/Height` vs 실제 컨테이너 크기

## 📁 로그 파일 위치

- **브라우저 다운로드**: 브라우저의 기본 다운로드 폴더
  - `minimap-logs-YYYY-MM-DD.txt`
  - `console-logs-YYYY-MM-DD.txt`
- **서버 저장**: `logs/console/console-logs-*.json`

## 💡 팁

1. **로그가 너무 많을 때**: `getMinimapLogs()`는 최근 20개만 테이블로 표시합니다.
2. **전체 로그 확인**: `getMinimapLogs()`를 실행하면 배열이 반환되므로, 콘솔에서 추가로 필터링할 수 있습니다.
3. **특정 키워드 검색**: 
   ```javascript
   getMinimapLogs().filter(log => log.message.includes('viewportRect'))
   ```
