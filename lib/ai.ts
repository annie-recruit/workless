import OpenAI from 'openai';
import { Memory, AIClassification, Attachment } from '@/types';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { stripHtml } from './text';
import { parsePDFWithAdobe } from './ai-pdf';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// 텍스트 파일 읽기
export async function readTextFile(filepath: string): Promise<string> {
  try {
    const fullPath = getActualFilePath(filepath);
    const content = readFileSync(fullPath, 'utf-8');
    
    // 너무 길면 앞부분만 (2000자)
    if (content.length > 2000) {
      return content.substring(0, 2000) + '... (내용이 길어서 일부만 표시)';
    }
    
    return content;
  } catch (error) {
    console.error('텍스트 파일 읽기 실패:', error);
    return '텍스트 파일을 읽을 수 없습니다';
  }
}

// PowerPoint 파일 읽기 (.pptx)
export async function parsePowerPointFile(filepath: string): Promise<string> {
  try {
    console.log('📊 [PPT 1/3] parsePowerPointFile 함수 시작');
    console.log('📊 [PPT 1/3] filepath:', filepath);
    
    const fullPath = getActualFilePath(filepath);
    console.log('📊 [PPT 2/3] fullPath:', fullPath);
    
    console.log('📊 [PPT 2/3] 파일 읽기 시작...');
    const buffer = readFileSync(fullPath);
    console.log('📊 [PPT 2/3] 파일 읽기 완료. Buffer 크기:', buffer.length, 'bytes');
    
    console.log('📊 [PPT 3/3] PPTX 텍스트 추출 시작...');
    
    // adm-zip으로 PPTX 파일 압축 해제
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    
    // 슬라이드 파일 찾기 (ppt/slides/slide*.xml)
    const slideEntries = zip.getEntries().filter((entry: any) => 
      entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')
    );
    
    console.log(`📊 [PPT 3/3] 슬라이드 개수: ${slideEntries.length}`);
    
    if (slideEntries.length === 0) {
      console.log('⚠️ PPTX에서 슬라이드를 찾을 수 없습니다');
      return '(PPT 텍스트 추출 실패: 슬라이드 없음)';
    }
    
    const allTexts: string[] = [];
    
    // 각 슬라이드에서 텍스트 추출
    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i];
      const slideXml = entry.getData().toString('utf-8');
      
      // XML에서 <a:t> 태그 안의 텍스트 추출 (Office Open XML 형식)
      const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      const slideTexts = textMatches.map(match => {
        const textMatch = match.match(/<a:t[^>]*>([^<]*)<\/a:t>/);
        return textMatch ? textMatch[1] : '';
      }).filter(text => text.trim().length > 0);
      
      if (slideTexts.length > 0) {
        allTexts.push(`[슬라이드 ${i + 1}]\n${slideTexts.join('\n')}`);
      }
    }
    
    let text = allTexts.join('\n\n');
    console.log('📊 [PPT 3/3] 텍스트 추출 완료, 길이:', text.length);
    
    // 너무 길면 앞부분만 (2000자)
    if (text.length > 2000) {
      text = text.substring(0, 2000) + '... (내용 계속)';
    }
    
    if (text.trim()) {
      console.log('✅ PPT 분석 완료. 미리보기:', text.substring(0, 50).replace(/\n/g, ' '));
      return text;
    } else {
      console.log('⚠️ PPT에서 텍스트를 추출하지 못했습니다');
      return '(PPT 텍스트 추출 실패)';
    }
  } catch (error) {
    console.error('❌ PPT 파싱 실패:', error instanceof Error ? error.message : String(error));
    return 'PowerPoint 파일을 읽을 수 없습니다';
  }
}

