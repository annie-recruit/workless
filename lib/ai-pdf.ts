// Adobe PDF Services API 기반 PDF 파싱
import { createReadStream } from 'fs';
import { join } from 'path';
import * as PDFServicesSdk from '@adobe/pdfservices-node-sdk';

// 파일 실제 경로 구성 (Railway 볼륨 또는 로컬 public)
function getActualFilePath(filepath: string): string {
  if (filepath.startsWith('/data/uploads/')) {
    const filename = filepath.replace('/data/uploads/', '');
    return join(process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data', 'uploads', filename);
  }
  const relativePath = filepath.replace(/^\//, '');
  return join(process.cwd(), 'public', relativePath);
}

// Adobe PDF Extract API로 텍스트 추출
export async function parsePDFWithAdobe(filepath: string): Promise<string> {
  try {
    console.log('📄 [Adobe 1/4] PDF Extract 시작');
    console.log('📄 [Adobe 1/4] filepath:', filepath);

    const fullPath = getActualFilePath(filepath);
    console.log('📄 [Adobe 2/4] fullPath:', fullPath);

    if (!process.env.PDF_SERVICES_CLIENT_ID || !process.env.PDF_SERVICES_CLIENT_SECRET) {
      throw new Error('Adobe PDF Services 환경 변수가 설정되지 않았습니다.');
    }

    const {
      PDFServices,
      MimeType,
      ServicePrincipalCredentials,
      ExtractPDFJob,
      ExtractPDFResult,
      ExtractPDFParams,
      ExtractElementType,
    } = PDFServicesSdk as any;

    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
    });

    const pdfServices = new PDFServices({ credentials });
    const readStream = createReadStream(fullPath);

    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF,
    });

    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT],
    });

    const job = new ExtractPDFJob({ inputAsset, params });
    console.log('📄 [Adobe 3/4] Extract 실행 중...');
    const pollingURL = await pdfServices.submit({ job });

    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult,
    });

    const result = pdfServicesResponse.result;

    let structuredData: any = null;
    if (result.contentJSON) {
      structuredData = result.contentJSON;
    } else {
      const resultAsset = result.content || result.resource;
      const streamAsset = await pdfServices.getContent({ asset: resultAsset });
      const chunks: Buffer[] = [];
      for await (const chunk of streamAsset.readStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const zipData = Buffer.concat(chunks);
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipData);
      const jsonEntry = zip.getEntry('structuredData.json');
      if (!jsonEntry) {
        throw new Error('structuredData.json을 찾을 수 없습니다.');
      }
      structuredData = JSON.parse(jsonEntry.getData().toString('utf-8'));
    }

    const elements = structuredData?.elements || [];
    const text = elements
      .filter((el: any) => el.Text)
      .map((el: any) => el.Text)
      .join('\n');

    console.log('📄 [Adobe 4/4] 텍스트 추출 완료, 길이:', text.length);

    if (!text.trim()) {
      return '(PDF 텍스트 추출 실패)';
    }

    const maxLen = 10000;
    if (text.length > maxLen) {
      return text.substring(0, maxLen) + `\n\n... (내용이 길어서 일부만 표시. 총 ${text.length}자)`;
    }

    return text;
  } catch (error) {
    console.error('❌ Adobe PDF Extract 실패:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
