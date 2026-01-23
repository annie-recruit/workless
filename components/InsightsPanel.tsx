'use client';

import { useState, useEffect } from 'react';
import { Goal } from '@/types';

interface Insights {
  summary: string;
  topTopics: { topic: string; count: number }[];
  trends: string[];
  suggestions: string[];
  keywordCloud?: { keyword: string; count: number }[];
}

interface InsightsPanelProps {
  personaId: string | null;
}

export default function InsightsPanel({ personaId }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = personaId 
        ? `/api/insights?personaId=${personaId}` 
        : '/api/insights';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || '인사이트를 불러올 수 없습니다';
        setError(errorMessage);
        console.error('Insights API error:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setError('인사이트를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [personaId]);

  if (loading) {
    return (
      <div className="h-full flex items-start justify-center pt-12">
        <div className="text-gray-400">분석 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-2">⚠️ 오류</div>
        <div className="text-gray-600 text-sm text-center mb-4">{error}</div>
        <button
          onClick={fetchInsights}
          className="px-4 py-2 bg-indigo-500 text-white border-2 border-indigo-600 hover:bg-indigo-600 text-sm"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">인사이트를 불러올 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* 상단 배너 - 메인 헤더와 단차 맞추기 */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-indigo-600 px-6 py-12 text-white">
        <div className="mb-3">
          <div className="text-sm opacity-90 mb-1">
            {new Date().toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric',
              weekday: 'short'
            })}
          </div>
          <h2 className="text-2xl font-bold">데일리 정리 시간</h2>
        </div>
        <p className="text-sm opacity-90">
          오늘 하루를 돌아보고<br />
          내일을 준비해요
        </p>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="space-y-6 p-6">
        {/* 새로고침 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={fetchInsights}
            className="text-sm text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>

        {/* 전체 요약 */}
        <div className="bg-gradient-to-br from-orange-50 to-indigo-50 p-4 border-2 border-indigo-300">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">💭 요약</h3>
          <p className="text-gray-700 leading-relaxed text-sm">
            {insights.summary}
          </p>
        </div>

        {/* 진행 중인 목표 */}
        <GoalsSection />

        {/* 주요 주제 */}
        {insights.topTopics.length > 0 && (
          <div className="bg-white p-4 border-2 border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🏷️ 주요 주제</h3>
            <div className="space-y-2">
              {insights.topTopics.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.topic}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all"
                        style={{ 
                          width: `${(item.count / insights.topTopics[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {item.count}개
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 트렌드 - 숨김 */}

        {/* 제안 */}
        {insights.suggestions.length > 0 && (
          <div className="bg-gray-50 p-4 border-2 border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 제안</h3>
            <ul className="space-y-2">
              {insights.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="mt-0.5">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// 목표 섹션 컴포넌트
function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        // active 상태의 목표만 표시
        setGoals(data.goals.filter((g: Goal) => g.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();

    // goal-updated 이벤트 리스너
    const handleGoalUpdate = () => {
      fetchGoals();
    };
    window.addEventListener('goal-updated', handleGoalUpdate);

    return () => {
      window.removeEventListener('goal-updated', handleGoalUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-4 border-2 border-gray-300">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🎯 진행 중인 목표</h3>
        <p className="text-xs text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (goals.length === 0) return null;

  return (
    <>
      <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 border-2 border-orange-300">
        <h3 className="text-sm font-semibold text-orange-700 mb-3">🎯 진행 중인 목표</h3>
        <div className="space-y-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoal(goal)}
              className="bg-white p-3 border-2 transition-all cursor-pointer border-orange-300 hover:border-orange-500"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2">
                  {goal.title}
                </h4>
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex-shrink-0">
                  {goal.category === 'idea' ? '아이디어' : goal.category === 'request' ? '요청' : '습관'}
                </span>
              </div>
              
              {/* 진행률 바 */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">진행률</span>
                  <span className="text-xs font-semibold text-orange-600">{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* 마일스톤 요약 */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">
                    {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length}
                  </span>
                  {' '}단계 완료
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 목표 상세 모달 */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={fetchGoals}
        />
      )}
    </>
  );
}

// 목표 상세 모달
function GoalDetailModal({ goal, onClose, onUpdate }: { goal: Goal; onClose: () => void; onUpdate: () => void }) {
  const [milestones, setMilestones] = useState(goal.milestones || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleMilestone = (index: number) => {
    const updated = [...milestones];
    updated[index].completed = !updated[index].completed;
    setMilestones(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 진행률 계산
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

      const res = await fetch(`/api/goals?id=${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones,
          progress,
          status: progress === 100 ? 'completed' : 'active',
          completedAt: progress === 100 ? Date.now() : undefined,
        }),
      });

      if (res.ok) {
        alert('✅ 목표가 업데이트되었습니다!');
        onUpdate();
        onClose();
      } else {
        alert('업데이트 실패');
      }
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('업데이트 중 오류 발생');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 목표를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/goals?id=${goal.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('✅ 목표가 삭제되었습니다!');
        onUpdate();
        onClose();
      } else {
        alert('삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('삭제 중 오류 발생');
    }
  };

  const handleArchive = async () => {
    if (!confirm('이 목표를 보관하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/goals?id=${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (res.ok) {
        alert('✅ 목표가 보관되었습니다!');
        onUpdate();
        onClose();
      } else {
        alert('보관 실패');
      }
    } catch (error) {
      console.error('Failed to archive goal:', error);
      alert('보관 중 오류 발생');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-gray-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-white mb-2">{goal.title}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-white/20 text-white rounded-full">
                  {goal.category === 'idea' ? '아이디어' : goal.category === 'request' ? '요청' : '습관'}
                </span>
                <span className="text-xs text-white/80">
                  {new Date(goal.createdAt).toLocaleDateString('ko-KR')} 생성
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 진행률 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">전체 진행률</span>
              <span className="text-2xl font-bold text-white">
                {Math.round((milestones.filter(m => m.completed).length / milestones.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${(milestones.filter(m => m.completed).length / milestones.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 설명 */}
          {goal.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 목표 설명</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{goal.description}</p>
            </div>
          )}

          {/* 마일스톤 체크리스트 */}
          {milestones.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">✅ 실행 계획</h3>
              <div className="space-y-2">
                {milestones.map((milestone, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      milestone.completed
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={() => handleToggleMilestone(idx)}
                      className="mt-1 mr-3 h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-800 font-medium'}`}>
                      {milestone.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📦 보관
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              🗑️ 삭제
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
