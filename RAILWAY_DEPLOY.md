# 🚂 Railway 배포 가이드

## 📋 사전 준비

1. **GitHub에 코드 푸시** (필수)
   ```bash
   git push origin main
   ```
   - GitHub 인증이 필요하면 브라우저에서 인증하세요

2. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub로 로그인

## 🚀 Railway 배포 단계

### 1. 새 프로젝트 생성
1. Railway 대시보드에서 **New Project** 클릭
2. **Deploy from GitHub repo** 선택
3. `annie-recruit/workless` 리포지토리 선택

### 2. 환경 변수 설정
Railway 대시보드에서 **Variables** 탭으로 이동:

| Name | Value | 필수 여부 |
|------|-------|----------|
| `NEXTAUTH_SECRET` | 랜덤 문자열 (예: `openssl rand -base64 32`로 생성) | ✅ 필수 |
| `NEXTAUTH_URL` | 배포된 앱 URL (예: `https://your-app.railway.app`) | ✅ 필수 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | ✅ 필수 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | ✅ 필수 |
| `OPENAI_API_KEY` | OpenAI API 키 | ✅ 필수 |
| `PDF_SERVICES_CLIENT_ID` | Adobe PDF Services 클라이언트 ID (선택) | ⚪ 선택 |
| `PDF_SERVICES_CLIENT_SECRET` | Adobe PDF Services 클라이언트 시크릿 (선택) | ⚪ 선택 |

**NEXTAUTH_SECRET 생성 방법:**
터미널에서 다음 명령어 실행:
```bash
openssl rand -base64 32
```
생성된 문자열을 `NEXTAUTH_SECRET` 값으로 사용하세요.

### 3. 볼륨 설정 (데이터베이스 영구 저장)
1. **Settings** 탭으로 이동
2. **Volumes** 섹션에서 **Add Volume** 클릭
3. Mount Path: `/app/data`
4. **Add** 클릭

### 4. 배포 확인
1. Railway가 자동으로 빌드 및 배포 시작
2. **Deployments** 탭에서 배포 상태 확인
3. 배포 완료 후 **Settings** > **Generate Domain** 클릭하여 도메인 생성

## ✅ 배포 완료!

배포된 URL로 접속하면 앱을 사용할 수 있습니다!

## 🔄 업데이트 방법

코드 수정 후 GitHub에 푸시하면 Railway가 자동으로 재배포합니다:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 📱 PWA 설치

배포된 사이트에서:
- **iOS (Safari)**: 공유 버튼 → "홈 화면에 추가"
- **Android (Chrome)**: 메뉴 → "앱 설치"

## 💡 팁

- Railway 대시보드에서 로그 확인 가능
- 환경 변수는 언제든지 수정 가능
- 볼륨은 데이터베이스 파일을 영구 저장합니다
- 무료 플랜: $5 크레딧/월 제공

## 🐛 문제 해결

### 빌드 실패 시
- Railway 로그 확인
- `package.json`의 빌드 스크립트 확인
- Node.js 버전 확인 (18 이상 필요)

### 데이터베이스 오류 시
- 볼륨이 제대로 마운트되었는지 확인
- `/app/data` 경로 확인

### 서버 에러 (NO_SECRET) 시
- `NEXTAUTH_SECRET` 환경 변수가 설정되었는지 확인
- Railway 대시보드의 **Variables** 탭에서 환경 변수 확인
- 환경 변수 추가 후 서비스를 재시작하세요

### Google OAuth 설정 방법 (중요!)

**⚠️ `redirect_uri_mismatch` 오류 해결 방법:**

1. **Railway 도메인 확인**
   - Railway 대시보드에서 **Settings** > **Generate Domain** 클릭하여 도메인 생성
   - 생성된 도메인을 복사 (예: `https://workless-production.up.railway.app`)

2. **Google Cloud Console 설정**
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   - **API 및 서비스** > **사용자 인증 정보** 이동
   - **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
   - 애플리케이션 유형: **웹 애플리케이션**
   - **승인된 리디렉션 URI**에 다음을 **정확히** 추가:
     ```
     https://your-railway-domain.railway.app/api/auth/callback/google
     ```
     ⚠️ **주의사항:**
     - `https://`로 시작해야 함
     - 마지막에 `/` 없이 정확히 입력
     - Railway 도메인과 정확히 일치해야 함
     - (로컬 개발용) `http://localhost:3000/api/auth/callback/google`도 추가
   
3. **OAuth 동의 화면 설정**
   - **OAuth 동의 화면** 탭으로 이동
   - 사용자 유형 선택 (외부 또는 내부)
   - 앱 이름, 사용자 지원 이메일 등 필수 정보 입력
   - 테스트 사용자 추가 (앱이 검증되지 않은 경우)

4. **환경 변수 설정**
   - 생성된 **클라이언트 ID**를 `GOOGLE_CLIENT_ID`에 설정
   - 생성된 **클라이언트 시크릿**을 `GOOGLE_CLIENT_SECRET`에 설정
   - Railway 도메인을 `NEXTAUTH_URL`에 설정 (예: `https://your-railway-domain.railway.app`)

5. **리디렉션 URI 확인**
   - Google Cloud Console에서 설정한 URI가 Railway 도메인과 정확히 일치하는지 확인
   - URI는 대소문자를 구분하므로 정확히 입력해야 함
   - 변경 후 몇 분 정도 기다려야 반영될 수 있음
