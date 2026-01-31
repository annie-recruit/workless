'use client';

import { useEffect, useRef, useState } from 'react';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

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
    const { t, language } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [positions, setPositions] = useState<CardPositions>(initialPositions || {
        card1: { x: 40, y: 40 },
        card2: { x: 260, y: 40 },
        card3: { x: 260, y: 240 },
        action: { x: 40, y: 350 },
        calendar: { x: 520, y: 40 },
        viewer: { x: 480, y: 300 },
    });

    // 초기 랜덤 위치 배정
    useEffect(() => {
        if (!initialPositions) {
            const randomize = () => {
                const margin = 30;
                const boardW = 800; // 가상 보드 너비
                const boardH = 600; // 가상 보드 높이

                const getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

                setPositions({
                    card1: { x: getRandom(margin, boardW / 2.8), y: getRandom(margin, boardH / 3.5) },
                    card2: { x: getRandom(boardW / 2.8, boardW / 1.6), y: getRandom(margin, boardH / 3.5) },
                    card3: { x: getRandom(boardW / 2.8, boardW / 1.6), y: getRandom(boardH / 3.5, (boardH / 3.5) * 2) },
                    action: { x: getRandom(margin, boardW / 3.2), y: getRandom((boardH / 3.5) * 2, boardH - 200) },
                    calendar: { x: getRandom(boardW / 1.6, boardW - 180 - margin - 20), y: getRandom(margin, boardH / 2.2) },
                    viewer: { x: getRandom(boardW / 1.8, boardW - 240 - margin - 20), y: getRandom(boardH / 2.2, boardH - 220 - margin) },
                });
            };
            randomize();
        }
    }, [initialPositions]);

    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState<keyof CardPositions | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [visibleCards, setVisibleCards] = useState<Set<keyof CardPositions>>(new Set(['card1', 'card2', 'card3', 'action', 'calendar', 'viewer']));

    const handleDelete = (card: keyof CardPositions, e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setVisibleCards(prev => {
            const next = new Set(prev);
            next.delete(card);
            return next;
        });
    };

    // 롱프레스 타이머
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // 컨테이너 크기 관측 및 스케일링 계산
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                const height = containerRef.current.offsetHeight;
                setSize({ width, height });

                // 모바일 대응: 컨테이너 너비가 좁으면 스케일 조정 (기준 너비 800px로 조정)
                if (width < 800) {
                    setScale(Math.max(0.4, width / 800));
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

        // 카드 중심점 계산 (크기 변경 반영)
        const card1Center = { x: positions.card1.x + 80, y: positions.card1.y + 65 };
        const card2Center = { x: positions.card2.x + 80, y: positions.card2.y + 65 };
        const card3Center = { x: positions.card3.x + 80, y: positions.card3.y + 65 };
        const actionCenter = { x: positions.action.x + 75, y: positions.action.y + 70 };
        const viewerCenter = { x: positions.viewer.x + 120, y: positions.viewer.y + 100 };

        if (visibleCards.has('card1') && visibleCards.has('card2')) {
            drawPixelLine(card1Center.x, card1Center.y, card2Center.x, card2Center.y, '#818CF8');
        }
        if (visibleCards.has('card2') && visibleCards.has('card3')) {
            drawPixelLine(card2Center.x, card2Center.y, card3Center.x, card3Center.y, '#A78BFA');
        }
        if (visibleCards.has('card1') && visibleCards.has('action')) {
            drawPixelLine(card1Center.x, card1Center.y, actionCenter.x, actionCenter.y, '#FB923C');
        }
        if (visibleCards.has('card2') && visibleCards.has('viewer')) {
            drawPixelLine(card2Center.x, card2Center.y, viewerCenter.x, viewerCenter.y, '#3B82F6');
        }
    }, [positions, size, showLines, visibleCards]);

    const handlePointerDown = (card: keyof CardPositions, e: React.PointerEvent) => {
        const isTouch = e.pointerType === 'touch';
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;

        const startDrag = () => {
            setDragging(card);
            setDragOffset({
                x: startX - rect.left,
                y: startY - rect.top,
            });
            if (isTouch && 'vibrate' in navigator) navigator.vibrate(50);
        };

        if (!isTouch) {
            startDrag();
            return;
        }

        // 모바일 롱프레스 (1초)
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(startDrag, 1000);

        const handleMove = (moveEv: PointerEvent) => {
            const dist = Math.sqrt(Math.pow(moveEv.clientX - startX, 2) + Math.pow(moveEv.clientY - startY, 2));
            if (dist > 10) clearLongPressTimer();
        };

        const handleUp = () => {
            clearLongPressTimer();
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        const newX = (e.clientX - containerRect.left - dragOffset.x) / scale;
        const newY = (e.clientY - containerRect.top - dragOffset.y) / scale;

        const maxX = (containerRect.width / scale) - (dragging === 'viewer' ? 240 : dragging === 'calendar' ? 180 : dragging === 'action' ? 150 : 160);
        const maxY = (containerRect.height / scale) - (dragging === 'viewer' ? 200 : dragging === 'calendar' ? 220 : dragging === 'action' ? 180 : 140);

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
            className="w-full h-full bg-transparent overflow-hidden pointer-events-none select-none"
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
                {visibleCards.has('card1') && (
                    <div
                        className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[160px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto group"
                        style={{ left: `${positions.card1.x}px`, top: `${positions.card1.y}px`, zIndex: dragging === 'card1' ? 20 : 10 }}
                        onPointerDown={(e) => handlePointerDown('card1', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('card1', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-gray-800 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        >
                            ×
                        </button>

                        {/* 장식용 코너 포인트 */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                    <div className="mb-2">
                        <h3 className="text-[12px] font-semibold text-gray-900 mb-1">{t('onboarding.note')}</h3>
                        <p className="text-[10px] text-gray-800 leading-relaxed">
                            {t('onboarding.note.desc1')}<br />
                            {t('onboarding.note.desc2')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <span>{t('onboarding.justNow')}</span>
                        <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
                            {t('onboarding.tutorial')}
                        </span>
                    </div>
                </div>

                {/* 메모리 카드 2: 카드 연결 */}
                {visibleCards.has('card2') && (
                    <div
                        className="absolute bg-purple-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[160px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto group"
                        style={{ left: `${positions.card2.x}px`, top: `${positions.card2.y}px`, zIndex: dragging === 'card2' ? 20 : 10 }}
                        onPointerDown={(e) => handlePointerDown('card2', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('card2', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-gray-800 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        >
                            ×
                        </button>

                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                    <div className="mb-2">
                        <h3 className="text-[12px] font-semibold text-gray-900 mb-1">{t('onboarding.connect')}</h3>
                        <p className="text-[10px] text-gray-800 leading-relaxed">
                            {t('onboarding.connect.desc1')}<br />
                            {t('onboarding.connect.desc2')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <span>{t('onboarding.justNow')}</span>
                        <span className="px-1 py-0.5 bg-orange-50 text-orange-600 border border-orange-200">
                            {t('onboarding.feature')}
                        </span>
                    </div>
                </div>

                {/* 메모리 카드 3: 태그 & 분류 */}
                {visibleCards.has('card3') && (
                    <div
                        className="absolute bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-3.5 w-[160px] cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto group"
                        style={{ left: `${positions.card3.x}px`, top: `${positions.card3.y}px`, zIndex: dragging === 'card3' ? 20 : 10 }}
                        onPointerDown={(e) => handlePointerDown('card3', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('card3', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-gray-800 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        >
                            ×
                        </button>

                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                    <div className="mb-2">
                        <h3 className="text-[12px] font-semibold text-gray-900 mb-1">{t('onboarding.tag')}</h3>
                        <p className="text-[10px] text-gray-800 leading-relaxed">
                            {t('onboarding.tag.desc1')}<br />
                            {t('onboarding.tag.desc2')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <span>{t('onboarding.justNow')}</span>
                    </div>
                </div>

                {/* 액션 플랜 카드 */}
                {visibleCards.has('action') && (
                    <div
                        className="absolute w-[150px] bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-2.5 cursor-move hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto group"
                        style={{ left: `${positions.action.x}px`, top: `${positions.action.y}px`, zIndex: dragging === 'action' ? 20 : 10 }}
                        onPointerDown={(e) => handlePointerDown('action', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('action', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-gray-800 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        >
                            ×
                        </button>

                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                    <div className="mb-1.5">
                        <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-bold border border-indigo-200 uppercase">
                            Action Project
                        </span>
                        <h3 className="text-[12px] font-black text-gray-900 mt-1 flex items-center gap-1">
                            <PixelIcon name="target" size={12} className="text-indigo-600" ariaLabel="액션 프로젝트 타겟" />
                            <span>{t('onboarding.action')}</span>
                        </h3>
                    </div>

                    <div className="mb-2">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[8px] font-bold text-gray-600">{t('onboarding.progress')}</span>
                            <span className="text-[8px] font-black text-indigo-600 font-mono">33%</span>
                        </div>
                        <div className="h-2 bg-gray-100 border-2 border-gray-800 p-0.5">
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
                            <p className="text-[9px] font-medium text-gray-400 line-through">{t('onboarding.todo1')}</p>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <div className="mt-0.5 w-2.5 h-2.5 border-2 border-gray-800 bg-white flex-shrink-0" />
                            <p className="text-[9px] font-medium text-gray-800">{t('onboarding.todo2')}</p>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <div className="mt-0.5 w-2.5 h-2.5 border-2 border-gray-800 bg-white flex-shrink-0" />
                            <p className="text-[9px] font-medium text-gray-800">{t('onboarding.todo3')}</p>
                        </div>
                    </div>
                </div>

                {/* 캘린더 위젯 */}
                {visibleCards.has('calendar') && (
                    <div
                        className="absolute bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] border-[3px] border-black p-3 cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] transition-shadow pointer-events-auto group"
                        style={{ left: `${positions.calendar.x}px`, top: `${positions.calendar.y}px`, width: '180px', zIndex: dragging === 'calendar' ? 20 : 10 }}
                        onPointerDown={(e) => handlePointerDown('calendar', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('calendar', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-md"
                        >
                            ×
                        </button>

                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200">
                        <div className="flex items-center gap-1.5">
                            <PixelIcon name="calendar" size={16} ariaLabel={t('onboarding.calendar')} />
                            <h3 className="text-[12px] font-semibold text-gray-800">{t('onboarding.calendar')}</h3>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                        <button className="p-0.5 hover:bg-gray-100 rounded">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-[11px] font-semibold text-gray-800">
                            {language === 'ko' ? '2026년 1월' : 'Jan 2026'}
                        </span>
                        <button className="p-0.5 hover:bg-gray-100 rounded">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {(language === 'ko' 
                            ? ['일', '월', '화', '수', '목', '금', '토'] 
                            : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                        ).map((day, i) => (
                            <div key={i} className="text-center text-[9px] font-medium text-gray-500 py-0.5">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 2;
                            const isToday = day === 28;
                            const isCurrentMonth = day >= 1 && day <= 31;
                            return (
                                <div
                                    key={i}
                                    className={`text-center text-[9px] py-1 rounded transition-colors ${isToday ? 'bg-blue-100 font-bold' : isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'
                                        }`}
                                >
                                    {day >= 1 && day <= 31 ? day : ''}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 뷰어 위젯 */}
                {visibleCards.has('viewer') && (
                    <div
                        className="absolute flex flex-col bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden cursor-move hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transition-shadow pointer-events-auto group"
                        style={{
                            left: `${positions.viewer.x}px`,
                            top: `${positions.viewer.y}px`,
                            width: '240px',
                            height: '200px',
                            zIndex: dragging === 'viewer' ? 20 : 10
                        }}
                        onPointerDown={(e) => handlePointerDown('viewer', e)}
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={(e) => handleDelete('viewer', e)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute -top-1 right-1 w-6 h-7 flex items-center justify-center text-gray-500 hover:text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        >
                            ×
                        </button>

                        <div className="h-7 bg-[#EEEEEE] border-b-[3px] border-black flex items-center justify-between px-2 select-none shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 border border-black bg-[#FF5F56]" />
                                <div className="w-2.5 h-2.5 border border-black bg-[#FFBD2E]" />
                                <div className="w-2.5 h-2.5 border border-black bg-[#27C93F]" />
                            </div>
                            <span className="ml-1 text-[10px] font-bold text-black uppercase tracking-tight">{t('onboarding.preview')}</span>
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
