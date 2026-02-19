'use client';

import React, { useMemo, useState } from 'react';
import { ActionProject, ProjectMilestone, ProjectAction, ActionDraft, Memory } from '@/types';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';
import { useLanguage } from './LanguageContext';
import { PixelCorners } from './ui/PixelCorners';
import { apiPost } from '@/lib/apiClient';
import { formatLocalDate } from '@/lib/dateUtils';
import { API, TIMEOUT, CARD_COLOR_OPTIONS } from '@/lib/constants';

interface ActionProjectCardProps {
    project: ActionProject;
    onUpdate: (id: string, updates: Partial<ActionProject>) => void;
    onDelete: (id: string) => void;
    isDragging?: boolean;
    isSelected?: boolean;
    isHighlighted?: boolean;
    allMemories?: Memory[];
    onOpenLinkManager?: (project: ActionProject) => void;
    onMentionClick?: (memoryId: string) => void;
    linkNotes?: Record<string, string>;
    onRequestDeleteLink?: (projectId: string, memoryId: string) => void;
    onAddMemory?: (memory: Memory) => void;
    onActivityPointerOverCapture?: (e: React.PointerEvent) => void;
    onActivityPointerOutCapture?: (e: React.PointerEvent) => void;
    onActivityFocusCapture?: (e: React.FocusEvent) => void;
    onActivityBlurCapture?: (e: React.FocusEvent) => void;
}

