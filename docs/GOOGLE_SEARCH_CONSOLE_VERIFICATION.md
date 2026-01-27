# Google Search Console을 통한 도메인 소유권 확인 가이드

## 📋 개요

Google OAuth 동의 화면의 브랜딩 인증을 위해서는 **Google Search Console**을 통해 도메인 소유권을 확인해야 합니다.

## 🚀 단계별 가이드

### 1단계: Google Search Console 접속

1. [Google Search Console](https://search.google.com/search-console) 접속
2. Google 계정으로 로그인 (OAuth 프로젝트와 같은 계정 사용)

### 2단계: 속성 추가

1. **속성 추가** 버튼 클릭
2. **URL 접두어** 방식 선택
3. 도메인 입력: `https://workless-production.up.railway.app`
4. **계속** 클릭

### 3단계: 소유권 확인 방법 선택

Google Search Console에서 다음 중 하나의 방법을 선택할 수 있습니다:

#### 방법 1: HTML 파일 업로드 (권장)

1. **HTML 파일** 방법 선택
2. Google이 제공한 파일명 확인 (예: `google1234567890.html`)
3. 파일 내용 확인 (보통 특정 메타 태그나 코드)
4. 파일명을 알려주시면 `public/` 폴더에 생성하겠습니다

**파일 생성 후:**
- 파일을 `public/` 폴더에 추가
- Railway에 배포
- Google Search Console에서 **확인** 버튼 클릭

#### 방법 2: HTML 태그 추가

1. **HTML 태그** 방법 선택
2. Google이 제공한 메타 태그 확인
   - 예: `<meta name="google-site-verification" content="ABC123XYZ..." />`
3. 메타 태그 코드를 알려주시면 `app/layout.tsx`에 추가하겠습니다

**메타 태그 추가 후:**
- Railway에 배포
- Google Search Console에서 **확인** 버튼 클릭

#### 방법 3: DNS 레코드 추가

1. **DNS 레코드** 방법 선택
2. Google이 제공한 DNS 레코드 확인
   - 타입: `TXT`
   - 이름: `@` 또는 도메인 이름
   - 값: Google이 제공한 확인 코드
3. Railway 또는 도메인 제공업체의 DNS 설정에 추가

**DNS 레코드 추가 후:**
- DNS 전파 대기 (보통 몇 분~몇 시간)
- Google Search Console에서 **확인** 버튼 클릭

### 4단계: 소유권 확인 완료

1. Google Search Console에서 **확인** 버튼 클릭
2. 소유권 확인 완료 메시지 확인
3. Google Cloud Console의 OAuth 동의 화면으로 돌아가기

### 5단계: OAuth 동의 화면에서 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **OAuth 동의 화면** 메뉴로 이동
3. **브랜딩** 섹션 확인
4. 도메인 소유권이 확인되었는지 확인

---

## ⚠️ 중요 사항

1. **도메인 정확히 입력**: `https://workless-production.up.railway.app` (프로토콜 포함)
2. **HTTPS 필수**: 프로덕션 환경에서는 HTTPS가 필요합니다
3. **배포 확인**: 파일/메타 태그 추가 후 Railway에 배포되어야 Google이 접근할 수 있습니다
4. **캐시**: 배포 후 브라우저 캐시를 지우고 확인하세요

---

## 🔧 문제 해결

### 문제: 파일을 찾을 수 없음 (404)

**해결:**
1. 파일이 `public/` 폴더에 있는지 확인
2. 파일명이 정확히 일치하는지 확인 (대소문자 구분)
3. Railway에 배포되었는지 확인
4. 브라우저에서 직접 URL 접근 테스트:
   ```
   https://workless-production.up.railway.app/google1234567890.html
   ```

### 문제: 메타 태그가 인식되지 않음

**해결:**
1. `app/layout.tsx`의 `<head>` 섹션에 정확히 추가되었는지 확인
2. 배포 후 페이지 소스에서 메타 태그 확인:
   - 브라우저에서 `Ctrl+U` (또는 `Cmd+Option+U`)로 소스 보기
   - 메타 태그가 있는지 확인
3. `'use client'` 컴포넌트에서는 메타 태그가 작동하지 않을 수 있으므로, `app/layout.tsx`에 추가해야 합니다

### 문제: DNS 레코드가 인식되지 않음

**해결:**
1. DNS 전파 시간 대기 (최대 48시간, 보통 몇 분~몇 시간)
2. DNS 조회 도구로 확인:
   ```
   nslookup -type=TXT workless-production.up.railway.app
   ```
3. Railway의 DNS 설정 확인 (Railway는 기본적으로 DNS를 관리하지 않으므로, 커스텀 도메인을 사용하는 경우 도메인 제공업체에서 설정)

---

## 📝 체크리스트

- [ ] Google Search Console 접속
- [ ] 속성 추가 (`https://workless-production.up.railway.app`)
- [ ] 소유권 확인 방법 선택 (HTML 파일/메타 태그/DNS)
- [ ] Google이 제공한 파일명/메타 태그/DNS 레코드 확인
- [ ] 파일 생성 또는 설정 추가
- [ ] Railway에 배포
- [ ] 브라우저에서 직접 접근 테스트
- [ ] Google Search Console에서 확인 완료
- [ ] Google Cloud Console OAuth 동의 화면에서 도메인 확인

---

## 🔗 참고 링크

- [Google Search Console](https://search.google.com/search-console)
- [Google Cloud Console - OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent)
- [Google 브랜딩 인증 가이드](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
