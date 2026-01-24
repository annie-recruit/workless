#!/usr/bin/env tsx

/**
 * PixelLab API를 사용하여 픽셀 아트 에셋을 생성하고 저장하는 CLI 스크립트
 * 
 * 사용법:
 *   pnpm gen:asset --name viewer_frame --prompt "pixel art UI frame..." --size 128 --transparent
 *   pnpm gen:asset --name icon_bundle --prompt "stack of three rectangles..." --size 64 --transparent --force
 * 
 * 디자인 일관성 가이드:
 * - 모든 아이콘은 동일한 스타일과 색상 팔레트를 사용해야 함
 * - 프로젝트 컬러: 주황색 (#fb923c, #FDBA74) + 인디고 (#6366f1, #818CF8, #A78BFA)
 * - 스타일: 픽셀 아트, 두 톤 쉐이딩, 흰색 아웃라인, 단순하고 깔끔한 디자인
 * - 투명 배경: --transparent 옵션 사용 시 배경이 완전히 투명해야 함
 * - 일관성: 같은 프로젝트의 에셋들은 시각적으로 통일감 있어야 함
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 경로 (scripts/ 상위)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'generated');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'manifest.json');

// .env.local 파일 로드 (간단한 파싱)
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
  width?: number;
  height?: number;
  transparent?: boolean;
  noPrefix?: boolean;
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
    } else if (arg === '--width' && argv[i + 1]) {
      args.width = parseInt(argv[++i], 10);
    } else if (arg === '--height' && argv[i + 1]) {
      args.height = parseInt(argv[++i], 10);
    } else if (arg === '--transparent') {
      args.transparent = true;
    } else if (arg === '--no-prefix') {
      args.noPrefix = true;
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
  ensureDirectoryExists(ASSETS_DIR);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[갱신] manifest.json 저장 완료`);
}

// PixelLab API 호출
async function generateImage(
  prompt: string,
  width: number,
  height: number,
  transparent: boolean,
  noPrefix: boolean,
  model: 'pixflux' | 'bitforge' = 'pixflux'
): Promise<{ imageUrl?: string; imageBase64?: string }> {
  const apiKey = process.env.PIXELLAB_API_KEY;
  if (!apiKey) {
    throw new Error('PIXELLAB_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
  }

  const apiUrl = model === 'bitforge' 
    ? 'https://api.pixellab.ai/v1/generate-image-bitforge'
    : 'https://api.pixellab.ai/v1/generate-image-pixflux';

  // 디자인 일관성을 위한 공통 프롬프트 프리픽스
  // 모든 아이콘이 동일한 스타일과 색상 팔레트를 사용하도록 강제
  // 프로젝트 컬러: 주황색 (#fb923c, #FDBA74) + 인디고 (#6366f1, #818CF8, #A78BFA)
  const designConsistencyPrefix = 'pixel art icon, EXACTLY THE SAME design style as other icons in this project, MUST use orange and indigo color palette ONLY (orange: #fb923c #FDBA74, indigo: #6366f1 #818CF8 #A78BFA), NO other colors allowed, identical two-tone shading technique, identical white outline thickness, identical pixel size, identical simple clean design, front view, isolated icon on transparent background, consistent visual weight, consistent line style, consistent detail level';
  
  // 프롬프트에 디자인 일관성 강조 추가
  // 투명 배경을 명확히 요청 (여러 방법으로 강조)
  // 모든 아이콘이 완전히 동일한 스타일을 유지하도록 강제
  const basePrompt = noPrefix ? prompt : `${designConsistencyPrefix}, ${prompt}`;
  const enhancedPrompt = transparent
    ? `${basePrompt}, completely transparent background, no background color, no solid background, alpha channel enabled, PNG with transparency, transparent PNG format`
    : `${basePrompt}`;

  const requestBody = {
    description: enhancedPrompt,
    image_size: {
      width,
      height,
    },
    text_guidance_scale: 8,
    no_background: transparent, // 투명 옵션이 있으면 항상 적용 (크기 제한 제거)
  };
  
  if (transparent) {
    console.log('[프롬프트] 투명 배경 강제 적용');
  }

  console.log(`[API] PixelLab API 호출 중... (모델: ${model}, 크기: ${width}x${height})`);
  
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

  // 이미지 데이터 추출 (API route와 동일한 로직)
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

// 메인 실행 함수
async function main() {
  // .env.local 파일 로드
  loadEnvFile();
  
  const args = parseArgs();

  // 필수 인자 검증
  if (!args.name) {
    console.error('[오류] --name 인자가 필요합니다.');
    console.error('\n사용법:');
    console.error('  pnpm gen:asset --name <이름> --prompt "<프롬프트>" [옵션]');
    console.error('\n옵션:');
    console.error('  --name <이름>        에셋 논리 이름 (필수)');
    console.error('  --prompt "<텍스트>"  PixelLab 프롬프트 (필수)');
    console.error('  --size <숫자>        출력 해상도 (기본값: 64)');
    console.error('  --width <숫자>       출력 가로 해상도 (기본값: --size 또는 128)');
    console.error('  --height <숫자>      출력 세로 해상도 (기본값: --size 또는 128)');
    console.error('  --transparent        배경 투명 여부');
    console.error('  --no-prefix          아이콘용 스타일 프리픽스 비활성화 (버튼/프레임 등용)');
    console.error('  --force              기존 파일 덮어쓰기');
    console.error('  --model <모델>      pixflux 또는 bitforge (기본값: pixflux)');
    process.exit(1);
  }

  if (!args.prompt) {
    console.error('[오류] --prompt 인자가 필요합니다.');
    process.exit(1);
  }

  const fallbackSize = args.size || 128; // 기본값 128 (더 큰 크기로 생성하여 깨짐 현상 방지)
  const width = args.width || fallbackSize;
  const height = args.height || fallbackSize;
  const transparent = args.transparent || false;
  const noPrefix = args.noPrefix || false;
  const force = args.force || false;
  const model = args.model || 'pixflux';

  // 출력 파일 경로
  const outputPath = path.join(ASSETS_DIR, `${args.name}.png`);

  // 기존 파일 확인
  if (fs.existsSync(outputPath) && !force) {
    console.error(`[오류] 파일이 이미 존재합니다: ${outputPath}`);
    console.error('덮어쓰려면 --force 옵션을 사용하세요.');
    process.exit(1);
  }

  try {
    // 1. PixelLab API 호출
    console.log(`\n[시작] 에셋 생성: ${args.name}`);
    console.log(`[설정] 크기: ${width}x${height}, 투명: ${transparent}, 모델: ${model}`);
    if (noPrefix) {
      console.log('[설정] 아이콘용 스타일 프리픽스 비활성화 (--no-prefix)');
    }
    
    const { imageUrl, imageBase64 } = await generateImage(args.prompt, width, height, transparent, noPrefix, model);

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

    // 3. 파일 저장
    ensureDirectoryExists(ASSETS_DIR);
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`[저장] 파일 저장 완료: ${outputPath}`);

    // 4. manifest.json 갱신
    const manifest = readManifest();
    manifest[args.name] = `/assets/generated/${args.name}.png`;
    writeManifest(manifest);

    console.log(`\n[완료] 에셋 생성 성공!`);
    console.log(`  파일: ${outputPath}`);
    console.log(`  경로: /assets/generated/${args.name}.png`);
    console.log(`  manifest.json에 등록됨`);

  } catch (error) {
    console.error('\n[오류] 에셋 생성 실패:');
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
