'use client';

import { useState } from 'react';
import { Memory, ActionProject } from '@/types';
import PixelIcon from './PixelIcon';

interface ActionProjectLinkManagerProps {
    project: ActionProject;
    allMemories: Memory[];
    onClose: () => void;
    onLinked: (projectId: string, memoryId: string, note: string) => void;
}

export default function ActionProjectLinkManager({ project, allMemories, onClose, onLinked }: ActionProjectLinkManagerProps) {
    const stripHtmlClient = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [linkNote, setLinkNote] = useState('');

    // 현재 프로젝트와 이미 연결된 기록들은 제외
    const linkedIds = project.sourceMemoryIds || [];
    const availableMemories = allMemories.filter(m =>
        !linkedIds.includes(m.id) &&
        (searchQuery === '' ||
            stripHtmlClient(m.content).toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.topic?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const [showSuccess, setShowSuccess] = useState(false);

    const handleLink = async () => {
        if (!selectedMemoryId) {
            alert('연결할 기록을 선택해주세요.');
            return;
        }

        setIsLinking(true);
        try {
            // 1. 프로젝트 업데이트 및 기록과의 링크 생성
            // 여기서는 하드코딩된 API 대신 범용 메모리 링크 API를 사용할 수도 있지만,
            // 프로젝트의 sourceMemoryIds를 업데이트하는 것이 주 목적입니다.
            // 일단은 /api/memories/link를 시도하고 (id1=project.id, id2=memory.id)
            // 서버에서 프로젝트 ID를 처리할 수 있게 하거나, 상위에서 처리하도록 합니다.
            // 여기서는 프로젝트의 소스 업데이트는 부모에서 하도록 설계합니다.

            const res = await fetch('/api/memories/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memoryId1: project.id,
                    memoryId2: selectedMemoryId,
                    note: linkNote,
                }),
            });

            if (res.ok) {
                onLinked(project.id, selectedMemoryId, linkNote);
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    onClose();
                }, 2000);
            } else {
                alert('링크 추가 실패');
            }
        } catch (error) {
            console.error('Failed to link project:', error);
            alert('링크 추가 중 오류 발생');
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <>
            {showSuccess && (
                <div className="fixed bottom-6 right-6 z-[9999] font-galmuri11 animate-slide-up">
                    <div className="bg-green-500 text-white border-4 border-gray-900 p-4 min-w-[300px] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="flex items-center gap-3">
                            <PixelIcon name="success" size={24} />
                            <p className="text-sm font-bold">기록이 연결되었습니다!</p>
                        </div>
                    </div>
                </div>
            )}

            {!showSuccess && (
                <div className="fixed bottom-6 right-6 z-[9999] font-galmuri11 animate-slide-up">
                    <div className="bg-white border-4 border-gray-900 w-[500px] max-h-[80vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

                        <div className="p-4 border-b-4 border-gray-900 flex justify-between items-center">
                            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">프로젝트에 기록 연결</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors text-xl leading-none">×</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="bg-indigo-50 p-3 border-2 border-indigo-300">
                                <div className="text-[10px] text-indigo-700 font-bold mb-1 uppercase tracking-tighter">TARGET PROJECT</div>
                                <p className="text-gray-900 text-xs font-bold">{project.title}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="기록 검색..."
                                        className="w-full h-10 px-3 pr-10 text-sm border-2 border-gray-300 focus:outline-none focus:border-gray-900"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={linkNote}
                                    onChange={(e) => setLinkNote(e.target.value)}
                                    placeholder="연결 메모 (옵션)"
                                    className="w-full h-10 px-3 text-sm border-2 border-gray-300 focus:outline-none focus:border-gray-900"
                                />
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {availableMemories.length === 0 ? (
                                    <div className="text-center text-gray-400 py-6 text-xs italic">기록이 없습니다.</div>
                                ) : (
                                    availableMemories.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMemoryId(m.id)}
                                            className={`w-full p-3 border-2 transition-all text-left ${selectedMemoryId === m.id ? 'border-gray-900 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-400'
                                                }`}
                                        >
                                            {m.title && <p className="text-gray-900 text-xs font-bold mb-1">{m.title}</p>}
                                            <p className="text-gray-600 text-[11px] line-clamp-2">{stripHtmlClient(m.content)}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t-4 border-gray-900 flex justify-end gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm border-2 border-gray-900 text-gray-700 hover:bg-gray-100 transition-colors font-bold">취소</button>
                            <button
                                onClick={handleLink}
                                disabled={!selectedMemoryId || isLinking}
                                className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50 font-bold"
                            >
                                {isLinking ? '연결 중...' : '연결하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
