'use client';

import { useState } from 'react';
import { quickAddMemory } from '@/app/actions/quickAdd';
import PixelIcon from './PixelIcon';

interface QuickAddProps {
    onMemoryCreated: (memory?: any) => void;
    onClose: () => void;
}

export default function QuickAdd({ onMemoryCreated, onClose }: QuickAddProps) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (focusAfter: boolean = false) => {
        if (!text.trim()) {
            setError('텍스트를 입력해주세요');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Server Action 호출 (API 키 노출 없음)
            const result = await quickAddMemory(text.trim(), title.trim() || undefined);

            if (!result.success) {
                throw new Error(result.error || '저장에 실패했습니다');
            }

            // 성공
            setTitle('');
            setText('');
            onMemoryCreated({ id: result.cardId, deduped: result.deduped });

            if (!focusAfter) {
                onClose();
            }
        } catch (err) {
            console.error('Quick Add error:', err);
            setError(err instanceof Error ? err.message : '저장에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <PixelIcon name="plus" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">빠른 추가</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* 제목 (선택) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            제목 (선택)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled={loading}
                        />
                    </div>

                    {/* 텍스트 (필수) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            텍스트 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="내용을 입력하세요..."
                            rows={8}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            disabled={loading}
                        />
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        <PixelIcon name="info" size={16} className="inline mr-1" />
                        즉시 저장됩니다 (AI 분석 없음)
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading || !text.trim()}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? '저장 중...' : '추가'}
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={loading || !text.trim()}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? '저장 중...' : '추가 & 포커스'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
