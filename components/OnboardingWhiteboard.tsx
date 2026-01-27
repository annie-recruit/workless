'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';

type CardPosition = {
    id: string;
    x: number;
    y: number;
};

export default function OnboardingWhiteboard() {
    // 샘플 메모리 카드 초기 데이터
    const initialCards = [
        {
            id: 'sample-1',
            title: '프로젝트 아이디어',
            content: 'AI 기반 개인 비서 앱 개발 시작!',
            x: 20,
            y: 30,
            rotation: -3,
            color: 'bg-orange-100',
        },
        {
            id: 'sample-2',
            title: '오늘 할 일',
            content: '운동 30분, 책 읽기, 친구와 약속',
            x: 200,
            y: 60,
            rotation: 2,
            color: 'bg-indigo-100',
        },
        {
            id: 'sample-3',
            title: '메모',
            content: '좋은 아이디어는 기록하면 현실이 된다 ✨',
            x: 380,
            y: 20,
            rotation: -2,
            color: 'bg-orange-100',
        },
    ];

    const initialCalendar = {
        id: 'sample-calendar',
        x: 100,
        y: 250,
        rotation: 1,
    };

    const [cardPositions, setCardPositions] = useState<CardPosition[]>(
        initialCards.map(c => ({ id: c.id, x: c.x, y: c.y }))
    );
    const [calendarPosition, setCalendarPosition] = useState({ x: initialCalendar.x, y: initialCalendar.y });
    const [projectPosition, setProjectPosition] = useState({ x: 350, y: 230 });
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDate = new Date();
    const currentMonth = format(currentDate, 'yyyy년 M월');
    const currentDay = format(currentDate, 'd');

    const handlePointerDown = (id: string, e: React.PointerEvent) => {
        if (!containerRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();
        const isCalendar = id === 'sample-calendar';
        const isProject = id === 'sample-project';
        const currentPos = isCalendar
            ? calendarPosition
            : isProject
                ? projectPosition
                : cardPositions.find(c => c.id === id);

        if (!currentPos) return;

        setDraggingId(id);
        setDragOffset({
            x: e.clientX - rect.left - currentPos.x,
            y: e.clientY - rect.top - currentPos.y,
        });

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId || !containerRef.current) return;
        e.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;

        if (draggingId === 'sample-calendar') {
            setCalendarPosition({ x: newX, y: newY });
        } else if (draggingId === 'sample-project') {
            setProjectPosition({ x: newX, y: newY });
        } else {
            setCardPositions(prev =>
                prev.map(card =>
                    card.id === draggingId ? { ...card, x: newX, y: newY } : card
                )
            );
        }
    };

    const handlePointerUp = () => {
        setDraggingId(null);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-gradient-to-br from-orange-50 via-white to-indigo-50 border-[3px] border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* 배경 그리드 */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                />
            </div>

            {/* 워터마크 */}
            <div className="absolute bottom-4 right-4 text-xs font-galmuri11 text-gray-400 pointer-events-none select-none">
                드래그하여 이동해보세요!
            </div>

            {/* 메모리 카드들 */}
            {initialCards.map((card) => {
                const position = cardPositions.find(p => p.id === card.id);
                if (!position) return null;

                return (
                    <div
                        key={card.id}
                        className={`absolute ${card.color} border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] p-3 w-[140px] cursor-move transition-transform hover:scale-105 ${draggingId === card.id ? 'opacity-80 z-50' : 'z-10'
                            }`}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) rotate(${card.rotation}deg)`,
                        }}
                        onPointerDown={(e) => handlePointerDown(card.id, e)}
                    >
                        {/* 코너 포인트 */}
                        <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-gray-800" />
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-800" />
                        <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-gray-800" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-800" />

                        {/* 제목 */}
                        <h3 className="text-[10px] font-semibold text-gray-900 mb-1 font-galmuri11 select-none">
                            {card.title}
                        </h3>

                        {/* 내용 */}
                        <p className="text-[9px] text-gray-800 leading-relaxed font-galmuri11 select-none">
                            {card.content}
                        </p>
                    </div>
                );
            })}

            {/* 캘린더 위젯 */}
            <div
                className={`absolute bg-white border-[3px] border-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] p-3 w-[200px] cursor-move ${draggingId === 'sample-calendar' ? 'opacity-80 z-50' : 'z-10'
                    }`}
                style={{
                    transform: `translate(${calendarPosition.x}px, ${calendarPosition.y}px) rotate(${initialCalendar.rotation}deg)`,
                }}
                onPointerDown={(e) => handlePointerDown('sample-calendar', e)}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                        <svg
                            className="w-3 h-3 text-gray-700 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <h3 className="text-[10px] font-semibold text-gray-800 font-galmuri11 select-none">
                            캘린더
                        </h3>
                    </div>
                </div>

                {/* 현재 월 */}
                <div className="text-center mb-2">
                    <span className="text-[10px] font-semibold text-gray-800 font-galmuri11 select-none">
                        {currentMonth}
                    </span>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div
                            key={day}
                            className="text-center text-[8px] font-medium text-gray-500 font-galmuri11 select-none"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* 간단한 캘린더 그리드 (현재 날짜만 표시) */}
                <div className="grid grid-cols-7 gap-0.5">
                    {[...Array(7)].map((_, i) => (
                        <div
                            key={i}
                            className={`text-center text-[8px] p-0.5 font-galmuri11 select-none ${i === 3
                                ? 'bg-blue-100 text-blue-700 font-bold rounded'
                                : 'text-gray-300'
                                }`}
                        >
                            {i === 3 ? currentDay : ''}
                        </div>
                    ))}
                </div>

                {/* 샘플 일정 */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full" />
                        <span className="text-[8px] text-gray-600 font-galmuri11 select-none">
                            미팅 3개
                        </span>
                    </div>
                </div>
            </div>

            {/* 액션 프로젝트 카드 */}
            <div
                className={`absolute bg-white border-[3px] border-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] p-3 w-[180px] cursor-move ${draggingId === 'sample-project' ? 'opacity-80 z-50' : 'z-10'
                    }`}
                style={{
                    transform: `translate(${projectPosition.x}px, ${projectPosition.y}px) rotate(-1.5deg)`,
                }}
                onPointerDown={(e) => handlePointerDown('sample-project', e)}
            >
                {/* 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-gray-800" />

                {/* 헤더 */}
                <div className="mb-2">
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-bold border border-indigo-200 uppercase tracking-tighter select-none">
                        Action
                    </span>
                    <h3 className="text-[11px] font-black text-gray-900 leading-tight mt-1 select-none font-galmuri11">
                        운동 루틴 만들기
                    </h3>
                </div>

                {/* 진행바 */}
                <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-bold text-gray-600 select-none">PROGRESS</span>
                        <span className="text-[8px] font-black text-indigo-600 font-mono select-none">33%</span>
                    </div>
                    <div className="h-2 bg-gray-100 border border-gray-800 p-0.5 relative">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                            style={{ width: '33%' }}
                        />
                    </div>
                </div>

                {/* 샘플 액션들 */}
                <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border border-gray-800 flex-shrink-0 flex items-center justify-center bg-indigo-500">
                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-[9px] font-medium text-gray-400 line-through select-none font-galmuri11">
                            운동 계획 세우기
                        </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border border-gray-800 bg-white flex-shrink-0" />
                        <p className="text-[9px] font-medium text-gray-800 select-none font-galmuri11">
                            아침 스트레칭 하기
                        </p>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 w-2.5 h-2.5 border border-gray-800 bg-white flex-shrink-0" />
                        <p className="text-[9px] font-medium text-gray-800 select-none font-galmuri11">
                            저녁 조깅 30분
                        </p>
                    </div>
                </div>
            </div>

            {/* 연결선 (첫 번째 카드와 캘린더 연결) */}
            <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%', zIndex: 5 }}
            >
                <defs>
                    <pattern
                        id="onboarding-dash"
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                    >
                        <rect width="4" height="4" fill="#6366f1" />
                    </pattern>
                </defs>
                <line
                    x1={(cardPositions[0]?.x || 20) + 70}
                    y1={(cardPositions[0]?.y || 30) + 40}
                    x2={calendarPosition.x + 100}
                    y2={calendarPosition.y + 20}
                    stroke="url(#onboarding-dash)"
                    strokeWidth="2"
                    opacity="0.4"
                />
            </svg>
        </div>
    );
}
