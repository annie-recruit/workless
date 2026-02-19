'use client';

import React, { useEffect } from 'react';
import { Memory, ActionProject } from '@/types';
import LinkManager from '../LinkManager';
import ActionProjectLinkManager from '../ActionProjectLinkManager';
import GroupToasts from '../groups/GroupToasts';
import PixelIcon from '../PixelIcon';
import type { BoardToastState, MemorySummary } from '@/hooks/groups/useGroupsPanel';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface BoardOverlayProps {
    linkManagerMemory: Memory | null;
    setLinkManagerMemory: (memory: Memory | null) => void;
    linkManagerProject: ActionProject | null;
    setLinkManagerProject: (project: ActionProject | null) => void;
    localMemories: Memory[];
    setLocalMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
    toast: BoardToastState;
    setToast: (toast: BoardToastState) => void;
    editableGroupName: string;
    setEditableGroupName: React.Dispatch<React.SetStateAction<string>>;
    editableRelatedMemories: MemorySummary[];
    setEditableRelatedMemories: React.Dispatch<React.SetStateAction<MemorySummary[]>>;
    groupModalMemory: Memory | null;
    handleCancelGroup: () => void;
    handleConfirmGroup: () => void;
    handleDeleteLink: () => void;
    handleDeleteMemory: () => void;
    handleDeleteProject: () => void;
    selectedMemoryIds: Set<string>;
    setSelectedMemoryIds: (ids: Set<string>) => void;
    projectPrompt: string;
    setProjectPrompt: (prompt: string) => void;
    setLocalProjects: React.Dispatch<React.SetStateAction<ActionProject[]>>;
    mentionToasts: Array<{ id: string; memoryId: string; x: number; y: number; relatedIds: string[] }>;
    setMentionToasts: React.Dispatch<React.SetStateAction<Array<{ id: string; memoryId: string; x: number; y: number; relatedIds: string[] }>>>;
    resolveTimestamp: (val: unknown) => number;
    sanitizeHtml: (val: string) => string;
    stripHtmlClient: (val: string) => string;
    boardSize: { width: number; height: number };
}