export const ActionProjectCard: React.FC<ActionProjectCardProps> = ({
    project,
    onUpdate,
    onDelete,
    isDragging,
    isSelected,
    isHighlighted,
    allMemories = [],
    onOpenLinkManager,
    onMentionClick,
    linkNotes,
    onRequestDeleteLink,
    onAddMemory,
    onActivityPointerOverCapture,
    onActivityPointerOutCapture,
    onActivityFocusCapture,
    onActivityBlurCapture,
}) => {
    const { t, language } = useLanguage();
    const [generatingActions, setGeneratingActions] = useState<Set<string>>(new Set());
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(project.title);
    const [editSummary, setEditSummary] = useState(project.summary);
    const [draftContents, setDraftContents] = useState<Record<string, string>>({});
    const [isCreatingCard, setIsCreatingCard] = useState<Record<string, boolean>>({});
    const [isCopying, setIsCopying] = useState<Record<string, boolean>>({});

    const bgColorClass = useMemo(() => {
        const color = project.color || 'bg-white';
        if (color === 'indigo') return 'bg-indigo-50';
        if (color === 'orange') return 'bg-orange-50';
        if (color === 'purple') return 'bg-purple-50';
        return color;
    }, [project.color]);

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // 전체 진행률 계산
    const progress = useMemo(() => {
        const totalActions = project.milestones.reduce((acc, m) => acc + m.actions.length, 0);
        if (totalActions === 0) return 0;
        const completedActions = project.milestones.reduce(
            (acc, m) => acc + m.actions.filter((a) => a.completed).length,
            0
        );
        return Math.round((completedActions / totalActions) * 100);
    }, [project.milestones]);

    const handleToggleAction = (milestoneId: string, actionId: string) => {
        const newMilestones = project.milestones.map((m) => {
            if (m.id === milestoneId) {
                return {
                    ...m,
                    actions: m.actions.map((a) =>
                        a.id === actionId ? { ...a, completed: !a.completed } : a
                    ),
                };
            }
            return m;
        });
        onUpdate(project.id, { milestones: newMilestones });
    };

    const handleCreateDraft = async (milestoneId: string, actionId: string, actionText: string) => {
        setGeneratingActions(prev => new Set([...prev, actionId]));
        try {
            const data = await apiPost<{ draft: ActionDraft }>(
                `/api/projects/${project.id}/generate-draft`,
                { milestoneId, actionId, actionText }
            );
            const draft = data.draft;

            const newMilestones = project.milestones.map((m) => {
                if (m.id === milestoneId) {
                    return {
                        ...m,
                        actions: m.actions.map((a) =>
                            a.id === actionId ? { ...a, draft } : a
                        ),
                    };
                }
                return m;
            });

            onUpdate(project.id, { milestones: newMilestones });
        } catch (error) {
            console.error('Error generating real draft:', error);
            alert('초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setGeneratingActions(prev => {
                const next = new Set(prev);
                next.delete(actionId);
                return next;
            });
        }
    };

    // 초안 삭제 (접기/초기화 용도가 필요하다면)
    const handleDeleteDraft = (milestoneId: string, actionId: string) => {
        const newMilestones = project.milestones.map((m) => {
            if (m.id === milestoneId) {
                return {
                    ...m,
                    actions: m.actions.map((a) => {
                        if (a.id === actionId) {
                            const { draft, ...rest } = a;
                            return rest;
                        }
                        return a;
                    }),
                };
            }
            return m;
        });
        onUpdate(project.id, { milestones: newMilestones });
    };

    const handleConvertToCard = async (actionId: string, content: string) => {
        if (isCreatingCard[actionId]) return;
        
        setIsCreatingCard(prev => ({ ...prev, [actionId]: true }));
        try {
            const data = await apiPost<{ memory: Memory }>(API.MEMORIES, {
                content,
                source: 'action-project-draft',
                derivedFromCardId: project.id,
            });
            if (onAddMemory) onAddMemory(data.memory);
            
            // 성공 알림 대신 버튼 상태로 피드백 (필요 시 토스트 등 사용)
        } catch (error) {
            console.error('Error creating card:', error);
            alert('카드로 생성에 실패했습니다.');
        } finally {
            setIsCreatingCard(prev => ({ ...prev, [actionId]: false }));
        }
    };

    const handleCopyDraft = (actionId: string, content: string) => {
        if (isCopying[actionId]) return;
        
        navigator.clipboard.writeText(content);
        setIsCopying(prev => ({ ...prev, [actionId]: true }));
        setTimeout(() => {
            setIsCopying(prev => ({ ...prev, [actionId]: false }));
        }, TIMEOUT.COPY_FEEDBACK);
    };

    return (
        <div
            id={`project-${project.id}`}
            className={`group relative w-[480px] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] flex flex-col ${isDragging ? 'opacity-50' : 'opacity-100'
                } ${bgColorClass} ${isSelected || isHighlighted ? 'border-[3px] border-blue-400' : 'border-2 border-gray-800'}`}
            onPointerOverCapture={onActivityPointerOverCapture}
            onPointerOutCapture={onActivityPointerOutCapture}
            onFocusCapture={onActivityFocusCapture}
            onBlurCapture={onActivityBlurCapture}
        >
            <PixelCorners />

            {/* 드래그 아이콘 */}
            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            </div>

            {/* 상단 우측 버튼들 */}
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isEditing) {
                            onUpdate(project.id, { title: editTitle, summary: editSummary });
                        }
                        setIsEditing(!isEditing);
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                >
                    <PixelIcon name={isEditing ? "check" : "edit-box"} size={20} className="text-gray-500" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(project.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded transition-colors"
                >
                    <PixelIcon name="trash-alt" size={20} className="text-red-500" />
                </button>
            </div>

            {/* 헤더 */}
            <div className="mb-5">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase tracking-tighter">
                        {t('memory.list.project.title')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{project.expectedDuration}</span>
                </div>
                {isEditing ? (
                    <input
                        className="text-xl font-black text-gray-900 leading-tight bg-transparent border-b-2 border-indigo-300 focus:outline-none w-full"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                    />
                ) : (
                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {project.title}
                    </h3>
                )}
            </div>

            {/* 진행바 */}
            <div className="mb-7">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-600">PROGRESS</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">{progress}%</span>
                </div>
                <div className="h-4 bg-gray-100 border-2 border-gray-800 p-0.5 relative">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                    {/* 그리드 패턴 오버레이 */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
                </div>
            </div>

            {/* 프로젝트 요약 */}
            <div className="mb-7 p-4 bg-gray-50 border border-gray-200">
                {isEditing ? (
                    <textarea
                        className="text-sm text-gray-700 leading-relaxed bg-transparent w-full focus:outline-none min-h-[60px]"
                        value={editSummary}
                        onChange={e => setEditSummary(e.target.value)}
                    />
                ) : (
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{project.summary}"
                    </p>
                )}
            </div>

            {/* 단계 및 액션들 */}
            <div className="space-y-8">
                {project.milestones.map((milestone) => (
                    <div key={milestone.id}>
                        <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 border-b-2 border-gray-800 pb-2 mb-4">
                            <span className="w-2 h-2 bg-gray-800" />
                            {milestone.title}
                        </h4>
                        <div className="space-y-4">
                            {milestone.actions.map((action) => (
                                <div key={action.id} className="group/action">
                                    <div
                                        data-interactive="true"
                                        className="flex items-start gap-3 cursor-pointer"
                                        onPointerDown={(e) => {
                                            // 텍스트 선택 등을 위해 기본 동작 허용이 필요할 수도 있지만,
                                            // 일반 클릭/체크 동작을 위해 preventDefault는 상황에 따라 조절.
                                            // 여기서는 체크박스 영역 클릭과 분리 필요.
                                        }}
                                    >
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleAction(milestone.id, action.id);
                                            }}
                                            className={`mt-0.5 w-5 h-5 border-2 border-gray-800 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${action.completed ? 'bg-indigo-500' : 'bg-white hover:bg-indigo-50'
                                                }`}
                                        >
                                            {action.completed && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    onClick={() => handleToggleAction(milestone.id, action.id)}
                                                    className={`text-[15px] font-medium leading-tight transition-all select-none ${action.completed ? 'text-gray-400 line-through decoration-gray-400 decoration-2' : 'text-gray-900'
                                                        }`}
                                                >
                                                    {action.text}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 mt-1.5 min-h-[22px]">
                                                {action.duration && (
                                                    <span className="text-[10px] font-bold text-indigo-400 whitespace-nowrap">
                                                        {t('memory.list.project.estimated').replace('{duration}', action.duration)}
                                                    </span>
                                                )}

                                                {/* 초안 생성 버튼 (예상 시간 옆으로 이동) */}
                                                {!action.completed && !action.draft && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCreateDraft(milestone.id, action.id, action.text);
                                                        }}
                                                        disabled={generatingActions.has(action.id)}
                                                        className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold transition-all border whitespace-nowrap ${generatingActions.has(action.id)
                                                            ? 'bg-orange-100 border-orange-300 text-orange-600 cursor-wait'
                                                            : 'opacity-0 group-hover/action:opacity-100 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 active:scale-95'
                                                            }`}
                                                    >
                                                        <PixelIcon
                                                            name="sparkles"
                                                            size={14}
                                                            className={generatingActions.has(action.id) ? 'animate-pulse' : ''}
                                                        />
                                                        {generatingActions.has(action.id)
                                                            ? t('project.draft.generating')
                                                            : t('project.draft.button')}
                                                    </button>
                                                )}
                                            </div>

                                            {/* 생성된 초안 뷰 */}
                                            {action.draft && !action.completed && (
                                                <div className="mt-3 animate-fadeIn">
                                                    {action.draft.type === 'research' ? (
                                                        // 조사형 (Research)
                                                        <div className="bg-yellow-50 border-2 border-yellow-400 p-3 relative">
                                                            <div className="absolute -top-2.5 left-2 px-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase tracking-tight">
                                                                Research Result
                                                            </div>
                                                            <ul className="space-y-2 mt-1">
                                                                {action.draft.links?.map((link, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2 text-xs">
                                                                        <span className="text-yellow-600 mt-0.5">🔍</span>
                                                                        <div className="min-w-0">
                                                                            <a
                                                                                href={link.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="font-bold text-gray-800 hover:underline hover:text-indigo-600 block truncate"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {link.title}
                                                                            </a>
                                                                            <span className="text-[10px] text-gray-500">{link.domain}</span>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <div className="mt-3 flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const textToCopy = action.draft!.links?.map(l => `${l.title}\n${l.url}`).join('\n\n') || '';
                                                                        handleCopyDraft(action.id, textToCopy);
                                                                    }}
                                                                    className={`px-2 py-1 bg-white border border-yellow-200 text-[10px] font-bold text-yellow-700 hover:bg-yellow-100 flex items-center gap-1 transition-all ${isCopying[action.id] ? 'bg-yellow-50 text-yellow-500' : ''}`}
                                                                >
                                                                    <PixelIcon name={isCopying[action.id] ? "check" : "copy"} size={12} />
                                                                    {isCopying[action.id] ? 'Copied!' : 'Copy All Links'}
                                                                </button>
                                                                <button
                                                                    disabled={isCreatingCard[action.id]}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const textToSave = action.draft!.links?.map(l => `- ${l.title}: ${l.url}`).join('\n') || '';
                                                                        handleConvertToCard(action.id, `[Research: ${action.text}]\n\n${textToSave}`);
                                                                    }}
                                                                    className={`px-2 py-1 bg-white border border-yellow-200 text-[10px] font-bold text-yellow-700 hover:bg-yellow-100 flex items-center gap-1 disabled:opacity-50 transition-all ${isCreatingCard[action.id] ? 'bg-orange-50' : ''}`}
                                                                >
                                                                    {isCreatingCard[action.id] ? (
                                                                        <ProcessingLoader size={10} scale={1} variant="inline" tone="graphite" />
                                                                    ) : (
                                                                        <PixelIcon name="plus" size={12} />
                                                                    )}
                                                                    {isCreatingCard[action.id] ? 'Creating...' : 'Create as Card'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // 글쓰기형 (Writing)
                                                        <div className="bg-blue-50 border-2 border-blue-400 p-3 relative">
                                                            <div className="absolute -top-2.5 left-2 px-1.5 bg-blue-400 text-white text-[10px] font-bold uppercase tracking-tight">
                                                                Draft Content
                                                            </div>
                                                            <textarea
                                                                className="w-full h-32 text-xs bg-white border border-blue-200 p-2 focus:outline-none focus:border-blue-500 resize-none mt-1 leading-relaxed text-gray-700"
                                                                value={draftContents[action.id] ?? action.draft.content}
                                                                onChange={(e) => setDraftContents(prev => ({ ...prev, [action.id]: e.target.value }))}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div className="mt-2 flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const content = draftContents[action.id] ?? action.draft!.content;
                                                                        handleCopyDraft(action.id, content);
                                                                    }}
                                                                    className={`px-2 py-1 bg-white border border-blue-200 text-[10px] font-bold text-blue-700 hover:bg-blue-100 flex items-center gap-1 transition-all ${isCopying[action.id] ? 'bg-blue-50 text-blue-500' : ''}`}
                                                                >
                                                                    <PixelIcon name={isCopying[action.id] ? "check" : "copy"} size={12} />
                                                                    {isCopying[action.id] ? 'Copied!' : 'Copy'}
                                                                </button>
                                                                <button
                                                                    disabled={isCreatingCard[action.id]}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleConvertToCard(action.id, draftContents[action.id] ?? action.draft!.content);
                                                                    }}
                                                                    className={`px-2 py-1 bg-white border border-blue-200 text-[10px] font-bold text-blue-700 hover:bg-blue-100 flex items-center gap-1 disabled:opacity-50 transition-all ${isCreatingCard[action.id] ? 'bg-indigo-50' : ''}`}
                                                                >
                                                                    {isCreatingCard[action.id] ? (
                                                                        <ProcessingLoader size={10} scale={1} variant="inline" tone="graphite" />
                                                                    ) : (
                                                                        <PixelIcon name="plus" size={12} />
                                                                    )}
                                                                    {isCreatingCard[action.id] ? 'Creating...' : 'Create as Card'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDraft(milestone.id, action.id);
                                                                    }}
                                                                    className="px-2 py-1 text-[10px] text-gray-400 hover:text-red-500"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 관련 기록 */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-1">
                    <PixelIcon name="link" size={14} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-[11px] text-gray-500 mb-2 flex items-center justify-between font-bold">
                            <span>{t('memory.card.related.title')}</span>
                            <button
                                onClick={() => onOpenLinkManager?.(project)}
                                className="text-[11px] text-indigo-500 hover:text-indigo-600"
                            >
                                {t('memory.card.related.add')}
                            </button>
                        </div>
                        {project.sourceMemoryIds && project.sourceMemoryIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {project.sourceMemoryIds.map((relatedId) => {
                                    const memory = allMemories.find(m => m.id === relatedId);
                                    if (!memory) return null;
                                    const note = linkNotes?.[`${project.id}:${relatedId}`] || linkNotes?.[`${relatedId}:${project.id}`];

                                    return (
                                        <div key={relatedId} className="relative group/link">
                                            <button
                                                onClick={() => onMentionClick?.(relatedId)}
                                                className="text-[11px] px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors line-clamp-1 max-w-[180px]"
                                                title={memory.title || stripHtml(memory.content)}
                                            >
                                                {memory.title || stripHtml(memory.content).substring(0, 20)}
                                            </button>
                                            {note && <div className="mt-0.5 text-[9px] text-gray-400 px-1">{note}</div>}
                                            {isEditing && (
                                                <button
                                                    onClick={() => onRequestDeleteLink?.(project.id, relatedId)}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 border border-white shadow-sm"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-[11px] text-gray-400 italic">
                                {t('memory.card.related.none')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 바닥 정보 */}
            <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <span>{formatLocalDate(project.createdAt, language)}</span>
                <div className="flex items-center gap-1.5">
                    {CARD_COLOR_OPTIONS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onUpdate(project.id, { color: item.id })}
                            className={`w-3.5 h-3.5 border border-white ${item.class} ${bgColorClass === item.id ? 'ring-2 ring-gray-800 ring-offset-1' : ''}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActionProjectCard;
