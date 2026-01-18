# 🚀 GitHub & Vercel 배포 가이드

## 📝 다음 단계

### 1. GitHub 리포지토리 생성
1. https://github.com/new 접속
2. Repository name: `workless` (또는 원하는 이름)
3. **Private** 선택 (개인 프로젝트니까!)
4. **Create repository** 클릭

### 2. GitHub에 푸시
리포지토리 생성 후 나오는 URL을 복사하고 아래 명령어 실행:

```powershell
cd c:\Users\user\workless-besir
& "C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/annie-recruit/workless.git
& "C:\Program Files\Git\cmd\git.exe" branch -M main
& "C:\Program Files\Git\cmd\git.exe" push -u origin main
```

**참고**: GitHub 인증이 필요하면 브라우저가 열릴 거예요!

### 3. 앱 아이콘 생성
배포 전에 아이콘을 만들어야 해요:

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 `http://localhost:3000/generate-icons.html` 열기
3. 자동으로 `icon-192.png`와 `icon-512.png` 다운로드됨
4. 다운로드된 파일을 `public/` 폴더에 복사
5. Git에 추가:
```powershell
& "C:\Program Files\Git\cmd\git.exe" add public/icon-192.png public/icon-512.png
& "C:\Program Files\Git\cmd\git.exe" commit -m "Add app icons"
& "C:\Program Files\Git\cmd\git.exe" push
```

### 4. Vercel 배포 🌟
1. https://vercel.com 접속
2. **GitHub로 로그인**
3. **New Project** 클릭
4. `workless` 리포지토리 선택
5. **Environment Variables** 추가:
   - Name: `OPENAI_API_KEY`
   - Value: (여기에 OpenAI API 키 입력)
6. **Deploy** 클릭!

### 5. PWA 설치 📱
배포 완료 후:

**iOS (Safari)**
1. 배포된 URL 접속 (예: https://workless.vercel.app)
2. 공유 버튼 (⬆️) → "홈 화면에 추가"
3. 이름 확인 → 추가

**Android (Chrome)**
1. 배포된 URL 접속
2. 메뉴 (⋮) → "앱 설치" 또는 "홈 화면에 추가"
3. 설치

## ✅ 완료!
이제 핸드폰에서 앱처럼 사용할 수 있어요! 🎉

## 🔄 업데이트 방법
코드 수정 후:
```powershell
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "Update feature"
& "C:\Program Files\Git\cmd\git.exe" push
```
Vercel이 자동으로 재배포해요!

## 💡 팁
- Vercel 대시보드에서 배포 로그 확인 가능
- 환경 변수는 Vercel 대시보드 > Settings > Environment Variables에서 수정
- 도메인 변경: Vercel 대시보드 > Settings > Domains
