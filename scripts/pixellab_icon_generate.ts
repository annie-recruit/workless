#!/usr/bin/env tsx

/**
 * PixelLab API를 사용하여 UI용 픽셀 아이콘을 생성하고 후처리하는 CLI 스크립트
 * 
 * 사용법:
 *   pnpm gen:icon --name trash --prompt "trash can"
 *   pnpm gen:icon --name check --prompt "check mark" --size 128 --force
 * 
 * 아이콘 생성 규칙:
 * - 해상도: 항상 128x128 이상 (기본값 128)
 * - 스타일: pixel art UI icon, simple flat shape, thick white outline
 * - 후처리: 128x128 고정 캔버스, 중앙 정렬, 8px padding
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 경로 (scripts/ 상위)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'icons');
const MANIFEST_PATH = path.join(ICONS_DIR, 'manifest.json');

// 아이콘 캔버스 설정
const CANVAS_SIZE = 128; // 최종 캔버스 크기 (고정)
const PADDING = 8; // 아이콘 주변 여백

// .env.local 파일 로드
function loadEnvFile() {
  const envPath = path.join(PROJECT_ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

// CLI 인자 파싱
interface Args {
  name?: string;
  prompt?: string;
  size?: number;
  force?: boolean;
  model?: 'pixflux' | 'bitforge';
}

function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--name' && argv[i + 1]) {
      args.name = argv[++i];
    } else if (arg === '--prompt' && argv[i + 1]) {
      args.prompt = argv[++i];
    } else if (arg === '--size' && argv[i + 1]) {
      args.size = parseInt(argv[++i], 10);
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--model' && argv[i + 1]) {
      const model = argv[++i];
      if (model === 'bitforge' || model === 'pixflux') {
        args.model = model;
      }
    }
  }

  return args;
}

// 디렉토리 생성 (없으면)
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[생성] 디렉토리: ${dirPath}`);
  }
}

// manifest.json 읽기
function readManifest(): Record<string, string> {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[경고] manifest.json 파싱 실패, 새로 생성합니다:', error);
      return {};
    }
  }
  return {};
}

// manifest.json 쓰기
function writeManifest(manifest: Record<string, string>) {
  ensureDirectoryExists(ICONS_DIR);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[갱신] manifest.json 저장 완료`);
}

// PixelLab API 호출
async function generateIcon(
  prompt: string,
  size: number,
  model: 'pixflux' | 'bitforge' = 'pixflux'
): Promise<{ imageUrl?: string; imageBase64?: string }> {
  const apiKey = process.env.PIXELLAB_API_KEY;
  if (!apiKey) {
    throw new Error('PIXELLAB_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
  }

  const apiUrl = model === 'bitforge' 
    ? 'https://api.pixellab.ai/v1/generate-image-bitforge'
    : 'https://api.pixellab.ai/v1/generate-image-pixflux';

  // UI 아이콘 전용 프롬프트 (엄격한 규칙)
  const iconPrompt = `pixel art UI icon, ${prompt}, simple flat shape, thick white outline, no perspective, no shadow, no blur, no gradient background, minimal color palette 2-4 colors, centered composition, designed for UI icon usage, transparent background, consistent outline thickness, consistent pixel size, clean edges`;

  const requestBody = {
    description: iconPrompt,
    image_size: {
      width: size,
      height: size,
    },
    text_guidance_scale: 8,
    no_background: true, // 항상 투명 배경
  };

  console.log(`[API] PixelLab API 호출 중... (모델: ${model}, 크기: ${size}x${size})`);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PixelLab API 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[API] 응답 수신 완료');

  // 이미지 데이터 추출
  let imageUrl: string | undefined;
  let imageBase64: string | undefined;

  if (data.image) {
    if (typeof data.image === 'string') {
      if (data.image.startsWith('data:')) {
        imageUrl = data.image;
      } else if (data.image.startsWith('http')) {
        imageUrl = data.image;
      } else {
        imageBase64 = data.image;
        imageUrl = `data:image/png;base64,${data.image}`;
      }
    } else if (typeof data.image === 'object') {
      if (data.image.url) {
        imageUrl = data.image.url;
      } else if (data.image.base64) {
        imageBase64 = data.image.base64;
        imageUrl = `data:image/png;base64,${data.image.base64}`;
      } else {
        // 객체의 모든 키 확인
        for (const key in data.image) {
          if (typeof data.image[key] === 'string' && data.image[key].length > 100) {
            const imgData = data.image[key];
            if (imgData.startsWith('http')) {
              imageUrl = imgData;
              break;
            } else {
              imageBase64 = imgData;
              imageUrl = `data:image/png;base64,${imgData}`;
              break;
            }
          }
        }
      }
    }
  } else if (data.image_url) {
    imageUrl = data.image_url;
  } else if (data.url) {
    imageUrl = data.url;
  } else if (data.result?.image) {
    const resultImage = data.result.image;
    if (typeof resultImage === 'string') {
      if (resultImage.startsWith('http')) {
        imageUrl = resultImage;
      } else {
        imageBase64 = resultImage;
        imageUrl = `data:image/png;base64,${resultImage}`;
      }
    }
  }

  if (!imageUrl) {
    throw new Error('API 응답에서 이미지 데이터를 찾을 수 없습니다. 응답 구조: ' + JSON.stringify(Object.keys(data)));
  }

  return { imageUrl, imageBase64 };
}

// 이미지 다운로드 (URL인 경우)
async function downloadImage(url: string): Promise<Buffer> {
  console.log(`[다운로드] 이미지 다운로드 중: ${url.substring(0, 50)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패 (${response.status}): ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// base64 이미지를 Buffer로 변환
function base64ToBuffer(base64: string): Buffer {
  // data:image/png;base64, 접두사 제거
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// 후처리: 아이콘을 128x128 캔버스에 중앙 정렬하고 padding 적용
async function postProcessIcon(imageBuffer: Buffer): Promise<Buffer> {
  console.log('[후처리] 아이콘 후처리 시작...');
  
  try {
    // 원본 이미지 로드
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    console.log(`[후처리] 원본 크기: ${metadata.width}x${metadata.height}`);
    
    // 아이콘 영역 크기 계산 (캔버스에서 padding 제외)
    const iconAreaSize = CANVAS_SIZE - (PADDING * 2);
    
    // 아이콘을 iconAreaSize로 리사이즈 (nearest-neighbor로 픽셀 그리드 보존)
    const resized = image
      .resize(iconAreaSize, iconAreaSize, {
        kernel: sharp.kernel.nearest, // nearest-neighbor 리샘플링
        fit: 'contain', // 비율 유지하면서 포함
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // 투명 배경
      })
      .ensureAlpha(); // 알파 채널 보장
    
    // 128x128 투명 캔버스 생성
    const canvas = sharp({
      create: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // 완전 투명
      },
    });
    
    // 리사이즈된 아이콘을 캔버스 중앙에 배치
    const resizedBuffer = await resized.toBuffer();
    const resizedMetadata = await sharp(resizedBuffer).metadata();
    
    // 중앙 정렬을 위한 offset 계산
    const offsetX = Math.floor((CANVAS_SIZE - (resizedMetadata.width || iconAreaSize)) / 2);
    const offsetY = Math.floor((CANVAS_SIZE - (resizedMetadata.height || iconAreaSize)) / 2);
    
    console.log(`[후처리] 아이콘 크기: ${resizedMetadata.width}x${resizedMetadata.height}, 오프셋: (${offsetX}, ${offsetY})`);
    
    // 캔버스에 아이콘 합성
    const finalBuffer = await canvas
      .composite([
        {
          input: resizedBuffer,
          left: offsetX,
          top: offsetY,
        },
      ])
      .png()
      .toBuffer();
    
    console.log('[후처리] 후처리 완료');
    return finalBuffer;
    
  } catch (error) {
    console.error('[후처리] 오류:', error);
    throw new Error(`후처리 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 메인 실행 함수
async function main() {
  // .env.local 파일 로드
  loadEnvFile();
  
  const args = parseArgs();

  // 필수 인자 검증
  if (!args.name) {
    console.error('[오류] --name 인자가 필요합니다.');
    console.error('\n사용법:');
    console.error('  pnpm gen:icon --name <이름> --prompt "<프롬프트>" [옵션]');
    console.error('\n옵션:');
    console.error('  --name <이름>        아이콘 키 이름 (필수)');
    console.error('  --prompt "<텍스트>"  아이콘 의미 설명 (필수)');
    console.error('  --size <숫자>        생성 해상도 (기본값: 128, 최소 128)');
    console.error('  --force              기존 파일 덮어쓰기');
    console.error('  --model <모델>      pixflux 또는 bitforge (기본값: pixflux)');
    process.exit(1);
  }

  if (!args.prompt) {
    console.error('[오류] --prompt 인자가 필요합니다.');
    process.exit(1);
  }

  const size = Math.max(args.size || 128, 128); // 최소 128
  const force = args.force || false;
  const model = args.model || 'pixflux';

  // 출력 파일 경로
  const outputPath = path.join(ICONS_DIR, `${args.name}.png`);

  // 기존 파일 확인
  if (fs.existsSync(outputPath) && !force) {
    console.error(`[오류] 파일이 이미 존재합니다: ${outputPath}`);
    console.error('덮어쓰려면 --force 옵션을 사용하세요.');
    process.exit(1);
  }

  try {
    // 1. PixelLab API 호출
    console.log(`\n[시작] UI 아이콘 생성: ${args.name}`);
    console.log(`[설정] 생성 크기: ${size}x${size}, 최종 크기: ${CANVAS_SIZE}x${CANVAS_SIZE}, 패딩: ${PADDING}px`);
    
    const { imageUrl, imageBase64 } = await generateIcon(args.prompt, size, model);

    // 2. 이미지 데이터를 Buffer로 변환
    let imageBuffer: Buffer;
    if (imageBase64) {
      console.log('[처리] base64 이미지를 디코딩 중...');
      imageBuffer = base64ToBuffer(imageUrl!);
    } else if (imageUrl && imageUrl.startsWith('http')) {
      console.log('[처리] HTTP URL에서 이미지 다운로드 중...');
      imageBuffer = await downloadImage(imageUrl);
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      console.log('[처리] data URL에서 이미지 디코딩 중...');
      imageBuffer = base64ToBuffer(imageUrl);
    } else {
      throw new Error('이미지 데이터 형식을 확인할 수 없습니다.');
    }

    // 3. 후처리: 128x128 캔버스에 중앙 정렬
    const processedBuffer = await postProcessIcon(imageBuffer);

    // 4. 파일 저장
    ensureDirectoryExists(ICONS_DIR);
    fs.writeFileSync(outputPath, processedBuffer);
    console.log(`[저장] 파일 저장 완료: ${outputPath}`);

    // 5. manifest.json 갱신
    const manifest = readManifest();
    manifest[args.name] = `/assets/icons/${args.name}.png`;
    writeManifest(manifest);

    console.log(`\n[완료] UI 아이콘 생성 성공!`);
    console.log(`  파일: ${outputPath}`);
    console.log(`  경로: /assets/icons/${args.name}.png`);
    console.log(`  크기: ${CANVAS_SIZE}x${CANVAS_SIZE}px (고정)`);
    console.log(`  manifest.json에 등록됨`);

  } catch (error) {
    console.error('\n[오류] UI 아이콘 생성 실패:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error('\n스택 트레이스:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// 스크립트 실행
main().catch((error) => {
  console.error('[치명적 오류]', error);
  process.exit(1);
});
