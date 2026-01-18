const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 배경
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);
  
  // W 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', size / 2, size / 2);
  
  // 그라데이션 라인
  const gradient = ctx.createLinearGradient(size * 0.2, size * 0.75, size * 0.8, size * 0.75);
  gradient.addColorStop(0, '#60a5fa');
  gradient.addColorStop(1, '#a78bfa');
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.75);
  ctx.lineTo(size * 0.8, size * 0.75);
  ctx.stroke();
  
  // 파일 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`✅ ${filename} 생성 완료!`);
}

// 아이콘 생성
generateIcon(192, 'public/icon-192.png');
generateIcon(512, 'public/icon-512.png');

console.log('\n🎉 모든 아이콘 생성 완료!');
