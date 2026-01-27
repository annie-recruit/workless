# Google OAuth 앱 게시 가이드

## 📋 개요

현재 Workless는 Gmail 연동을 위해 Google OAuth를 사용하고 있습니다. 상용화를 위해서는 **OAuth 동의 화면을 게시**해야 합니다.

### 현재 상태
- ✅ OAuth 설정 완료
- ✅ 테스트 계정 등록 완료
- ⚠️ **앱 게시 필요** (상용화를 위해)

### 왜 게시가 필요한가?
- **테스트 모드**: 최대 100명의 테스트 사용자만 사용 가능
- **게시 후**: 모든 사용자가 앱을 사용할 수 있음
- **Gmail API**: 민감한 스코프이므로 Google 검토가 필요할 수 있음

---

## 🚀 단계별 가이드

### 1단계: Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (Workless 프로젝트)

### 2단계: OAuth 동의 화면 확인 및 수정

1. **API 및 서비스** > **OAuth 동의 화면** 메뉴로 이동
2. 현재 설정 확인:
   - **앱 이름**: Workless (또는 원하는 이름)
   - **사용자 지원 이메일**: 본인 이메일
   - **앱 로고**: 업로드 (선택사항)
   - **앱 도메인**: 프로덕션 도메인 (예: `workless.app`)
   - **개발자 연락처 정보**: 본인 이메일

3. **스코프** 확인:
   - ✅ `openid`
   - ✅ `email`
   - ✅ `profile`
   - ✅ `https://www.googleapis.com/auth/gmail.readonly` ⚠️ **이 스코프는 검토 필요**

### 3단계: 테스트 사용자 설정 (현재 상태 확인)

1. **테스트 사용자** 섹션에서:
   - 본인 이메일이 테스트 사용자로 등록되어 있는지 확인
   - 필요시 추가 테스트 사용자 등록 (최대 100명)

### 4단계: 앱 게시 준비

#### 4-1. 필수 정보 확인

다음 정보들이 모두 입력되어 있는지 확인:

- [ ] 앱 이름
- [ ] 사용자 지원 이메일
- [ ] 개발자 연락처 정보
- [ ] 앱 도메인 (프로덕션 URL)
- [ ] 개인정보처리방침 URL (필수)
- [ ] 서비스 약관 URL (선택, 권장)

#### 4-2. 개인정보처리방침 작성

Gmail API를 사용하므로 개인정보처리방침이 **필수**입니다.

**✅ 완료됨:** 개인정보처리방침 페이지가 생성되었습니다.

**페이지 위치:**
- URL: `https://your-domain.com/privacy` (예: `https://workless.app/privacy`)
- 파일: `/app/privacy/page.tsx`

**Google Cloud Console에 등록:**
1. **OAuth 동의 화면** > **개인정보처리방침 URL** 필드에 입력:
   ```
   https://your-domain.com/privacy
   ```
   (실제 프로덕션 도메인으로 변경하세요)

**포함된 내용:**
- ✅ Gmail 읽기 권한 사용 명시
- ✅ 데이터 수집 목적 및 사용 방법
- ✅ 데이터 보관 기간 및 삭제 권리
- ✅ 보안 조치 설명
- ✅ 제3자 서비스 (Google OAuth, OpenAI API) 명시

#### 4-3. Gmail API 검토 준비

`gmail.readonly` 스코프는 **Google 검토**가 필요합니다.

**검토에 필요한 정보:**
1. **사용 사례 설명**: 왜 Gmail 데이터가 필요한지
2. **데이터 사용 방식**: 읽기 전용으로만 사용한다는 명시
3. **보안 조치**: 데이터 암호화, 접근 제어 등
4. **비디오 데모** (선택, 권장): 앱 사용 방법 시연

**검토 기간**: 보통 1-2주 소요

### 5단계: 앱 게시

1. **OAuth 동의 화면** 페이지에서 **"게시"** 또는 **"PUBLISH APP"** 버튼 클릭
2. 확인 메시지에서 **"확인"** 클릭
3. Gmail API 스코프 사용 시 **검토 요청** 자동 제출

### 6단계: 검토 대기 (Gmail API 사용 시)