// Word 파일 읽기 (.docx)
export async function parseWordFile(filepath: string): Promise<string> {
  try {
    console.log('📄 [Word 1/3] parseWordFile 함수 시작');
    console.log('📄 [Word 1/3] filepath:', filepath);
    
    const fullPath = getActualFilePath(filepath);
    console.log('📄 [Word 2/3] fullPath:', fullPath);
    
    console.log('📄 [Word 2/3] 파일 읽기 시작...');
    const buffer = readFileSync(fullPath);
    console.log('📄 [Word 2/3] 파일 읽기 완료. Buffer 크기:', buffer.length, 'bytes');
    
    console.log('📄 [Word 3/3] Word 텍스트 추출 시작...');
    
    // mammoth로 텍스트 추출
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    
    let text = result?.value || '';
    console.log('📄 [Word 3/3] 텍스트 추출 완료, 길이:', text.length);
    
    // 너무 길면 앞부분만 (1000자)
    if (text.length > 1000) {
      text = text.substring(0, 1000) + '... (내용 계속)';
    }
    
    if (text.trim()) {
      console.log('✅ Word 분석 완료. 미리보기:', text.substring(0, 50).replace(/\n/g, ' '));
      return text;
    } else {
      console.log('⚠️ Word에서 텍스트를 추출하지 못했습니다');
      return '(Word 텍스트 추출 실패)';
    }
  } catch (error) {
    console.error('❌ Word 파싱 실패:', error instanceof Error ? error.message : String(error));
    return 'Word 파일을 읽을 수 없습니다';
  }
}

// PDF 파일 파싱
// PDF 파싱 (pdf-parse-fork 사용 - canvas 의존성 없음)
export async function parsePDF(filepath: string): Promise<string> {
  try {
    console.log('📄 [PDF 1/3] parsePDF 함수 시작');
    console.log('📄 [PDF 1/3] filepath:', filepath);
    
    const fullPath = getActualFilePath(filepath);
    console.log('📄 [PDF 2/3] fullPath:', fullPath);
    
    console.log('📄 [PDF 2/3] 파일 읽기 시작...');
    const dataBuffer = readFileSync(fullPath);
    console.log('📄 [PDF 2/3] 파일 읽기 완료. Buffer 크기:', dataBuffer.length, 'bytes');
    
    console.log('📄 [PDF 3/3] Adobe PDF Extract로 텍스트 추출 시작...');
    
    // 먼저 Adobe PDF Extract API로 시도
    try {
      const text = await parsePDFWithAdobe(filepath);
      return text;
    } catch (adobeError) {
      console.warn('⚠️ Adobe PDF Extract 실패, pdf-parse-fork로 재시도...', adobeError);
      
      // PDF.js 실패 시 백업으로 pdf-parse-fork 사용
      const pdfParse = require('pdf-parse-fork');
      
      const data = await pdfParse(dataBuffer, {
        max: 0,
        version: 'v2.0.550'
      });
      
      let text = data?.text || '';
      console.log('📄 [PDF 3/3] 백업 파서 텍스트 추출 완료, 길이:', text.length);
      console.log('📄 [PDF 3/3] 총 페이지 수:', data?.numpages || 0);
      
      if (text.length < 200) {
        console.warn('⚠️ PDF 텍스트 추출이 불완전할 수 있습니다.');
      }
      
      if (text.length > 1000) {
        text = text.substring(0, 1000) + '... (내용 계속)';
      }
      
      if (text.trim()) {
        console.log('✅ PDF 분석 완료 (백업). 미리보기:', text.substring(0, 50).replace(/\n/g, ' '));
        return text;
      } else {
        console.log('⚠️ PDF에서 텍스트를 추출하지 못했습니다');
        return '(PDF 텍스트 추출 실패)';
      }
    }
  } catch (error) {
    console.error('❌ PDF 파싱 실패:', error instanceof Error ? error.message : String(error));
    return 'PDF 파일을 읽을 수 없습니다';
  }
}

