'use client';

import { useState, useEffect } from 'react';
import { Persona } from '@/types';

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onPersonaChange: (personaId: string | null) => void;
}

const DEFAULT_PERSONAS = [
  { icon: '👨‍💼', name: 'HR 전문가', description: '채용, 인사, 조직 관리' },
  { icon: '👨‍🍳', name: '요리사', description: '레시피, 요리, 음식' },
  { icon: '💻', name: '개발자', description: '프로그래밍, 기술, 개발' },
  { icon: '📚', name: '학생', description: '공부, 학습, 교육' },
];

export default function PersonaSelector({ selectedPersonaId, onPersonaChange }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: '', icon: '👤', description: '', context: '' });

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      const res = await fetch('/api/personas');
      const data = await res.json();
      setPersonas(data.personas || []);
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const createPersona = async () => {
    if (!newPersona.name || !newPersona.icon) return;

    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPersona),
      });

      if (res.ok) {
        await loadPersonas();
        setIsCreating(false);
        setNewPersona({ name: '', icon: '👤', description: '', context: '' });
      }
    } catch (error) {
      console.error('Failed to create persona:', error);
    }
  };

  const deletePersona = async (id: string) => {
    if (!confirm('이 페르소나를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/personas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedPersonaId === id) {
          onPersonaChange(null);
        }
        await loadPersonas();
      }
    } catch (error) {
      console.error('Failed to delete persona:', error);
    }
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  return (
    <div className="relative">
      {/* 선택된 페르소나 또는 기본 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={selectedPersona ? `${selectedPersona.name}` : '페르소나 선택'}
      >
        <span className="text-2xl">{selectedPersona?.icon || '👤'}</span>
        <span className="text-sm font-medium text-gray-700">
          {selectedPersona?.name || '페르소나'}
        </span>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">페르소나 선택</h3>
              <p className="text-xs text-gray-500 mt-1">AI가 당신의 역할에 맞춰 분석합니다</p>
            </div>

            {/* 기본 모드 (페르소나 없음) */}
            <button
              onClick={() => {
                onPersonaChange(null);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 ${
                !selectedPersonaId ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-2xl">👤</span>
              <div className="flex-1">
                <div className="font-medium text-gray-800">기본 모드</div>
                <div className="text-xs text-gray-500">페르소나 없이 사용</div>
              </div>
              {!selectedPersonaId && (
                <span className="text-blue-500">✓</span>
              )}
            </button>

            {/* 페르소나 목록 */}
            {personas.map(persona => (
              <div
                key={persona.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 ${
                  selectedPersonaId === persona.id ? 'bg-blue-50' : ''
                }`}
              >
                <button
                  onClick={() => {
                    onPersonaChange(persona.id);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left flex items-center gap-3"
                >
                  <span className="text-2xl">{persona.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{persona.name}</div>
                    {persona.description && (
                      <div className="text-xs text-gray-500">{persona.description}</div>
                    )}
                  </div>
                  {selectedPersonaId === persona.id && (
                    <span className="text-blue-500">✓</span>
                  )}
                </button>
                <button
                  onClick={() => deletePersona(persona.id)}
                  className="p-1 hover:bg-red-100 rounded text-red-500 text-sm"
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
            ))}

            {/* 새 페르소나 만들기 */}
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-blue-600 font-medium"
              >
                <span className="text-2xl">➕</span>
                <span>새 페르소나 만들기</span>
              </button>
            )}

            {/* 새 페르소나 생성 폼 */}
            {isCreating && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="space-y-3">
                  {/* 이모티콘 선택 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">이모티콘</label>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_PERSONAS.map(p => (
                        <button
                          key={p.icon}
                          onClick={() => setNewPersona({ ...newPersona, icon: p.icon })}
                          className={`text-2xl p-2 rounded-lg border-2 ${
                            newPersona.icon === p.icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          {p.icon}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={newPersona.icon}
                        onChange={(e) => setNewPersona({ ...newPersona, icon: e.target.value })}
                        className="w-16 text-center p-2 border-2 border-gray-200 rounded-lg"
                        placeholder="😊"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  {/* 이름 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">이름 *</label>
                    <input
                      type="text"
                      value={newPersona.name}
                      onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                      placeholder="HR 전문가"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">설명</label>
                    <input
                      type="text"
                      value={newPersona.description}
                      onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                      placeholder="채용, 인사, 조직 관리"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* AI 컨텍스트 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">AI 컨텍스트 (역할/관심사)</label>
                    <textarea
                      value={newPersona.context}
                      onChange={(e) => setNewPersona({ ...newPersona, context: e.target.value })}
                      placeholder="HR 업무에 관심 많음. 채용 프로세스 개선, 조직 문화, 성과 관리 등에 대해 공부 중."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={3}
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={createPersona}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      만들기
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewPersona({ name: '', icon: '👤', description: '', context: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
