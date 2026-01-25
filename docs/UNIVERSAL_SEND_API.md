# Workless Universal Send API

어디서든 텍스트를 Workless로 보낼 수 있는 Universal Send API 문서입니다.

## 엔드포인트

```
POST /api/inbox
```

## 인증

Bearer 토큰 방식을 사용합니다.

```
Authorization: Bearer <WORKLESS_SEND_API_KEY>
```

### API Key → userId 매핑

Universal Send API는 **세션이 아니라 API 키에 매핑된 userId**로 저장합니다.

- 권장: `WORKLESS_SEND_API_KEY_MAP` (JSON)
  - 예: `{"YOUR_KEY_1":"user-abc","YOUR_KEY_2":"user-def"}`
- 호환(단일 키): `WORKLESS_SEND_API_KEY` + (선택) `WORKLESS_SEND_API_USER_ID`

## 요청 형식

### Headers
```
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

### Body (JSON)
```json
{
  "text": "required - 저장할 텍스트 (최대 50,000자)",
  "source": "required - 출처 (예: ios-shortcut, raycast, cli)",
  "title": "optional - 제목",
  "url": "optional - 관련 URL",
  "createdAt": "optional - ISO 8601 형식",
  "clientId": "optional - 클라이언트 식별자 (호환용)",
  "sourceItemId": "optional - 소스 아이템 ID (권장)",
  "dedupeKey": "optional - 중복 방지 키 (dedupeKey, userId 기준)",
  "rawMeta": "optional - 원문 메타데이터(JSON object)"
}
```

## 응답 형식

### 성공 (201 Created)
```json
{
  "status": "ok",
  "cardId": "abc123",
  "ingestId": "ingest_456",
  "deduped": false
}
```

### 중복 (200 OK)
```json
{
  "status": "ok",
  "cardId": "existing-card-id",
  "ingestId": "existing-ingest-id",
  "deduped": true,
  "message": "Content already exists"
}
```

### 에러

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key. Please provide a valid Bearer token."
}
```

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "text field is required and must be a string"
}
```

#### 413 Payload Too Large
```json
{
  "error": "Payload Too Large",
  "message": "text field exceeds maximum length of 50000 characters"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 30
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later."
}
```

## Rate Limiting

- **제한**: 60 requests/minute per API key
- **응답 헤더**:
  - `X-RateLimit-Limit`: 분당 최대 요청 수
  - `X-RateLimit-Remaining`: 남은 요청 수
  - `X-RateLimit-Reset`: 리셋 시간 (Unix timestamp)

## curl 예시

### 1. 성공 케이스

```bash
curl -X POST https://your-domain.com/api/inbox \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "text": "iOS에서 보낸 메모입니다",
    "source": "ios-shortcut",
    "title": "아이디어"
  }'
```

**예상 응답**:
```json
{
  "status": "ok",
  "cardId": "xyz789",
  "ingestId": "xyz789",
  "deduped": false
}
```

### 2. 인증 실패 (401)

```bash
curl -X POST https://your-domain.com/api/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "text": "인증 없이 보낸 메모",
    "source": "test"
  }'
```

**예상 응답**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key. Please provide a valid Bearer token."
}
```

### 3. 필수 필드 누락 (400)

```bash
curl -X POST https://your-domain.com/api/inbox \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "source": "test"
  }'
```

**예상 응답**:
```json
{
  "error": "Bad Request",
  "message": "text field is required and must be a string"
}
```

### 4. 중복 방지 테스트

**첫 번째 요청**:
```bash
curl -X POST https://your-domain.com/api/inbox \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "text": "중복 테스트 메모",
    "source": "test",
    "dedupeKey": "test-dedupe-123"
  }'
```

**응답**:
```json
{
  "status": "ok",
  "cardId": "new-card-id",
  "ingestId": "new-card-id",
  "deduped": false
}
```

**두 번째 요청 (동일한 dedupeKey)**:
```bash
curl -X POST https://your-domain.com/api/inbox \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "text": "다른 내용이지만 같은 dedupeKey",
    "source": "test",
    "dedupeKey": "test-dedupe-123"
  }'
```

**응답**:
```json
{
  "status": "ok",
  "cardId": "new-card-id",
  "ingestId": "new-card-id",
  "deduped": true,
  "message": "Content already exists"
}
```

## iOS Shortcut 설정 예시

1. Shortcuts 앱에서 새 Shortcut 생성
2. "Get Contents of URL" 액션 추가
3. 설정:
   - **URL**: `https://your-domain.com/api/inbox`
   - **Method**: POST
   - **Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer YOUR_API_KEY`
   - **Request Body**: JSON
     ```json
     {
       "text": "[Shortcut Input]",
       "source": "ios-shortcut"
     }
     ```
4. 공유 시트에서 실행 가능하도록 설정

## 보안 고려사항

1. **API 키 보호**: 
   - API 키는 절대 클라이언트 코드에 하드코딩하지 마세요
   - 환경 변수로 관리하세요
   - 정기적으로 키를 갱신하세요

2. **Rate Limiting**:
   - 60 req/min 제한이 있습니다
   - 초과 시 429 응답을 받습니다

3. **Payload 크기**:
   - text 필드는 최대 50,000자로 제한됩니다
   - 초과 시 413 응답을 받습니다

4. **로깅**:
   - 서버는 보안을 위해 전체 텍스트를 로그에 기록하지 않습니다
   - 텍스트 길이와 메타데이터만 기록됩니다

## 문제 해결

### 401 Unauthorized
- API 키가 올바른지 확인하세요
- `Authorization` 헤더 형식이 `Bearer <KEY>` 인지 확인하세요

### 429 Too Many Requests
- 1분당 60회 제한을 초과했습니다
- `retryAfter` 초 후에 다시 시도하세요

### 500 Internal Server Error
- 서버 문제입니다
- 잠시 후 다시 시도하세요
- 계속 발생하면 관리자에게 문의하세요
