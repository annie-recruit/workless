'use client';

import { useState, useMemo } from 'react';
import type { Memory, CanvasBlock } from '@/types';
import PixelIcon from './PixelIcon';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { stripHtmlClient } from '@/board/boardUtils';

interface MemoryListPanelProps {
    memories: Memory[];
    blocks: CanvasBlock[];
    onClose: () => void;
    onDeleteMemory: (id: string) => void;
    onDeleteBlock: (id: string) => void;
}

export default function MemoryListPanel({
    memories,
    blocks,
    onClose,
    onDeleteMemory,
    onDeleteBlock,
}: MemoryListPanelProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'memory' | 'block'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        // Process Memories
        const memoryItems = memories.map(m => ({
            id: m.id,
            type: 'memory' as const,
            title: m.title || '제목 없음',
            content: stripHtmlClient(m.content),
            createdAt: m.createdAt,
            original: m
        }));

        // Process Blocks
        const blockItems = blocks.map(b => ({
            id: b.id,
            type: 'block' as const,
            title: b.type === 'calendar' ? '캘린더' :
                b.type === 'minimap' ? '미니맵' :
                    b.type === 'viewer' ? '뷰어' :
                        b.type === 'meeting-recorder' ? '미팅 레코더' :
                            b.type === 'database' ? '데이터베이스' : '위젯',
            content: `${b.width || '?'}x${b.height || '?'}`,
            createdAt: b.createdAt,
            original: b
        }));

        const allItems = [...memoryItems, ...blockItems];

        return allItems
            .filter(item => {
                if (activeTab === 'memory' && item.type !== 'memory') return false;
                if (activeTab === 'block' && item.type !== 'block') return false;
                if (!query) return true;
                return (
                    item.title.toLowerCase().includes(query) ||
                    item.content.toLowerCase().includes(query)
                );
            })
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [memories, blocks, activeTab, searchQuery]);

    return (
        <div className="fixed bottom-6 right-6 z-[9000] w-[400px] h-[500px] bg-white border-[3px] border-black flex flex-col overflow-hidden animate-slide-up font-galmuri11">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-indigo-50 border-b-[3px] border-black">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <PixelIcon name="folder" size={20} className="text-indigo-500" />
                    기억 관리
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <PixelIcon name="close" size={16} />
                </button>
            </div>

            {/* Tabs & Search */}
            <div className="p-3 border-b-[3px] border-black space-y-3 bg-white">
                <div className="flex border-[2px] border-black">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-1.5 text-xs font-medium transition-all border-r-[2px] border-black ${activeTab === 'all' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        전체 ({memories.length + blocks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('memory')}
                        className={`flex-1 py-1.5 text-xs font-medium transition-all border-r-[2px] border-black ${activeTab === 'memory' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        기억 ({memories.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('block')}
                        className={`flex-1 py-1.5 text-xs font-medium transition-all ${activeTab === 'block' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        위젯 ({blocks.length})
                    </button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border-[2px] border-black focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <PixelIcon name="search" size={14} />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <PixelIcon name="search" size={32} className="opacity-20" />
                        <p className="text-xs">항목이 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredItems.map((item) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                className="bg-white p-3 border-[2px] border-black hover:border-indigo-500 transition-all group flex items-start gap-3"
                            >
                                <div className={`shrink-0 w-8 h-8 border-[2px] border-black flex items-center justify-center ${item.type === 'memory' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'
                                    }`}>
                                    <PixelIcon
                                        name={item.type === 'memory' ? 'doc' : (
                                            item.title === '캘린더' ? 'calendar' :
                                                item.title === '미니맵' ? 'minimap' :
                                                    item.title === '뷰어' ? 'viewer' : 'database'
                                        )}
                                        size={16}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-700 truncate max-w-[150px]">
                                            {item.title}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: ko })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                        {item.content}
                                    </p>
                                </div>

                                <button
                                    onClick={() => item.type === 'memory' ? onDeleteMemory(item.id) : onDeleteBlock(item.id)}
                                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 border-[2px] border-transparent hover:border-red-500"
                                    title="삭제"
                                >
                                    <PixelIcon name="delete" size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