// 이미지 분석 (Vision API) - base64로 전송
export async function analyzeImageFromPath(filepath: string): Promise<string> {
  try {
    const fs = require('fs');
    
    const fullPath = getActualFilePath(filepath);
    
    if (!fs.existsSync(fullPath)) {
      console.error('이미지 파일을 찾을 수 없습니다:', fullPath);
      return '이미지 파일을 찾을 수 없습니다';
    }
    
    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');
    const ext = extname(filepath).toLowerCase();
    
    // MIME 타입 결정
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 이미지의 내용을 간단히 설명해줘. 2-3문장으로. 이미지에 텍스트가 있으면 포함해서 설명해줘.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || '이미지 분석 실패';
  } catch (error) {
    console.error('Image analysis error:', error);
    return '이미지 분석 불가';
  }
}

// 이미지 분석 (Vision API) - URL 방식 (외부 URL용)
export async function analyzeImage(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 이미지의 내용을 간단히 설명해줘. 2-3문장으로.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || '이미지 분석 실패';
  } catch (error) {
    console.error('Image analysis error:', error);
    return '이미지 분석 불가';
  }
}

// 첨부 파일 내용 요약
export async function summarizeAttachments(attachments: Attachment[]): Promise<string> {
  if (!attachments || attachments.length === 0) return '';

  console.log('📦 [summarizeAttachments] 시작 - 파일 개수:', attachments.length);
  const descriptions: string[] = [];

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    console.log(`\n📦 [파일 ${i + 1}/${attachments.length}] 처리 시작`);
    console.log(`   - 파일명: ${attachment.filename}`);
    console.log(`   - MIME 타입: ${attachment.mimetype}`);
    console.log(`   - 파일 경로: ${attachment.filepath}`);
    console.log(`   - 파일 크기: ${attachment.size} bytes`);
    
    const mimetype = attachment.mimetype;
    
    if (mimetype.startsWith('image/')) {
      // 이미지는 base64로 읽어서 Vision API로 분석
      console.log(`🖼️ [파일 ${i + 1}] → 이미지로 판단, Vision API 분석 시작`);
      const imageDesc = await analyzeImageFromPath(attachment.filepath);
      console.log(`✅ [파일 ${i + 1}] 이미지 분석 완료`);
      descriptions.push(`[이미지: ${attachment.filename}] ${imageDesc}`);
      
    } else if (mimetype === 'application/pdf') {
      // PDF 파일 파싱
      console.log(`📄 [파일 ${i + 1}] → PDF로 판단, 파싱 시작`);
      const pdfText = await parsePDF(attachment.filepath);
      console.log(`✅ [파일 ${i + 1}] PDF 파싱 완료, 텍스트 길이: ${pdfText.length}`);
      descriptions.push(`[PDF 문서: ${attachment.filename}]\n내용: ${pdfText}`);
      
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || attachment.filename.endsWith('.docx')) {
      // Word 파일 파싱
      console.log(`📄 [파일 ${i + 1}] → Word(.docx)로 판단, 파싱 시작`);
      const wordText = await parseWordFile(attachment.filepath);
      console.log(`✅ [파일 ${i + 1}] Word 파싱 완료, 텍스트 길이: ${wordText.length}`);
      descriptions.push(`[Word 문서: ${attachment.filename}]\n내용: ${wordText}`);
      
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || attachment.filename.endsWith('.pptx')) {
      // PowerPoint 파일 파싱
      console.log(`📊 [파일 ${i + 1}] → PowerPoint(.pptx)로 판단, 파싱 시작`);
      const pptText = await parsePowerPointFile(attachment.filepath);
      console.log(`✅ [파일 ${i + 1}] PPT 파싱 완료, 텍스트 길이: ${pptText.length}`);
      descriptions.push(`[PowerPoint 문서: ${attachment.filename}]\n내용: ${pptText}`);
      
    } else if (mimetype === 'text/plain' || mimetype === 'text/markdown' || attachment.filename.endsWith('.txt') || attachment.filename.endsWith('.md')) {
      // 텍스트 파일 읽기
      console.log(`📝 [파일 ${i + 1}] → 텍스트 파일로 판단, 읽기 시작`);
      const textContent = await readTextFile(attachment.filepath);
      console.log(`✅ [파일 ${i + 1}] 텍스트 읽기 완료, 텍스트 길이: ${textContent.length}`);
      descriptions.push(`[텍스트 파일: ${attachment.filename}]\n내용: ${textContent}`);
      
    } else {
      // 기타 파일은 파일명과 타입만
      console.log(`📎 [파일 ${i + 1}] → 기타 파일 (분석 불가)`);
      descriptions.push(`[파일: ${attachment.filename}] (내용 분석 불가)`);
    }
  }

  console.log('\n📦 [summarizeAttachments] 완료 - 총 설명 개수:', descriptions.length);
  return descriptions.join('\n\n');
}

