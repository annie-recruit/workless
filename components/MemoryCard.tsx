'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { Memory } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useViewer } from './ViewerContext';
import PixelIcon from './PixelIcon';
import { sanitizeHtml, stripHtmlClient } from './memory/html';
import { useLocalMemorySync } from './memory/hooks/useLocalMemorySync';
import { useMentionLinkClick } from './memory/hooks/useMentionLinkClick';

type SuggestionResource = {
  name: string;
  url?: string;
  type?: string;
  description?: string;
};

type SuggestionActionPlanItem = {
  step: number | string;
  action: string;
  timeframe?: string;
};

type Suggestions = {
  nextSteps?: string[];
  resources?: SuggestionResource[];
  actionPlan?: SuggestionActionPlanItem[];
};

const resolveTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
};

type MemoryCardProps = {
  memory: Memory;
  onDelete?: () => void;
  allMemories: Memory[];
  isHighlighted?: boolean;
  onDragStart?: (memoryId: string) => void;
  onDragEnd?: () => void;
  onOpenLinkManager?: (memory: Memory) => void;
  variant?: 'board' | 'list';
  colorClass?: string;
  onCardColorChange?: (color: 'green' | 'pink' | 'purple') => void;
  linkNotes?: Record<string, string>;
  personaId?: string | null;
  onLinkDeleted?: (updatedMemory1: Memory, updatedMemory2: Memory) => void;
  onOpenGroupModal?: (memory: Memory) => void;
  onRequestDeleteLink?: (memoryId1: string, memoryId2: string) => void;
  onRequestDelete?: (memoryId: string) => void;
  onMentionClick?: (mentionedMemoryId: string) => void;
  onCardFocus?: (memoryId: string) => void;
  onCreateSummaryCard?: (sourceMemory: Memory, summaryText: string) => Promise<void>;
  onActivityEditStart?: (memoryId: string) => void;
  onActivityEditCommit?: (memoryId: string) => void;
  onActivityEditEnd?: (memoryId: string) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const MemoryCard = memo(
  function MemoryCard(props: MemoryCardProps) {
    const {
      memory,
      allMemories,
      isHighlighted = false,
      onDragStart,
      onDragEnd,
      onOpenLinkManager,
      variant = 'list',
      colorClass,
      onCardColorChange,
      linkNotes,
      personaId,
      onOpenGroupModal,
      onRequestDeleteLink,
      onRequestDelete,
      onMentionClick,
      onActivityEditStart,
      onActivityEditCommit,
      onActivityEditEnd,
    } = props;
    const { viewerExists, openInViewer } = useViewer();
    const [localMemory, setLocalMemory] = useLocalMemorySync(memory);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(localMemory.title || '');
    const [editContent, setEditContent] = useState(localMemory.content);
    const editRef = useRef<HTMLDivElement>(null);
    const prevIsEditingRef = useRef(false);
    const timeAgo = formatDistanceToNow(resolveTimestamp(localMemory.createdAt), {
      addSuffix: true,
      locale: ko,
    });

    // 편집 모드로 전환할 때 초기 내용 설정
    useEffect(() => {
      if (isEditing && !prevIsEditingRef.current && editRef.current) {
        // 편집 모드로 전환하는 순간에만 초기 내용 설정
        editRef.current.innerHTML = editContent;
      }
      prevIsEditingRef.current = isEditing;
    }, [isEditing, editContent]);

    const handleToggleSummary = async () => {
      if (!showSummary && !summary) {
        // 요약이 없으면 API 호출
        setIsLoadingSummary(true);
        try {
          console.log('📝 요약 요청 - personaId:', personaId);
          const url = personaId
            ? `/api/memories/${localMemory.id}/summarize?personaId=${personaId}`
            : `/api/memories/${localMemory.id}/summarize`;
          console.log('📝 요약 API URL:', url);
          const res = await fetch(url);
          if (res.ok) {
            const data: unknown = await res.json();
            const nextSummary =
              isRecord(data) && typeof data.summary === 'string' ? data.summary : null;

            if (nextSummary) {
              setSummary(nextSummary);
              setShowSummary(true);
            } else {
              alert('요약 생성 실패');
            }
          } else {
            alert('요약 생성 실패');
          }
        } catch (error) {
          console.error('Failed to fetch summary:', error);
          alert('요약을 가져올 수 없습니다');
        } finally {
          setIsLoadingSummary(false);
        }
      } else {
        // 이미 있으면 토글만
        setShowSummary(!showSummary);
      }
    };

    const handleToggleSuggestions = async () => {
      if (!showSuggestions && !suggestions) {
        // 제안이 없으면 API 호출
        setIsLoadingSuggestions(true);
        try {
          console.log('💡 제안 요청 - personaId:', personaId);
          const url = personaId
            ? `/api/memories/${localMemory.id}/suggestions?personaId=${personaId}`
            : `/api/memories/${localMemory.id}/suggestions`;
          console.log('💡 제안 API URL:', url);
          const res = await fetch(url);
          if (res.ok) {
            const data: unknown = await res.json();
            const nextSuggestions =
              isRecord(data) && isRecord(data.suggestions) ? (data.suggestions as Suggestions) : null;

            if (nextSuggestions) {
              setSuggestions(nextSuggestions);
              setShowSuggestions(true);
            } else {
              alert('제안 생성 실패');
            }
          } else {
            alert('제안 생성 실패');
          }
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          alert('제안을 가져올 수 없습니다');
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        // 이미 있으면 토글만
        setShowSuggestions(!showSuggestions);
      }
    };

    const handleDelete = () => {
      if (onRequestDelete) {
        onRequestDelete(localMemory.id);
      }
    };

    const handleEdit = async () => {
      if (isEditing) {
        // 저장
        try {
          const updatedHtml = editRef.current?.innerHTML || editContent;
          const titleToSave = editTitle.trim() || null;

          const res = await fetch(`/api/memories?id=${localMemory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: titleToSave, content: updatedHtml }),
          });

          if (res.ok) {
            // 로컬 상태 즉시 업데이트 (새로고침 없이)
            setLocalMemory((prev) => ({
              ...prev,
              title: titleToSave || undefined,
              content: updatedHtml,
            }));
            setIsEditing(false);
            onActivityEditCommit?.(localMemory.id);
            onActivityEditEnd?.(localMemory.id);
            // 편집 모드 종료 시 상태 초기화
            setEditTitle(titleToSave || '');
            setEditContent(updatedHtml);
          } else {
            const errorData = await res.json();
            console.error('Edit error response:', errorData);
            alert(`수정에 실패했습니다: ${errorData.error || '알 수 없는 오류'}`);
          }
        } catch (error) {
          console.error('Edit error:', error);
          alert('수정에 실패했습니다');
        }
      } else {
        // 편집 모드로 전환
        setEditTitle(localMemory.title || '');
        setEditContent(localMemory.content);
        onActivityEditStart?.(localMemory.id);
        setIsEditing(true);
      }
    };

    const execEditCommand = (command: string, value?: string) => {
      if (!editRef.current) return;
      editRef.current.focus();
      document.execCommand(command, false, value);
      setEditContent(editRef.current.innerHTML);
    };

    const handleAutoGroup = () => {
      if (onOpenGroupModal) {
        onOpenGroupModal(localMemory);
      }
    };

    const handleConvertToGoal = async (suggestions: Suggestions) => {
      if (!confirm('이 AI 제안을 목표로 전환하시겠습니까?')) return;

      try {
        const res = await fetch(`/api/memories/${localMemory.id}/convert-to-goal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions }),
        });

        if (res.ok) {
          const data: unknown = await res.json();
          const goalTitle =
            isRecord(data) && isRecord(data.goal) && typeof data.goal.title === 'string'
              ? data.goal.title
              : null;
          alert(goalTitle ? `✅ 목표가 생성되었습니다!\n"${goalTitle}"` : '✅ 목표가 생성되었습니다!');
          // 인사이트 패널 새로고침을 위해
          window.dispatchEvent(new CustomEvent('goal-updated'));
        } else {
          alert('목표 생성 실패');
        }
      } catch (error) {
        console.error('Convert to goal error:', error);
        alert('목표 생성 중 오류 발생');
      }
    };

    // @ 태그 클릭 핸들러용 ref
    const contentRef = useRef<HTMLDivElement>(null);

    // 텍스트가 200자 이상이면 접기 기능 활성화
    const MAX_LENGTH = 200;
    const plainContent = stripHtmlClient(localMemory.content);
    const isLong = plainContent.length > MAX_LENGTH;
    const safeHtml = sanitizeHtml(localMemory.content);

    useMentionLinkClick(contentRef, onMentionClick, safeHtml);

    const cardClassName =
      variant === 'board' ? `${colorClass || 'bg-orange-50'}` : 'bg-white';

    return (
      <div
        id={`memory-${localMemory.id}`}
        data-editing={isEditing ? 'true' : 'false'}
        draggable={!isEditing}
        onDragStart={(e) => {
          if (isEditing) {
            e.preventDefault();
            return;
          }
          onDragStart?.(localMemory.id);
        }}
        onDragEnd={() => {
          if (isEditing) return;
          onDragEnd?.();
        }}
        style={{ touchAction: 'none' }}
        className={`group relative p-3 md:p-5 border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] transition-transform scroll-mt-4 h-full flex flex-col hover:scale-105 ${isEditing ? 'cursor-default' : 'cursor-move'
          } ${cardClassName} ${isHighlighted ? 'ring-4 ring-indigo-400 ring-offset-2' : ''}`}
        onPointerDown={(e) => {
          if (isEditing) {
            // 편집 모드에서는 드래그 시작 방지
            e.stopPropagation();
          }
        }}
      >
        {/* 장식용 코너 포인트 */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />
        {/* 드래그 아이콘 */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* 상단 우측 버튼들 */}
        <div className="absolute top-2 right-3 flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity">
          {/* AI 자동 묶기 버튼 */}
          <button
            onClick={handleAutoGroup}
            className="group/action w-8 h-8 inline-flex items-center justify-center rounded-md transition-colors"
            title="AI로 자동 묶기"
          >
            {/* pixelarticons 사용 (그룹/묶기) */}
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-md transition-colors translate-x-[20px]">
              <PixelIcon name="group" size={16} className="text-gray-500" />
            </span>
          </button>

          {/* 수정 버튼 */}
          <button
            onClick={handleEdit}
            className="group/action w-8 h-8 inline-flex items-center justify-center rounded-md transition-colors"
            title={isEditing ? '저장' : '수정'}
          >
            {isEditing ? (
              <span className="inline-flex w-8 h-8 items-center justify-center rounded-md transition-colors translate-x-[10px]">
                <PixelIcon name="check" size={16} className="text-gray-500" />
              </span>
            ) : (
              /* pixelarticons 사용 (편집) */
              <span className="inline-flex w-8 h-8 items-center justify-center rounded-md transition-colors translate-x-[10px]">
                <PixelIcon name="edit-box" size={16} className="text-gray-500" />
              </span>
            )}
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={handleDelete}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
            title="삭제"
          >
            {/* pixelarticons 사용 (삭제) */}
            <PixelIcon name="trash-alt" size={16} className="text-red-500" />
          </button>
        </div>

        {/* 내용 (편집 모드) */}
        {isEditing ? (
          <div className="mb-2">
            {/* 제목 편집 */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
              placeholder="제목 (선택)"
              className="w-full px-2 py-1 mb-1.5 text-[11px] md:text-xs font-semibold border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-1 px-2 py-1 border border-indigo-300 bg-indigo-50/60">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execEditCommand('bold')}
                className="px-2 py-1 text-[10px] md:text-xs rounded hover:bg-white font-semibold"
                title="굵게"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execEditCommand('italic')}
                className="px-2 py-1 text-[10px] md:text-xs rounded hover:bg-white italic"
                title="기울임"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execEditCommand('underline')}
                className="px-2 py-1 text-[10px] md:text-xs rounded hover:bg-white underline"
                title="밑줄"
              >
                U
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const url = prompt('링크 URL을 입력해주세요');
                  if (url) execEditCommand('createLink', url);
                }}
                className="px-2 py-1 text-[10px] md:text-xs rounded hover:bg-white"
                title="하이퍼링크"
              >
                <PixelIcon name="link" size={16} />
              </button>
            </div>
            <div
              ref={editRef}
              contentEditable
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
              className="w-full p-2 border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[10px] md:text-[11px] whitespace-pre-wrap"
              onInput={() => setEditContent(editRef.current?.innerHTML || '')}
              suppressContentEditableWarning
            />
          </div>
        ) : (
          <div className="mb-2 pr-8">
            {/* 제목 */}
            {localMemory.title && (
              <h3 className="text-[11px] md:text-xs font-semibold text-gray-900 mb-1">
                {stripHtmlClient(localMemory.title)}
              </h3>
            )}
            {/* 내용 */}
            <div
              ref={contentRef}
              className={`text-[10px] md:text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
            {isLong && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-1 text-indigo-500 hover:text-indigo-600 text-[10px] md:text-[11px] font-medium"
              >
                더보기
              </button>
            )}
            {isLong && isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="mt-1 text-gray-500 hover:text-gray-600 text-[10px] md:text-[11px] font-medium"
              >
                접기
              </button>
            )}
          </div>
        )}

        {/* AI 버튼들 */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            onClick={handleToggleSummary}
            disabled={isLoadingSummary}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isLoadingSummary ? '생성중' : showSummary ? '요약 끄기' : '요약'}
          </button>

          <button
            onClick={handleToggleSuggestions}
            disabled={isLoadingSuggestions}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isLoadingSuggestions ? '생성중' : showSuggestions ? '제안 끄기' : '제안'}
          </button>
          {variant === 'board' && (
            <>
              <span className="ml-auto" />
              <div className="flex items-center gap-0.5" data-tutorial-target="ai-features">
                {([
                  { id: 'green', class: 'bg-orange-300' },
                  { id: 'purple', class: 'bg-indigo-400' },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onCardColorChange?.(item.id)}
                    className={`w-4 h-4 border ${item.class} border-white`}
                    title={`${item.id === 'green' ? '주황' : '인디고'} 카드`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI 요약 표시 */}
        {showSummary && summary && (
          <div className="mb-1.5 p-1.5 bg-gradient-to-r from-orange-50 to-indigo-50 border border-indigo-300">
            <div className="flex items-start gap-1">
              <svg
                className="w-2.5 h-2.5 text-indigo-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="flex-1">
                <div className="text-[10px] font-semibold text-indigo-700 mb-0.5">AI 요약</div>
                <p className="text-[10px] text-gray-700 leading-relaxed">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* AI 제안 표시 */}
        {showSuggestions && suggestions && (
          <div className="mb-1.5 p-2 bg-gradient-to-br from-orange-50 to-indigo-50 border border-indigo-300 space-y-2">
            {/* 다음 단계 */}
            {suggestions.nextSteps && suggestions.nextSteps.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-2.5 h-2.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <h4 className="text-[10px] font-bold text-indigo-700">다음 단계</h4>
                </div>
                <ul className="space-y-0.5 ml-2">
                  {suggestions.nextSteps.map((step: string, idx: number) => (
                    <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 관련 자료 */}
            {suggestions.resources && suggestions.resources.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-2.5 h-2.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h4 className="text-[10px] font-bold text-orange-700">관련 자료</h4>
                </div>
                <ul className="space-y-0.5 ml-2">
                  {suggestions.resources.map((resource, idx) => (
                    <li key={idx} className="text-[10px] text-gray-700 cursor-default">
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-orange-700 hover:underline cursor-pointer"
                        >
                          {resource.name}
                        </a>
                      ) : (
                        <span className="font-medium text-orange-700">{resource.name}</span>
                      )}
                      {resource.type && <span className="text-gray-500 ml-1">({resource.type})</span>}
                      {resource.description && <p className="text-gray-600 ml-2">{resource.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 실행 계획 */}
            {suggestions.actionPlan && suggestions.actionPlan.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h4 className="text-[10px] font-bold text-orange-700">실행 계획</h4>
                  </div>
                  <button
                    onClick={() => handleConvertToGoal(suggestions)}
                    className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full transition-all shadow-sm"
                  >
                    🎯 목표로 전환
                  </button>
                </div>
                <ul className="space-y-0.5 ml-2">
                  {suggestions.actionPlan.map((plan, idx) => (
                    <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1">
                      <span className="font-bold text-orange-600">{plan.step}.</span>
                      <div>
                        <span>{plan.action}</span>
                        {plan.timeframe && <span className="text-gray-500 ml-1">({plan.timeframe})</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 첨부 파일 표시 */}
        {localMemory.attachments && localMemory.attachments.length > 0 && (
          <div className="mb-1.5 space-y-1.5">
            {localMemory.attachments.map((attachment) => {
              const isImage = attachment.mimetype.startsWith('image/');
              const isPdf = attachment.mimetype === 'application/pdf';
              const isDocx =
                attachment.mimetype ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                attachment.mimetype === 'application/msword' ||
                attachment.filename.toLowerCase().endsWith('.docx') ||
                attachment.filename.toLowerCase().endsWith('.doc');
              const isSupported = isImage || isPdf || isDocx;

              const handleAttachmentClick = (e: React.MouseEvent) => {
                if (viewerExists && isSupported) {
                  e.preventDefault();
                  e.stopPropagation();
                  openInViewer({
                    kind: 'file',
                    url: attachment.filepath,
                    fileName: attachment.filename,
                    mimeType: attachment.mimetype,
                  });
                }
                // Viewer가 없거나 지원 안 되는 파일은 기본 동작 유지
              };

              if (isImage) {
                return (
                  <div key={attachment.id} className="mt-1 relative group">
                    <img
                      src={attachment.filepath}
                      alt={attachment.filename}
                      className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={handleAttachmentClick}
                      style={{ maxHeight: '200px' }}
                    />
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-gray-500">{attachment.filename}</p>
                      {viewerExists && (
                        <a
                          href={attachment.filepath}
                          download={attachment.filename}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                          title="다운로드"
                        >
                          <PixelIcon name="download" size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={attachment.id} className="flex items-center gap-1.5">
                    <a
                      href={attachment.filepath}
                      target={viewerExists && isSupported ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      onClick={handleAttachmentClick}
                      className={`flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex-1 ${viewerExists && isSupported ? 'cursor-pointer' : ''
                        }`}
                    >
                      <PixelIcon
                        name={attachment.mimetype.includes('pdf') ? 'pdf' : isDocx ? 'docx' : 'attachment'}
                        size={16}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-700 truncate">{attachment.filename}</p>
                        <p className="text-[9px] text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                      {!viewerExists || !isSupported ? (
                        <span className="text-indigo-500 text-[10px]">열기</span>
                      ) : (
                        <span className="text-indigo-500 text-[10px]">Viewer에서 보기</span>
                      )}
                    </a>
                    {viewerExists && (
                      <a
                        href={attachment.filepath}
                        download={attachment.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="다운로드"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
          <span className="flex-shrink-0 whitespace-nowrap">{timeAgo}</span>

          {localMemory.topic && (
            <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] border border-indigo-200">
              {localMemory.topic}
            </span>
          )}

          {localMemory.nature && (
            <span className="px-1 py-0.5 bg-orange-50 text-orange-600 text-[10px] border border-orange-200">
              {localMemory.nature}
            </span>
          )}

          {localMemory.repeatCount !== undefined && localMemory.repeatCount > 1 && (
            <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px]">
              🔁 {localMemory.repeatCount}
            </span>
          )}

        </div>

        {/* 관련 기록 링크 */}
        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
          <div className="flex items-start gap-1">
            <svg className="w-2.5 h-2.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div className="flex-1">
              <div className="text-[10px] text-gray-500 mb-0.5 flex items-center justify-between">
                <span>연결된 기록</span>
                <button
                  onClick={() => onOpenLinkManager?.(localMemory)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600"
                >
                  + 추가
                </button>
              </div>
              {localMemory.relatedMemoryIds && localMemory.relatedMemoryIds.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {localMemory.relatedMemoryIds.slice(0, 3).map((relatedId) => {
                    const relatedMemory = allMemories.find((m) => m.id === relatedId);
                    if (!relatedMemory) return null;
                    const noteKey =
                      relatedMemory.id < localMemory.id
                        ? `${relatedMemory.id}:${localMemory.id}`
                        : `${localMemory.id}:${relatedMemory.id}`;
                    const note = linkNotes?.[noteKey];

                    return (
                      <div key={relatedId} className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // 연결된 기록 클릭 시 토스트 표시
                            if (onMentionClick) {
                              onMentionClick(relatedId);
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200 hover:border-indigo-300 line-clamp-1 max-w-[150px] text-left"
                          title={relatedMemory.title || stripHtmlClient(relatedMemory.content)}
                        >
                          {relatedMemory.title || stripHtmlClient(relatedMemory.content).substring(0, 20)}...
                        </button>
                        {note && (
                          <div className="mt-0.5 text-[9px] text-gray-500 line-clamp-1">메모: {note}</div>
                        )}
                        {/* 링크 삭제 버튼 */}
                        {isEditing && (
                          <button
                            onClick={() => {
                              if (onRequestDeleteLink) {
                                onRequestDeleteLink(localMemory.id, relatedId);
                              }
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                            title="연결 끊기"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {localMemory.relatedMemoryIds.length > 3 && (
                    <span className="text-[10px] text-gray-400 self-center">
                      +{localMemory.relatedMemoryIds.length - 3}개 더
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">아직 연결된 기록이 없습니다</p>
              )}
            </div>
          </div>

          {/* 출처 정보 */}
          {localMemory.source && localMemory.source !== 'manual' && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-0.5 select-none">
              <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase tracking-tight font-bold">
                <PixelIcon name={localMemory.source === 'gmail' ? 'mail' : 'info'} size={10} />
                <span>
                  {localMemory.source === 'gmail' && 'Gmail 출처'}
                  {localMemory.source === 'ios-shortcut' && 'iOS Shortcut'}
                  {localMemory.source === 'workless-web' && 'Quick Add'}
                  {!['gmail', 'ios-shortcut', 'workless-web'].includes(localMemory.source) && localMemory.source}
                </span>
              </div>
              {localMemory.sourceSender && (
                <div className="text-[10px] text-gray-600 truncate">
                  <span className="text-gray-400 mr-1">From:</span>
                  {localMemory.sourceSender}
                </div>
              )}
              {localMemory.sourceSubject && (
                <div className="text-[10px] text-gray-800 font-medium truncate leading-snug">
                  <span className="text-gray-400 mr-1">Subject:</span>
                  {localMemory.sourceSubject}
                </div>
              )}
              {localMemory.sourceLink && (
                <a
                  href={localMemory.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 text-[9px] text-indigo-500 hover:text-indigo-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{localMemory.source === 'gmail' ? '메일 원본 보기' : '링크 열기'}</span>
                  <PixelIcon name="arrow" size={8} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 커스텀 비교 함수: memory와 주요 props만 비교
    return (
      prevProps.memory.id === nextProps.memory.id &&
      prevProps.memory.content === nextProps.memory.content &&
      prevProps.memory.title === nextProps.memory.title &&
      prevProps.memory.relatedMemoryIds?.length === nextProps.memory.relatedMemoryIds?.length &&
      prevProps.colorClass === nextProps.colorClass &&
      prevProps.variant === nextProps.variant &&
      prevProps.personaId === nextProps.personaId &&
      prevProps.isHighlighted === nextProps.isHighlighted &&
      Object.keys(prevProps.linkNotes || {}).length === Object.keys(nextProps.linkNotes || {}).length
    );
  }
);

export default MemoryCard;
