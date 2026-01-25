# Sentry 세팅 (로컬 포함, 쉬운 버전)

이 프로젝트는 **DSN만 넣으면** 바로 동작하게 세팅해놨어요.

## 0) 준비물

- Sentry 계정(무료 플랜 가능)
- Sentry에서 만든 프로젝트 1개

## 1) Sentry에서 “프로젝트 만들기”

1. Sentry 로그인 → **Projects** → **Create Project**
2. 플랫폼은 **Next.js**(없으면 JavaScript)로 선택
3. 프로젝트 이름 정하고 생성
4. 생성 후 DSN 찾기:
   - 보통 **Project Settings → Client Keys (DSN)** 메뉴에 있어요.

여기서 **DSN 문자열**을 복사합니다. (대충 `https://...@o0.ingest.sentry.io/123` 형태)

## 2) 로컬에서 DSN 넣기 (가장 쉬운 방법)

`.env.local`에 아래 두 줄을 추가/수정하세요.

- `NEXT_PUBLIC_SENTRY_DSN=...` (브라우저에서 발생한 오류 전송용)
- `SENTRY_DSN=...` (서버/엣지/Route Handler 오류 전송용)

팁:
- 일단은 두 값에 **같은 DSN** 넣으면 됩니다.
- DSN을 안 넣으면(빈 값) Sentry 전송은 자동으로 꺼져요.

## 3) “진짜 되는지” 확인 (로컬)

서버 켠 뒤:

1. `npm run dev`
2. 브라우저에서 `http://localhost:3000/api/debug/sentry` 접속
   - 개발 환경에서만 일부러 에러를 던지는 엔드포인트입니다.
3. 화면에 `Sentry Event ID`가 보이면:
   - Sentry 웹에서 **Issues** 들어가서 방금 이슈가 생성됐는지 확인하면 돼요.
   - Event ID로 검색하면 더 빨라요.

## 4) (선택) 성능/트레이싱 샘플링

원하면 아래 값으로 성능 트레이싱 비율을 조절할 수 있어요. (0~1)

- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1`
- `SENTRY_TRACES_SAMPLE_RATE=0.1`

## 5) (선택) 소스맵 업로드(배포에서 “에러 위치”를 더 예쁘게)

이건 로컬에서는 굳이 안 해도 되고, **배포(예: Railway)에서만** 해도 충분해요.

1. Sentry에서 토큰 만들기:
   - **User Settings → API → Auth Tokens**에서 생성
   - Releases 관련 권한이 필요합니다(프로젝트 릴리즈 업로드용).
2. 배포 환경변수로 아래를 추가:
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - (권장) `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` (보통 git commit SHA)

이 값들이 있으면 Next 빌드 시점에 소스맵 업로드가 자동으로 붙어서,
Sentry에서 스택트레이스가 더 읽기 쉬워집니다.

## 6) (선택) Sentry Webhook을 우리 앱으로 받기 (JSON 저장)

이 프로젝트에는 Sentry Webhook을 받아서 `logs/sentry/*.json`으로 저장하는 엔드포인트가 있어요:

- `POST /api/webhooks/sentry`

### 설정 순서

1. `.env.local`(로컬) 또는 배포 환경변수에 시크릿 추가:
   - `SENTRY_WEBHOOK_SECRET=원하는_긴_문자열`
2. Sentry 웹에서 Webhook 생성:
   - 프로젝트/조직 설정에서 **Webhooks**로 이동 → **Add Webhook**
   - URL: `https://<너의도메인>/api/webhooks/sentry` (로컬 테스트면 ngrok 같은 터널 필요)
   - Secret: 위에서 만든 `SENTRY_WEBHOOK_SECRET`와 동일하게 입력
   - 이벤트는 일단 `issue`(또는 `error`) 관련부터 켜두면 좋아요
3. 트리거가 발생하면 서버의 `logs/sentry/`에 JSON 파일이 쌓입니다.

참고:
- `SENTRY_WEBHOOK_SECRET`가 없으면, 프로덕션에서는 요청을 거부하게 해놨어요(보안).
