'use client';

import { useState } from 'react';
import { Memory, CanvasBlock, CalendarBlockConfig, MeetingRecorderBlockConfig, DatabaseBlockConfig, ActionProject } from '@/types';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';

interface WidgetSynergyToastProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMemoryIds: Set<string>;
  selectedBlockIds: Set<string>;
  memories: Memory[];
  blocks: CanvasBlock[];
  projects: ActionProject[];
  onSynergyComplete?: () => void;
  personaId?: string | null;
}

type SynergyType =
  | 'meeting-recorder-calendar'
  | 'database-memory'
  | 'calendar-memory'
  | 'action-plan-calendar'
  | 'meeting-recorder-action-plan'
  | 'action-plan-database';

interface SynergyOption {
  type: SynergyType;
  label: string;
  description: string;
  icon: string;
}

export default function WidgetSynergyToast({
  isOpen,
  onClose,
  selectedMemoryIds,
  selectedBlockIds,
  memories,
  blocks,
  projects,
  onSynergyComplete,
  personaId,
}: WidgetSynergyToastProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSynergy, setSelectedSynergy] = useState<SynergyType | null>(null);

  if (!isOpen) return null;

  // 선택된 항목들 가져오기
  const selectedMemories = memories.filter(m => selectedMemoryIds.has(m.id));
  const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
  const selectedProjects = projects.filter(p => selectedMemoryIds.has(p.id));

  // 사용 가능한 시너지 옵션 감지
  const availableSynergies: SynergyOption[] = [];

  // 1. 미팅녹음 - 캘린더
  const meetingRecorderBlock = selectedBlocks.find(b => b.type === 'meeting-recorder');
  const calendarBlock = selectedBlocks.find(b => b.type === 'calendar');
  if (meetingRecorderBlock && calendarBlock) {
    // 미팅녹음 위젯에 실제 녹음 내용이 있는지 확인
    const meetingConfig = meetingRecorderBlock.config as MeetingRecorderBlockConfig;
    const hasContent = (meetingConfig.script && meetingConfig.script.trim()) || 
                      (meetingConfig.summary && meetingConfig.summary.trim());
    
    if (hasContent) {
      availableSynergies.push({
        type: 'meeting-recorder-calendar',
        label: '미팅녹음 → 캘린더',
        description: '회의록을 분석하여 캘린더에 투두 생성',
        icon: 'calendar',
      });
    }
  }

  // 2. 데이터베이스 - 카드
  const databaseBlock = selectedBlocks.find(b => b.type === 'database');
  if (databaseBlock && selectedMemories.length > 0) {
    availableSynergies.push({
      type: 'database-memory',
      label: '카드 → 데이터베이스',
      description: '기록 카드 내용을 데이터베이스로 정리',
      icon: 'database',
    });
  }

  // 3. 캘린더 - 카드
  if (calendarBlock && selectedMemories.length > 0) {
    availableSynergies.push({
      type: 'calendar-memory',
      label: '카드 → 캘린더',
      description: '일정 관련 기록을 캘린더에 동기화',
      icon: 'calendar',
    });
  }

  // 4. 액션플랜 - 캘린더
  if (selectedProjects.length > 0 && calendarBlock) {
    availableSynergies.push({
      type: 'action-plan-calendar',
      label: '액션플랜 → 캘린더',
      description: '액션플랜의 일정/단계를 캘린더에 연동',
      icon: 'calendar',
    });
  }

  // 5. 미팅녹음 - 액션플랜
  if (meetingRecorderBlock && selectedProjects.length > 0) {
    // 미팅녹음 위젯에 실제 녹음 내용이 있는지 확인
    const meetingConfig = meetingRecorderBlock.config as MeetingRecorderBlockConfig;
    const hasContent = (meetingConfig.script && meetingConfig.script.trim()) || 
                      (meetingConfig.summary && meetingConfig.summary.trim());
    
    if (hasContent) {
      availableSynergies.push({
        type: 'meeting-recorder-action-plan',
        label: '미팅녹음 → 액션플랜',
        description: '회의록을 AI가 액션플랜으로 생성',
        icon: 'success',
      });
    }
  }

  // 6. 액션플랜 - 데이터베이스
  if (selectedProjects.length > 0 && databaseBlock) {
    availableSynergies.push({
      type: 'action-plan-database',
      label: '액션플랜 → 데이터베이스',
      description: '액션플랜을 데이터베이스 테이블로 변환',
      icon: 'database',
    });
  }

  const handleSynergy = async (synergyType: SynergyType) => {
    setIsProcessing(true);
    setSelectedSynergy(synergyType);

    try {
      const response = await fetch('/api/widget-synergy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synergyType,
          memoryIds: Array.from(selectedMemoryIds),
          blockIds: Array.from(selectedBlockIds),
          projectIds: selectedProjects.map(p => p.id),
          personaId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`시너지 적용 완료: ${data.message || '성공'}`);
        onSynergyComplete?.();
        onClose();
      } else {
        const error = await response.json();
        alert(`시너지 적용 실패: ${error.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Synergy error:', error);
      alert('시너지 적용 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
      setSelectedSynergy(null);
    }
  };

  if (availableSynergies.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up font-galmuri11">
      <div className="bg-white border-4 border-purple-700 p-4 min-w-[320px] max-w-[380px] shadow-[8px_8px_0px_0px_rgba(126,34,206,0.4)] relative">
        {/* 픽셀 코너 장식 */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-purple-700" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-700" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-purple-700" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-purple-700" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PixelIcon name="link" size={16} />
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              시너지 액션 제안
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-800 transition-colors text-xl leading-none"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {availableSynergies.map((synergy) => (
            <button
              key={synergy.type}
              onClick={() => handleSynergy(synergy.type)}
              disabled={isProcessing}
              className={`w-full p-2.5 border-2 transition-all text-left group ${
                selectedSynergy === synergy.type
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2">
                <PixelIcon name={synergy.icon as any} size={16} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-gray-800">{synergy.label}</h3>
                  <p className="text-[10px] text-gray-600 truncate">{synergy.description}</p>
                </div>
                {isProcessing && selectedSynergy === synergy.type && (
                  <div className="flex-shrink-0">
                    <ProcessingLoader size={14} variant="inline" tone="indigo" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-3 pt-2 border-t-2 border-gray-200 flex items-center justify-center">
          <span className="text-[10px] text-gray-500 font-bold">
            {selectedMemories.length}개 기록 · {selectedBlocks.length}개 위젯
          </span>
        </div>
      </div>
    </div>
  );
}
