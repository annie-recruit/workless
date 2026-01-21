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

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | (여기에 OpenAI API 키 입력) |

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