// 기억 자동 분류 (파일 내용 포함)
export async function classifyMemory(
  content: string, 
  existingMemories: Memory[], 
  fileContext?: string,
  personaContext?: string
): Promise<AIClassification> {
  const fullContent = fileContext 
    ? `${content}\n\n[첨부된 파일 내용]\n${fileContext}`
    : content;
  const normalizedContent = stripHtml(fullContent);

  const personaPrefix = personaContext 
    ? `🎯 페르소나: 사용자는 "${personaContext}" 역할로 활동 중입니다.\n\n이 전문 분야의 관점에서 사용자의 기록을 분석해주세요. 이 페르소나의 맥락과 관심사를 반영하여 분류해주세요.\n\n`
    : '';

  const prompt = `
${personaPrefix}너는 개인 비서야. 사용자가 입력한 생각이나 기록을 분석해서 자동으로 분류해줘.

[사용자 입력]
"${normalizedContent}"

[기존 기억들] (최근 10개)
${existingMemories.slice(0, 10).map(m => `- ${stripHtml(m.content)} (주제: ${m.topic}, 클러스터: ${m.clusterTag})`).join('\n')}

다음 기준으로 분류해줘:

1. **주제 (topic)**: 아이디어, 업무, 커리어, 감정, 기록, 일상, 학습, 기타 중 하나
2. **성격 (nature)**: 단순기록, 아이디어, 요청, 고민, 질문 중 하나
3. **시간 성격 (timeContext)**: 당장, 언젠가, 특정시점, 과거회상 중 하나
4. **연관 기억**: 기존 기억 중 관련있는 것이 있다면 그 내용을 간단히 언급
5. **클러스터 제안**: 이 기억이 속할 만한 주제 묶음 이름 (예: "채용 아이디어", "커리어 고민", "프로젝트 메모")

${fileContext ? '\n**중요**: 첨부된 파일 내용도 고려해서 분류해줘. 이미지나 문서의 내용이 주제와 성격을 결정하는데 중요해.\n' : ''}

JSON 형식으로만 답해줘:
{
  "topic": "...",
  "nature": "...",
  "timeContext": "...",
  "suggestedCluster": "...",
  "reasoning": "..."
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  return {
    topic: result.topic || '기타',
    nature: result.nature || '단순기록',
    timeContext: result.timeContext || '언젠가',
    suggestedCluster: result.suggestedCluster,
  };
}

// 관련 기억 찾기 (간단한 키워드 매칭)
export async function findRelatedMemories(content: string, memories: Memory[]): Promise<string[]> {
  if (memories.length === 0) return [];

  const normalizedContent = stripHtml(content);
  const prompt = `
사용자가 새로 입력한 내용: "${normalizedContent}"

기존 기억들:
${memories.map((m, i) => `${i}. ${stripHtml(m.content)}`).join('\n')}

새 입력과 관련있는 기존 기억의 번호를 배열로 답해줘.
관련이 없으면 빈 배열 [].

JSON 형식:
{ "relatedIndices": [0, 3, 5] }
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  const indices = result.relatedIndices || [];
  
  return indices.map((idx: number) => memories[idx]?.id).filter(Boolean);
}

