import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'Workless - 알아서 정리해주는 개인 비서';
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
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
        {/* 배경 장식 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
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
          }}
        >
          {/* 제목 */}
          <h1
            style={{
              fontSize: '96px',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              letterSpacing: '-0.05em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '24px',
            }}
          >
            Workless
          </h1>
          
          {/* 구분선 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '2px',
                background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
              }}
            />
            <p
              style={{
                fontSize: '24px',
                color: '#cbd5e1',
                fontWeight: '300',
                margin: 0,
              }}
            >
              알아서 정리해주는 개인 비서
            </p>
            <div
              style={{
                width: '48px',
                height: '2px',
                background: 'linear-gradient(to left, #a78bfa, #60a5fa)',
              }}
            />
          </div>
          
          {/* 부제목 */}
          <p
            style={{
              fontSize: '32px',
              color: '#94a3b8',
              fontWeight: '400',
              margin: 0,
              textAlign: 'center',
            }}
          >
            일상의 기억, 아이디어, 할 일을<br />
            AI가 알아서 정리해드립니다
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
