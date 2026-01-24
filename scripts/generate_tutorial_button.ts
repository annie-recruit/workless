#!/usr/bin/env tsx

/**
 * Pixel 스타일의 "Tutorial" 버튼 PNG를 로컬에서 생성합니다.
 *
 * PixelLab 크레딧이 소진되었을 때(402) 임시로 UI를 막지 않기 위한 fallback 생성기입니다.
 * 출력:
 *  - public/assets/generated/tutorial_button.png
 *  - public/assets/generated/manifest.json (tutorial_button 엔트리 보장)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'generated');
const OUT_PATH = path.join(OUT_DIR, 'tutorial_button.png');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

type RGBA = { r: number; g: number; b: number; a?: number };

function clamp255(n: number) {
  return Math.max(0, Math.min(255, n | 0));
}

function setPixel(buf: Buffer, w: number, x: number, y: number, c: RGBA) {
  const a = c.a ?? 255;
  if (x < 0 || y < 0) return;
  const idx = (y * w + x) * 4;
  if (idx < 0 || idx + 3 >= buf.length) return;
  buf[idx + 0] = clamp255(c.r);
  buf[idx + 1] = clamp255(c.g);
  buf[idx + 2] = clamp255(c.b);
  buf[idx + 3] = clamp255(a);
}

function fillRect(buf: Buffer, w: number, h: number, x0: number, y0: number, rw: number, rh: number, c: RGBA) {
  for (let y = y0; y < y0 + rh; y++) {
    if (y < 0 || y >= h) continue;
    for (let x = x0; x < x0 + rw; x++) {
      if (x < 0 || x >= w) continue;
      setPixel(buf, w, x, y, c);
    }
  }
}

function drawOutline(buf: Buffer, w: number, h: number, x0: number, y0: number, rw: number, rh: number, thickness: number, c: RGBA) {
  // top
  fillRect(buf, w, h, x0, y0, rw, thickness, c);
  // bottom
  fillRect(buf, w, h, x0, y0 + rh - thickness, rw, thickness, c);
  // left
  fillRect(buf, w, h, x0, y0, thickness, rh, c);
  // right
  fillRect(buf, w, h, x0 + rw - thickness, y0, thickness, rh, c);
}

// 5x7 bitmap font (only glyphs needed for "Tutorial")
const GLYPHS: Record<string, string[]> = {
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  u: [
    '00000',
    '00000',
    '10001',
    '10001',
    '10001',
    '10001',
    '01111',
  ],
  t: [
    '00100',
    '00100',
    '11110',
    '00100',
    '00100',
    '00100',
    '00011',
  ],
  o: [
    '00000',
    '00000',
    '01110',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
  r: [
    '00000',
    '00000',
    '10110',
    '11001',
    '10000',
    '10000',
    '10000',
  ],
  i: [
    '00100',
    '00000',
    '01100',
    '00100',
    '00100',
    '00100',
    '01110',
  ],
  a: [
    '00000',
    '00000',
    '01110',
    '00001',
    '01111',
    '10001',
    '01111',
  ],
  l: [
    '01100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '01110',
  ],
};

function measureText(text: string, scale: number, gap: number) {
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!GLYPHS[ch]) continue;
    width += glyphW;
    if (i !== text.length - 1) width += gap;
  }
  return { width, height: glyphH };
}

function drawText(buf: Buffer, w: number, h: number, x: number, y: number, text: string, scale: number, gap: number, c: RGBA, outline?: { c: RGBA; offset: number }) {
  let cursorX = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyph = GLYPHS[ch];
    if (!glyph) continue;

    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] !== '1') continue;
        const px0 = cursorX + gx * scale;
        const py0 = y + gy * scale;

        if (outline) {
          const o = outline.offset;
          // 4-neighborhood outline
          fillRect(buf, w, h, px0 - o, py0, scale, scale, outline.c);
          fillRect(buf, w, h, px0 + o, py0, scale, scale, outline.c);
          fillRect(buf, w, h, px0, py0 - o, scale, scale, outline.c);
          fillRect(buf, w, h, px0, py0 + o, scale, scale, outline.c);
        }

        fillRect(buf, w, h, px0, py0, scale, scale, c);
      }
    }

    cursorX += 5 * scale + gap;
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readManifest(): Record<string, string> {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeManifest(manifest: Record<string, string>) {
  ensureDir(OUT_DIR);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

async function main() {
  const W = 240;
  const H = 64;
  const buf = Buffer.alloc(W * H * 4, 0); // transparent

  // Button geometry
  const bx = 10;
  const by = 12;
  const bw = W - 20;
  const bh = 40;

  const outline: RGBA = { r: 255, g: 255, b: 255, a: 255 };
  const fill: RGBA = { r: 0x63, g: 0x66, b: 0xf1, a: 255 };       // #6366f1
  const highlight: RGBA = { r: 0x81, g: 0x8c, b: 0xf8, a: 255 };   // #818CF8
  const shadow: RGBA = { r: 0x43, g: 0x38, b: 0xca, a: 255 };      // #4338CA
  const textColor: RGBA = { r: 255, g: 255, b: 255, a: 255 };
  const textOutline: RGBA = { r: 0x1f, g: 0x22, b: 0x5a, a: 255 }; // deep indigo-ish

  // Outer outline + fill
  drawOutline(buf, W, H, bx, by, bw, bh, 2, outline);
  fillRect(buf, W, H, bx + 2, by + 2, bw - 4, bh - 4, fill);

  // 3D effect: highlight strip + shadow strip
  fillRect(buf, W, H, bx + 2, by + 2, bw - 4, 6, highlight);
  fillRect(buf, W, H, bx + 2, by + bh - 2 - 6, bw - 4, 6, shadow);

  // Inner subtle border line (pixel-y bevel)
  drawOutline(buf, W, H, bx + 3, by + 3, bw - 6, bh - 6, 1, { r: 230, g: 230, b: 255, a: 255 });

  // Text
  const label = 'Tutorial';
  const scale = 3;
  const gap = 3;
  const m = measureText(label, scale, gap);
  const tx = Math.round(bx + (bw - m.width) / 2);
  const ty = Math.round(by + (bh - m.height) / 2) + 1;

  drawText(buf, W, H, tx, ty, label, scale, gap, textColor, { c: textOutline, offset: 1 });

  ensureDir(OUT_DIR);
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_PATH);

  const manifest = readManifest();
  manifest.tutorial_button = '/assets/generated/tutorial_button.png';
  writeManifest(manifest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

