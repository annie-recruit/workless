// 사용 예시 1: 기본 사용법 (자동 광고)
import PixelAdSense from '@/components/PixelAdSense';

export default function SomePage() {
    return (
        <div>
            {/* 사이안 테두리 (기본) */}
            <PixelAdSense />

            {/* 보라색 테두리 */}
            <PixelAdSense borderColor="purple" />

            {/* 핑크색 테두리 */}
            <PixelAdSense borderColor="pink" />
        </div>
    );
}

// 사용 예시 2: 특정 광고 단위 사용
export function PageWithAdUnit() {
    return (
        <div>
            <PixelAdSense
                adSlot="1234567890"  // 애드센스에서 받은 광고 슬롯 ID
                adFormat="rectangle"
                borderColor="cyan"
            />
        </div>
    );
}

// 사용 예시 3: 랜딩 페이지에 추가
export function LandingPageExample() {
    return (
        <div className="space-y-8">
            <h1>WORKLESS</h1>

            {/* 콘텐츠 사이에 광고 삽입 */}
            <PixelAdSense
                borderColor="purple"
                className="my-8"
            />

            <p>서비스 설명...</p>

            {/* 다른 색상의 광고 */}
            <PixelAdSense
                borderColor="pink"
                className="my-8"
            />
        </div>
    );
}

// 사용 예시 4: 대시보드/화이트보드 사이드바에 추가
export function DashboardSidebar() {
    return (
        <aside className="w-64 p-4">
            <h2>도구</h2>

            {/* 사이드바 광고 */}
            <PixelAdSense
                adFormat="vertical"
                borderColor="indigo"
                className="mt-4"
            />
        </aside>
    );
}