export default function BoardOverlay({
    linkManagerMemory,
    setLinkManagerMemory,
    linkManagerProject,
    setLinkManagerProject,
    localMemories,
    setLocalMemories,
    toast,
    setToast,
    editableGroupName,
    setEditableGroupName,
    editableRelatedMemories,
    setEditableRelatedMemories,
    groupModalMemory,
    handleCancelGroup,
    handleConfirmGroup,
    handleDeleteLink,
    handleDeleteMemory,
    handleDeleteProject,
    selectedMemoryIds,
    setSelectedMemoryIds,
    projectPrompt,
    setProjectPrompt,
    setLocalProjects,
    mentionToasts,
    setMentionToasts,
    resolveTimestamp,
    sanitizeHtml,
    stripHtmlClient,
    boardSize,
}: BoardOverlayProps) {
    useEffect(() => {
        if (toast.type === 'success') {
            const timer = setTimeout(() => {
                setToast({ type: null });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [toast.type, setToast]);

    return (
        <>
            {/* 링크 관리 모달 */}
            {linkManagerMemory && (
                <div data-tutorial-target="link-memories">
                    <LinkManager
                        currentMemory={linkManagerMemory}
                        allMemories={localMemories}
                        onClose={() => setLinkManagerMemory(null)}
                        onLinked={async (updatedMemory1, updatedMemory2) => {
                            console.log('🔗 Link added, response:', {
                                memory1: updatedMemory1.id,
                                memory1_relatedIds: updatedMemory1.relatedMemoryIds,
                                memory2: updatedMemory2.id,
                                memory2_relatedIds: updatedMemory2.relatedMemoryIds
                            });

                            setLocalMemories(prev => {
                                return prev.map(m => {
                                    if (m.id === updatedMemory1.id) {
                                        return JSON.parse(JSON.stringify(updatedMemory1));
                                    }
                                    if (m.id === updatedMemory2.id) {
                                        return JSON.parse(JSON.stringify(updatedMemory2));
                                    }
                                    return m;
                                });
                            });

                            if (linkManagerMemory.id === updatedMemory1.id) {
                                setLinkManagerMemory(JSON.parse(JSON.stringify(updatedMemory1)));
                            } else if (linkManagerMemory.id === updatedMemory2.id) {
                                setLinkManagerMemory(JSON.parse(JSON.stringify(updatedMemory2)));
                            }
                        }}
                    />
                </div>
            )}

            {/* 프로젝트 링크 관리 모달 */}
            {linkManagerProject && (
                <ActionProjectLinkManager
                    project={linkManagerProject}
                    allMemories={localMemories}
                    onClose={() => setLinkManagerProject(null)}
                    onLinked={(projectId, memoryId, note) => {
                        // 로컬 프로젝트 상태 업데이트는 MemoryView의 onUpdate가 처리할 수도 있지만
                        // 즉시 반영을 위해 여기서 프로젝트 목록을 업데이트합니다.
                        setLocalProjects(prev => prev.map(p => {
                            if (p.id === projectId) {
                                const sourceIds = p.sourceMemoryIds || [];
                                if (!sourceIds.includes(memoryId)) {
                                    return { ...p, sourceMemoryIds: [...sourceIds, memoryId] };
                                }
                            }
                            return p;
                        }));
                    }}
                />
            )}

            {/* AI 자동 묶기 토스트 팝업 */}
            <GroupToasts
                toast={toast}
                editableGroupName={editableGroupName}
                setEditableGroupName={setEditableGroupName}
                editableRelatedMemories={editableRelatedMemories}
                setEditableRelatedMemories={setEditableRelatedMemories}
                groupModalMemory={groupModalMemory}
                localMemories={localMemories}
                onCancelGroup={handleCancelGroup}
                onConfirmGroup={handleConfirmGroup}
            />

            {toast.type === 'success' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-green-500 text-white border-3 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-center gap-3">
                            <PixelIcon name="success" size={24} />
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-tight">{toast.data?.message || '완료되었습니다!'}</p>
                            </div>
                            <button onClick={() => setToast({ type: null })} className="p-1 hover:bg-green-600 border-2 border-transparent hover:border-white/30 transition-all">
                                <PixelIcon name="close" size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.type === 'delete-link' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-3 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-start gap-3 mb-4">
                            <PixelIcon name="link" size={24} />
                            <div className="flex-1">
                                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">연결을 삭제하시겠습니까?</h3>
                                <p className="text-sm text-gray-600">이 연결을 삭제하면 두 기록 간의 연결이 끊어집니다.</p>
                            </div>
                            <button onClick={() => setToast({ type: null })} className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all">
                                <PixelIcon name="close" size={16} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setToast({ type: null })} className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">취소</button>
                            <button onClick={handleDeleteLink} className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {toast.type === 'delete-memory' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-3 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-start gap-3 mb-4">
                            <PixelIcon name="delete" size={24} />
                            <div className="flex-1">
                                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">기록을 삭제하시겠습니까?</h3>
                                <p className="text-sm text-gray-600">이 기록을 삭제하면 복구할 수 없습니다.</p>
                            </div>
                            <button onClick={() => setToast({ type: null })} className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all">
                                <PixelIcon name="close" size={16} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setToast({ type: null })} className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">취소</button>
                            <button onClick={handleDeleteMemory} className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {toast.type === 'delete-project' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-3 border-gray-900 p-5 min-w-[350px] max-w-[450px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-start gap-3 mb-4">
                            <PixelIcon name="delete" size={24} />
                            <div className="flex-1">
                                <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">프로젝트를 삭제하시겠습니까?</h3>
                                <p className="text-sm text-gray-600">이 프로젝트를 삭제하면 복구할 수 없습니다.</p>
                            </div>
                            <button onClick={() => setToast({ type: null })} className="p-1 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-all">
                                <PixelIcon name="close" size={16} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setToast({ type: null })} className="flex-1 px-4 py-2 text-xs font-bold border-2 border-gray-900 text-gray-700 bg-white hover:bg-gray-100 transition-all uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">취소</button>
                            <button onClick={handleDeleteProject} className="flex-1 px-4 py-2 text-xs font-black bg-red-500 text-white border-2 border-gray-900 hover:bg-red-600 transition-all uppercase tracking-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">삭제</button>
                        </div>
                    </div>
                </div>
            )}


            {toast.type === 'confirm' && toast.data?.type === 'create-project' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-3 border-gray-900 p-6 min-w-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-100 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                <PixelIcon name="target" size={24} className="text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight">액션 프로젝트 생성</h3>
                                <p className="text-sm text-gray-600 font-medium">선택한 {selectedMemoryIds.size}개의 기록을 바탕으로 계획을 세웁니다.</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-widest">어떤 프로젝트를 생성할까요?</label>
                            <textarea
                                value={projectPrompt}
                                onChange={(e) => setProjectPrompt(e.target.value)}
                                placeholder="예: 안티 그라비티 학습 프로젝트, 2주 습관 만들기 등"
                                className="w-full h-24 p-3 bg-gray-50 border-2 border-gray-900 text-sm font-medium focus:ring-0 focus:border-indigo-500 transition-colors resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setToast({ type: null }); setProjectPrompt(''); }} className="flex-1 px-4 py-3 text-sm font-black border-2 border-gray-900 bg-white hover:bg-gray-100 transition-all uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">취소</button>
                            <button
                                disabled={!projectPrompt.trim()}
                                onClick={async () => {
                                    try {
                                        setToast({ type: 'loading', data: { message: 'AI가 실천 계획을 세우는 중...' } });
                                        const res = await fetch('/api/projects', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                sourceMemoryIds: Array.from(selectedMemoryIds),
                                                userPrompt: projectPrompt,
                                                x: 100,
                                                y: 100,
                                                color: 'bg-indigo-50'
                                            }),
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            setLocalProjects(prev => [data.project, ...prev]);
                                            setToast({ type: 'success', data: { message: '액션 프로젝트가 생성되었습니다!' } });
                                            setSelectedMemoryIds(new Set());
                                            setProjectPrompt('');
                                        } else {
                                            setToast({ type: 'error', data: { message: '프로젝트 생성 실패' } });
                                        }
                                    } catch (error) {
                                        setToast({ type: 'error', data: { message: '오류가 발생했습니다' } });
                                    }
                                }}
                                className="flex-1 px-4 py-3 text-sm font-black bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:transform-none"
                            >
                                프로젝트 생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.type === 'error' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-red-500 text-white border-3 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-center gap-3">
                            <PixelIcon name="error" size={24} />
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-tight">{toast.data?.message || '오류가 발생했습니다'}</p>
                            </div>
                            <button onClick={() => setToast({ type: null })} className="p-1 hover:bg-red-600 border-2 border-transparent hover:border-white/30 transition-all">
                                <PixelIcon name="close" size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* @ 태그 관련 기록 토스트들 (여러 개 중첩 가능) */}
            {mentionToasts.length > 0 && (
                <>
                    {/* 바깥 클릭 시 모든 토스트 닫기용 오버레이 */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMentionToasts([])}
                    />
                    {mentionToasts.map((toast) => {
                        const toastMemory = localMemories.find(m => m.id === toast.memoryId);
                        if (!toastMemory) return null;

                        const safeHtml = sanitizeHtml(toastMemory.content);
                        const timeAgo = formatDistanceToNow(resolveTimestamp(toastMemory.createdAt), {
                            addSuffix: true,
                            locale: ko
                        });

                        return (
                            <div
                                key={toast.id}
                                className="absolute bg-white border border-indigo-400 z-50 p-3 min-w-[280px] max-w-[320px] max-h-[500px] overflow-y-auto cursor-pointer"
                                style={{
                                    left: `${toast.x}px`,
                                    top: `${toast.y}px`,
                                }}
                                onClick={(e) => {
                                    // 버튼이나 링크 클릭이 아닐 때만 기록으로 이동
                                    const target = e.target as HTMLElement;
                                    if (!target.closest('button') && !target.closest('a')) {
                                        const element = document.getElementById(`memory-${toast.memoryId}`);
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }
                                    e.stopPropagation();
                                }}
                            >
                                {/* 헤더 */}
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-800">관련 기록</h4>
                                    <button
                                        onClick={() => setMentionToasts(prev => prev.filter(t => t.id !== toast.id))}
                                        className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                                        title="닫기"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* 제목 */}
                                {toastMemory.title && (
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                        {toastMemory.title}
                                    </h3>
                                )}

                                {/* 내용 */}
                                <div
                                    className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap mb-2"
                                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                                />

                                {/* 첨부 파일 */}
                                {toastMemory.attachments && toastMemory.attachments.length > 0 && (
                                    <div className="mb-2 space-y-1">
                                        {toastMemory.attachments.map((attachment) => {
                                            const isImage = attachment.mimetype.startsWith('image/');

                                            if (isImage) {
                                                return (
                                                    <div key={attachment.id}>
                                                        <img
                                                            src={attachment.filepath}
                                                            alt={attachment.filename}
                                                            className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => window.open(attachment.filepath, '_blank')}
                                                            style={{ maxHeight: '150px' }}
                                                        />
                                                        <p className="text-[10px] text-gray-500 mt-0.5">{attachment.filename}</p>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <a
                                                        key={attachment.id}
                                                        href={attachment.filepath}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                                    >
                                                        <PixelIcon
                                                            name={attachment.mimetype.includes('pdf') ? 'pdf' : 'attachment'}
                                                            size={16}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] text-gray-700 truncate">{attachment.filename}</p>
                                                            <p className="text-[9px] text-gray-500">
                                                                {(attachment.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                        <span className="text-indigo-500 text-[10px]">열기</span>
                                                    </a>
                                                );
                                            }
                                        })}
                                    </div>
                                )}

                                {/* 연결된 기록 */}
                                {toastMemory.relatedMemoryIds && toastMemory.relatedMemoryIds.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="flex items-start gap-1">
                                            <svg className="w-2.5 h-2.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-gray-500 mb-1">연결된 기록</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {toastMemory.relatedMemoryIds.slice(0, 3).map(relatedId => {
                                                        const relatedMemory = localMemories.find(m => m.id === relatedId);
                                                        if (!relatedMemory) return null;
                                                        const relatedContent = stripHtmlClient(relatedMemory.content);
                                                        const relatedTitle = relatedMemory.title || relatedContent.substring(0, 20);

                                                        return (
                                                            <button
                                                                key={relatedId}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // 연결된 기록 클릭 시 새로운 토스트 추가 (기존 토스트는 유지)
                                                                    const toastWidth = 320;
                                                                    const currentToastX = toast.x;
                                                                    const currentToastY = toast.y;

                                                                    // 현재 토스트 오른쪽에 새 토스트 표시 (공간 부족하면 왼쪽)
                                                                    const rightSpace = boardSize.width - (currentToastX + toastWidth);
                                                                    const leftSpace = currentToastX;

                                                                    let newToastX: number;
                                                                    if (rightSpace >= toastWidth + 20) {
                                                                        newToastX = currentToastX + toastWidth + 10;
                                                                    } else if (leftSpace >= toastWidth + 20) {
                                                                        newToastX = currentToastX - toastWidth - 10;
                                                                    } else {
                                                                        newToastX = currentToastX + toastWidth + 10;
                                                                    }

                                                                    const newToastY = Math.max(0, Math.min(currentToastY, boardSize.height - 200));

                                                                    // 새로운 토스트를 배열에 추가
                                                                    const newToastId = `toast-${Date.now()}-${Math.random()}`;
                                                                    setMentionToasts(prev => [...prev, {
                                                                        id: newToastId,
                                                                        memoryId: relatedId,
                                                                        x: newToastX,
                                                                        y: newToastY,
                                                                        relatedIds: [relatedId],
                                                                    }]);
                                                                }}
                                                                className="text-[10px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200 hover:border-indigo-300 line-clamp-1 max-w-[150px] text-left"
                                                                title={relatedTitle}
                                                            >
                                                                {relatedTitle}...
                                                            </button>
                                                        );
                                                    })}
                                                    {toastMemory.relatedMemoryIds.length > 3 && (
                                                        <span className="text-[10px] text-gray-400 self-center">
                                                            +{toastMemory.relatedMemoryIds.length - 3}개 더
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 시간 정보 (위치 제외) */}
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-[10px] text-gray-500">{timeAgo}</span>
                                    {toastMemory.topic && (
                                        <span className="ml-2 px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] border border-indigo-200">
                                            {toastMemory.topic}
                                        </span>
                                    )}
                                    {toastMemory.nature && (
                                        <span className="ml-1 px-1 py-0.5 bg-orange-50 text-orange-600 text-[10px] border border-orange-200">
                                            {toastMemory.nature}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </>
    );
}
