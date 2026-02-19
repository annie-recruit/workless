'use client';

import { useState, useMemo } from 'react';
import type { Memory, CanvasBlock } from '@/types';
import PixelIcon from './PixelIcon';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { stripHtmlClient } from '@/board/boardUtils';
import { useLanguage } from './LanguageContext';

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
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'all' | 'memory' | 'block'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(30);

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        // Process Memories
        const memoryItems = memories.map(m => ({
            id: m.id,
            type: 'memory' as const,
            title: m.title || t('memory.list.item.noTitle'),
            content: stripHtmlClient(m.content),
            createdAt: m.createdAt,
            original: m
        }));

        // Process Blocks
        const blockItems = blocks.map(b => ({
            id: b.id,
            type: 'block' as const,
            title: b.type === 'calendar' ? t('onboarding.calendar') :
                b.type === 'minimap' ? t('memory.view.board.widget.minimap') :
                    b.type === 'viewer' ? t('memory.view.board.widget.viewer') :
                        b.type === 'meeting-recorder' ? t('memory.view.board.widget.recorder') :
                            b.type === 'database' ? t('memory.view.board.widget.db') : t('memory.view.board.widget.add'),
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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
            setVisibleCount(prev => Math.min(prev + 20, filteredItems.length));
        }
    };

    const visibleItems = filteredItems.slice(0, visibleCount);

    return (
        <div className="fixed bottom-6 right-6 z-[9000] animate-slide-up font-galmuri11">
            <div className="w-[400px] h-[500px] bg-white border-3 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900 z-20" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900 z-20" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900 z-20" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900 z-20" />
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-indigo-50 border-b-3 border-gray-900">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <PixelIcon name="folder" size={20} className="text-indigo-500" />
                    {t('memory.list.title')}
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <PixelIcon name="close" size={16} />
                </button>
            </div>

            {/* Tabs & Search */}
            <div className="p-3 border-b-3 border-gray-900 space-y-3 bg-white">
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => { setActiveTab('all'); setVisibleCount(30); }}
                        className={`px-4 py-1.5 text-xs font-medium transition-all border-2 border-black ${activeTab === 'all' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        style={{
                            clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                        }}
                    >
                        {t('memory.list.tab.all').replace('{count}', (memories.length + blocks.length).toString())}
                    </button>
                    <button
                        onClick={() => { setActiveTab('memory'); setVisibleCount(30); }}
                        className={`px-4 py-1.5 text-xs font-medium transition-all border-2 border-black ${activeTab === 'memory' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        style={{
                            clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                        }}
                    >
                        {t('memory.list.tab.memory').replace('{count}', memories.length.toString())}
                    </button>
                    <button
                        onClick={() => { setActiveTab('block'); setVisibleCount(30); }}
                        className={`px-4 py-1.5 text-xs font-medium transition-all border-2 border-black ${activeTab === 'block' ? 'bg-gradient-to-r from-orange-100 to-indigo-100 text-gray-900' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        style={{
                            clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                        }}
                    >
                        {t('memory.list.tab.widget').replace('{count}', blocks.length.toString())}
                    </button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('memory.list.search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(30); }}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border-[2px] border-black focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <PixelIcon name="search" size={14} />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50" onScroll={handleScroll}>
                {visibleItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <PixelIcon name="search" size={32} className="opacity-20" />
                        <p className="text-xs">{t('memory.list.noResult')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visibleItems.map((item) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                className="bg-white p-3 border-[2px] border-black hover:border-indigo-500 transition-all group flex items-start gap-3"
                                style={{
                                    clipPath: 'polygon(2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px), 0 2px, 2px 2px)'
                                }}
                            >
                                <div className={`shrink-0 w-8 h-8 border-[2px] border-black flex items-center justify-center ${item.type === 'memory' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'
                                    }`}>
                                    <PixelIcon
                                        name={item.type === 'memory' ? 'doc' : (
                                            item.title === t('onboarding.calendar') ? 'calendar' :
                                                item.title === t('memory.view.board.widget.minimap') ? 'minimap' :
                                                    item.title === t('memory.view.board.widget.viewer') ? 'viewer' : 'database'
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
                                            {formatDistanceToNow(item.createdAt, { 
                                                addSuffix: true, 
                                                locale: language === 'ko' ? ko : enUS 
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                        {item.content}
                                    </p>
                                </div>

                                <button
                                    onClick={() => item.type === 'memory' ? onDeleteMemory(item.id) : onDeleteBlock(item.id)}
                                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 border-[2px] border-transparent hover:border-red-500"
                                    title={t('common.delete')}
                                >
                                    <PixelIcon name="delete" size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
