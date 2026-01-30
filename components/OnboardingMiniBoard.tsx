'use client';

import { useEffect, useRef, useState } from 'react';
import PixelIcon from './PixelIcon';

export type CardPosition = {
    x: number;
    y: number;
};

export type CardPositions = {
    card1: CardPosition;
    card2: CardPosition;
    card3: CardPosition;
    action: CardPosition;
    calendar: CardPosition;
    viewer: CardPosition;
};

interface OnboardingMiniBoardProps {
    showLines?: boolean;
    initialPositions?: CardPositions;
}

export default function OnboardingMiniBoard({
    showLines = true,
    initialPositions
}: OnboardingMiniBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [positions, setPositions] = useState<CardPositions>(initialPositions || {
        card1: { x: 20, y: 20 },
        card2: { x: 220, y: 20 },
        card3: { x: 220, y: 180 },
        action: { x: 20, y: 280 },
        calendar: { x: 420, y: 20 },
        viewer: { x: 380, y: 200 },
    });
    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState<keyof CardPositions | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // 컨테이너 크기 관측 및 스케일링 계산
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                const height = containerRef.current.offsetHeight;
                setSize({ width, height });

                // 모바일 대응: 컨테이너 너비가 좁으면 스케일 조정 (기준 너비 1000px)
                if (width < 1000) {
                    setScale(width / 1000);
                } else {
                    setScale(1);
                }
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // 연결선 그리기
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size.width === 0 || size.height === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size.width * dpr;
        canvas.height = size.height * dpr;
        canvas.style.width = `${size.width}px`;
        canvas.style.height = `${size.height}px`;
        ctx.scale(dpr, dpr);

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, size.width, size.height);

        if (!showLines) return;

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

        drawPixelLine(card1Center.x, card1Center.y, card2Center.x, card2Center.y, '#818CF8');
        drawPixelLine(card2Center.x, card2Center.y, card3Center.x, card3Center.y, '#A78BFA');
        drawPixelLine(card1Center.x, card1Center.y, actionCenter.x, actionCenter.y, '#FB923C');
        drawPixelLine(card2Center.x, card2Center.y, viewerCenter.x, viewerCenter.y, '#3B82F6');
    }, [positions, size, showLines]);

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

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        const maxX = containerRect.width - (dragging === 'viewer' ? 200 : dragging === 'calendar' ? 160 : dragging === 'action' ? 126 : 140);
        const maxY = containerRect.height - (dragging === 'viewer' ? 160 : dragging === 'calendar' ? 200 : dragging === 'action' ? 150 : 120);

        setPositions(prev => ({
            ...prev,
            [dragging]: {
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY)),
            },
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDragging(null);
        try {
            (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch { }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-transparent overflow-hidden pointer-events-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'none' }}
        >
            <div 
                className="w-full h-full relative"
                style={{ 
                    transform: scale !== 1 ? `scale(${scale})` : 'none',
                    transformOrigin: 'top left',
                    width: scale !== 1 ? `${100 / scale}%` : '100%',
                    height: scale !== 1 ? `${100 / scale}%` : '100%'
                }}
            >
                {/* 연결선 캔버스 */}
                {showLines && (
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{ zIndex: 1 }}
                    />
                )}

                {/* 메모리 카드 1: 메모 작성 */}
                <div
                    className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto"
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
                            • 파일 첨부 가능<br />
                            • @태그로 참조
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
                    className="absolute bg-purple-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto"
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
                    className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[140px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto"
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
                            • 태그 자동 분류<br />
                            • 시간 맥락 추적
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-gray-500">
                        <span>방금 전</span>
                    </div>
                </div>

                {/* 액션 플랜 카드 */}
                <div
                    className="absolute w-[126px] bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-2.5 cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto"
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
                            <PixelIcon name="target" size={12} className="text-indigo-600" ariaLabel="액션 프로젝트 타겟" />
                            <span>시작하기</span>
                        </h3>
                    </div>

                    <div className="mb-2">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[7px] font-bold text-gray-600">PROGRESS</span>
                            <span className="text-[7px] font-black text-indigo-600 font-mono">33%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 border-2 border-gray-800 p-0.5">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 w-1/3" />
                        </div>
                    </div>

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

                {/* 캘린더 위젯 */}
                <div
                    className="absolute bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] border-[3px] border-black p-3 cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto"
                    style={{ left: `${positions.calendar.x}px`, top: `${positions.calendar.y}px`, width: '160px', zIndex: dragging === 'calendar' ? 20 : 10 }}
                    onPointerDown={(e) => handlePointerDown('calendar', e)}
                >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200">
                        <div className="flex items-center gap-1.5">
                            <PixelIcon name="calendar" size={14} ariaLabel="캘린더 위젯" />
                            <h3 className="text-[10px] font-semibold text-gray-800">캘린더</h3>
                        </div>
                    </div>

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

                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                            <div key={day} className="text-center text-[8px] font-medium text-gray-500 py-0.5">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 2;
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

                {/* 뷰어 위젯 */}
                <div
                    className="absolute flex flex-col bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-shadow pointer-events-auto"
                    style={{
                        left: `${positions.viewer.x}px`,
                        top: `${positions.viewer.y}px`,
                        width: '200px',
                        height: '160px',
                        zIndex: dragging === 'viewer' ? 20 : 10
                    }}
                    onPointerDown={(e) => handlePointerDown('viewer', e)}
                >
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

                    <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden relative group">
                        <img
                            src="https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=400&auto=format&fit=crop"
                            alt="콘텐츠 미리보기 이미지"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                    </div>
                </div>
            </div>
        </div>
    );
}
