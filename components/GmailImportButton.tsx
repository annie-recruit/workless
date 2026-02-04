'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';
import { useLanguage } from './LanguageContext';

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
    variant?: 'default' | 'minimal';
}

export const GmailImportButton: React.FC<GmailImportButtonProps> = ({ onImportComplete, variant = 'default' }) => {
    const { t, language } = useLanguage();
    const [status, setStatus] = useState<'idle' | 'loading' | 'selecting' | 'importing' | 'success' | 'error'>('idle');
    const [emails, setEmails] = useState<GmailEmail[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [importCount, setImportCount] = useState(0);

    // 상태 변화 디버깅
    useEffect(() => {
        console.log('[GmailImport] Status changed to:', status);
        console.log('[GmailImport] Emails length:', emails.length);
    }, [status, emails.length]);

    const fetchEmails = async () => {
        setStatus('loading');
        try {
            console.log('[GmailImport] Fetching emails...');
            const response = await fetch('/api/import/gmail');
            console.log('[GmailImport] Response status:', response.status);
            const data = await response.json();
            console.log('[GmailImport] Response data:', data);

            if (response.status === 403 || data.code === 'INSUFFICIENT_SCOPES') {
                console.log('[GmailImport] Insufficient scopes - triggering re-auth');
                // 권한이 없는 경우 동의 화면을 강제로 띄우기 위해 재로그인 시도
                signIn('google', {
                    callbackUrl: window.location.href,
                    prompt: 'consent'
                });
                return;
            }

            if (response.ok) {
                console.log('[GmailImport] Success - emails count:', data.emails?.length || 0);
                console.log('[GmailImport] Emails data:', data.emails);
                setEmails(data.emails || []);
                console.log('[GmailImport] Setting status to selecting...');
                setStatus('selecting');
                // 아직 임포트되지 않은 메일들만 기본 선택
                const unimportedIds = (data.emails as GmailEmail[])
                    ?.filter(e => !e.isImported)
                    .map(e => e.messageId);
                console.log('[GmailImport] Unimported IDs:', unimportedIds);
                setSelectedIds(new Set(unimportedIds));
            } else {
                console.error('[GmailImport] API error:', data);
                setStatus('error');
            }
        } catch (error) {
            console.error('[GmailImport] Fetch error:', error);
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
                title={t('memory.view.board.import.gmail')}
                className={variant === 'minimal'
                    ? `w-full flex items-center justify-between p-3 rounded-xl transition-all ${status === 'idle' ? 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600' : 'bg-indigo-50 text-indigo-700'}`
                    : `px-2 py-1 text-xs rounded border flex items-center gap-1 transition-all duration-200 font-galmuri11
                    ${status === 'idle' ? 'border-gray-200 bg-white/40 backdrop-blur-sm hover:bg-white/60 text-gray-700' : ''}
                    ${(status === 'loading' || status === 'importing' || status === 'selecting') ? 'border-gray-200 bg-gray-50/30 text-gray-400 cursor-not-allowed' : ''}
                    ${status === 'success' ? 'border-green-200 bg-green-50/50 text-green-700' : ''}
                    ${status === 'error' ? 'border-red-200 bg-red-50/50 text-red-700' : ''}`
                }
            >
                <div className="flex items-center gap-3">
                    {status === 'loading' || status === 'importing' ? (
                        <PixelIcon name="refresh" size={variant === 'minimal' ? 18 : 16} className="animate-spin" />
                    ) : status === 'success' ? (
                        <PixelIcon name="success" size={variant === 'minimal' ? 18 : 16} />
                    ) : status === 'error' ? (
                        <PixelIcon name="error" size={variant === 'minimal' ? 18 : 16} />
                    ) : (
                        <PixelIcon name="mail" size={variant === 'minimal' ? 18 : 16} />
                    )}

                    <span className={variant === 'minimal' ? "text-xs font-bold" : "font-medium whitespace-nowrap"}>
                        {status === 'loading' ? t('gmail.import.checking') :
                            status === 'importing' ? t('gmail.import.importing') :
                                status === 'selecting' ? t('gmail.import.selecting') :
                                    status === 'success' ? (importCount > 0 ? t('memory.view.board.import.gmail.success').replace('{count}', importCount.toString()) : t('gmail.import.noNewMail')) :
                                        status === 'error' ? t('gmail.import.failed') :
                                            t('memory.view.board.import.gmail')}
                    </span>
                </div>
                {variant === 'minimal' && <PixelIcon name="arrow" size={14} />}
            </button>

            {/* 메일 선택 토스트 UI */}
            {status === 'selecting' && (
                <div className="fixed bottom-20 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-4 border-gray-900 p-5 w-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        {/* 픽셀 코너 장식 */}
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                                <div>
                                    <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{t('gmail.import.title')}</p>
                                    <p className="text-xs text-gray-500">{t('gmail.import.desc')}</p>
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
                                    <p className="text-center py-8 text-xs text-gray-400">{t('gmail.import.empty')}</p>
                                ) : (
                                    emails.map((email) => (
                                        <div
                                            key={email.messageId}
                                            onClick={() => toggleSelect(email.messageId)}
                                            className={`
                                                p-3 border-2 transition-all cursor-pointer relative group
                                                ${selectedIds.has(email.messageId)
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : email.isImported
                                                        ? 'border-gray-200 bg-gray-50/50 opacity-80'
                                                        : 'border-gray-200 bg-white hover:border-gray-400'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold truncate ${email.isImported && !selectedIds.has(email.messageId) ? 'text-gray-500' : 'text-gray-800'}`}>
                                                        {email.subject || (language === 'ko' ? '(제목 없음)' : '(No Subject)')}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                                        {email.from}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0 pt-0.5">
                                                    {selectedIds.has(email.messageId) ? (
                                                        <PixelIcon name="success" size={14} className="text-indigo-600" />
                                                    ) : email.isImported ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[10px] bg-gray-200 text-gray-500 px-1 font-bold">{t('gmail.import.alreadyImported')}</span>
                                                            <div className="w-3.5 h-3.5 border-2 border-gray-300 group-hover:border-gray-400" />
                                                        </div>
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
                                    {t('gmail.import.button.cancel')}
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
                                    {t('gmail.import.button.import').replace('{count}', selectedIds.size.toString())}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 임포트 중 로딩 토스트 */}
            {status === 'importing' && (
                <div className="fixed bottom-20 right-6 z-[9999] animate-slide-up font-galmuri11">
                    <div className="bg-white border-4 border-gray-900 p-5 min-w-[300px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

                        <div className="flex items-center gap-3">
                            <ProcessingLoader size={20} variant="inline" tone="indigo" />
                            <div>
                                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{t('gmail.import.toast.analyzing')}</p>
                                <p className="text-xs text-gray-600">{t('gmail.import.toast.converting')}</p>
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
