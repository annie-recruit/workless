import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { Attachment } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 업로드 디렉토리 확인 및 생성
export async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// 파일 저장
export async function saveFile(file: File): Promise<Attachment> {
  await ensureUploadDir();

  // 파일명 생성: nanoid + 원본 확장자
  const ext = path.extname(file.name);
  const filename = `${nanoid()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const publicPath = `/uploads/${filename}`;

  // 파일 저장
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return {
    id: nanoid(),
    filename: file.name,
    filepath: publicPath,
    mimetype: file.type,
    size: file.size,
    createdAt: Date.now(),
  };
}

// 파일 타입 체크
export function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

export function isPDF(mimetype: string): boolean {
  return mimetype === 'application/pdf';
}

export function getFileIcon(mimetype: string): string {
  if (isImage(mimetype)) return '🖼️';
  if (isPDF(mimetype)) return '📄';
  if (mimetype.includes('video')) return '🎥';
  if (mimetype.includes('audio')) return '🎵';
  if (mimetype.includes('zip') || mimetype.includes('rar')) return '📦';
  if (mimetype.includes('word')) return '📝';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
  return '📎';
}
