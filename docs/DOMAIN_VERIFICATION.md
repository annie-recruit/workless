# Google OAuth 도메인 소유권 확인 가이드

## 📋 개요

Google OAuth 동의 화면에서 브랜딩 인증을 하려면 도메인 소유권 확인이 필요합니다.

## 🔍 확인 방법

Google Cloud Console에서 다음 중 하나의 방법을 선택할 수 있습니다:

1. **HTML 파일 업로드** (가장 간단, 권장)
2. **DNS 레코드 추가**
3. **Google Search Console 연동**

---

## 방법 1: HTML 파일 업로드 (권장)

### 1단계: Google Cloud Console에서 파일명 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **OAuth 동의 화면** 메뉴로 이동
3. **브랜딩** 섹션에서 **도메인 소유권 확인** 클릭
4. **HTML 파일 업로드** 방법 선택
5. Google이 제공하는 파일명 확인 (예: `google1234567890.html`)

### 2단계: HTML 파일 생성

Google이 제공한 파일명으로 HTML 파일을 생성합니다.

**예시:**
- 파일명: `google1234567890.html` (Google이 제공한 실제 파일명 사용)
- 내용: Google이 제공한 특정 코드 또는 간단한 HTML

### 3단계: 파일 배포

생성한 HTML 파일을 `public/` 폴더에 추가하면 Next.js가 자동으로 루트 경로(`/`)에서 접근 가능하게 합니다.

**파일 위치:**
```
public/google1234567890.html
```

**접근 URL:**
```
https://workless-production.up.railway.app/google1234567890.html
```

### 4단계: Google에서 확인

1. Google Cloud Console로 돌아가기
2. **확인** 또는 **Verify** 버튼 클릭
3. Google이 파일에 접근하여 소유권 확인

---

## 방법 2: 메타 태그 추가

Google이 메타 태그를 요구하는 경우:

### 1단계: 메타 태그 확인

Google Cloud Console에서 제공하는 메타 태그를 확인합니다.

**예시:**
```html
<meta name="google-site-verification" content="ABC123XYZ..." />
```

### 2단계: 레이아웃에 추가

`app/layout.tsx`의 `<head>` 섹션에 메타 태그를 추가합니다.

```tsx
<head>
  <meta name="google-site-verification" content="Google이_제공한_코드" />
  {/* 기존 코드... */}
</head>
```

### 3단계: 배포 및 확인

1. 변경사항 커밋 및 배포
2. Google Cloud Console에서 확인

---

## 방법 3: DNS 레코드 추가

### 1단계: DNS 레코드 확인

Google Cloud Console에서 제공하는 DNS 레코드를 확인합니다.

**예시:**
- 타입: `TXT`
- 이름: `@` 또는 도메인 이름
- 값: Google이 제공한 확인 코드

### 2단계: DNS 설정

Railway나 도메인 제공업체의 DNS 설정에서 레코드를 추가합니다.

### 3단계: 확인

DNS 전파 후 Google Cloud Console에서 확인합니다.

---

## ⚠️ 주의사항

1. **파일명 정확히 일치**: Google이 제공한 파일명과 정확히 일치해야 합니다
2. **HTTPS 필수**: 프로덕션 환경에서는 HTTPS가 필요합니다
3. **배포 확인**: 파일 추가 후 Railway에 배포되어야 Google이 접근할 수 있습니다
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

### 문제: DNS 레코드가 인식되지 않음

**해결:**
1. DNS 전파 시간 대기 (최대 48시간, 보통 몇 분~몇 시간)
2. DNS 조회 도구로 확인:
   ```
   nslookup -type=TXT your-domain.com
   ```
3. Railway의 DNS 설정 확인

---

## 📝 체크리스트

- [ ] Google Cloud Console에서 소유권 확인 방법 선택
- [ ] Google이 제공한 파일명/메타 태그/DNS 레코드 확인
- [ ] 파일 생성 또는 설정 추가
- [ ] Railway에 배포
- [ ] 브라우저에서 직접 접근 테스트
- [ ] Google Cloud Console에서 확인 완료

---

## 🔗 참고 링크

- [Google Cloud Console - OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent)
- [Google 도메인 소유권 확인 가이드](https://support.google.com/webmasters/answer/9008080)
