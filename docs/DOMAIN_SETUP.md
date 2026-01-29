# 🌐 workless.me 도메인 설정 가이드

## 1️⃣ Railway에 도메인 추가

### Railway 대시보드에서:
1. Railway.app 접속
2. Workless 프로젝트 선택
3. **Settings** 탭 → **Domains** 섹션
4. **+ Add Domain** 클릭
5. `workless.me` 입력 후 **Add**

Railway가 다음과 같은 DNS 레코드를 보여줄 것입니다:

```
Type: CNAME
Name: @
Value: [railway-provided-value].railway.app
```

또는

```
Type: A
Name: @
Value: [IP address]
```

---

## 2️⃣ 도메인 등록업체에서 DNS 설정

### 도메인을 구매한 곳 (예: Namecheap, GoDaddy, Cloudflare 등)에서:

#### 옵션 A: CNAME 레코드 (추천)
```
Type: CNAME
Host: @
Value: [Railway에서 제공한 주소].railway.app
TTL: Automatic 또는 300
```

#### 옵션 B: A 레코드
```
Type: A
Host: @
Value: [Railway에서 제공한 IP]
TTL: Automatic 또는 300
```

#### www 서브도메인 추가 (선택사항)
```
Type: CNAME
Host: www
Value: workless.me
TTL: Automatic 또는 300
```

**중요**: DNS 전파는 최대 48시간 걸릴 수 있지만, 보통 5-10분이면 완료됩니다.

---

## 3️⃣ Railway 환경변수 업데이트

Railway 대시보드 → **Variables** 탭에서 다음 변수 수정:

### 필수 변경:
```bash
NEXTAUTH_URL=https://workless.me
```

### Google OAuth 리디렉션 URL 업데이트 필요:
- Google Cloud Console 접속
- OAuth 2.0 클라이언트 설정
- **승인된 리디렉션 URI** 추가:
  - `https://workless.me/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google` (개발용)

---

## 4️⃣ 로컬 개발 환경 업데이트

`.env.local` 파일은 그대로 유지 (localhost용):

```bash
NEXTAUTH_URL=http://localhost:3000  # 로컬은 그대로
```

---

## 5️⃣ SSL/HTTPS 설정

Railway는 자동으로 Let's Encrypt SSL 인증서를 발급합니다.
도메인이 연결되면 자동으로 HTTPS가 활성화됩니다.

---

## 6️⃣ 확인 체크리스트

- [ ] Railway에서 도메인 상태가 "Active" 또는 "Connected"
- [ ] `https://workless.me` 접속 가능
- [ ] `https://www.workless.me` 접속 가능 (www 설정한 경우)
- [ ] Google OAuth 로그인 작동
- [ ] SSL 인증서 (자물쇠 아이콘) 표시됨

---

## 7️⃣ 추가 설정 (선택사항)

### Sentry 도메인 업데이트
Sentry 프로젝트 설정에서 도메인 업데이트

### Google Search Console
- 새 속성 추가: `https://workless.me`
- 소유권 확인

### Google Analytics (사용하는 경우)
- 속성 설정에서 URL 업데이트

---

## 🐛 문제 해결

### "도메인이 연결되지 않음"
- DNS 전파 대기 (최대 48시간)
- `dig workless.me` 명령어로 DNS 확인
- Railway 로그 확인

### "SSL 인증서 오류"
- DNS가 제대로 설정되었는지 확인
- Railway에서 도메인 제거 후 다시 추가

### "Google OAuth 오류"
- Google Cloud Console에서 리디렉션 URI 확인
- NEXTAUTH_URL 환경변수 확인

---

## 📞 도움이 필요하면

1. Railway 문서: https://docs.railway.app/deploy/custom-domains
2. DNS 전파 확인: https://dnschecker.org
3. SSL 테스트: https://www.ssllabs.com/ssltest/

---

**축하합니다! 🎉**
`workless.me`가 이제 당신의 프로덕션 URL입니다!
