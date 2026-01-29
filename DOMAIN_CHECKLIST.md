# ✅ workless.me 도메인 설정 체크리스트

## 🎯 목표
`workless.me` 도메인을 Railway 프로젝트에 연결하고 모든 기능이 정상 작동하도록 설정

---

## 📋 단계별 체크리스트

### 1️⃣ Railway 도메인 설정

- [ ] **Railway 대시보드** 접속
- [ ] **Settings** → **Domains** 클릭
- [ ] **+ Add Domain** 클릭
- [ ] `workless.me` 입력 후 **Add**
- [ ] Railway가 제공한 DNS 레코드 복사 (CNAME 또는 A 레코드)
- [ ] 포트 입력 창이 나오면 **3000** 입력

**Railway가 제공할 정보 예시:**
```
Type: CNAME
Name: @
Value: workless-production-xxxx.up.railway.app
```

---

### 2️⃣ DNS 설정 (도메인 등록업체)

도메인을 구매한 곳(Namecheap, GoDaddy, Cloudflare 등)에서:

#### 루트 도메인 (workless.me)
- [ ] **DNS 관리** 페이지 접속
- [ ] **새 레코드 추가**:
  - Type: `CNAME` (또는 A)
  - Host/Name: `@`
  - Value: Railway가 제공한 주소
  - TTL: `Automatic` 또는 `300`
- [ ] **저장**

#### www 서브도메인 (선택사항)
- [ ] **새 레코드 추가**:
  - Type: `CNAME`
  - Host/Name: `www`
  - Value: `workless.me`
  - TTL: `Automatic` 또는 `300`
- [ ] **저장**

**⏱️ DNS 전파 대기**: 5분~48시간 (보통 10분 이내)

---

### 3️⃣ Railway 환경변수 업데이트

- [ ] Railway **Variables** 탭 클릭
- [ ] `NEXTAUTH_URL` 찾기
- [ ] 값을 `https://workless.me`로 변경
- [ ] **Save** 클릭
- [ ] 자동 재배포 대기

**변경 전:**
```
NEXTAUTH_URL=https://workless-besir-production.up.railway.app
```

**변경 후:**
```
NEXTAUTH_URL=https://workless.me
```

---

### 4️⃣ Google OAuth 설정 업데이트

- [ ] [Google Cloud Console](https://console.cloud.google.com) 접속
- [ ] **API 및 서비스** → **사용자 인증 정보**
- [ ] OAuth 2.0 클라이언트 ID 클릭
- [ ] **승인된 리디렉션 URI** 섹션에 추가:
  ```
  https://workless.me/api/auth/callback/google
  ```
- [ ] 기존 Railway URL은 유지 (백업용)
- [ ] **저장**

---

### 5️⃣ 동작 테스트

#### 기본 접속
- [ ] `https://workless.me` 접속 가능
- [ ] `https://www.workless.me` 접속 가능 (www 설정한 경우)
- [ ] SSL 인증서 표시 (🔒 자물쇠 아이콘)
- [ ] 페이지 정상 로드

#### Google OAuth 로그인
- [ ] **Google로 로그인** 버튼 클릭
- [ ] Google 로그인 화면 표시
- [ ] 로그인 성공 후 대시보드 접속
- [ ] 세션 유지 확인 (새로고침 후에도 로그인 상태)

#### 주요 기능
- [ ] 메모리 추가/수정/삭제
- [ ] 보드 위에서 카드 드래그
- [ ] AI 기능 (요약, 그룹 제안 등)
- [ ] 파일 업로드
- [ ] 이미지 로드 (Google 프로필 이미지 등)

---

### 6️⃣ 추가 설정 (선택사항)

#### Sentry 도메인 업데이트
- [ ] [Sentry.io](https://sentry.io) 접속
- [ ] 프로젝트 설정
- [ ] **Allowed Domains**에 `workless.me` 추가

#### Google Search Console
- [ ] [Search Console](https://search.google.com/search-console) 접속
- [ ] 새 속성 추가: `https://workless.me`
- [ ] 소유권 확인 (DNS TXT 레코드)

#### Google Analytics (사용하는 경우)
- [ ] Analytics 속성 설정
- [ ] URL을 `https://workless.me`로 업데이트

---

## 🐛 문제 해결

### "도메인이 연결되지 않습니다"

**원인**: DNS 전파 대기 중

**해결**:
```bash
# DNS 전파 확인
dig workless.me

# 또는 온라인 도구 사용
# https://dnschecker.org
```

### "SSL 인증서 오류"

**원인**: Let's Encrypt 인증서 발급 대기 중

**해결**:
1. DNS가 제대로 설정되었는지 확인
2. Railway 대시보드에서 도메인 상태 확인
3. 10-30분 대기 후 재시도
4. 여전히 안 되면 Railway에서 도메인 제거 후 다시 추가

### "Google OAuth 오류: redirect_uri_mismatch"

**원인**: Google OAuth 리디렉션 URI 미설정

**해결**:
1. Google Cloud Console → OAuth 2.0 클라이언트
2. 승인된 리디렉션 URI에 정확히 입력:
   ```
   https://workless.me/api/auth/callback/google
   ```
3. 저장 후 5분 대기

### "404 Not Found"

**원인**: Railway 재배포 필요

**해결**:
1. Railway 대시보드 → **Deployments** 탭
2. **Deploy** 버튼 클릭하여 수동 재배포
3. 또는 Git push로 자동 배포 트리거

---

## 🔧 유용한 명령어

```bash
# DNS 조회
dig workless.me
dig www.workless.me

# HTTPS 연결 테스트
curl -I https://workless.me

# SSL 인증서 확인
openssl s_client -connect workless.me:443 -servername workless.me
```

---

## 📞 도움 리소스

- **Railway 문서**: https://docs.railway.app/deploy/custom-domains
- **DNS 전파 확인**: https://dnschecker.org
- **SSL 테스트**: https://www.ssllabs.com/ssltest/
- **Google OAuth 설정**: https://console.cloud.google.com

---

## 🎉 완료!

모든 체크리스트를 완료하면:

✅ **https://workless.me** 에서 Workless 접속 가능  
✅ **Google OAuth 로그인** 정상 작동  
✅ **SSL/HTTPS** 자동 활성화  
✅ **모든 기능** 정상 작동  

---

**마지막 업데이트**: 2026-01-29  
**도메인**: workless.me  
**프로젝트**: Workless - 비정형 애자일 워크스페이스
