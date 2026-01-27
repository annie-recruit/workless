# Google Search Console 소유권 확인 단계별 가이드

## 📋 전체 과정 요약

Google OAuth 브랜딩 인증을 위해서는 **Google Search Console**에서 도메인 소유권을 먼저 확인해야 합니다.

---

## 🚀 단계별 상세 가이드

### 1단계: Google Search Console 접속

1. 브라우저에서 [Google Search Console](https://search.google.com/search-console) 접속
2. OAuth 프로젝트와 같은 Google 계정으로 로그인

### 2단계: 속성 추가

1. 왼쪽 상단의 **속성 선택** 드롭다운 클릭
2. **속성 추가** 클릭
3. **URL 접두어** 탭 선택 (권장)
4. 도메인 입력: `https://workless-production.up.railway.app`
   - ⚠️ **주의**: `https://` 포함해서 정확히 입력
5. **계속** 버튼 클릭

### 3단계: 소유권 확인 방법 선택 화면

이제 Google이 소유권 확인 방법을 선택하라고 합니다. 다음 중 하나를 선택할 수 있습니다:

#### ✅ 방법 1: HTML 태그 (가장 간단, 권장)

1. **HTML 태그** 탭 클릭
2. 화면에 다음과 같은 메타 태그가 표시됩니다:

```html
<meta name="google-site-verification" content="여기에-긴-문자열-코드가-표시됩니다" />
```

3. **이 코드를 복사하세요!**
   - `content="..."` 부분의 긴 문자열이 중요합니다
   - 예시: `content="ABC123XYZ789..."`

4. 이 코드를 알려주시면 `app/layout.tsx`에 추가하겠습니다

#### 방법 2: HTML 파일

1. **HTML 파일** 탭 클릭
2. Google이 파일명을 제공합니다 (예: `google1234567890.html`)
3. 파일 내용도 함께 제공됩니다
4. 파일명과 내용을 알려주시면 `public/` 폴더에 생성하겠습니다

#### 방법 3: Google Analytics

1. **Google Analytics** 탭 클릭
2. Google Analytics 추적 코드가 이미 있는 경우 사용 가능

#### 방법 4: Google Tag Manager

1. **Google Tag Manager** 탭 클릭
2. Google Tag Manager가 이미 설정되어 있는 경우 사용 가능

#### 방법 5: DNS 레코드

1. **DNS 레코드** 탭 클릭
2. Google이 DNS 레코드 정보를 제공합니다:
   - 타입: `TXT`
   - 이름: `@` 또는 도메인 이름
   - 값: 긴 확인 코드 문자열
3. 이 정보를 Railway 또는 도메인 제공업체의 DNS 설정에 추가해야 합니다

---

## 💡 추천 방법: HTML 태그 (가장 간단)

**HTML 태그 방법을 추천하는 이유:**
- ✅ 가장 빠르고 간단함
- ✅ 파일 업로드 불필요
- ✅ DNS 설정 불필요
- ✅ 코드 한 줄만 추가하면 됨

### HTML 태그 방법 상세 단계:

1. Google Search Console에서 **HTML 태그** 탭 선택
2. 화면에 표시된 메타 태그 전체를 복사
   - 예시:
   ```html
   <meta name="google-site-verification" content="abc123xyz789def456ghi012jkl345mno678pqr901stu234vwx567yz" />
   ```
3. **이 메타 태그 전체**를 알려주세요
4. 제가 `app/layout.tsx`에 추가하겠습니다
5. Railway에 배포
6. Google Search Console로 돌아가서 **확인** 버튼 클릭

---

## 📸 화면에서 찾아야 할 것

Google Search Console의 소유권 확인 화면에서:

```
┌─────────────────────────────────────────┐
│ 소유권 확인                              │
├─────────────────────────────────────────┤
│                                         │
│  [HTML 태그] [HTML 파일] [DNS 레코드]   │
│                                         │
│  HTML 태그 방법:                        │
│                                         │
│  아래 태그를 홈페이지의 <head> 섹션에   │
│  추가하세요:                            │
│                                         │
│  <meta name="google-site-verification"  │
│        content="여기에-코드가-있습니다" │
│        />                                │
│                                         │
│  [확인] 버튼을 클릭하기 전에 태그를     │
│  추가하고 저장하세요.                   │
│                                         │
└─────────────────────────────────────────┘
```

**이 화면에서 `content="..."` 부분의 긴 문자열을 복사해주세요!**

---

## 🔧 다음 단계

1. Google Search Console에서 메타 태그 코드 확인
2. 코드를 알려주시면 제가 `app/layout.tsx`에 추가
3. Railway에 배포
4. Google Search Console에서 **확인** 버튼 클릭
5. 소유권 확인 완료 후 Google Cloud Console OAuth 동의 화면에서 확인

---

## ❓ 문제 해결

### Q: 속성 추가 버튼이 안 보여요
A: 이미 속성이 추가되어 있을 수 있습니다. 왼쪽 상단의 속성 목록을 확인하세요.

### Q: 메타 태그가 안 보여요
A: **HTML 태그** 탭을 클릭했는지 확인하세요. 다른 탭(HTML 파일, DNS 등)을 선택하면 다른 방법이 표시됩니다.

### Q: 확인 버튼을 눌렀는데 실패했어요
A: 
1. 메타 태그가 `app/layout.tsx`의 `<head>` 섹션에 정확히 추가되었는지 확인
2. Railway에 배포되었는지 확인
3. 배포 후 몇 분 기다린 후 다시 시도
4. 브라우저에서 페이지 소스 보기(`Ctrl+U` 또는 `Cmd+Option+U`)로 메타 태그가 있는지 확인

---

## 📝 체크리스트

- [ ] Google Search Console 접속
- [ ] 속성 추가 (`https://workless-production.up.railway.app`)
- [ ] **HTML 태그** 탭 선택
- [ ] 메타 태그 코드 복사
- [ ] 코드를 알려주기
- [ ] 제가 `app/layout.tsx`에 추가
- [ ] Railway에 배포
- [ ] Google Search Console에서 **확인** 버튼 클릭
- [ ] 소유권 확인 완료 확인
