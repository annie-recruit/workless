'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PixelIcon from '@/components/PixelIcon';
import PixelGradientBanner from '@/components/PixelGradientBanner';
import PixelLanguageToggle from '@/components/PixelLanguageToggle';
import PixelAdSense from '@/components/PixelAdSense';
import PixelKakaoAdFit from '@/components/PixelKakaoAdFit';
import { useLanguage } from '@/components/LanguageContext';

export default function FeaturesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t, language } = useLanguage();
  
  const calendarDays = language === 'ko' 
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const features = [
    {
      id: 1,
      title: t('features.memory.title'),
      subtitle: t('features.memory.subtitle'),
      description: t('features.memory.desc'),
      icon: 'note',
      details: [
        t('features.memory.detail1'),
        t('features.memory.detail2'),
        t('features.memory.detail3'),
        t('features.memory.detail4')
      ],
      gradient: 'from-blue-500 to-purple-500',
      color: 'blue'
    },
    {
      id: 2,
      title: t('features.canvas.title'),
      subtitle: t('features.canvas.subtitle'),
      description: t('features.canvas.desc'),
      icon: 'layout',
      details: [
        t('features.canvas.detail1'),
        t('features.canvas.detail2'),
        t('features.canvas.detail3'),
        t('features.canvas.detail4')
      ],
      gradient: 'from-purple-500 to-pink-500',
      color: 'purple'
    },
    {
      id: 3,
      title: t('features.grouping.title'),
      subtitle: t('features.grouping.subtitle'),
      description: t('features.grouping.desc'),
      icon: 'grid',
      details: [
        t('features.grouping.detail1'),
        t('features.grouping.detail3'),
        t('features.grouping.detail4')
      ],
      gradient: 'from-pink-500 to-orange-500',
      color: 'pink'
    },
    {
      id: 5,
      title: t('features.insights.title'),
      subtitle: t('features.insights.subtitle'),
      description: t('features.insights.desc'),
      icon: 'zap',
      details: [
        t('features.insights.detail1'),
        t('features.insights.detail2'),
        t('features.insights.detail3'),
        t('features.insights.detail4')
      ],
      gradient: 'from-yellow-500 to-green-500',
      color: 'yellow'
    },
    {
      id: 6,
      title: t('features.localfirst.title'),
      subtitle: t('features.localfirst.subtitle'),
      description: t('features.localfirst.desc'),
      icon: 'shield',
      details: [
        t('features.localfirst.detail1'),
        t('features.localfirst.detail2'),
        t('features.localfirst.detail3'),
        t('features.localfirst.detail4')
      ],
      gradient: 'from-green-500 to-teal-500',
      color: 'green'
    },
    {
      id: 7,
      title: t('features.voice.title'),
      subtitle: t('features.voice.subtitle'),
      description: t('features.voice.desc'),
      icon: 'microphone',
      details: [
        t('features.voice.detail1'),
        t('features.voice.detail2'),
        t('features.voice.detail3'),
        t('features.voice.detail4')
      ],
      gradient: 'from-teal-500 to-cyan-500',
      color: 'teal'
    },
    {
      id: 8,
      title: t('features.widgets.title'),
      subtitle: t('features.widgets.subtitle'),
      description: t('features.widgets.desc'),
      icon: 'grid',
      details: [
        t('features.widgets.detail1'),
        t('features.widgets.detail2'),
        t('features.widgets.detail3'),
        t('features.widgets.detail4')
      ],
      gradient: 'from-cyan-500 to-blue-500',
      color: 'cyan'
    }
  ];

  const nextSlide = () => {
    if (currentSlide < features.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const feature = features[currentSlide];

  // 디버깅
  console.log('Current slide:', currentSlide, 'Feature:', feature.title);

  return (
    <main className="min-h-screen bg-white font-galmuri11">
      {/* 언어 토글 (고정 위치) */}
      <div className="fixed top-4 right-4 z-[100] scale-90 md:scale-100">
        <PixelLanguageToggle />
      </div>

      {/* 헤더 */}
      <header className="bg-indigo-600 border-b-2 border-indigo-500">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <PixelIcon name="arrowLeft" size={20} className="text-white" />
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">
                Workless
              </h1>
            </Link>
            <div />

          </div>
        </div>
      </header>

      {/* 메인 영역 - 왼쪽 이미지, 오른쪽 설명 */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            {/* 왼쪽 - 이미지/아이콘 영역 */}
            <div className="rounded-2xl p-8 flex items-center justify-center relative overflow-hidden min-h-[500px] bg-white">
              {/* 무한 캔버스 기능 (2번째 슬라이드) */}
              {currentSlide === 1 ? (
                <div className="relative w-full h-[450px] bg-gradient-to-br from-orange-50 to-indigo-50 border-2 border-gray-300 overflow-hidden">
                  {/* 사이드바 */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-indigo-600 border-r-2 border-gray-800 z-20 flex flex-col items-center py-3 gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-sm" />
                    <div className="w-6 h-6 bg-white/10 rounded-sm" />
                    <div className="w-6 h-6 bg-white/10 rounded-sm" />
                    <div className="mt-auto w-6 h-6 bg-white/10 rounded-sm" />
                  </div>

                  {/* 상단 메뉴바 */}
                  <div className="absolute top-0 left-12 right-0 h-10 bg-white border-b-2 border-gray-300 z-20 flex items-center px-3 gap-2">
                    <div className="w-16 h-5 bg-gray-200 rounded" />
                    <div className="w-6 h-6 bg-gray-200 rounded-sm" />
                    <div className="w-6 h-6 bg-gray-200 rounded-sm" />
                    <div className="ml-auto w-6 h-6 bg-indigo-200 rounded-sm" />
                  </div>

                  {/* 미니 캔버스 보드 영역 */}
                  <div className="absolute left-12 top-10 right-0 bottom-0 overflow-hidden">
                    {/* 메모리 카드 1 - 왼쪽 상단 */}
                    <div className="absolute top-8 left-8 w-32 h-40 p-2 border-2 border-gray-800 bg-orange-50 shadow-md z-10">
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="text-[8px] font-semibold text-gray-900 mb-1">{t('features.visual.canvas.card1.title')}</div>
                      <div className="text-[7px] text-black leading-tight">
                        {t('features.visual.canvas.card1.desc')}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-[6px] text-gray-500">{t('features.visual.time.justnow')}</div>
                    </div>

                    {/* 메모리 카드 2 - 중앙 */}
                    <div className="absolute top-20 left-44 w-32 h-40 p-2 border-2 border-gray-800 bg-indigo-50 shadow-md z-10">
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="text-[8px] font-semibold text-gray-900 mb-1">{t('features.visual.canvas.card2.title')}</div>
                      <div className="text-[7px] text-black leading-tight">
                        {t('features.visual.canvas.card2.desc')}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-[6px] text-gray-500">{t('features.visual.time.min5')}</div>
                    </div>

                    {/* 메모리 카드 3 - 오른쪽 하단 */}
                    <div className="absolute top-56 left-52 w-32 h-40 p-2 border-2 border-gray-800 bg-orange-50 shadow-md z-10">
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="text-[8px] font-semibold text-gray-900 mb-1">{t('features.visual.canvas.card3.title')}</div>
                      <div className="text-[7px] text-black leading-tight">
                        {t('features.visual.canvas.card3.desc')}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-[6px] text-gray-500">{t('features.visual.time.min10')}</div>
                    </div>

                    {/* 캘린더 위젯 - 오른쪽 상단 */}
                    <div className="absolute top-8 right-8 w-40 h-32 border-2 border-gray-800 bg-white shadow-md z-10">
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-gray-800" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gray-800" />
                      <div className="p-2">
                        <div className="text-[8px] font-bold text-center mb-1 text-gray-700">{t('features.visual.canvas.calendar')}</div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {calendarDays.map((day) => (
                            <div key={day} className="text-[6px] text-center text-gray-500">{day}</div>
                          ))}
                          {Array.from({ length: 28 }, (_, i) => (
                            <div key={i} className={`text-[6px] text-center py-0.5 ${i === 15 ? 'bg-indigo-500 text-white rounded-sm' : 'text-gray-700'}`}>
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 연결선 (실제 화이트보드 스타일 - quadratic bezier + 화살촉) */}
                    <svg className="absolute inset-0 pointer-events-none z-5" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <marker id="feat-arrow" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
                          <polygon points="0 0, 6 3, 0 6" fill="#6366F1" />
                        </marker>
                      </defs>
                      {/* 카드 1(96,112) → 카드 3(272,304), 제어점(136,252) — 실제 보드 곡률 공식 */}
                      <path
                        d="M 96 112 Q 136 252 272 304"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2"
                        strokeDasharray="5,3"
                        markerEnd="url(#feat-arrow)"
                        opacity="0.85"
                      />
                    </svg>

                    {/* 미니맵 표시 */}
                    <div className="absolute bottom-4 left-4 w-20 h-16 bg-white/90 border border-gray-400 shadow-lg z-20">
                      <div className="relative w-full h-full p-1">
                        <div className="absolute top-2 left-2 w-3 h-4 bg-orange-300 opacity-50" />
                        <div className="absolute top-4 left-6 w-3 h-4 bg-indigo-300 opacity-50" />
                        <div className="absolute top-9 left-8 w-3 h-4 bg-orange-300 opacity-50" />
                        <div className="absolute top-2 right-2 w-4 h-3 bg-gray-300 opacity-50" />
                        <div className="absolute inset-1 border border-blue-500 opacity-40" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 2 ? (
                /* 스마트 그룹화 기능 - AI 자동 묶기 UI */
                <div className="relative w-full h-[500px] bg-gradient-to-br from-orange-50 to-indigo-50 border-2 border-gray-300 overflow-visible">
                  {/* 메모리 카드 (그룹 묶기 버튼 하이라이트) */}
                  <div className="absolute top-12 left-8 w-56 h-72 p-4 border-2 border-gray-800 bg-white shadow-md z-10">
                    {/* 코너 포인트 */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                    
                    {/* 우측 상단 버튼들 (그룹 묶기 버튼 하이라이트) */}
                    <div className="absolute top-2 right-3 flex items-center gap-0.5">
                      {/* 하이라이트 효과가 있는 그룹 묶기 버튼 */}
                      <div className="relative">
                        {/* 그라데이션 펄스 효과 - 중앙에서 바깥으로 연해짐 */}
                        <div className="absolute -inset-3 bg-gradient-radial from-yellow-400/60 via-yellow-300/30 to-transparent animate-pulse rounded-full" 
                             style={{ background: 'radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, rgba(253, 224, 71, 0.3) 50%, transparent 100%)' }} 
                        />
                        <button className="relative w-8 h-8 inline-flex items-center justify-center bg-white border-2 border-orange-200 shadow-lg"
                          style={{
                            clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="4" height="4" fill="#6B7280"/>
                            <rect x="8" y="2" width="4" height="4" fill="#6B7280"/>
                            <rect x="2" y="8" width="4" height="4" fill="#6B7280"/>
                            <rect x="8" y="8" width="4" height="4" fill="#6B7280"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* 카드 내용 */}
                    <div className="text-[9px] font-semibold text-gray-900 mb-2">{t('features.visual.grouping.card.title')}</div>
                    <div className="text-[8px] text-black leading-tight mb-3">
                      {t('features.visual.grouping.card.desc')}
                    </div>
                    
                    <div className="absolute bottom-3 left-4 right-4 text-[7px] text-gray-500">{t('features.visual.time.justnow')}</div>
                  </div>

                  {/* GroupAutoModal 토스트 */}
                  <div className="absolute bottom-24 right-8 w-[280px] bg-white border-4 border-gray-900 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] z-20">
                    {/* 코너 장식 */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                    
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-tight mb-1">
                          {t('features.visual.grouping.modal.title')}
                        </h3>
                        <p className="text-[8px] text-gray-600">{t('features.visual.grouping.modal.subtitle')}</p>
                      </div>
                      <div className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center text-[10px]">×</div>
                    </div>

                    {/* 묶일 기록 목록 */}
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      <div className="bg-indigo-50 border border-indigo-200 p-2">
                        <p className="text-[8px] text-gray-800 font-bold truncate">{t('features.visual.grouping.modal.card1')}</p>
                        <p className="text-[7px] text-gray-600 line-clamp-1">{t('features.visual.grouping.modal.card1desc')}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 p-2">
                        <p className="text-[8px] text-gray-800 font-bold truncate">{t('features.visual.grouping.modal.card2')}</p>
                        <p className="text-[7px] text-gray-600 line-clamp-1">{t('features.visual.grouping.modal.card2desc')}</p>
                      </div>
                    </div>

                    {/* 그룹 이름 입력 */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={t('features.visual.grouping.modal.groupname')}
                        readOnly
                        className="w-full px-2 py-1.5 text-[8px] border-2 border-gray-300 bg-gray-50"
                        placeholder={t('features.visual.grouping.modal.groupname')}
                      />
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 text-[8px] font-bold border-2 border-gray-300 hover:bg-gray-50">
                        {t('features.visual.grouping.modal.cancel')}
                      </button>
                      <button className="flex-1 py-1.5 text-[8px] font-bold bg-indigo-600 text-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                        {t('features.visual.grouping.modal.submit')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 3 ? (
                /* AI 인사이트 패널 - 정적 콘텐츠 */
                <div className="relative w-full h-[500px] flex items-center justify-start pl-4">
                  <div className="w-[320px] h-[500px] overflow-hidden border-2 border-gray-300 rounded-lg shadow-lg bg-white font-galmuri11">
                    {/* 상단 그라데이션 배너 */}
                    <div className="relative isolate overflow-hidden px-5 py-6 text-white">
                      <PixelGradientBanner />
                      <div className="mb-2">
                        <div className="text-[10px] opacity-90 mb-1">
                          {t('features.visual.insights.date')}
                        </div>
                        <h2 className="text-lg font-bold">{t('features.visual.insights.title')}</h2>
                      </div>
                      <p className="text-xs opacity-90 whitespace-pre-wrap">
                        {t('features.visual.insights.desc')}
                      </p>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(500px - 140px)' }}>
                      {/* 페르소나 선택 및 새로고침 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-5 h-5 bg-gray-800 rounded-full" />
                          <span className="text-gray-700">{t('features.visual.insights.mode')}</span>
                        </div>
                        <button className="text-[10px] text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('features.visual.insights.refresh')}
                        </button>
                      </div>

                      {/* 전체 요약 */}
                      <div className="bg-gradient-to-br from-orange-50 to-indigo-50 p-2.5 border border-indigo-300">
                        <h3 className="text-[10px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                          <span className="text-xs">📄</span>
                          {t('features.visual.insights.summary.title')}
                        </h3>
                        <p className="text-[10px] text-gray-700 leading-relaxed">
                          {t('features.visual.insights.summary.content')}
                        </p>
                      </div>

                      {/* 제안 */}
                      <div className="bg-gray-50 p-2.5 border border-gray-200">
                        <h3 className="text-[10px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                          <span className="text-xs">💡</span>
                          {t('features.visual.insights.suggestions.title')}
                        </h3>
                        <ul className="space-y-1.5">
                          <li className="text-[10px] text-gray-700 flex items-start gap-1.5">
                            <span className="mt-0.5">✓</span>
                            <span>{t('features.visual.insights.suggestions.1')}</span>
                          </li>
                          <li className="text-[10px] text-gray-700 flex items-start gap-1.5">
                            <span className="mt-0.5">✓</span>
                            <span>{t('features.visual.insights.suggestions.2')}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 4 ? (
                /* 로컬 우선 기능 - 로컬 저장소 & 동기화 UI */
                <div className="relative w-full h-[500px] flex items-center justify-center">
                  <div className="relative w-[380px] h-[280px]">
                    {/* 로컬 저장소 카드 (왼쪽) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-36 h-48 bg-green-50 border-2 border-gray-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] z-10">
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                      
                      <div className="flex flex-col items-center gap-3 h-full justify-center">
                        <div className="w-14 h-14 bg-green-100 flex items-center justify-center">
                          <PixelIcon name="database" size={28} className="text-green-600" />
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-gray-900 mb-0.5">{t('features.visual.localfirst.local')}</div>
                          <div className="text-[7px] text-gray-600">{t('features.visual.localfirst.indexeddb')}</div>
                        </div>
                        <div className="w-full">
                          <div className="h-1.5 bg-green-500 mb-1" />
                          <div className="text-[7px] text-green-700 font-bold text-center">{t('features.visual.localfirst.offline')}</div>
                        </div>
                      </div>
                    </div>

                    {/* 동기화 아이콘 (중앙) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          {/* 왼쪽 화살표 */}
                          <div className="absolute left-0.5">
                            <PixelIcon name="arrow-left" size={16} className="text-indigo-500" />
                          </div>
                          {/* 오른쪽 화살표 */}
                          <div className="absolute right-0.5">
                            <PixelIcon name="arrow-right" size={16} className="text-indigo-500" />
                          </div>
                        </div>
                        <div className="px-2 py-1">
                          <div className="text-[7px] text-indigo-600 font-bold whitespace-nowrap">{t('features.visual.localfirst.sync')}</div>
                        </div>
                      </div>
                    </div>

                    {/* 클라우드 카드 (오른쪽) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-36 h-48 bg-indigo-50 border-2 border-gray-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] z-10">
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                      
                      <div className="flex flex-col items-center gap-3 h-full justify-center">
                        <div className="w-14 h-14 bg-indigo-100 flex items-center justify-center">
                          <PixelIcon name="cloud" size={28} className="text-indigo-600" />
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-gray-900 mb-0.5">{t('features.visual.localfirst.cloud')}</div>
                          <div className="text-[7px] text-gray-600">{t('features.visual.localfirst.backup')}</div>
                        </div>
                        <div className="w-full">
                          <div className="h-1.5 bg-indigo-500 mb-1" />
                          <div className="text-[7px] text-indigo-700 font-bold text-center">{t('features.visual.localfirst.safe')}</div>
                        </div>
                      </div>
                    </div>

                    {/* 하단 오프라인 설명 */}
                    <div className="absolute -bottom-20 left-0 right-0">
                      <div className="bg-green-50 border-2 border-green-500 p-3 flex items-start gap-2">
                        <PixelIcon name="wifi" size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-[8px] font-bold text-green-700 mb-1">{t('features.visual.localfirst.infotext')}</div>
                          <p className="text-[7px] text-gray-700 leading-relaxed">
                            {t('features.visual.localfirst.infodesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 5 ? (
                /* 음성 녹음 - 미팅 레코더 위젯 */
                <div className="relative w-full h-[500px] flex items-center justify-center">
                  <div className="w-[400px] h-[280px] bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border-[3px] border-black overflow-hidden font-galmuri11">
                    {/* 헤더 */}
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                        {t('features.visual.voice.title')}
                      </h3>
                      <button className="text-white hover:text-gray-200 text-lg">×</button>
                    </div>

                    {/* 녹음 시간 & 상태 */}
                    <div className="bg-red-50 border-b-2 border-red-200 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-red-600">{t('features.visual.voice.recording')}</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-gray-700">02:34</span>
                    </div>

                    {/* 스크립트 영역 */}
                    <div className="p-4 h-[160px] overflow-y-auto bg-gray-50">
                      <div className="space-y-3">
                        <div className="text-xs">
                          <span className="font-bold text-gray-900">{t('features.visual.voice.speaker1')}:</span>
                          <span className="text-gray-700 ml-1">{t('features.visual.voice.line1')}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-gray-900">{t('features.visual.voice.speaker2')}:</span>
                          <span className="text-gray-700 ml-1">{t('features.visual.voice.line2')}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-gray-900">{t('features.visual.voice.speaker3')}:</span>
                          <span className="text-gray-700 ml-1">{t('features.visual.voice.line3')}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-gray-900">{t('features.visual.voice.speaker1')}:</span>
                          <span className="text-gray-700 ml-1">{t('features.visual.voice.line4')}</span>
                          <span className="inline-block w-1 h-3 bg-teal-500 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* 하단 버튼 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 px-4 py-2 flex items-center justify-center gap-3">
                      <button className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" />
                        </svg>
                      </button>
                      <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold border border-gray-400 rounded">
                        {t('features.visual.voice.pause')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 6 ? (
                /* 여러가지 위젯들 - 위젯 갤러리 */
                <div className="relative w-full h-[500px] flex items-center justify-start pl-8">
                  <div className="space-y-4 w-full max-w-lg">
                    {/* 액션플랜 위젯 */}
                    <div className="relative bg-indigo-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-4 h-64">
                      {/* 픽셀 코너 장식 */}
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                      
                      {/* 헤더 */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-bold border border-indigo-200 uppercase tracking-tighter">
                            {t('features.visual.widgets.action.label')}
                          </span>
                          <span className="text-[8px] text-gray-500 font-mono">{t('features.visual.widgets.action.duration')}</span>
                        </div>
                        <h3 className="text-sm font-black text-gray-900 leading-tight">
                          {t('features.visual.widgets.action.title')}
                        </h3>
                      </div>

                      {/* 진행바 */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-gray-600">PROGRESS</span>
                          <span className="text-[9px] font-black text-indigo-600 font-mono">33%</span>
                        </div>
                        <div className="h-3 bg-gray-100 border-2 border-gray-800 p-0.5 relative">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                            style={{ width: '33%' }}
                          />
                          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
                        </div>
                      </div>

                      {/* 요약 */}
                      <div className="mb-3 p-2 bg-gray-50 border border-gray-200">
                        <p className="text-[9px] text-gray-700 leading-relaxed italic">
                          {t('features.visual.widgets.action.summary')}
                        </p>
                      </div>

                      {/* 첫 번째 마일스톤 미리보기 */}
                      <div>
                        <h4 className="flex items-center gap-1.5 text-[9px] font-black text-gray-900 border-b-2 border-gray-800 pb-1 mb-1.5">
                          <span className="w-1 h-1 bg-gray-800" />
                          {t('features.visual.widgets.action.step')}
                        </h4>
                        <div className="flex items-start gap-1.5">
                          <div className="mt-0.5 w-3.5 h-3.5 border-2 border-gray-800 flex-shrink-0 flex items-center justify-center bg-indigo-500">
                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-[10px] font-medium text-gray-400 line-through leading-tight">
                            {t('features.visual.widgets.action.task')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 데이터베이스 위젯 */}
                    <div className="bg-white border-[3px] border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] flex flex-col h-44">
                      {/* 헤더 */}
                      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[10px] font-semibold text-gray-700">{t('features.visual.widgets.table.title')}</h3>
                          <span className="text-[9px] text-gray-400">{t('features.visual.widgets.table.rows')}</span>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 text-xs">×</button>
                      </div>
                      {/* 테이블 */}
                      <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse text-[9px]">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="border-b border-r border-gray-200 px-2 py-1 text-[9px] font-semibold text-gray-700 text-left">
                                {t('features.visual.widgets.table.name')}
                              </th>
                              <th className="border-b border-r border-gray-200 px-2 py-1 text-[9px] font-semibold text-gray-700 text-left">
                                {t('features.visual.widgets.table.role')}
                              </th>
                              <th className="border-b border-r border-gray-200 px-2 py-1 text-[9px] font-semibold text-gray-700 text-left">
                                {t('features.visual.widgets.table.status')}
                              </th>
                              <th className="border-b border-gray-200 px-2 py-1 text-[9px] font-semibold text-gray-700 text-left">
                                {t('features.visual.widgets.table.progress')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50">
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.voice.speaker1')}</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.role1')}</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.status1')}</td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-gray-700">75%</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.voice.speaker2')}</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.role2')}</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.status2')}</td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-gray-700">100%</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.voice.speaker3')}</td>
                              <td className="border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.role3')}</td>
                              <td className="border-r border-gray-200 px-2 py-1.5 text-gray-700">{t('features.visual.widgets.table.status3')}</td>
                              <td className="px-2 py-1.5 text-gray-700">20%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 다른 슬라이드는 기존 메모리 카드 대각선 배치 */
                <div className="relative w-full max-w-sm h-[400px]">
                  {/* 카드 1 - 왼쪽 위 */}
                  <div className="absolute top-0 left-0 w-48 h-64 p-4 border-2 border-gray-800 bg-orange-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all z-10">
                    {/* 코너 포인트 */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                    
                    <div className="flex flex-col h-full">
                      <div className="flex-1 mb-3">
                        <h3 className="text-xs font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        
                        {/* AI 기능 버튼 (기억 관리 슬라이드일 때만) */}
                        {currentSlide === 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                              {t('features.visual.card.summary')}
                            </button>
                            <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                              {t('features.visual.card.suggestion')}
                            </button>
                          </div>
                        )}
                        
                        {/* 첫 번째 텍스트 - 태깅 하이라이트 포함 */}
                        {currentSlide === 0 ? (
                          <p className="text-xs text-black leading-relaxed">
                            <span className="inline-flex items-center px-1 py-0.5 bg-blue-100 text-blue-700 font-medium">{t('features.visual.card.tag.memo')}</span>{t('features.visual.card.tag.memo.desc')}
                          </p>
                        ) : (
                          <p className="text-xs text-black leading-relaxed">
                            {feature.details[0]}
                          </p>
                        )}
                        
                        <p className="text-xs text-black leading-relaxed mt-2">
                          {feature.details[1]}
                        </p>
                        
                        {/* 태깅 표시 (기억 관리 슬라이드일 때만) */}
                        {currentSlide === 0 && (
                          <div className="mt-2 flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-medium bg-blue-100 text-blue-700">
                              {t('features.visual.card.tag1')}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-medium bg-purple-100 text-purple-700">
                              {t('features.visual.card.tag2')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>{t('features.visual.time.justnow')}</span>
                        <PixelIcon name={feature.icon} size={12} />
                      </div>
                    </div>
                  </div>

                  {/* 카드 2 - 오른쪽 아래 (살짝 겹침) */}
                  <div className="absolute bottom-0 right-0 w-48 h-64 p-4 border-2 border-gray-800 bg-indigo-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-all z-20">
                    {/* 코너 포인트 */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                    
                    <div className="flex flex-col h-full">
                      <div className="flex-1 mb-3">
                        <p className="text-xs text-black leading-relaxed">
                          {feature.details[2] || feature.details[0]}
                        </p>
                        <p className="text-xs text-black leading-relaxed mt-2">
                          {feature.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>{t('features.visual.time.min5')}</span>
                        <PixelIcon name={feature.icon} size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 - 설명 영역 */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 tracking-tight">
                  {feature.title}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="space-y-3">
                {feature.details.map((detail, index) => (
                  <div
                    key={index}
                    className="relative flex items-start gap-3 bg-white p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] transition-all select-none"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {/* 픽셀 코너 장식 */}
                    <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-gray-800" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-800" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-gray-800" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-800" />
                    
                    <div className="w-2 h-2 bg-black flex-shrink-0 mt-1.5" />
                    <p className="text-xs text-gray-700 pt-0">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between mt-12">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`relative flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${
                currentSlide === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]'
              }`}
            >
              <PixelIcon name="chevronLeft" size={18} />
              {t('features.nav.prev')}
            </button>

            <div className="flex items-center gap-2">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all ${
                    index === currentSlide
                      ? 'w-10 h-2.5 bg-indigo-600'
                      : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`${t('features.nav.prev')} ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === features.length - 1}
              className={`relative flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${
                currentSlide === features.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]'
              }`}
            >
              {t('features.nav.next')}
              <PixelIcon name="chevronRight" size={18} />
            </button>
          </div>

          {/* 키보드 힌트 */}
          <div className="text-center mt-6">
            <p className="text-gray-400 text-xs">
              {t('features.nav.keyboard')}
            </p>
          </div>

          {/* 광고 영역 */}
          <div className="max-w-4xl mx-auto space-y-8 mt-12">
            <PixelAdSense className="" adSlot="2717431439" />
            <PixelKakaoAdFit />
          </div>
        </div>
      </div>
    </main>
  );
}
