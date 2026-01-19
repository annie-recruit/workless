// 새로운 PDF 파싱 함수 (PDF.js 사용)
import { readFileSync } from 'fs';
import { join } from 'path';

// 파일 실제 경로 구성 (Railway 볼륨 또는 로컬 public)
function getActualFilePath(filepath: string): string {
  // Railway 환경: /data/uploads/... → /app/data/uploads/...
  if (filepath.startsWith('/data/uploads/')) {
    const filename = filepath.replace('/data/uploads/', '');
    return join(process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data', 'uploads', filename);
  }
  
  // 로컬 환경: /uploads/... → /app/public/uploads/...
  const relativePath = filepath.replace(/^\//, '');
  return join(process.cwd(), 'public', relativePath);
}

// PDF.js를 사용한 강력한 PDF 파싱
export async function parsePDFWithPDFJS(filepath: string): Promise<string> {
  try {
    console.log('📄 [PDF.js 1/5] parsePDF 함수 시작');
    console.log('📄 [PDF.js 1/5] filepath:', filepath);
    
    const fullPath = getActualFilePath(filepath);
    console.log('📄 [PDF.js 2/5] fullPath:', fullPath);
    
    console.log('📄 [PDF.js 2/5] 파일 읽기 시작...');
    const dataBuffer = readFileSync(fullPath);
    console.log('📄 [PDF.js 2/5] 파일 읽기 완료. Buffer 크기:', dataBuffer.length, 'bytes');
    
    console.log('📄 [PDF.js 3/5] PDF.js 텍스트 추출 시작...');
    
    // PDF.js 사용 (Mozilla의 강력한 PDF 파서!)
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    
    // PDF 문서 로드
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    console.log('📄 [PDF.js 3/5] 총 페이지 수:', numPages);
    
    let fullText = '';
    
    // 모든 페이지에서 텍스트 추출
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 텍스트 아이템들을 문자열로 결합
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      
      console.log(`📄 [PDF.js 4/5] 페이지 ${pageNum}/${numPages} 추출 완료, 텍스트 길이: ${pageText.length}`);
    }
    
    console.log('📄 [PDF.js 5/5] 전체 텍스트 추출 완료, 총 길이:', fullText.length);
    
    // 텍스트가 너무 적으면 경고
    if (fullText.length < 200) {
      console.warn('⚠️ PDF 텍스트 추출이 불완전할 수 있습니다. 이미지 기반 PDF이거나 복잡한 레이아웃일 가능성이 있습니다.');
    }
    
    // 너무 길면 앞부분 (3000자로 증가 - 더 많은 맥락!)
    if (fullText.length > 3000) {
      fullText = fullText.substring(0, 3000) + `\n\n... (내용이 길어서 일부만 표시. 총 ${fullText.length}자)`;
    }
    
    if (fullText.trim()) {
      console.log('✅ PDF.js 분석 완료. 미리보기:', fullText.substring(0, 100).replace(/\n/g, ' '));
      return fullText;
    } else {
      console.log('⚠️ PDF에서 텍스트를 추출하지 못했습니다');
      return '(PDF 텍스트 추출 실패)';
    }
  } catch (error) {
    console.error('❌ PDF.js 파싱 실패:', error);
    throw error;
  }
}
