'use client';

import React, { useState } from 'react';
import PixelIcon from './PixelIcon';

interface GmailImportButtonProps {
    onImportComplete?: (count: number) => void;
}

export const GmailImportButton: React.FC<GmailImportButtonProps> = ({ onImportComplete }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importCount, setImportCount] = useState(0);

    const handleImport = async () => {
        if (status === 'loading') return;

        setStatus('loading');
        try {
            const response = await fetch('/api/import/gmail', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setImportCount(data.count);
                setStatus('success');
                onImportComplete?.(data.count);

                // 3초 후 초기화
                setTimeout(() => {
                    setStatus('idle');
                }, 3000);
            } else {
                console.error('Import failed:', data.error);
                setStatus('error');
            }
        } catch (error) {
            console.error('Import error:', error);
            setStatus('error');
        }
    };

    return (
        <button
            onClick={handleImport}
            disabled={status === 'loading'}
            title="Gmail에서 메일 가져오기"
            className={`
                px-2 py-1 text-xs rounded border flex items-center gap-1 transition-all duration-200
                ${status === 'idle' ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700' : ''}
                ${status === 'loading' ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
                ${status === 'success' ? 'border-green-200 bg-green-50 text-green-700' : ''}
                ${status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : ''}
            `}
        >
            {status === 'loading' ? (
                <PixelIcon name="refresh" size={16} className="animate-spin" />
            ) : status === 'success' ? (
                <PixelIcon name="success" size={16} />
            ) : status === 'error' ? (
                <PixelIcon name="error" size={16} />
            ) : (
                <PixelIcon name="mail" size={16} />
            )}

            <span className="font-medium whitespace-nowrap">
                {status === 'loading' ? 'Importing...' :
                    status === 'success' ? (importCount > 0 ? `${importCount} Imported` : 'No new mail') :
                        status === 'error' ? 'Failed' :
                            'Import from Gmail'}
            </span>
        </button>
    );
};