1. **API 및 서비스** > **OAuth 동의 화면**에서 상태 확인
   - 상태: "검토 중" 또는 "게시됨"
2. Google에서 이메일로 검토 진행 상황 알림
3. 추가 정보 요청 시 제공

### 7단계: 게시 완료 후

1. **게시됨** 상태 확인
2. 모든 사용자가 앱 사용 가능
3. 테스트 사용자 제한 해제

---

## ⚠️ 주의사항

### 1. 검토 거부 시
- Google이 검토를 거부하면 이유를 알려줍니다
- 요청사항에 맞춰 수정 후 재제출

### 2. 제한된 스코프 사용
- `gmail.readonly`는 읽기 전용이므로 검토 통과 가능성이 높습니다
- 쓰기 권한(`gmail.send`, `gmail.modify` 등)은 더 엄격한 검토 필요

### 3. 프로덕션 환경 변수
게시 후에도 다음 환경 변수들이 올바르게 설정되어 있는지 확인:

**Railway 환경 변수 설정:**
1. Railway 대시보드 > 프로젝트 > Variables 탭
2. 다음 환경 변수들이 설정되어 있는지 확인:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=https://workless-production.up.railway.app
NEXTAUTH_SECRET=your_secret_key
```

**중요:** 
- `NEXTAUTH_URL`은 Railway 프로덕션 URL과 정확히 일치해야 합니다
- NextAuth는 자동으로 `${NEXTAUTH_URL}/api/auth/callback/google` 경로를 사용합니다
- `GOOGLE_REDIRECT_URI`는 별도로 설정할 필요 없습니다 (NextAuth가 자동 처리)

### 4. 리디렉션 URI 확인 및 등록
**Google Cloud Console에서 확인:**

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보** 메뉴로 이동
3. OAuth 2.0 클라이언트 ID 선택
4. **승인된 리디렉션 URI** 섹션 확인

**다음 URI가 등록되어 있어야 합니다:**
```
https://workless-production.up.railway.app/api/auth/callback/google
```

**등록되지 않은 경우:**
1. **+ URI 추가** 버튼 클릭
2. 위 URL을 정확히 입력
3. **저장** 클릭

**확인 방법:**
- Railway 로그에서 다음 메시지 확인:
  ```
  📌 NEXTAUTH_URL: https://workless-production.up.railway.app
  📌 예상 리디렉션 URI: https://workless-production.up.railway.app/api/auth/callback/google
  ```

---

## 📝 체크리스트

게시 전 최종 확인:

- [ ] OAuth 동의 화면 정보 모두 입력
- [ ] 개인정보처리방침 URL 설정
- [ ] 프로덕션 리디렉션 URI 등록
- [ ] 테스트 계정으로 정상 작동 확인
- [ ] 프로덕션 환경 변수 설정 확인
- [ ] 앱 게시 버튼 클릭
- [ ] 검토 요청 제출 (Gmail API 사용 시)
- [ ] 검토 완료 대기

---

## 🔗 유용한 링크

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 동의 화면 설정](https://console.cloud.google.com/apis/credentials/consent)
- [Google API 검토 가이드](https://support.google.com/cloud/answer/9110914)
- [Gmail API 사용 가이드](https://developers.google.com/gmail/api/guides)

---

## 💡 팁

1. **검토 전 테스트**: 게시 전에 테스트 사용자로 충분히 테스트
2. **명확한 설명**: 검토 요청 시 사용 사례를 명확히 설명
3. **보안 강화**: 데이터 암호화, 접근 제어 등 보안 조치 강화
4. **문서화**: 개인정보처리방침과 서비스 약관을 명확히 작성

---

## ❓ 문제 해결

### Q: 게시 버튼이 비활성화되어 있어요
A: 필수 정보(개인정보처리방침 URL 등)가 누락되었을 수 있습니다. 모든 필수 항목을 확인하세요.

### Q: 검토가 거부되었어요
A: Google이 제공한 피드백을 확인하고 요청사항에 맞춰 수정 후 재제출하세요.

### Q: 테스트 사용자 제한이 언제 해제되나요?
A: 앱이 게시되고 검토가 완료되면 자동으로 해제됩니다.

---

**작성일**: 2026-01-27
**마지막 업데이트**: 2026-01-27
