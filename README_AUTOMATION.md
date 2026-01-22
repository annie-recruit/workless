# 자동화 설정 가이드

이 프로젝트에는 다음 자동화 기능이 설정되어 있습니다:

## 1. GitHub Actions CI

### 파일: `.github/workflows/ci.yml`

**동작:**
- `main` 또는 `develop` 브랜치에 푸시/PR 시 자동 실행
- 린트, 타입 체크, 빌드 테스트 수행
- 실패 시 GitHub Actions 탭에서 확인 가능

**실행 단계:**
1. 코드 체크아웃
2. Node.js 20 설정
3. 의존성 설치 (`npm ci`)
4. 린트 실행
5. 타입 체크 (`tsc --noEmit`)
6. 빌드 테스트 (`npm run build`)

## 2. Pre-commit 훅 (Husky)

### 파일: `.husky/pre-commit`

**동작:**
- 커밋 전 자동으로 실행
- 타입 체크, 린트, lint-staged 실행
- 실패 시 커밋 차단

**설정:**
- `lint-staged`가 스테이징된 파일만 체크
- TypeScript 파일: ESLint + Prettier
- JSON/MD 파일: Prettier

**비활성화 (일시적):**
```bash
git commit --no-verify
```

## 3. Railway 웹훅 엔드포인트

### 파일: `app/api/webhooks/railway/route.ts`

**동작:**
- Railway에서 배포 실패 시 이 엔드포인트로 알림
- 자동으로 GitHub 이슈 생성
- 오류 패턴 분석 및 해결 방법 제시

**설정 필요:**
1. Railway 대시보드에서 웹훅 설정:
   - URL: `https://your-domain.com/api/webhooks/railway`
   - 이벤트: `deployment.failed`, `deployment.error`

2. 환경 변수 설정 (Railway 또는 `.env`):
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_REPO=annie-recruit/workless
   ```

**GitHub Token 생성:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. `repo` 권한 부여
3. 토큰을 Railway 환경 변수에 추가

## 4. 배포 모니터링 워크플로우

### 파일: `.github/workflows/railway-webhook.yml`

**동작:**
- Railway 배포 실패 시 자동으로 GitHub 이슈 생성
- 오류 로그 분석 및 패턴 감지
- 가능한 해결 방법 제시

## 사용 방법

### 로컬에서 테스트

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 빌드 테스트
npm run build
```

### Railway 웹훅 테스트

```bash
# 웹훅 엔드포인트 확인
curl https://your-domain.com/api/webhooks/railway

# 배포 실패 시뮬레이션 (Railway 대시보드에서 설정)
```

## 문제 해결

### Pre-commit이 너무 느린 경우

`.husky/pre-commit`에서 일부 체크를 제거하거나 조건부로 실행:

```bash
# 타입 체크만 실행
npm run type-check || exit 1
```

### GitHub Actions 실패 시

1. GitHub 저장소 → Actions 탭 확인
2. 실패한 워크플로우 클릭
3. 로그 확인 및 수정

### Railway 웹훅이 작동하지 않는 경우

1. Railway 대시보드에서 웹훅 설정 확인
2. `GITHUB_TOKEN` 환경 변수 확인
3. Railway 로그에서 웹훅 호출 확인
