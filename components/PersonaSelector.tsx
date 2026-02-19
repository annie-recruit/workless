'use client';

import { useState, useEffect } from 'react';
import { Persona } from '@/types';
import PixelIcon from './PixelIcon';
import { useLanguage } from './LanguageContext';

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onPersonaChange: (personaId: string | null) => void;
  variant?: 'default' | 'fab';
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

export default function PersonaSelector({ selectedPersonaId, onPersonaChange, variant = 'default', ...props }: PersonaSelectorProps & React.HTMLAttributes<HTMLDivElement>) {
  const { t } = useLanguage();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const isFab = variant === 'fab';

  return (
    <div className={isFab ? 'relative' : 'relative'} {...props}>
      {/* 선택된 페르소나 또는 기본 아이콘 */}
      {isFab ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 border-3 ${
            selectedPersona
              ? 'bg-indigo-600 border-indigo-700 ring-3 ring-indigo-300 shadow-indigo-300/50 text-white'
              : 'bg-white border-gray-900 hover:bg-gray-50 text-gray-900'
          }`}
          title={selectedPersona ? `${selectedPersona.name}` : t('persona.selector.title')}
          data-tutorial-target="persona-selector"
        >
          {/* 픽셀 사람 아이콘 */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" className="drop-shadow-sm">
            <path d="m30.47 12.19 -1.52 0 0 3.05 -1.52 0 0 1.52 1.52 0 0 3.05 1.52 0 0 -3.05 1.53 0 0 -1.52 -1.53 0 0 -3.05z" fill="currentColor" strokeWidth="1"></path>
            <path d="M27.43 19.81h1.52v3.05h-1.52Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M27.43 9.14h1.52v3.05h-1.52Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M25.9 22.86h1.53v3.04H25.9Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M25.9 6.09h1.53v3.05H25.9Z" fill="currentColor" strokeWidth="1"></path>
            <path d="m24.38 24.38 -1.53 0 0 3.05 3.05 0 0 -1.53 -1.52 0 0 -1.52z" fill="currentColor" strokeWidth="1"></path>
            <path d="M22.85 4.57h3.05v1.52h-3.05Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M19.81 27.43h3.04v1.52h-3.04Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M19.81 22.86h3.04v1.52h-3.04Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M19.81 19.81h1.52v1.52h-1.52Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M19.81 3.05h3.04v1.52h-3.04Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M18.28 13.71h1.53v3.05h-1.53Z" fill="currentColor" strokeWidth="1"></path>
            <path d="m16.76 27.43 -1.53 0 0 1.52 -3.04 0 0 1.53 3.04 0 0 1.52 1.53 0 0 -1.52 3.05 0 0 -1.53 -3.05 0 0 -1.52z" fill="currentColor" strokeWidth="1"></path>
            <path d="M12.19 21.33h7.62v1.53h-7.62Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M13.71 18.28h4.57v1.53h-4.57Z" fill="currentColor" strokeWidth="1"></path>
            <path d="m15.23 4.57 1.53 0 0 -1.52 3.05 0 0 -1.53 -3.05 0 0 -1.52 -1.53 0 0 1.52 -3.04 0 0 1.53 3.04 0 0 1.52z" fill="currentColor" strokeWidth="1"></path>
            <path d="M12.19 13.71h1.52v3.05h-1.52Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M9.14 27.43h3.05v1.52H9.14Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M9.14 22.86h3.05v1.52H9.14Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M10.66 19.81h1.53v1.52h-1.53Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M9.14 3.05h3.05v1.52H9.14Z" fill="currentColor" strokeWidth="1"></path>
            <path d="m10.66 12.19 1.53 0 0 -1.52 7.62 0 0 1.52 1.52 0 0 7.62 1.52 0 0 -10.67 -1.52 0 0 -1.52 -1.52 0 0 -1.53 -7.62 0 0 1.53 -1.53 0 0 1.52 -1.52 0 0 10.67 1.52 0 0 -7.62z" fill="currentColor" strokeWidth="1"></path>
            <path d="m7.62 24.38 0 1.52 -1.53 0 0 1.53 3.05 0 0 -3.05 -1.52 0z" fill="currentColor" strokeWidth="1"></path>
            <path d="M6.09 4.57h3.05v1.52H6.09Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M4.57 22.86h1.52v3.04H4.57Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M4.57 6.09h1.52v3.05H4.57Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M3.04 19.81h1.53v3.05H3.04Z" fill="currentColor" strokeWidth="1"></path>
            <path d="M3.04 9.14h1.53v3.05H3.04Z" fill="currentColor" strokeWidth="1"></path>
            <path d="m4.57 16.76 0 -1.52 -1.53 0 0 -3.05 -1.52 0 0 3.05 -1.52 0 0 1.52 1.52 0 0 3.05 1.52 0 0 -3.05 1.53 0z" fill="currentColor" strokeWidth="1"></path>
          </svg>
          {/* 선택된 페르소나 인디케이터 */}
          {selectedPersona && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={selectedPersona ? `${selectedPersona.name}` : t('persona.selector.title')}
          data-tutorial-target="persona-selector"
        >
          <PixelIcon name="persona_default" size={24} className="flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700">
            {selectedPersona?.name || t('persona.selector.default')}
          </span>
        </button>
      )}

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 */}
          <div className={`absolute w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[420px] overflow-y-auto font-galmuri11 ${
            isFab ? 'bottom-full right-0 mb-3' : 'top-full left-0 mt-2'
          }`}>
            {/* 헤더 */}
            <div className="px-3 py-2.5 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-800">{t('persona.selector.title')}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{t('persona.selector.desc')}</p>
            </div>

            {/* 기본 모드 (페르소나 없음) */}
            <button
              onClick={() => {
                onPersonaChange(null);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 ${
                !selectedPersonaId ? 'bg-blue-50' : ''
              }`}
            >
              <PixelIcon name="persona_default" size={16} className="flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-800">{t('persona.selector.default')}</div>
                <div className="text-[10px] text-gray-500">{t('persona.selector.default.desc')}</div>
              </div>
              {!selectedPersonaId && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
            </button>

            {/* 페르소나 목록 */}
            {personas.map(persona => (
              <div
                key={persona.id}
                className={`px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 ${
                  selectedPersonaId === persona.id ? 'bg-blue-50' : ''
                }`}
              >
                <button
                  onClick={() => {
                    onPersonaChange(persona.id);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <PixelIcon name="persona_default" size={16} className="flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-800">{persona.name}</div>
                    {persona.description && (
                      <div className="text-[10px] text-gray-500">{persona.description}</div>
                    )}
                  </div>
                  {selectedPersonaId === persona.id && (
                    <span className="text-blue-500 text-xs">✓</span>
                  )}
                </button>
                <button
                  onClick={() => deletePersona(persona.id)}
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                  title={t('common.delete')}
                >
                  <PixelIcon name="trash-alt" size={12} />
                </button>
              </div>
            ))}

            {/* 새 페르소나 만들기 */}
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600 text-xs font-medium"
              >
                <PixelIcon name="plus" size={14} />
                <span>{t('persona.selector.create')}</span>
              </button>
            )}

            {/* 새 페르소나 생성 폼 */}
            {isCreating && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <div className="space-y-2">
                  {/* 아이콘 선택 */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-1">{t('persona.selector.modal.icon')}</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DEFAULT_PERSONAS.map(p => (
                        <button
                          key={p.iconName}
                          onClick={() => setNewPersona({ ...newPersona, icon: p.iconName })}
                          className={`p-1.5 rounded-lg border flex items-center justify-center ${
                            newPersona.icon === p.iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          style={{ width: '36px', height: '36px' }}
                          title={p.name}
                        >
                          <PixelIcon name={p.iconName} size={22} />
                        </button>
                      ))}
                      <div className="text-[10px] text-gray-500 self-center px-1">
                        {t('persona.selector.modal.icon.manual')}
                      </div>
                      <input
                        type="text"
                        value={newPersona.icon}
                        onChange={(e) => setNewPersona({ ...newPersona, icon: e.target.value })}
                        className="w-16 text-center p-1 border border-gray-200 rounded-lg text-[10px]"
                        placeholder="icon name"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  {/* 이름 */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">{t('persona.selector.modal.name')}</label>
                    <input
                      type="text"
                      value={newPersona.name}
                      onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                      placeholder={t('persona.selector.modal.name.placeholder')}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">{t('persona.selector.modal.desc')}</label>
                    <input
                      type="text"
                      value={newPersona.description}
                      onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                      placeholder={t('persona.selector.modal.desc.placeholder')}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* AI 컨텍스트 */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">{t('persona.selector.modal.context')}</label>
                    <textarea
                      value={newPersona.context}
                      onChange={(e) => setNewPersona({ ...newPersona, context: e.target.value })}
                      placeholder={t('persona.selector.modal.context.placeholder')}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
                      rows={2}
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={createPersona}
                      className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                    >
                      {t('persona.selector.modal.button.create')}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewPersona({ name: '', icon: 'persona_default', description: '', context: '' });
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
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
