import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';

/**
 * PixelLab API를 사용하여 픽셀 아트 이미지 생성
 * 
 * POST /api/pixellab/generate
 * Body: {
 *   prompt: string,
 *   model?: 'pixflux' | 'bitforge',
 *   width?: number,
 *   height?: number,
 *   transparent?: boolean,
 *   shading?: string,
 *   detail?: string,
 *   direction?: string
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
      model = 'pixflux',
      width = 64,
      height = 64,
      transparent = false,
      shading = 'medium shading',
      detail = 'medium detail',
      direction = 'front',
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트가 필요합니다' },
        { status: 400 }
      );
    }

    // 크기 검증 (32x32 ~ 400x400)
    if (width < 32 || width > 400 || height < 32 || height > 400) {
      return NextResponse.json(
        { error: '이미지 크기는 32x32 ~ 400x400 사이여야 합니다' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PIXELLAB_API_KEY;
    if (!apiKey) {
      console.error('[PixelLab API] API 키가 설정되지 않음');
      return NextResponse.json(
        { error: 'PixelLab API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    console.log('[PixelLab API] 외부 API 호출 시작...', { apiKey: apiKey ? '설정됨' : '없음', model });
    
    // 모델별 엔드포인트 선택
    const apiUrl = model === 'bitforge' 
      ? 'https://api.pixellab.ai/v1/generate-image-bitforge'
      : 'https://api.pixellab.ai/v1/generate-image-pixflux';
    
    // 프롬프트 구성 (description만 사용, shading/detail/direction은 별도 파라미터로 전달 가능하지만 description에 포함)
    const fullPrompt = `${prompt}, ${shading}, ${detail}, ${direction} view`;
    
    // PixelLab API 요청 본문 구성 (문서 참고: https://api.pixellab.ai/v1/docs)
    const requestBody: any = {
      description: fullPrompt, // 필수: 이미지 생성 텍스트 설명
      image_size: {            // 필수: 이미지 크기
        width,
        height,
      },
      text_guidance_scale: 8,  // 1-20, 기본값 8
      no_background: transparent && (width * height >= 200 * 200), // 200x200 이상에서만 투명 배경 지원
    };

    console.log('[PixelLab API] 외부 API 요청:', { 
      url: apiUrl, 
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    
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
      console.error('[PixelLab API] 외부 API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: `PixelLab API 오류: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[PixelLab API] 외부 API 원본 응답 키:', Object.keys(data));
    console.log('[PixelLab API] 외부 API 원본 응답 타입:', typeof data);
    console.log('[PixelLab API] 외부 API 원본 응답 전체:', JSON.stringify(data));
    
    // 이미지 URL 또는 base64 이미지 추출
    // PixelLab API 응답 형식 확인 필요
    // Python SDK: response.image.pil_image() -> image는 객체일 수 있음
    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    
    // 다양한 응답 형식 지원
    if (data.image) {
      // image 필드가 있는 경우
      if (typeof data.image === 'string') {
        // 문자열인 경우 (base64 또는 URL)
        if (data.image.startsWith('data:')) {
          imageUrl = data.image; // 이미 data URL 형식
        } else if (data.image.startsWith('http')) {
          imageUrl = data.image; // HTTP URL
        } else {
          // base64 문자열인 경우 data URL로 변환
          imageBase64 = data.image;
          imageUrl = `data:image/png;base64,${data.image}`;
        }
      } else if (typeof data.image === 'object') {
        // 객체인 경우 (Python SDK의 경우)
        if (data.image.url) {
          imageUrl = data.image.url;
        } else if (data.image.base64) {
          imageBase64 = data.image.base64;
          imageUrl = `data:image/png;base64,${data.image.base64}`;
        } else if (data.image.data) {
          // 다른 형식 시도
          const imageData = data.image.data || data.image;
          if (typeof imageData === 'string') {
            imageBase64 = imageData;
            imageUrl = `data:image/png;base64,${imageData}`;
          }
        } else {
          // 객체의 모든 키 확인
          console.log('[PixelLab API] image 객체 키:', Object.keys(data.image));
          // 첫 번째 문자열 값 찾기
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
      // 중첩된 result 객체
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
    
    // 이미지가 없으면 에러
    if (!imageUrl) {
      console.error('[PixelLab API] 이미지 데이터를 찾을 수 없습니다.');
      console.error('[PixelLab API] 전체 응답 구조:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { 
          error: '이미지 데이터를 찾을 수 없습니다', 
          details: 'API 응답에 image 필드가 없습니다',
          responseKeys: Object.keys(data),
          responseSample: JSON.stringify(data).substring(0, 500)
        },
        { status: 500 }
      );
    }
    
    // 이미지 데이터 반환 (base64 또는 URL)
    const result = {
      success: true,
      image: imageBase64 || imageUrl, // base64 또는 URL
      imageUrl: imageUrl, // 최종 이미지 URL (data URL 포함)
      metadata: {
        prompt: fullPrompt,
        model,
        size: { width, height },
        transparent,
      },
    };
    console.log('[PixelLab API] 최종 응답:', { 
      success: result.success, 
      hasImage: !!result.image, 
      hasImageUrl: !!result.imageUrl,
      imageUrlType: imageUrl.startsWith('data:') ? 'data URL' : imageUrl.startsWith('http') ? 'HTTP URL' : 'unknown',
      imageUrlLength: result.imageUrl?.length || 0
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PixelLab API] 예외 발생:', error);
    return NextResponse.json(
      { error: '이미지 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
