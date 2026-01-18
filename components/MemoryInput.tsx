'use client';

import { useState, useRef } from 'react';

interface MemoryInputProps {
  onMemoryCreated: () => void;
}

export default function MemoryInput({ onMemoryCreated }: MemoryInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setSuggestions([]);

    try {
      const formData = new FormData();
      formData.append('content', content);
      
      // 파일 추가
      files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/memories', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setContent('');
        setFiles([]);
        onMemoryCreated();

        // 조건부 제안 표시
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
      alert('기억 저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="아무 말이나 입력하세요... 형식 없음, 문장 엉망 OK"
            className="w-full min-h-[120px] px-4 py-3 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none resize-none"
            disabled={loading}
          />
        </div>

        {/* 첨부 파일 목록 */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
              >
                <span className="truncate max-w-[200px]">
                  {file.type.startsWith('image/') ? '🖼️' : '📎'} {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* 파일 선택 버튼 */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              📎 파일 첨부
            </button>
          </div>

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '저장 중...' : '기억해줘'}
          </button>
        </div>
      </form>

      {/* 조건부 제안 */}
      {suggestions.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            💡 이런 건 어때요?
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-amber-800">
                • {suggestion}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setSuggestions([])}
            className="mt-3 text-xs text-amber-600 hover:text-amber-800"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
