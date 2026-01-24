/**
 * PixelLab API 유틸리티
 * AI가 자동으로 픽셀 아트 이미지를 생성하고 적용할 수 있도록 하는 함수들
 */

export interface PixelLabGenerateOptions {
  prompt: string;
  model?: 'pixflux' | 'bitforge';
  width?: number;
  height?: number;
  transparent?: boolean;
  shading?: string;
  detail?: string;
  direction?: string;
}

export interface PixelLabResult {
  success: boolean;
  imageUrl?: string;
  image?: string; // base64
  metadata?: {
    prompt: string;
    model: string;
    size: { width: number; height: number };
    transparent: boolean;
  };
  error?: string;
}

/**
 * PixelLab API를 호출하여 픽셀 아트 이미지 생성
 * 서버 사이드에서 사용 (서버 컴포넌트 또는 API 라우트)
 */
export async function generatePixelArt(options: PixelLabGenerateOptions): Promise<PixelLabResult> {
  try {
    // 서버 사이드에서는 직접 PixelLab API 호출
    const apiKey = process.env.PIXELLAB_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'PixelLab API 키가 설정되지 않았습니다',
      };
    }

    // 모델별 엔드포인트 선택
    const apiUrl = options.model === 'bitforge' 
      ? 'https://api.pixellab.ai/v1/generate-image-bitforge'
      : 'https://api.pixellab.ai/v1/generate-image-pixflux';
    
    // 프롬프트 구성
    const fullPrompt = `${options.prompt}, ${options.shading || 'medium shading'}, ${options.detail || 'medium detail'}, ${options.direction || 'front'} view`;
    
    const requestBody: any = {
      description: fullPrompt,
      image_size: {
        width: options.width || 200,
        height: options.height || 200,
      },
      text_guidance_scale: 8,
      no_background: options.transparent && ((options.width || 200) * (options.height || 200) >= 200 * 200),
    };

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
      console.error('PixelLab API error:', errorText);
      return {
        success: false,
        error: `PixelLab API 오류: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    // 이미지 URL 또는 base64 이미지 추출
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
      } else if (data.image.url) {
        imageUrl = data.image.url;
      }
    } else if (data.image_url) {
      imageUrl = data.image_url;
    } else if (data.url) {
      imageUrl = data.url;
    }
    
    return {
      success: true,
      imageUrl: imageUrl,
      image: imageBase64 || imageUrl,
      metadata: {
        prompt: fullPrompt,
        model: options.model || 'pixflux',
        size: { width: options.width || 200, height: options.height || 200 },
        transparent: options.transparent || false,
      },
    };
  } catch (error: any) {
    console.error('PixelLab API 호출 실패:', error);
    return {
      success: false,
      error: error.message || '이미지 생성 중 오류가 발생했습니다',
    };
  }
}

/**
 * AI가 자동으로 프롬프트를 생성하고 PixelLab 이미지를 생성하는 헬퍼 함수
 * (서버 사이드에서 사용)
 */
export async function generatePixelArtWithAI(
  description: string,
  style: 'frame' | 'background' | 'icon' | 'ui-element' | 'custom' = 'custom'
): Promise<PixelLabResult> {
  // 스타일별 기본 프롬프트 템플릿
  const stylePrompts: Record<string, string> = {
    frame: 'pixel art frame border, two-tone shading, white outline, clean edges',
    background: 'pixel art background pattern, seamless, two-tone shading',
    icon: 'pixel art icon, simple, clear, two-tone shading, white outline',
    'ui-element': 'pixel art UI element, clean design, two-tone shading, white outline',
    custom: 'pixel art',
  };

  const basePrompt = stylePrompts[style] || stylePrompts.custom;
  const fullPrompt = `${description}, ${basePrompt}`;

  // 스타일별 크기 설정
  const sizeMap: Record<string, { width: number; height: number }> = {
    frame: { width: 200, height: 200 },
    background: { width: 400, height: 400 },
    icon: { width: 64, height: 64 },
    'ui-element': { width: 128, height: 128 },
    custom: { width: 200, height: 200 },
  };

  const size = sizeMap[style] || sizeMap.custom;

  return generatePixelArt({
    prompt: fullPrompt,
    width: size.width,
    height: size.height,
    transparent: style === 'frame' || style === 'icon' || style === 'ui-element',
    shading: 'medium shading',
    detail: 'medium detail',
    direction: 'front',
  });
}
