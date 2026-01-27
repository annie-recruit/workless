'use client';

import React, { useMemo } from 'react';
import { ActionProject, ProjectMilestone, ProjectAction } from '@/types';
import PixelIcon from './PixelIcon';

interface ActionProjectCardProps {
    project: ActionProject;
    onUpdate: (id: string, updates: Partial<ActionProject>) => void;
    onDelete: (id: string) => void;
    isDragging?: boolean;
    isSelected?: boolean;
}

export const ActionProjectCard: React.FC<ActionProjectCardProps> = ({
    project,
    onUpdate,
    onDelete,
    isDragging,
    isSelected,
}) => {
    // 전체 진행률 계산
    const progress = useMemo(() => {
        const totalActions = project.milestones.reduce((acc, m) => acc + m.actions.length, 0);
        if (totalActions === 0) return 0;
        const completedActions = project.milestones.reduce(
            (acc, m) => acc + m.actions.filter((a) => a.completed).length,
            0
        );
        return Math.round((completedActions / totalActions) * 100);
    }, [project.milestones]);

    const handleToggleAction = (milestoneId: string, actionId: string) => {
        const newMilestones = project.milestones.map((m) => {
            if (m.id === milestoneId) {
                return {
                    ...m,
                    actions: m.actions.map((a) =>
                        a.id === actionId ? { ...a, completed: !a.completed } : a
                    ),
                };
            }
            return m;
        });
        onUpdate(project.id, { milestones: newMilestones });
    };

    return (
        <div
            className={`relative w-[360px] bg-white border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-5 select-none transition-all hover:scale-105 ${isSelected ? 'ring-4 ring-indigo-400 ring-offset-2' : ''
                } ${isDragging ? 'opacity-90 grayscale-[0.2]' : ''}`}
        >
            {/* 장식용 코너 포인트 */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-800" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-800" />

            {/* 헤더 */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase tracking-tighter">
                            Action Project
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{project.expectedDuration}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {project.title}
                    </h3>
                </div>
                <button
                    onClick={() => onDelete(project.id)}
                    className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <PixelIcon name="delete" size={20} />
                </button>
            </div>

            {/* 진행바 */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-600">PROGRESS</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">{progress}%</span>
                </div>
                <div className="h-4 bg-gray-100 border-2 border-gray-800 p-0.5 relative">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                    {/* 그리드 패턴 오버레이 */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
                </div>
            </div>

            {/* 프로젝트 요약 */}
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{project.summary}"
                </p>
            </div>

            {/* 단계 및 액션들 */}
            <div className="space-y-6">
                {project.milestones.map((milestone) => (
                    <div key={milestone.id}>
                        <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">
                            <span className="w-1.5 h-1.5 bg-gray-800" />
                            {milestone.title}
                        </h4>
                        <div className="space-y-2.5">
                            {milestone.actions.map((action) => (
                                <div
                                    key={action.id}
                                    data-interactive="true"
                                    className="flex items-start gap-2.5 group cursor-pointer"
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleToggleAction(milestone.id, action.id);
                                    }}
                                >
                                    <div
                                        className={`mt-0.5 w-4 h-4 border-2 border-gray-800 flex-shrink-0 flex items-center justify-center transition-colors ${action.completed ? 'bg-indigo-500' : 'bg-white group-hover:bg-indigo-50'
                                            }`}
                                    >
                                        {action.completed && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-sm font-medium leading-tight transition-all ${action.completed ? 'text-gray-400 line-through decoration-gray-400 decoration-2' : 'text-gray-800'
                                                }`}
                                        >
                                            {action.text}
                                        </p>
                                        {action.duration && (
                                            <span className="text-[10px] font-bold text-indigo-400 mt-1 block">
                                                예상: {action.duration}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 장식 및 소스 연결 정보 */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 flex justify-between items-center">
                <div className="flex -space-x-1.5">
                    {project.sourceMemoryIds.slice(0, 3).map((id, idx) => (
                        <div key={id} className={`w-5 h-5 border border-white rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white overflow-hidden`}>
                            <div className="w-full h-full bg-indigo-100" />
                        </div>
                    ))}
                    {project.sourceMemoryIds.length > 3 && (
                        <div className="text-[10px] text-gray-400 self-center ml-2">
                            +{project.sourceMemoryIds.length - 3}
                        </div>
                    )}
                </div>
                <span className="text-[9px] text-gray-400 font-mono tracking-tighter">
                    CREATED {new Date(project.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};