// 요약 생성 (개선된 버전)
export async function generateSummary(query: string, memories: Memory[], personaContext?: string): Promise<string> {
  // 시간순 정렬
  const sortedMemories = [...memories].sort((a, b) => a.createdAt - b.createdAt);
  
  // 주제별, 성격별 분석
  const byTopic = sortedMemories.reduce((acc, m) => {
    const topic = m.topic || '미분류';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(m);
    return acc;
  }, {} as Record<string, Memory[]>);

  const byNature = sortedMemories.reduce((acc, m) => {
    const nature = m.nature || '단순기록';
    if (!acc[nature]) acc[nature] = [];
    acc[nature].push(m);
    return acc;
  }, {} as Record<string, Memory[]>);

  // 클러스터 태그 분석
  const clusterTags = [...new Set(sortedMemories.map(m => m.clusterTag).filter(Boolean))];

  const personaPrefix = personaContext 
    ? `🎯 페르소나: 사용자는 "${personaContext}" 역할로 활동 중입니다.\n\n당신은 이 전문 분야의 관점에서 사용자의 기록을 분석하는 전문가 비서입니다. 이 페르소나의 맥락, 목표, 관심사를 반영하여 분석해주세요.\n\n`
    : '';

  const prompt = `
${personaPrefix}당신은 개인 비서입니다. 사용자가 자신의 기록에 대해 질문했습니다.

[사용자 질문]
"${query}"

[분석 정보]
- 총 ${memories.length}개의 관련 기록 발견
- 주제별: ${Object.keys(byTopic).map(topic => `${topic}(${byTopic[topic].length}개)`).join(', ')}
- 성격별: ${Object.keys(byNature).map(nature => `${nature}(${byNature[nature].length}개)`).join(', ')}
- 주요 키워드: ${clusterTags.slice(0, 5).join(', ')}

[관련 기억들] (시간순)
${sortedMemories.map((m, idx) => {
  const date = new Date(m.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const tags = [m.nature, m.clusterTag].filter(Boolean).join(' • ');
  const plain = stripHtml(m.content);
  return `${idx + 1}. [${date}] ${plain.substring(0, 150)}${plain.length > 150 ? '...' : ''}
   ${tags ? `   태그: ${tags}` : ''}`;
}).join('\n\n')}

위 정보를 바탕으로 사용자 질문에 대한 깊이 있는 답변을 작성해주세요:

1. **전체 개요**: 질문과 관련된 기록들의 전반적인 맥락과 흐름
2. **시간순 흐름**: 기록이 어떻게 발전/변화했는지
3. **핵심 인사이트**: 패턴, 반복되는 주제, 주목할 점
4. **구체적 내용**: 중요한 기록들의 주요 내용
5. **결론 및 제안**: 이 기록들이 시사하는 것, 다음 행동 제안

친근하고 깊이 있는 톤으로 작성해주세요. 단순 나열이 아닌, 맥락과 통찰을 담아주세요.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 1500, // 더 긴 응답 허용
  });

  return response.choices[0].message.content || '요약 생성 실패';
}

// 조건부 제안 생성
export async function generateSuggestions(memories: Memory[], personaContext?: string): Promise<string[] | undefined> {
  // 조건 체크: 동일 클러스터 3회 이상
  const clusterCounts = new Map<string, number>();
  memories.forEach(m => {
    if (m.clusterTag) {
      clusterCounts.set(m.clusterTag, (clusterCounts.get(m.clusterTag) || 0) + 1);
    }
  });

  const frequentClusters = Array.from(clusterCounts.entries())
    .filter(([_, count]) => count >= 3)
    .map(([cluster, _]) => cluster);

  if (frequentClusters.length === 0) return undefined;

  const personaPrefix = personaContext 
    ? `🎯 페르소나: 사용자는 "${personaContext}" 역할로 활동 중입니다.\n\n이 전문가 관점에서 도움될 제안을 해주세요. 일반적인 조언이 아닌, 이 전문 분야에서 실제로 유용한 구체적인 제안을 해주세요.\n\n`
    : '';

  const prompt = `
${personaPrefix}사용자가 최근 이런 주제들을 반복해서 기록했어:
${frequentClusters.map(c => `- ${c}`).join('\n')}

관련 기억들:
${memories
  .filter(m => frequentClusters.includes(m.clusterTag || ''))
  .slice(0, 10)
  .map(m => `- ${stripHtml(m.content)}`)
  .join('\n')}

이 사용자에게 도움이 될 만한 제안을 2-3개만 해줘.
- 강요하지 말고
- 선택지처럼
- 짧고 실용적으로

JSON 형식:
{ "suggestions": ["제안1", "제안2"] }
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result.suggestions || undefined;
}

