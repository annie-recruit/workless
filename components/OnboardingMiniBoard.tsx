'use client';

import { useEffect, useRef, useState } from 'react';
import PixelIcon from './PixelIcon';

type CardPosition = {
    x: number;
    y: number;
};

type CardPositions = {
    card1: CardPosition;
    card2: CardPosition;
    card3: CardPosition;
    action: CardPosition;
    calendar: CardPosition;
    viewer: CardPosition;
};

export default function OnboardingMiniBoard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [positions, setPositions] = useState<CardPositions>({
        card1: { x: 20, y: 20 },
        card2: { x: 220, y: 20 },
        card3: { x: 220, y: 180 },
        action: { x: 20, y: 280 },
        calendar: { x: 420, y: 20 },
        viewer: { x: 380, y: 200 },
    });
    const [dragging, setDragging] = useState<keyof CardPositions | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // 연결선 그리기 (실제 PixelConnectionLayer와 동일한 알고리즘)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = 600 * dpr;
        canvas.height = 500 * dpr;
        canvas.style.width = '600px';
        canvas.style.height = '500px';
        ctx.scale(dpr, dpr);

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 600, 500);

        // 픽셀 스타일 연결선 그리기
        const drawPixelLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
            const LINE_PIXEL_SIZE = 2;
            let x1p = Math.round(x1 / LINE_PIXEL_SIZE);
            let y1p = Math.round(y1 / LINE_PIXEL_SIZE);
            const x2p = Math.round(x2 / LINE_PIXEL_SIZE);
            const y2p = Math.round(y2 / LINE_PIXEL_SIZE);

            const dx = Math.abs(x2p - x1p);
            const dy = Math.abs(y2p - y1p);
            const sx = x1p < x2p ? 1 : -1;
            const sy = y1p < y2p ? 1 : -1;
            let err = dx - dy;

            ctx.fillStyle = color;

            while (true) {
                ctx.fillRect(x1p * LINE_PIXEL_SIZE, y1p * LINE_PIXEL_SIZE, LINE_PIXEL_SIZE, LINE_PIXEL_SIZE);
                if (x1p === x2p && y1p === y2p) break;
                const e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x1p += sx; }
                if (e2 < dx) { err += dx; y1p += sy; }
            }
        };

        // 카드 중심점 계산 (70% 크기: 140px)
        const card1Center = { x: positions.card1.x + 70, y: positions.card1.y + 60 };
        const card2Center = { x: positions.card2.x + 70, y: positions.card2.y + 60 };
        const card3Center = { x: positions.card3.x + 70, y: positions.card3.y + 60 };
        const actionCenter = { x: positions.action.x + 90, y: positions.action.y + 60 };
        const viewerCenter = { x: positions.viewer.x + 100, y: positions.viewer.y + 80 };

        // 메모리 카드 1 -> 메모리 카드 2
        drawPixelLine(card1Center.x, card1Center.y, card2Center.x, card2Center.y, '#818CF8');
        // 메모리 카드 2 -> 메모리 카드 3
        drawPixelLine(card2Center.x, card2Center.y, card3Center.x, card3Center.y, '#A78BFA');
        // 메모리 카드 1 -> 액션 플랜
        drawPixelLine(card1Center.x, card1Center.y, actionCenter.x, actionCenter.y, '#FB923C');
        // 메모리 카드 2 -> 뷰어 위젯
        drawPixelLine(card2Center.x, card2Center.y, viewerCenter.x, viewerCenter.y, '#3B82F6');
    }, [positions]);

    // 컨테이너 참조를 위한 ref 추가
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (card: keyof CardPositions, e: React.PointerEvent) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragging(card);
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        e.preventDefault();

        // setPointerCapture를 사용하면 e.currentTarget이 캡처된 요소를 가리킬 수 있으므로
        // 정확한 좌표 계산을 위해 ref로 컨테이너의 위치를 참조합니다.
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        setPositions(prev => ({
            ...prev,
            [dragging]: {
                x: Math.max(0, Math.min(newX, 600 - (dragging === 'viewer' ? 200 : dragging === 'calendar' ? 160 : dragging === 'action' ? 126 : 140))),
                y: Math.max(0, Math.min(newY, 500 - (dragging === 'viewer' ? 160 : dragging === 'calendar' ? 200 : dragging === 'action' ? 150 : 120))),
            },
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDragging(null);
        try {
            // Release capture if needed, though usually automatic on up
            (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch { }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-[600px] h-[500px] bg-gradient-to-br from-orange-50 via-white to-indigo-50 overflow-hidden border-4 border-black"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'none' }}
        >
            {/* 연결선 캔버스 */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 1 }}
            />

            {/* 메모리 카드 1: 메모 작성 (70% 크기: 140px) */}
            <div
                className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow"
                style={{ left: `${positions.card1.x}px`, top: `${positions.card1.y}px`, zIndex: dragging === 'card1' ? 20 : 10 }}
                onPointerDown={(e) => handlePointerDown('card1', e)}
            >
                {/* 장식용 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                <div className="mb-2">
                    <h3 className="text-[10px] font-semibold text-gray-900 mb-1">메모 작성</h3>
                    <p className="text-[9px] text-gray-800 leading-relaxed">
                        • 파일 첨부 가능 (PDF, 이미지)<br />
                        • @태그로 다른 카드 참조
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] text-gray-500">
                    <span>방금 전</span>
                    <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
                        튜토리얼
                    </span>
                </div>
            </div>

            {/* 메모리 카드 2: 카드 연결 */}
            <div
                className="absolute bg-purple-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow"
                style={{ left: `${positions.card2.x}px`, top: `${positions.card2.y}px`, zIndex: dragging === 'card2' ? 20 : 10 }}
                onPointerDown={(e) => handlePointerDown('card2', e)}
            >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                <div className="mb-2">
                    <h3 className="text-[10px] font-semibold text-gray-900 mb-1">카드 연결</h3>
                    <p className="text-[9px] text-gray-800 leading-relaxed">
                        • 카드끼리 선으로 연결<br />
                        • 관계를 시각적으로 표현<br />
                        • AI가 자동으로 그룹 제안
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] text-gray-500">
                    <span>방금 전</span>
                    <span className="px-1 py-0.5 bg-orange-50 text-orange-600 border border-orange-200">
                        기능
                    </span>
                </div>
            </div>

            {/* 메모리 카드 3: 태그 & 분류 */}
            <div
                className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow"
                style={{ left: `${positions.card3.x}px`, top: `${positions.card3.y}px`, zIndex: dragging === 'card3' ? 20 : 10 }}
                onPointerDown={(e) => handlePointerDown('card3', e)}
            >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                <div className="mb-2">
                    <h3 className="text-[10px] font-semibold text-gray-900 mb-1">태그 & 분류</h3>
                    <p className="text-[9px] text-gray-800 leading-relaxed">
                        • 주제별 태그 자동 분류<br />
                        • 시간 맥락 추적<br />
                        • 검색으로 빠르게 찾기
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] text-gray-500">
                    <span>방금 전</span>
                </div>
            </div>

            {/* 액션 플랜 카드 (실제 ActionProjectCard 스타일) */}
            <div
                className="absolute w-[126px] bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-2.5 cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow"
                style={{ left: `${positions.action.x}px`, top: `${positions.action.y}px`, zIndex: dragging === 'action' ? 20 : 10 }}
                onPointerDown={(e) => handlePointerDown('action', e)}
            >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                <div className="mb-1.5">
                    <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[7px] font-bold border border-indigo-200 uppercase">
                        Action Project
                    </span>
                    <h3 className="text-[11px] font-black text-gray-900 mt-1 flex items-center gap-1">
                        <PixelIcon name="target" size={12} className="text-indigo-600" />
                        <span>시작하기</span>
                    </h3>
                </div>

                {/* 진행바 */}
                <div className="mb-2">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[7px] font-bold text-gray-600">PROGRESS</span>
                        <span className="text-[7px] font-black text-indigo-600 font-mono">33%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 border-2 border-gray-800 p-0.5">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 w-1/3" />
                    </div>
                </div>

                {/* 액션 아이템들 */}
                <div className="space-y-1">
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border-2 border-gray-800 bg-indigo-500 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-[8px] font-medium text-gray-400 line-through">카드 3개 만들기</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border-2 border-gray-800 bg-white flex-shrink-0" />
                        <p className="text-[8px] font-medium text-gray-800">카드끼리 연결하기</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border-2 border-gray-800 bg-white flex-shrink-0" />
                        <p className="text-[8px] font-medium text-gray-800">AI 기능 사용해보기</p>
                    </div>
                </div>
            </div>

            {/* 캘린더 위젯 (실제 CalendarBlock 스타일) */}
            <div
                className="absolute bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] border-[3px] border-black p-3 cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] transition-shadow"
                style={{ left: `${positions.calendar.x}px`, top: `${positions.calendar.y}px`, width: '160px', zIndex: dragging === 'calendar' ? 20 : 10 }}
                onPointerDown={(e) => handlePointerDown('calendar', e)}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-1.5">
                        <PixelIcon name="calendar" size={14} />
                        <h3 className="text-[10px] font-semibold text-gray-800">캘린더</h3>
                    </div>
                </div>

                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between mb-1.5">
                    <button className="p-0.5 hover:bg-gray-100 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-[10px] font-semibold text-gray-800">2026년 1월</span>
                    <button className="p-0.5 hover:bg-gray-100 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} className="text-center text-[8px] font-medium text-gray-500 py-0.5">
                            {day}
                        </div>
                    ))}
                </div>

                {/* 캘린더 그리드 */}
                <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 35 }, (_, i) => {
                        const day = i - 2; // 1일이 수요일이라고 가정
                        const isToday = day === 28;
                        const isCurrentMonth = day >= 1 && day <= 31;
                        return (
                            <div
                                key={i}
                                className={`text-center text-[8px] py-0.5 rounded transition-colors ${isToday ? 'bg-blue-100 font-bold' : isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'
                                    }`}
                            >
                                {day >= 1 && day <= 31 ? day : ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 뷰어 위젯 (ViewerBlock 스타일) */}
            <div
                className="absolute flex flex-col bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-shadow"
                style={{
                    left: `${positions.viewer.x}px`,
                    top: `${positions.viewer.y}px`,
                    width: '200px',
                    height: '160px',
                    zIndex: dragging === 'viewer' ? 20 : 10
                }}
                onPointerDown={(e) => handlePointerDown('viewer', e)}
            >
                {/* 타이틀 바 */}
                <div className="h-6 bg-[#EEEEEE] border-b-[3px] border-black flex items-center justify-between px-2 select-none shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 border border-black bg-[#FF5F56]" />
                            <div className="w-2 h-2 border border-black bg-[#FFBD2E]" />
                            <div className="w-2 h-2 border border-black bg-[#27C93F]" />
                        </div>
                        <span className="ml-1 text-[9px] font-bold text-black uppercase tracking-tight">PREVIEW</span>
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden relative group">
                    <img
                        src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=400&auto=format&fit=crop"
                        alt="콘텐츠 미리보기 이미지"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>
            </div>

            {/* 하단 안내 텍스트 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 justify-center">
                    <PixelIcon name="sparkles" size={12} className="text-yellow-500" />
                    <span>드래그 & 연결로 생각을 정리하세요</span>
                </p>
            </div>
        </div>
    );
}
