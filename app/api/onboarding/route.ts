import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { memoryDb, boardBlocksDb, boardPositionDb, projectDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { Attachment } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 이미 메모리가 있는지 확인
    const existingMemories = memoryDb.getAll(userId);
    if (existingMemories.length > 0) {
      return NextResponse.json({ 
        message: '이미 온보딩이 완료되었습니다',
        skipped: true 
      });
    }

    // 샘플 첨부파일 생성 (더미 데이터)
    const createDummyAttachment = (filename: string, mimetype: string): Attachment => ({
      id: nanoid(),
      filename,
      filepath: `/uploads/onboarding-${nanoid()}.${filename.split('.').pop()}`,
      mimetype,
      size: 1024,
      createdAt: Date.now(),
    });

    // 메모리 카드 1: 메모리 카드 기능 소개
    const memory1 = memoryDb.create(
      `메모리 카드에 다양한 정보를 기록할 수 있습니다.

**기능 소개:**
- 제목과 내용을 자유롭게 작성할 수 있어요
- 파일을 첨부해서 문서나 이미지를 함께 저장할 수 있습니다
- 다른 카드를 @태그로 참조할 수 있어요 (예: @메모리2 참조)

이렇게 카드들을 연결해서 생각의 흐름을 시각화할 수 있습니다.`,
      userId,
      {
        title: '메모리 카드 사용법',
        attachments: [createDummyAttachment('guide.pdf', 'application/pdf')],
      }
    );

    // 메모리 카드 2: 태깅 기능 소개
    const memory2 = memoryDb.create(
      `태깅(@) 기능을 사용하면 카드들을 서로 연결할 수 있습니다.

**태깅 사용법:**
- 다른 카드를 참조할 때는 @기억제목 형식으로 입력하세요
- 예를 들어 "@메모리 카드 사용법"이라고 입력하면 해당 카드와 연결됩니다
- 연결된 카드들은 화면에서 선으로 표시되어 관계를 한눈에 볼 수 있어요

이 기능을 활용하면 관련된 아이디어들을 체계적으로 정리할 수 있습니다.`,
      userId,
      {
        title: '태깅(@) 기능 안내',
        relatedMemoryIds: [memory1.id],
      }
    );

    // 메모리 카드 3: 첨부파일 기능 소개
    const memory3 = memoryDb.create(
      `첨부파일 기능을 사용하면 문서, 이미지, PDF 등을 카드에 함께 저장할 수 있습니다.

**지원하는 파일 형식:**
- PDF 문서
- 이미지 파일 (JPG, PNG 등)
- 텍스트 파일
- 기타 다양한 문서 형식

첨부한 파일은 카드에서 바로 확인할 수 있고, AI가 파일 내용을 분석해서 관련 카드를 찾아주기도 합니다.

예시: 이 카드에는 샘플 이미지가 첨부되어 있어요!`,
      userId,
      {
        title: '첨부파일 기능',
        attachments: [
          createDummyAttachment('sample-image.jpg', 'image/jpeg'),
          createDummyAttachment('sample-doc.txt', 'text/plain'),
        ],
        relatedMemoryIds: [memory1.id],
      }
    );

    // 메모리 1에도 메모리 2, 3 연결
    memoryDb.update(memory1.id, {
      relatedMemoryIds: [memory2.id, memory3.id],
    });

    // 메모리 위치 저장 (무작위 배열)
    boardPositionDb.upsertMany(userId, 'all', [
      { memoryId: memory1.id, x: 200, y: 150 },
      { memoryId: memory2.id, x: 600, y: 200 },
      { memoryId: memory3.id, x: 400, y: 400 },
    ]);

    // 캘린더 블록 생성
    const calendarBlock = boardBlocksDb.create(userId, {
      type: 'calendar',
      x: 1000,
      y: 150,
      width: 350,
      height: 400,
      config: {
        view: 'month',
        selectedDate: Date.now(),
        linkedMemoryIds: [],
        todos: [
          {
            id: nanoid(),
            text: '샘플 일정: 캘린더 위젯 사용해보기',
            completed: false,
            date: Date.now(),
            createdAt: Date.now(),
          },
        ],
      },
    });

    // 뷰어 블록용 사용법 안내 텍스트 파일 생성
    const viewerGuideContent = `Viewer 위젯 사용법 안내
=====================================

Viewer 위젯은 다양한 파일과 웹 페이지를 미리볼 수 있는 기능입니다.

**주요 기능:**
1. 파일 드롭: 이미지, PDF, DOCX 파일을 드래그 앤 드롭하면 바로 미리볼 수 있습니다
2. URL 미리보기: 웹 페이지 URL을 붙여넣으면 해당 페이지를 미리볼 수 있습니다
3. 히스토리: 이전에 본 파일들을 뒤로/앞으로 버튼으로 탐색할 수 있습니다
4. Pin 기능: 자주 보는 파일을 고정할 수 있습니다

**사용 예시:**
- PDF 문서를 드롭해서 내용 확인
- 이미지 파일을 드롭해서 바로 보기
- 웹 페이지 URL을 붙여넣어서 미리보기

이렇게 Viewer 위젯을 활용하면 화이트보드에서 바로 파일 내용을 확인할 수 있어 더욱 효율적으로 작업할 수 있습니다!`;

    // 텍스트 파일 저장
    const UPLOAD_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
      : path.join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    
    const viewerGuideFilename = `onboarding-viewer-guide-${nanoid()}.txt`;
    const viewerGuideFilepath = path.join(UPLOAD_DIR, viewerGuideFilename);
    await writeFile(viewerGuideFilepath, viewerGuideContent, 'utf-8');
    
    const viewerGuideUrl = process.env.RAILWAY_VOLUME_MOUNT_PATH 
      ? `/data/uploads/${viewerGuideFilename}`
      : `/uploads/${viewerGuideFilename}`;

    // 뷰어 블록 생성 (사용법 안내)
    const viewerBlock = boardBlocksDb.create(userId, {
      type: 'viewer',
      x: 1000,
      y: 600,
      width: 600,
      height: 400,
      config: {
        currentSource: {
          kind: 'file',
          url: viewerGuideUrl,
          fileName: 'Viewer 사용법 안내.txt',
          mimeType: 'text/plain',
        },
        history: [],
        historyIndex: -1,
        pinned: false,
      },
    });

    // 액션 프로젝트 생성 (사용법 안내 포함)
    const actionProject = projectDb.create(userId, {
      title: '🎯 액션 프로젝트 사용법',
      summary: '액션 프로젝트는 여러 메모리 카드를 선택해서 실천 계획을 만들 수 있는 기능입니다. 각 단계별로 구체적인 액션을 체크리스트로 관리할 수 있어요.',
      expectedDuration: '온보딩 가이드',
      milestones: [
        {
          id: nanoid(),
          title: '[1단계: 기능 이해하기]',
          actions: [
            {
              id: nanoid(),
              text: '메모리 카드 3개를 선택해보세요',
              duration: '2m',
              completed: false,
            },
            {
              id: nanoid(),
              text: '액션플랜 버튼을 눌러 프로젝트를 생성해보세요',
              duration: '1m',
              completed: false,
            },
          ],
        },
        {
          id: nanoid(),
          title: '[2단계: 프로젝트 활용하기]',
          actions: [
            {
              id: nanoid(),
              text: '체크박스를 클릭해서 액션을 완료 처리해보세요',
              duration: '1m',
              completed: false,
            },
            {
              id: nanoid(),
              text: '프로젝트 카드를 드래그해서 원하는 위치로 이동해보세요',
              duration: '1m',
              completed: false,
            },
          ],
        },
      ],
      sourceMemoryIds: [memory1.id, memory2.id, memory3.id],
      x: 200,
      y: 700,
      color: 'bg-indigo-50',
    });

    return NextResponse.json({
      success: true,
      memories: [memory1, memory2, memory3],
      blocks: [calendarBlock, viewerBlock],
      project: actionProject,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: '온보딩 데이터 생성 실패' },
      { status: 500 }
    );
  }
}
