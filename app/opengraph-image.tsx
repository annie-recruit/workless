import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'WORKLESS - 맥락을 구체화. 비정형 애자일 워크스페이스';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* 픽셀 도트 배경 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '60px 80px',
            border: '8px solid white',
            position: 'relative',
          }}
        >
          {/* 코너 장식 */}
          <div style={{ position: 'absolute', top: '-12px', left: '-12px', width: '24px', height: '24px', background: 'white' }} />
          <div style={{ position: 'absolute', top: '-12px', right: '-12px', width: '24px', height: '24px', background: 'white' }} />
          <div style={{ position: 'absolute', bottom: '-12px', left: '-12px', width: '24px', height: '24px', background: 'white' }} />
          <div style={{ position: 'absolute', bottom: '-12px', right: '-12px', width: '24px', height: '24px', background: 'white' }} />

          {/* 제목 */}
          <h1
            style={{
              fontSize: '120px',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              letterSpacing: '-0.05em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '24px',
              textShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            }}
          >
            WORKLESS
          </h1>

          {/* 구분선 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '4px',
                background: 'white',
              }}
            />
            <p
              style={{
                fontSize: '28px',
                color: 'white',
                fontWeight: '400',
                margin: 0,
              }}
            >
              맥락을 구체화
            </p>
            <div
              style={{
                width: '60px',
                height: '4px',
                background: 'white',
              }}
            />
          </div>

          {/* 부제목 */}
          <p
            style={{
              fontSize: '36px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '600',
              margin: 0,
              textAlign: 'center',
            }}
          >
            비정형 애자일 워크스페이스
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
