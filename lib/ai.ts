import OpenAI from 'openai';
import { Memory, AIClassification, Attachment } from '@/types';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 텍스트 파일 읽기
export async function readTextFile(filepath: string): Promise<string> {
  try {
    const fullPath = join(process.cwd(), 'public', filepath);
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

// PDF 파일 파싱
export async function parsePDF(filepath: string): Promise<string> {
  try {
    console.log('🔍 [PDF 1/4] parsePDF 함수 시작');
    console.log('🔍 [PDF 1/4] filepath:', filepath);
    
    const fullPath = join(process.cwd(), 'public', filepath);
    console.log('🔍 [PDF 2/4] fullPath:', fullPath);
    
    console.log('🔍 [PDF 3/4] 파일 읽기 시작...');
    const dataBuffer = readFileSync(fullPath);
    console.log('🔍 [PDF 3/4] 파일 읽기 완료. Buffer 크기:', dataBuffer.length, 'bytes');
    
    console.log('🔍 [PDF 4/4] PDF 파싱 시작...');
    
    // pdf-parse를 동적으로 import (CommonJS 모듈이므로)
    const pdfParse = require('pdf-parse');
    
    // pdf-parse는 함수로 직접 사용 (클래스 아님!)
    // 사용법: pdfParse(dataBuffer, options)
    const data = await pdfParse(dataBuffer);
    
    console.log('🔍 [PDF 4/4] PDF 파싱 완료!');
    console.log('🔍 [PDF 4/4] data 키들:', Object.keys(data || {}));
    console.log('🔍 [PDF 4/4] 추출된 텍스트 길이:', data?.text?.length || 0);
    console.log('🔍 [PDF 4/4] 페이지 수:', data?.numpages || 0);
    
    let text = data?.text || '';
    
    // 너무 길면 앞부분만 (2000자)
    if (text.length > 2000) {
      text = text.substring(0, 2000) + '... (내용이 길어서 일부만 표시)';
    }
    
    if (text.trim()) {
      console.log('✅ PDF 파싱 최종 완료. 미리보기:', text.substring(0, 100).replace(/\n/g, ' '));
      return text;
    } else {
      console.log('⚠️ PDF에서 텍스트를 추출하지 못했습니다');
      return '(PDF에서 텍스트를 추출할 수 없습니다)';
    }
    
  } catch (error) {
    console.error('❌ PDF 파싱 실패 상세 정보:');
    console.error('  - 에러 타입:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('  - 에러 메시지:', error instanceof Error ? error.message : String(error));
    return 'PDF 파일을 읽을 수 없습니다';
  }
}

// 이미지 분석 (Vision API) - base64로 전송
export async function analyzeImageFromPath(filepath: string): Promise<string> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 파일 경로에서 실제 파일 읽기
    const fullPath = path.join(process.cwd(), 'public', filepath);
    
    if (!fs.existsSync(fullPath)) {
      console.error('이미지 파일을 찾을 수 없습니다:', fullPath);
      return '이미지 파일을 찾을 수 없습니다';
    }
    
    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filepath).toLowerCase();
    
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
  fileContext?: string
): Promise<AIClassification> {
  const fullContent = fileContext 
    ? `${content}\n\n[첨부된 파일 내용]\n${fileContext}`
    : content;

  const prompt = `
너는 개인 비서야. 사용자가 입력한 생각이나 기록을 분석해서 자동으로 분류해줘.

[사용자 입력]
"${fullContent}"

[기존 기억들] (최근 10개)
${existingMemories.slice(0, 10).map(m => `- ${m.content} (주제: ${m.topic}, 클러스터: ${m.clusterTag})`).join('\n')}

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

  const prompt = `
사용자가 새로 입력한 내용: "${content}"

기존 기억들:
${memories.map((m, i) => `${i}. ${m.content}`).join('\n')}

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

// 요약 생성
export async function generateSummary(query: string, memories: Memory[]): Promise<string> {
  const prompt = `
사용자 질문: "${query}"

관련 기억들:
${memories.map(m => `- ${m.content} (${new Date(m.createdAt).toLocaleDateString()})`).join('\n')}

위 기억들을 바탕으로 사용자 질문에 대한 요약을 해줘.
- 핵심만 간단히
- 시간 순서나 주제별로 정리
- 너무 형식적이지 않게, 친근한 톤으로
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content || '요약 생성 실패';
}

// 조건부 제안 생성
export async function generateSuggestions(memories: Memory[]): Promise<string[] | undefined> {
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

  const prompt = `
사용자가 최근 이런 주제들을 반복해서 기록했어:
${frequentClusters.map(c => `- ${c}`).join('\n')}

관련 기억들:
${memories
  .filter(m => frequentClusters.includes(m.clusterTag || ''))
  .slice(0, 10)
  .map(m => `- ${m.content}`)
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
export async function generateInsights(memories: Memory[]): Promise<{
  summary: string;
  topTopics: { topic: string; count: number }[];
  trends: string[];
  suggestions: string[];
}> {
  if (memories.length === 0) {
    return {
      summary: '아직 기억이 없습니다.',
      topTopics: [],
      trends: [],
      suggestions: ['첫 기억을 기록해보세요!'],
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

  // AI에게 인사이트 요청
  const recentMemories = memories.slice(0, 30);
  
  const prompt = `
당신은 개인 비서입니다. 사용자의 기록들을 분석해서 인사이트를 제공해주세요.

[전체 통계]
- 총 기억 개수: ${memories.length}개
- 가장 많은 주제: ${topTopics.map(t => `${t.topic}(${t.count}개)`).join(', ')}

[최근 30개 기억] (시간순)
${recentMemories.map(m => `- [${m.topic}/${m.nature}] ${m.content.substring(0, 100)}...`).join('\n')}

다음을 분석해주세요:

1. **전체 요약**: 사용자가 최근에 어떤 것들에 관심을 가지고 있는지 2-3문장으로
2. **트렌드**: 최근 변화나 패턴 (예: "최근 업무 관련 기록이 증가했어요", "학습에 대한 관심이 높아지고 있어요")
3. **제안**: 실용적인 행동 제안 3개

친근하고 격려하는 톤으로 작성해주세요.

JSON 형식:
{
  "summary": "...",
  "trends": ["트렌드1", "트렌드2"],
  "suggestions": ["제안1", "제안2", "제안3"]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    summary: result.summary || '분석 중입니다...',
    topTopics,
    trends: result.trends || [],
    suggestions: result.suggestions || [],
  };
}

// AI 그룹 제안 생성
export async function suggestGroups(memories: Memory[]): Promise<{
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

  const prompt = `
사용자의 기억들을 분석해서 의미 있는 그룹으로 묶어주세요.

[기억 목록]
${memories.map((m, idx) => `[인덱스:${idx}] ${m.content.substring(0, 150)}... (주제: ${m.topic}, 성격: ${m.nature})`).join('\n')}

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
