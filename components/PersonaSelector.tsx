'use client';

import { useState, useEffect } from 'react';
import { Persona } from '@/types';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onPersonaChange: (personaId: string | null) => void;
  isFloating?: boolean;
}

// 이모지 → PixelIcon name 매핑
const EMOJI_TO_ICON: Record<string, string> = {
  '👤': 'persona_default',
  '👨‍💼': 'persona_hr',
  '👨‍🍳': 'persona_chef',
  '💻': 'persona_developer',
  '📚': 'persona_student',
};

const DEFAULT_PERSONAS = [
  { icon: '👨‍💼', iconName: 'persona_hr', name: 'HR 전문가', description: '채용, 인사, 조직 관리' },
  { icon: '👨‍🍳', iconName: 'persona_chef', name: '요리사', description: '레시피, 요리, 음식' },
  { icon: '💻', iconName: 'persona_developer', name: '개발자', description: '프로그래밍, 기술, 개발' },
  { icon: '📚', iconName: 'persona_student', name: '학생', description: '공부, 학습, 교육' },
];

// 이모지 또는 아이콘 이름을 PixelIcon name으로 변환
function getIconName(icon: string): string | null {
  // 이미 iconName 형식이면 그대로 사용
  if (icon.startsWith('persona_')) {
    return icon;
  }
  // 이모지면 매핑된 이름 반환
  return EMOJI_TO_ICON[icon] || null;
}

export default function PersonaSelector({ selectedPersonaId, onPersonaChange, isFloating = false, ...props }: PersonaSelectorProps & React.HTMLAttributes<HTMLDivElement>) {
  const { t } = useLanguage();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: '', icon: 'persona_default', description: '', context: '' });

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
        setNewPersona({ name: '', icon: 'persona_default', description: '', context: '' });
      }
    } catch (error) {
      console.error('Failed to create persona:', error);
    }
  };

  const generateContext = async () => {
    if (!newPersona.description) {
      alert(t('persona.selector.generate.noDesc') || '설명을 먼저 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/personas/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersona.name,
          description: newPersona.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewPersona(prev => ({ ...prev, context: data.context }));
      } else {
        alert('AI 컨텍스트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to generate context:', error);
      alert('AI 컨텍스트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePersona = async (id: string) => {
    if (!confirm(t('persona.selector.delete.confirm'))) return;

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
    <div className="relative" {...props}>
      {/* 선택된 페르소나 또는 기본 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 transition-all ${
          isFloating 
            ? 'w-14 h-14 rounded-full bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 justify-center'
            : 'px-3 py-2 rounded-lg hover:bg-gray-100'
        }`}
        title={selectedPersona ? `${selectedPersona.name}` : t('persona.selector.title')}
        data-tutorial-target="persona-selector"
      >
        <PixelIcon name={selectedPersona?.icon || 'persona_default'} size={isFloating ? 28 : 24} className="flex-shrink-0" />
        {!isFloating && (
          <span className="text-sm font-medium text-gray-700">
            {selectedPersona?.name || t('persona.selector.default')}
          </span>
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-[105]"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 */}
          <div className={`absolute z-[110] bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] w-80 max-h-[300px] overflow-y-auto ${
            isFloating ? 'bottom-full right-0 mb-4' : 'top-full left-0 mt-2'
          }`}>
            {/* 헤더 */}
            <div className="p-4 border-b-2 border-gray-900 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
                  <PixelIcon name="users" size={18} />
                  {t('persona.selector.title')}
                </h3>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{t('persona.selector.desc')}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-900">
                <PixelIcon name="close" size={18} />
              </button>
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
              {/* 페르소나 아이콘 표시 */}
              <PixelIcon name="persona_default" size={24} className="flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{t('persona.selector.default')}</div>
                <div className="text-xs text-gray-500">{t('persona.selector.default.desc')}</div>
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
                  {/* 페르소나 아이콘 표시 */}
                  <PixelIcon name={persona.icon || "persona_default"} size={24} className="flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{persona.name}</div>
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
                  title={t('common.delete')}
                >
                  <PixelIcon name="delete" size={16} />
                </button>
              </div>
            ))}

            {/* 새 페르소나 만들기 */}
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-blue-600 font-medium"
              >
                <PixelIcon name="plus" size={20} />
                <span>{t('persona.selector.create')}</span>
              </button>
            )}

            {/* 새 페르소나 생성 폼 */}
            {isCreating && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="space-y-3">
                  {/* 아이콘 선택 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('persona.selector.modal.icon')}</label>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_PERSONAS.map(p => (
                        <button
                          key={p.iconName}
                          onClick={() => setNewPersona({ ...newPersona, icon: p.iconName })}
                          className={`p-2 rounded-lg border flex items-center justify-center ${
                            newPersona.icon === p.iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          style={{ width: '48px', height: '48px' }}
                          title={p.name}
                        >
                          <PixelIcon name={p.iconName} size={32} />
                        </button>
                      ))}
                      <div className="text-xs text-gray-500 self-center px-2">
                        {t('persona.selector.modal.icon.manual')}
                      </div>
                      <input
                        type="text"
                        value={newPersona.icon}
                        onChange={(e) => setNewPersona({ ...newPersona, icon: e.target.value })}
                        className="w-20 text-center p-2 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400"
                        placeholder="icon name"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  {/* 이름 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('persona.selector.modal.name')}</label>
                    <input
                      type="text"
                      value={newPersona.name}
                      onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                      placeholder={t('persona.selector.modal.name.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('persona.selector.modal.desc')}</label>
                    <input
                      type="text"
                      value={newPersona.description}
                      onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                      placeholder={t('persona.selector.modal.desc.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  {/* AI 컨텍스트 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">{t('persona.selector.modal.context')}</label>
                      <button
                        onClick={generateContext}
                        disabled={isGenerating || !newPersona.description}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 flex items-center gap-1"
                      >
                        {isGenerating ? (
                          <span className="animate-spin">⌛</span>
                        ) : (
                          <PixelIcon name="sparkles" size={10} />
                        )}
                        {isGenerating ? '생성 중...' : 'AI 생성'}
                      </button>
                    </div>
                    <textarea
                      value={newPersona.context}
                      onChange={(e) => setNewPersona({ ...newPersona, context: e.target.value })}
                      placeholder={t('persona.selector.modal.context.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-gray-900 placeholder-gray-400"
                      rows={3}
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={createPersona}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      {t('persona.selector.modal.button.create')}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewPersona({ name: '', icon: 'persona_default', description: '', context: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      {t('common.cancel')}
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
