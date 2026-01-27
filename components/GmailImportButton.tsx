'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';

interface GmailEmail {
    messageId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    isImported?: boolean;
}

interface GmailImportButtonProps {
    onImportComplete?: (count: number) => void;
}

export const GmailImportButton: React.FC<GmailImportButtonProps> = ({ onImportComplete }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'selecting' | 'importing' | 'success' | 'error'>('idle');
    const [emails, setEmails] = useState<GmailEmail[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [importCount, setImportCount] = useState(0);

    const fetchEmails = async () => {
        setStatus('loading');
        try {
            const response = await fetch('/api/import/gmail');
            const data = await response.json();

            if (response.status === 403 || data.code === 'INSUFFICIENT_SCOPES') {
                // 권한이 없는 경우 동의 화면을 강제로 띄우기 위해 재로그인 시도
                signIn('google', { 
                    callbackUrl: window.location.href, 
                    prompt: 'consent' 
                });
                return;
            }

            if (response.ok) {
                setEmails(data.emails || []);
                setStatus('selecting');
                // 아직 임포트되지 않은 메일들만 기본 선택
                const unimportedIds = (data.emails as GmailEmail[])
                    ?.filter(e => !e.isImported)
                    .map(e => e.messageId);
                setSelectedIds(new Set(unimportedIds));
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setStatus('error');
        }
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;

        setStatus('importing');
        try {
            const response = await fetch('/api/import/gmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: Array.from(selectedIds) }),
            });

            const data = await response.json();

            if (response.ok) {
                setImportCount(data.count);
                setStatus('success');
                onImportComplete?.(data.count);
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Import error:', error);
            setStatus('error');
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    return (
        <>
            <button
                onClick={fetchEmails}
                disabled={status === 'loading' || status === 'importing' || status === 'selecting'}
                title="Gmail에서 메일 가져오기"
                className={`
                    px-2 py-1 text-xs rounded border flex items-center gap-1 transition-all duration-200 font-galmuri11
                    ${status === 'idle' ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700' : ''}
                    ${(status === 'loading' || status === 'importing' || status === 'selecting') ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
                    ${status === 'success' ? 'border-green-200 bg-green-50 text-green-700' : ''}
                    ${status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : ''}
                `}
            >
                {status === 'loading' || status === 'importing' ? (
                    <PixelIcon name="refresh" size={16} className="animate-spin" />
                ) : status === 'success' ? (
                    <PixelIcon name="success" size={16} />
                ) : status === 'error' ? (
                    <PixelIcon name="error" size={16} />
                ) : (
                    <PixelIcon name="mail" size={16} />
                )}

                <span className="font-medium whitespace-nowrap">
                    {status === 'loading' ? 'Checking...' :
                        status === 'importing' ? 'Importing...' :
                            status === 'selecting' ? 'Selecting...' :
                                status === 'success' ? (importCount > 0 ? `${importCount} Imported` : 'No new mail') :
                                    status === 'error' ? 'Failed' :
                                        'Import from Gmail'}
                </span>
            </button>

            {/* 메일 선택 토스트 UI */}
            {status === 'selecting' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-4 border-gray-900 p-5 w-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        {/* 픽셀 코너 장식 */}
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                                <div>
                                    <p className="text-sm font-black text-gray-800 uppercase tracking-tight">Gmail 메일 선택</p>
                                    <p className="text-xs text-gray-500">가져올 메일을 선택해주세요 (라벨: Workless)</p>
                                </div>
                                <button 
                                    onClick={() => setStatus('idle')}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <PixelIcon name="close" size={16} />
                                </button>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {emails.length === 0 ? (
                                    <p className="text-center py-8 text-xs text-gray-400">가져올 수 있는 메일이 없습니다.</p>
                                ) : (
                                    emails.map((email) => (
                                        <div 
                                            key={email.messageId}
                                            onClick={() => !email.isImported && toggleSelect(email.messageId)}
                                            className={`
                                                p-3 border-2 transition-all cursor-pointer relative group
                                                ${email.isImported 
                                                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                                                    : selectedIds.has(email.messageId)
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-200 bg-white hover:border-gray-400'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold truncate ${email.isImported ? 'text-gray-400' : 'text-gray-800'}`}>
                                                        {email.subject || '(제목 없음)'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                                        {email.from}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0 pt-0.5">
                                                    {email.isImported ? (
                                                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1 font-bold">이미 추가됨</span>
                                                    ) : selectedIds.has(email.messageId) ? (
                                                        <PixelIcon name="success" size={14} className="text-indigo-600" />
                                                    ) : (
                                                        <div className="w-3.5 h-3.5 border-2 border-gray-300 group-hover:border-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-1 font-light">
                                                {email.snippet}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="flex-1 py-2 text-xs font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={selectedIds.size === 0}
                                    className={`
                                        flex-2 px-6 py-2 text-xs font-bold transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]
                                        ${selectedIds.size > 0 
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:translate-y-[2px] active:shadow-none' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                                    `}
                                >
                                    {selectedIds.size}개 메일 가져오기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 임포트 중 로딩 토스트 */}
            {status === 'importing' && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-4 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        
                        <div className="flex items-center gap-3">
                            <ProcessingLoader size={20} variant="inline" tone="indigo" />
                            <div>
                                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">메일을 분석하고 있어요</p>
                                <p className="text-xs text-gray-600">AI가 기록으로 변환 중입니다...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 0;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
};
