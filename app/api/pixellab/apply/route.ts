import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { generatePixelArt } from '@/lib/pixellab';
import { boardBlocksDb } from '@/lib/db';

/**
 * PixelLab 이미지를 생성하고 특정 컴포넌트에 적용
 * 
 * POST /api/pixellab/apply
 * Body: {
 *   prompt: string,
 *   target: 'viewer-frame' | 'viewer-background' | 'icon' | 'ui-element',
 *   blockId?: string,  // ViewerBlock ID (viewer-frame/background일 때)
 *   style?: 'frame' | 'background' | 'icon' | 'ui-element' | 'custom',
 *   width?: number,
 *   height?: number,
 *   ...기타 PixelLab 옵션
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      prompt,
      target,
      blockId,
      style = 'custom',
      width,
      height,
      transparent,
      shading = 'medium shading',
      detail = 'medium detail',
      direction = 'front',
      model = 'pixflux',
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트가 필요합니다' },
        { status: 400 }
      );
    }

    // 타겟별 기본 크기 설정
    const defaultSizes: Record<string, { width: number; height: number; transparent: boolean }> = {
      'viewer-frame': { width: 200, height: 200, transparent: true },
      'viewer-background': { width: 400, height: 400, transparent: false },
      'icon': { width: 64, height: 64, transparent: true },
      'ui-element': { width: 128, height: 128, transparent: true },
    };

    const defaultSize = defaultSizes[target] || { width: 200, height: 200, transparent: false };

    // PixelLab 이미지 생성
    const result = await generatePixelArt({
      prompt,
      model,
      width: width || defaultSize.width,
      height: height || defaultSize.height,
      transparent: transparent !== undefined ? transparent : defaultSize.transparent,
      shading,
      detail,
      direction,
    });

    if (!result.success || !result.imageUrl) {
      return NextResponse.json(
        { error: result.error || '이미지 생성 실패' },
        { status: 500 }
      );
    }

    // 타겟별 응답 데이터 구성
    let applyData: any = {
      imageUrl: result.imageUrl,
      metadata: result.metadata,
    };

    if (target === 'viewer-frame' || target === 'viewer-background') {
      if (!blockId) {
        return NextResponse.json(
          { error: 'blockId가 필요합니다' },
          { status: 400 }
        );
      }

      // ViewerBlock config 업데이트
      const block = boardBlocksDb.getById(blockId, userId);
      if (!block || block.type !== 'viewer') {
        return NextResponse.json(
          { error: 'ViewerBlock을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      const configKey = target === 'viewer-frame' ? 'pixelArtFrame' : 'pixelArtBackground';
      const updatedConfig = {
        ...block.config,
        [configKey]: result.imageUrl,
      };

      boardBlocksDb.update(blockId, userId, {
        config: updatedConfig,
      });

      applyData = {
        ...applyData,
        blockId,
        configKey,
        applied: true,
      };
    }

    return NextResponse.json({
      success: true,
      ...applyData,
    });
  } catch (error: any) {
    console.error('PixelLab apply error:', error);
    return NextResponse.json(
      { error: error.message || '이미지 적용에 실패했습니다' },
      { status: 500 }
    );
  }
}