// 인사이트 생성 (전체 기억 분석)
export async function generateInsights(memories: Memory[], personaContext?: string): Promise<{
  summary: string;
  topTopics: { topic: string; count: number }[];
  trends: string[];
  suggestions: string[];
  keywordCloud?: { keyword: string; count: number }[];
}> {
  if (memories.length === 0) {
    return {
      summary: '아직 기억이 없습니다.',
      topTopics: [],
      trends: [],
      suggestions: ['첫 기억을 기록해보세요!'],
      keywordCloud: [],
    };
  }

  // 주제별 통계
  const topicCounts = new Map<string, number>();
  memories.forEach(m => {
    if (m.topic) {
      topicCounts.set(m.topic, (topicCounts.get(m.topic) || 0) + 1);
    }
  });

  const topTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 키워드 클라우드 생성 (clusterTag 기반)
  const keywordCounts = new Map<string, number>();
  memories.forEach(m => {
    if (m.clusterTag) {
      keywordCounts.set(m.clusterTag, (keywordCounts.get(m.clusterTag) || 0) + 1);
    }
  });

  const keywordCloud = Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // 상위 20개 키워드

  // AI에게 인사이트 요청 (개선된 버전)
  const recentMemories = memories.slice(0, 40); // 더 많은 기록 분석
  
  // 시간대별 분포 분석
  const now = Date.now();
  const last7Days = memories.filter(m => now - m.createdAt < 7 * 24 * 60 * 60 * 1000);
  const last30Days = memories.filter(m => now - m.createdAt < 30 * 24 * 60 * 60 * 1000);
  
  // 반복 기록 분석
  const repeatedMemories = memories.filter(m => m.repeatCount && m.repeatCount > 1);
  
  const personaPrefix = personaContext 
    ? `🎯 페르소나: 사용자는 "${personaContext}" 역할로 활동 중입니다.\n\n당신은 이 전문 분야의 관점에서 사용자의 기록을 분석하는 전문가 비서입니다. 이 페르소나의 맥락, 목표, 관심사를 반영하여 깊이 있는 인사이트를 제공해주세요. 일반적인 분석이 아닌, 이 전문 분야에서 중요한 패턴과 인사이트를 찾아주세요.\n\n`
    : '';
  
  const prompt = `
${personaPrefix}당신은 개인 비서입니다. 사용자의 기록들을 깊이 있게 분석해서 의미 있는 인사이트를 제공해주세요.

[전체 통계]
- 총 기억: ${memories.length}개
- 최근 7일: ${last7Days.length}개 (평균 ${(last7Days.length / 7).toFixed(1)}개/일)
- 최근 30일: ${last30Days.length}개
- 반복된 기록: ${repeatedMemories.length}개
- 가장 많은 주제: ${topTopics.map(t => `${t.topic}(${t.count}개)`).join(', ')}
- 주요 키워드: ${keywordCloud.slice(0, 10).map(k => k.keyword).join(', ')}

[최근 기록들] (시간순, 최신 40개)
${recentMemories.map((m, idx) => {
  const date = new Date(m.createdAt);
  const daysAgo = Math.floor((now - m.createdAt) / (24 * 60 * 60 * 1000));
  const timeLabel = daysAgo === 0 ? '오늘' : daysAgo === 1 ? '어제' : `${daysAgo}일 전`;
  const plain = stripHtml(m.content);
  return `${idx + 1}. [${timeLabel}] [${m.nature}] ${plain.substring(0, 120)}...
   키워드: ${m.clusterTag || '없음'}${m.repeatCount && m.repeatCount > 1 ? ` (${m.repeatCount}회 반복)` : ''}`;
}).join('\n')}

다음을 심층 분석해주세요:

1. **전체 요약**: 사용자의 최근 관심사와 활동 패턴을 2문장으로 간결하게

2. **트렌드** (2개만, 짧게): 
   - 가장 눈에 띄는 변화나 패턴 1-2개만
   - 각 트렌드는 한 문장으로 간결하게

3. **제안** (2개만, 짧게):
   - 가장 실용적인 행동 제안 2개만
   - 각 제안은 한 문장으로 간결하게

격려하고 통찰력 있는 톤으로, 단순 정보 나열이 아닌 의미 있는 인사이트를 제공해주세요.

JSON 형식:
{
  "summary": "...",
  "trends": ["트렌드1", "트렌드2", "트렌드3"],
  "suggestions": ["제안1", "제안2", "제안3"]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 500, // 절반으로 줄임
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    summary: result.summary || '분석 중입니다...',
    topTopics,
    trends: result.trends || [],
    suggestions: result.suggestions || [],
    keywordCloud,
  };
}

// AI 그룹 제안 생성
export async function suggestGroups(memories: Memory[], personaContext?: string): Promise<{
  groups: Array<{
    name: string;
    description: string;
    memoryIds: string[];
    color: string;
  }>;
}> {
  if (memories.length < 3) {
    return { groups: [] };
  }

  const personaPrefix = personaContext 
    ? `🎯 페르소나: 사용자는 "${personaContext}" 역할로 활동 중입니다.\n\n이 전문 분야의 관점에서 그룹을 제안해주세요. 이 페르소나의 맥락과 목표에 맞는 의미 있는 그룹을 만들어주세요.\n\n`
    : '';

  const prompt = `
${personaPrefix}사용자의 기억들을 분석해서 의미 있는 그룹으로 묶어주세요.

[기억 목록]
${memories.map((m, idx) => {
  const plain = stripHtml(m.content);
  return `[인덱스:${idx}] ${plain.substring(0, 150)}... (주제: ${m.topic}, 성격: ${m.nature})`;
}).join('\n')}

다음 기준으로 그룹을 제안해주세요:
1. **의미적 연관성**: 비슷한 주제나 맥락
2. **시간적 연관성**: 특정 시기/프로젝트와 관련
3. **목적 연관성**: 같은 목표나 관심사

조건:
- 최소 3개 이상의 기억이 있어야 그룹 생성
- 최대 5개의 그룹만 제안
- 그룹 이름은 짧고 명확하게 (10자 이내)
- 각 그룹에 적합한 색상 추천 (blue, purple, green, orange, pink, red, yellow)
- **memoryIndices에는 위 목록의 인덱스 번호를 배열로 반환**

JSON 형식:
{
  "groups": [
    {
      "name": "그룹 이름",
      "description": "이 그룹에 대한 짧은 설명",
      "memoryIndices": [0, 1, 2],
      "color": "blue"
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{ "groups": [] }');
  
  // 인덱스를 실제 메모리 ID로 변환
  const groupsWithIds = result.groups.map((group: any) => ({
    name: group.name,
    description: group.description,
    memoryIds: (group.memoryIndices || [])
      .filter((idx: number) => idx >= 0 && idx < memories.length)
      .map((idx: number) => memories[idx].id),
    color: group.color,
  }));

  return { groups: groupsWithIds };
}

// 화이트보드 레이아웃 생성 (연결선 기반)
export async function generateLayout(params: {
  memories: Array<{ id: string; title?: string; content: string }>;
  connections: Array<{ from: string; to: string }>;
  currentPositions: Record<string, { x: number; y: number }>;
  cardSize: 's' | 'm' | 'l';
}): Promise<Record<string, { x: number; y: number }>> {
  const { memories, connections, currentPositions, cardSize } = params;
  
  if (memories.length === 0) {
    return {};
  }

  // 카드 크기에 따른 간격 설정
  const cardSpacing = cardSize === 's' ? 280 : cardSize === 'l' ? 400 : 340;
  const minDistance = cardSpacing;
  const groupSpacing = cardSpacing * 2.5;

  // 연결된 기록들을 그룹화 (연결 컴포넌트 찾기)
  const visited = new Set<string>();
  const groups: string[][] = [];

  const findConnected = (startId: string, group: string[]) => {
    if (visited.has(startId)) return;
    visited.add(startId);
    group.push(startId);
    
    connections.forEach(conn => {
      if (conn.from === startId && !visited.has(conn.to)) {
        findConnected(conn.to, group);
      } else if (conn.to === startId && !visited.has(conn.from)) {
        findConnected(conn.from, group);
      }
    });
  };

  memories.forEach(m => {
    if (!visited.has(m.id)) {
      const group: string[] = [];
      findConnected(m.id, group);
      if (group.length > 0) {
        groups.push(group);
      }
    }
  });

  // AI에게 각 그룹의 배치 전략 요청
  const prompt = `
당신은 화이트보드 레이아웃 디자이너입니다. 연결선이 있는 기록들을 시각적으로 잘 보이도록 배열해주세요.

[기록 정보]
${memories.map(m => {
  const plain = stripHtml(m.content);
  return `- ID: ${m.id}, 제목: ${m.title || '(제목 없음)'}, 내용: ${plain.substring(0, 100)}...`;
}).join('\n')}

[연결 정보]
${connections.map(c => `- ${c.from} ↔ ${c.to}`).join('\n')}

[그룹 정보]
${groups.map((group, idx) => `그룹 ${idx + 1}: ${group.join(', ')}`).join('\n')}

요구사항:
1. 연결된 기록들은 가까이 배치하되, 내용이 잘 보이도록 너무 겹치지 않게
2. 연결선이 잘 보이도록 적절한 간격 유지 (최소 ${minDistance}px)
3. 관련 있는 그룹들은 모여있도록 배치
4. 각 그룹 내에서는 연결 관계를 고려한 배치
5. 화면을 효율적으로 사용하되, 여백도 적절히

각 기록의 x, y 좌표를 반환해주세요. 좌표는 0부터 시작합니다.

JSON 형식:
{
  "positions": {
    "memoryId1": { "x": 100, "y": 200 },
    "memoryId2": { "x": 400, "y": 200 },
    ...
  },
  "reasoning": "배치 전략에 대한 간단한 설명"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.positions || {};
  } catch (error) {
    console.error('AI 레이아웃 생성 실패, 기본 레이아웃 사용:', error);
    
    // AI 실패 시 기본 레이아웃 (그룹별로 배치)
    const layout: Record<string, { x: number; y: number }> = {};
    let currentX = 50;
    let currentY = 50;
    let maxY = currentY;

    groups.forEach((group, groupIdx) => {
      const groupStartX = currentX;
      const groupStartY = currentY;
      
      // 그룹 내에서 연결 관계 고려한 배치
      group.forEach((memoryId, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        layout[memoryId] = {
          x: groupStartX + col * cardSpacing,
          y: groupStartY + row * cardSpacing,
        };
        maxY = Math.max(maxY, groupStartY + row * cardSpacing);
      });

      // 다음 그룹은 아래로
      currentY = maxY + groupSpacing;
      if (groupIdx % 2 === 1) {
        currentX += groupSpacing * 2;
        currentY = 50;
      }
    });

    // 연결되지 않은 기록들도 배치
    memories.forEach(m => {
      if (!layout[m.id]) {
        layout[m.id] = {
          x: currentX,
          y: currentY,
        };
        currentX += cardSpacing;
        if (currentX > 2000) {
          currentX = 50;
          currentY += cardSpacing;
        }
      }
    });

    return layout;
  }
}
