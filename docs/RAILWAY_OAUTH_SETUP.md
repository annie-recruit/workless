# Railway 프로덕션 OAuth 설정 확인 가이드

## 🔍 리디렉션 URI 확인

### 현재 프로덕션 URL
```
https://workless-production.up.railway.app
```

### 리디렉션 URI (자동 생성)
```
https://workless-production.up.railway.app/api/auth/callback/google
```

---

## ✅ 확인 체크리스트

### 1. Railway 환경 변수 확인

1. [Railway 대시보드](https://railway.app/) 접속
2. Workless 프로젝트 선택
3. **Variables** 탭 클릭
4. 다음 환경 변수들이 설정되어 있는지 확인:

```env
NEXTAUTH_URL=https://workless-production.up.railway.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

**중요:**
- `NEXTAUTH_URL`은 정확히 `https://workless-production.up.railway.app`로 설정되어야 합니다
- NextAuth는 자동으로 `${NEXTAUTH_URL}/api/auth/callback/google` 경로를 사용합니다

### 2. Google Cloud Console 리디렉션 URI 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보** 메뉴로 이동
3. OAuth 2.0 클라이언트 ID 선택 (Workless용)
4. **승인된 리디렉션 URI** 섹션 확인

**다음 URI가 등록되어 있어야 합니다:**
```
https://workless-production.up.railway.app/api/auth/callback/google
```

**등록되지 않은 경우:**
1. **+ URI 추가** 버튼 클릭
2. 위 URL을 정확히 입력 (복사-붙여넣기 권장)
3. **저장** 클릭

### 3. Railway 로그 확인

Railway 대시보드에서 배포 로그를 확인하면 다음 메시지가 출력됩니다:

```
📌 NEXTAUTH_URL: https://workless-production.up.railway.app
📌 예상 리디렉션 URI: https://workless-production.up.railway.app/api/auth/callback/google
```

이 메시지가 출력되면 환경 변수가 올바르게 설정된 것입니다.

---

## 🐛 문제 해결

### 문제: "redirect_uri_mismatch" 오류

**원인:** Google Cloud Console에 리디렉션 URI가 등록되지 않았거나, Railway의 `NEXTAUTH_URL`이 잘못 설정됨

**해결 방법:**
1. Google Cloud Console에서 리디렉션 URI 확인 및 추가
2. Railway 환경 변수에서 `NEXTAUTH_URL` 확인
3. Railway 재배포

### 문제: 로그인 후 리디렉션되지 않음

**원인:** `NEXTAUTH_URL`이 설정되지 않았거나 잘못된 값

**해결 방법:**
1. Railway Variables에서 `NEXTAUTH_URL` 확인
2. 정확히 `https://workless-production.up.railway.app`로 설정
3. Railway 재배포

---

## 📝 참고사항

- NextAuth는 자동으로 리디렉션 URI를 생성하므로 `GOOGLE_REDIRECT_URI` 환경 변수는 필요 없습니다
- `gmail.ts`에서 사용하는 `GOOGLE_REDIRECT_URI`는 Gmail API 직접 호출 시에만 사용됩니다
- NextAuth를 통한 로그인은 자동으로 리디렉션 URI를 처리합니다

---

**작성일**: 2026-01-27
