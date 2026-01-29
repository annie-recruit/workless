#!/bin/bash
# workless 로컬 개발 서버 실행
cd "$(dirname "$0")"

# nvm 사용 시
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node &>/dev/null; then
  echo "❌ Node.js가 설치되어 있지 않습니다."
  echo "   https://nodejs.org 에서 LTS 버전을 설치하거나, 터미널에서:"
  echo "   brew install node"
  exit 1
fi

echo "Node $(node -v) | npm $(npm -v)"
echo ""

if [ ! -d "node_modules" ]; then
  echo "📦 의존성 설치 중..."
  npm install
  echo ""
fi

echo "🚀 개발 서버 시작 (http://localhost:3000)"
echo "   종료: Ctrl+C"
echo ""
npm run dev
