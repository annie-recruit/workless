'use client';

import { useState } from 'react';
import PixelIcon from '@/components/PixelIcon';
import { useLanguage } from '@/components/LanguageContext';
import PixelLanguageToggle from '@/components/PixelLanguageToggle';

export default function FeaturesPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-galmuri11 -my-8 relative">
      {/* 언어 토글 위치: 우측 상단 여백 */}
      <div className="absolute top-8 right-8 z-[100]">
        <PixelLanguageToggle />
      </div>

      {/* 섹션 1: 메모리 카드 & 무한 캔버스 */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* 왼쪽: 실제 컴포넌트 데모 */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-gray-900 mb-8 whitespace-pre-line">
                {t('features.section1.title')}
              </h2>
              
              {/* 메모리 카드 예시 1 */}
              <div className="relative p-5 bg-orange-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow cursor-default">
                {/* 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('features.demo.card1.title')}</h3>
                <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                  {t('features.demo.card1.content')}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                    <PixelIcon name="zap" size={10} />
                    {t('query.result.summary')}
                  </button>
                  <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                    <PixelIcon name="zap" size={10} />
                    {t('query.result.suggestions')}
                  </button>
                  <button className="ml-auto w-5 h-5 bg-orange-300 border border-white"></button>
                  <button className="w-5 h-5 bg-indigo-400 border border-white"></button>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                    <PixelIcon name="link" size={10} />
                    {t('features.demo.related.title')}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] border border-indigo-200">
                      {t('features.section1.item2.title')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-2">
                  <span>{t('features.demo.time.2h')}</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-200">{t('features.demo.tag.campaign')}</span>
                </div>
              </div>

              {/* 메모리 카드 예시 2 */}
              <div className="relative p-5 bg-purple-50 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow cursor-default">
                {/* 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
                
                <p 
                  className="text-xs text-gray-700 mb-2 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: t('features.demo.card2.content') }}
                />
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>{t('features.demo.time.1h')}</span>
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200">{t('features.demo.tag.content')}</span>
                </div>
              </div>
            </div>

            {/* 오른쪽: 설명 */}
            <div className="space-y-8">
              <div>
                <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold mb-4">
                  {t('features.section1.badge')}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {t('features.section1.desc')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section1.item1.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section1.item1.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section1.item2.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section1.item2.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section1.item3.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section1.item3.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section1.item4.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section1.item4.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 2: AI 기반 분석 */}
      <section className="py-20 px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* 왼쪽: 실제 컴포넌트 데모 */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-gray-900 mb-8 whitespace-pre-line">
                {t('features.section2.title')}
              </h2>

              {/* AI 요약/제안 결과 - IT PM/PO 예시 -> 실제 MemoryCard 구조와 일치시킴 */}
              <div className="relative p-5 bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-shadow cursor-default">
                {/* 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1">Q2 제품 로드맵 수립</h3>
                  <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    사용자 피드백 분석 결과 검색 기능 개선이 가장 시급한 것으로 나타났습니다. 개발팀과 협업하여 3주 스프린트 계획을 수립하고 MVP 범위를 확정했습니다.
                  </p>
                </div>

                <div className="mb-1 flex items-center gap-1.5">
                  <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <PixelIcon name="zap" size={10} />
                    요약 끄기
                  </button>
                  <button className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <PixelIcon name="zap" size={10} />
                    제안 끄기
                  </button>
                  <div className="ml-auto flex gap-0.5">
                    <div className="w-4 h-4 bg-orange-300 border border-white"></div>
                    <div className="w-4 h-4 bg-indigo-400 border border-white"></div>
                  </div>
                </div>

                {/* AI 요약 - 실제 MemoryCard 스타일 */}
                <div className="mb-1.5 p-1.5 bg-gradient-to-r from-orange-50 to-indigo-50 border border-indigo-300">
                  <div className="flex items-start gap-1">
                    <PixelIcon name="zap" size={12} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-indigo-700 mb-0.5">{t('features.demo.summary.title')}</div>
                      <p className="text-[10px] text-gray-700 leading-relaxed">{t('features.demo.summary.content')}</p>
                    </div>
                  </div>
                </div>

                {/* AI 제안 - 실제 MemoryCard 스타일 */}
                <div className="mb-1.5 p-2 bg-gradient-to-br from-orange-50 to-indigo-50 border border-indigo-300 space-y-2">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <PixelIcon name="next" size={12} className="text-indigo-600" />
                      <h4 className="text-[10px] font-bold text-indigo-700">{t('features.demo.next.title')}</h4>
                    </div>
                    <ul className="space-y-0.5 ml-2">
                      <li className="flex items-start gap-1 text-[10px] text-gray-700">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{t('features.demo.next.item1')}</span>
                      </li>
                      <li className="flex items-start gap-1 text-[10px] text-gray-700">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{t('features.demo.next.item2')}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-2">
                  <span>{t('features.demo.time.2h')}</span>
                  <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200">{t('features.demo.tag.planning')}</span>
                </div>
              </div>
            </div>

            {/* 오른쪽: 설명 */}
            <div className="space-y-8">
              <div>
                <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold mb-4">
                  {t('features.section2.badge')}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  {t('features.section2.desc')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item1.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item1.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item2.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item2.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item3.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item3.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 3: 스마트 연결 & 위젯 */}
      <section className="py-20 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* 왼쪽: 위젯 데모 */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-gray-900 mb-8 whitespace-pre-line">
                {t('features.section_extra.title')}
              </h2>

              {/* 위젯 리스트 - 레이아웃 변경 */}
              <div className="space-y-4">
                {/* 캘린더 위젯 - 실제 디자인 반영, 글씨색 검정으로 변경 */}
                <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] p-3 w-1/2">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-black">
                      <PixelIcon name="calendar" size={14} />
                      <span className="text-xs font-bold">{t('features.demo.calendar.title')}</span>
                    </div>
                    <button className="text-[10px] text-black">W</button>
                  </div>
                  
                  {/* 월 네비게이션 */}
                  <div className="flex items-center justify-between mb-2 text-black">
                    <button className="text-xs"><PixelIcon name="chevron-left" size={10} /></button>
                    <span className="text-xs font-bold">2026.02</span>
                    <button className="text-xs"><PixelIcon name="chevron-right" size={10} /></button>
                  </div>

                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 gap-0.5 mb-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={`${day}-${idx}`} className="text-[8px] text-black font-bold py-0.5">{day}</div>
                    ))}
                  </div>

                  {/* 날짜 그리드 */}
                  <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center">
                    {[26,27,28,29,30,31,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].map((d, idx) => (
                      <div key={idx} className={`py-1 relative ${idx < 6 ? 'text-gray-400' : 'text-black'} ${d === 7 || d === 14 || d === 21 ? 'font-bold' : ''}`}>
                        {d}
                        {(d === 7 || d === 14 || d === 21) && idx >= 6 && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 뷰어 위젯 - 캘린더 아래로 이동 및 가로 2배(w-full) 확대 */}
                <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] w-full">
                  {/* macOS 스타일 헤더 */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-[9px] text-gray-600 font-bold truncate max-w-[200px]">Roadmap.PDF</span>
                    <button className="text-xs text-black"><PixelIcon name="close" size={10} /></button>
                  </div>
                  
                  {/* PDF 콘텐츠 영역 */}
                  <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 h-40 overflow-hidden">
                    <div className="text-white space-y-3">
                      <h3 className="font-black text-xl">Product Roadmap</h3>
                      <p className="text-sm opacity-90">Q2 2026 Strategy & Goals</p>
                      <div className="mt-4 flex gap-2">
                        <div className="text-xs bg-white/20 px-3 py-1.5 rounded-sm">Feature A: Smart Connect</div>
                        <div className="text-xs bg-white/20 px-3 py-1.5 rounded-sm">Design B: Pixel Perfect UI</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 설명 */}
            <div className="space-y-8">
              <div>
                <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold mb-4">
                  {t('features.section_extra.badge')}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 whitespace-pre-line">
                  {t('features.section_extra.subtitle')}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  {t('features.section_extra.desc')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item4.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item4.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item5.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item5.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section2.item6.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section2.item6.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 4: 액션 프로젝트 & 위젯 메뉴바 */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* 왼쪽: 실제 컴포넌트 데모 */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-gray-900 mb-8 whitespace-pre-line">
                {t('features.section3.title')}
              </h2>

              {/* 위젯 생성 메뉴바 - 4번째 이미지 참고 */}
              <div className="p-4 bg-gray-50 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold">{t('features.demo.whiteboard')}</span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <span>1906×3600</span>
                    <span>{t('features.demo.arrange')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <button className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-[10px]">
                    <PixelIcon name="image" size={10} />
                    {t('features.demo.selecting')}
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 bg-white border border-indigo-300 text-indigo-600 text-[10px]">
                    <PixelIcon name="menu" size={10} />
                    {t('features.demo.widgets')}
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-[10px]">
                    <PixelIcon name="folder" size={10} />
                    {t('features.demo.group')}
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-[10px]">
                    <PixelIcon name="flag" size={10} />
                    {t('features.demo.flag')}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-600 text-indigo-600 text-[11px] font-bold">
                    <PixelIcon name="calendar" size={12} />
                    {t('features.demo.calendar.title')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 text-[11px]">
                    <PixelIcon name="chart" size={12} />
                    {t('features.demo.widget.minimap')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 text-[11px]">
                    <PixelIcon name="video" size={12} />
                    {t('features.demo.widget.viewer')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 text-[11px]">
                    <PixelIcon name="table" size={12} />
                    {t('features.demo.widget.recorder')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 text-[11px]">
                    <PixelIcon name="database" size={12} />
                    {t('features.demo.widget.db')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 border border-gray-400 text-gray-600 text-[11px]">
                    <PixelIcon name="check" size={12} />
                    {t('features.demo.widget.actionPlan')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 text-[11px]">
                    <PixelIcon name="grid" size={12} />
                    {t('features.demo.widget.blob')}
                  </button>
                </div>
              </div>

              {/* 액션 프로젝트 카드 */}
              <div className="relative w-full bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-5">
                {/* 코너 포인트 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

                {/* 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase">
                      ACTION PROJECT
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{t('features.demo.expected')}: 8h</span>
                  </div>
                  <button className="text-gray-400 hover:text-red-500">
                    <PixelIcon name="trash" size={16} />
                  </button>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-4">{t('features.demo.project.title')}</h3>

                {/* 진행바 */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-600 uppercase">Progress</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">60%</span>
                  </div>
                  <div className="h-3 bg-gray-100 border-2 border-gray-800 p-0.5 relative">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 w-[60%] transition-all duration-300"></div>
                  </div>
                </div>

                {/* 프로젝트 설명 */}
                <div className="mb-5 p-3 bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-700 italic leading-relaxed">
                    {t('features.demo.project.summary')}
                  </p>
                </div>

                {/* TODO 섹션 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 border-b-2 border-gray-800 pb-1 mb-2">
                      <span className="w-1.5 h-1.5 bg-gray-800"></span>
                      {t('features.demo.project.step1')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 w-3.5 h-3.5 border-2 border-gray-800 bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <PixelIcon name="check" size={8} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 line-through decoration-2">{t('features.demo.project.action1')}</p>
                          <span className="text-[9px] text-indigo-400 font-bold block mt-0.5">{t('features.demo.expected')}: 2h</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 w-3.5 h-3.5 border-2 border-gray-800 bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <PixelIcon name="check" size={8} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 line-through decoration-2">{t('features.demo.project.action2')}</p>
                          <span className="text-[9px] text-indigo-400 font-bold block mt-0.5">{t('features.demo.expected')}: 3h</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 w-3.5 h-3.5 border-2 border-gray-800 bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <PixelIcon name="check" size={8} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 line-through decoration-2">{t('features.demo.project.action3')}</p>
                          <span className="text-[9px] text-indigo-400 font-bold block mt-0.5">{t('features.demo.expected')}: 4h</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 w-3.5 h-3.5 border-2 border-gray-800 bg-white hover:bg-indigo-50 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-800">{t('features.demo.project.action4')}</p>
                          <span className="text-[9px] text-indigo-400 font-bold block mt-0.5">{t('features.demo.expected')}: 2h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 하단 소스 연결 정보 */}
                <div className="mt-6 pt-4 border-t border-dashed border-gray-300 flex justify-between items-center">
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 border border-white rounded-full bg-orange-200 flex items-center justify-center ring-2 ring-white"></div>
                    <div className="w-5 h-5 border border-white rounded-full bg-purple-200 flex items-center justify-center ring-2 ring-white"></div>
                    <div className="w-5 h-5 border border-white rounded-full bg-green-200 flex items-center justify-center ring-2 ring-white"></div>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono">2026.01.28</span>
                </div>
              </div>
            </div>

            {/* 오른쪽: 설명 */}
            <div className="space-y-8">
              <div>
                <div className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold mb-4">
                  {t('features.section3.badge')}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  {t('features.section3.desc')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section3.item1.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section3.item1.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section3.item2.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section3.item2.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section3.item3.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section3.item3.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section3.item4.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section3.item4.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{t('features.section3.item5.title')}</h4>
                    <p className="text-sm text-gray-600">{t('features.section3.item5.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-24 px-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)]">
            <h2 className="text-5xl font-black text-gray-900 mb-4">{t('features.cta.title')}</h2>
            <p className="text-xl text-gray-700 mb-2">
              {t('features.cta.desc1')}
            </p>
            <p className="text-xl text-gray-700 mb-8">
              {t('features.cta.desc2')}
            </p>
            <a
              href="/"
              className="inline-block px-8 py-4 bg-black text-white text-lg font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] transition-all hover:translate-y-[-2px]"
            >
              {t('features.cta.button')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
