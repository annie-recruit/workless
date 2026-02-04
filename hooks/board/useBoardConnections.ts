'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { Memory, ActionProject } from '@/types';
import { CARD_DIMENSIONS } from '@/board/boardUtils';

interface UseBoardConnectionsProps {
    localMemories: Memory[];
    filteredMemories: Memory[];
    linkInfo: Record<string, { note?: string; isAIGenerated: boolean }>;
    getLinkKey: (id1: string, id2: string) => string;
    positions: Record<string, { x: number; y: number }>;
    cardSize: 's' | 'm' | 'l';
    projects?: ActionProject[];
}

export function useBoardConnections({
    localMemories,
    filteredMemories,
    linkInfo,
    getLinkKey,
    positions,
    cardSize,
    projects = [],
}: UseBoardConnectionsProps) {
    // 간단한 시드 기반 랜덤 함수 (groupId 기반 고정 랜덤)
    const seededRandom = useCallback((seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }, []);

    // 연결 그룹을 찾아서 색상 할당
    const connectionPairsWithColor = useMemo(() => {
        const set = new Set<string>();
        const pairs: Array<{ from: string; to: string }> = [];
        const visibleIds = new Set(filteredMemories.map(m => m.id));
        const allMemoryIds = new Set(localMemories.map(m => m.id));
        const invalidConnections: Array<{ memoryId: string; invalidRelatedId: string }> = [];

        // 메모리 카드 간 연결
        localMemories.forEach(memory => {
            const related = memory.relatedMemoryIds || [];
            related.forEach(relatedId => {
                if (!allMemoryIds.has(relatedId)) {
                    invalidConnections.push({ memoryId: memory.id, invalidRelatedId: relatedId });
                    return;
                }
                if (!visibleIds.has(memory.id) || !visibleIds.has(relatedId)) {
                    return;
                }
                const key = [memory.id, relatedId].sort().join(':');
                if (set.has(key)) return;
                set.add(key);
                pairs.push({ from: memory.id, to: relatedId });
            });
        });

        // 액션 플랜 ↔ 메모리 카드 연결
        projects.forEach(project => {
            const sourceMemoryIds = project.sourceMemoryIds || [];
            sourceMemoryIds.forEach(memoryId => {
                // 메모리가 존재하고 보이는지 확인
                if (!allMemoryIds.has(memoryId)) {
                    return;
                }
                if (!visibleIds.has(memoryId)) {
                    return;
                }
                // 액션 플랜 -> 메모리 연결 추가
                const key = [project.id, memoryId].sort().join(':');
                if (set.has(key)) return;
                set.add(key);
                pairs.push({ from: project.id, to: memoryId });
            });
        });

        const connectionGroups: Array<Set<string>> = [];
        const nodeToGroup = new Map<string, number>();

        pairs.forEach(pair => {
            const fromGroup = nodeToGroup.get(pair.from);
            const toGroup = nodeToGroup.get(pair.to);

            if (fromGroup === undefined && toGroup === undefined) {
                const newGroup = new Set<string>([pair.from, pair.to]);
                connectionGroups.push(newGroup);
                const groupIndex = connectionGroups.length - 1;
                nodeToGroup.set(pair.from, groupIndex);
                nodeToGroup.set(pair.to, groupIndex);
            } else if (fromGroup !== undefined && toGroup === undefined) {
                connectionGroups[fromGroup].add(pair.to);
                nodeToGroup.set(pair.to, fromGroup);
            } else if (fromGroup === undefined && toGroup !== undefined) {
                connectionGroups[toGroup].add(pair.from);
                nodeToGroup.set(pair.from, toGroup);
            } else if (fromGroup !== undefined && toGroup !== undefined && fromGroup !== toGroup) {
                const merged = new Set([...connectionGroups[fromGroup], ...connectionGroups[toGroup]]);
                connectionGroups[fromGroup] = merged;
                connectionGroups[toGroup].forEach(node => nodeToGroup.set(node, fromGroup));
                connectionGroups[toGroup] = new Set();
            }
        });

        const colors = [
            '#6366F1', '#818CF8', '#A5B4FC', '#FB923C', '#FDBA74', '#FED7AA', '#4F46E5', '#7C3AED',
        ];

        const pairsWithColor = pairs.map(pair => {
            const fromGroup = nodeToGroup.get(pair.from);
            const toGroup = nodeToGroup.get(pair.to);
            const groupIndex = fromGroup !== undefined ? fromGroup : (toGroup !== undefined ? toGroup : -1);
            const colorIndex = groupIndex >= 0 ? groupIndex % colors.length : 0;
            return {
                ...pair,
                color: colors[colorIndex],
                groupIndex: groupIndex,
            };
        });

        const pairKeyToCount = new Map<string, number>();
        pairsWithColor.forEach(pair => {
            const key = [pair.from, pair.to].sort().join(':');
            pairKeyToCount.set(key, (pairKeyToCount.get(key) || 0) + 1);
        });

        const pairKeyToIndex = new Map<string, number>();
        const finalPairs = pairsWithColor.map(pair => {
            const key = [pair.from, pair.to].sort().join(':');
            const count = pairKeyToCount.get(key) || 1;
            const currentIndex = pairKeyToIndex.get(key) || 0;
            pairKeyToIndex.set(key, currentIndex + 1);
            return {
                ...pair,
                offsetIndex: currentIndex,
                totalConnections: count,
            };
        });

        return {
            pairsWithColor: finalPairs,
            connectionGroups: connectionGroups.filter(g => g.size > 0),
            nodeToGroup,
            invalidConnections,
        };
    }, [localMemories, filteredMemories, linkInfo, getLinkKey, projects]);

    // 유효하지 않은 연결 정리
    useEffect(() => {
        const { invalidConnections } = connectionPairsWithColor;
        if (!invalidConnections || invalidConnections.length === 0) return;

        const cleanupSet = new Set<string>();
        invalidConnections.forEach(({ memoryId, invalidRelatedId }) => {
            cleanupSet.add(`${memoryId}:${invalidRelatedId}`);
        });

        const timer = setTimeout(() => {
            cleanupSet.forEach(key => {
                const [memoryId, invalidRelatedId] = key.split(':');
                fetch('/api/memories/cleanup-relations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ memoryId, invalidRelatedId }),
                }).catch(() => { });
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [connectionPairsWithColor.invalidConnections?.length, localMemories.length]);

    // Blob Area 생성
    const blobAreas = useMemo(() => {
        const { connectionGroups } = connectionPairsWithColor;
        const blobs: Array<{
            id: string;
            memoryIds: string[];
            color: string;
            bounds: { minX: number; minY: number; maxX: number; maxY: number };
            seed: number;
            center: { x: number; y: number };
            radius: { x: number; y: number };
        }> = [];

        connectionGroups.forEach((group, groupIndex) => {
            const memoryIds = Array.from(group);
            if (memoryIds.length < 2) return;

            const cardPositions = memoryIds
                .map(id => {
                    const pos = positions[id];
                    if (!pos) return null;
                    
                    // 액션 플랜 체크
                    const project = projects?.find(p => p.id === id);
                    if (project) {
                        return {
                            x: pos.x,
                            y: pos.y,
                            width: 360,
                            height: 120,
                        };
                    }
                    
                    // 일반 메모리 카드
                    const cardData = CARD_DIMENSIONS[cardSize];
                    return {
                        x: pos.x,
                        y: pos.y,
                        width: cardData.width,
                        height: cardData.height,
                    };
                })
                .filter((p): p is NonNullable<typeof p> => p !== null);

            if (cardPositions.length === 0) return;

            const basePadding = 40;
            const seed = groupIndex * 1000 + memoryIds.length;
            const paddingX = basePadding + (seededRandom(seed) - 0.5) * 20;
            const paddingY = basePadding + (seededRandom(seed + 1) - 0.5) * 20;

            const minX = Math.min(...cardPositions.map(p => p.x)) - paddingX;
            const minY = Math.min(...cardPositions.map(p => p.y)) - paddingY;
            const maxX = Math.max(...cardPositions.map(p => p.x + p.width)) + paddingX;
            const maxY = Math.max(...cardPositions.map(p => p.y + p.height)) + paddingY;

            const pastelColors = [
                '#E0E7FF', '#C7D2FE', '#A5B4FC', '#FED7AA', '#FDBA74', '#FED7AA', '#DDD6FE', '#E9D5FF',
            ];

            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const rx = (maxX - minX) / 2;
            const ry = (maxY - minY) / 2;

            blobs.push({
                id: `blob-${groupIndex}`,
                memoryIds,
                color: pastelColors[groupIndex % pastelColors.length],
                bounds: { minX, minY, maxX, maxY },
                seed,
                center: { x: cx, y: cy },
                radius: { x: rx, y: ry },
            });
        });

        return blobs;
    }, [connectionPairsWithColor, positions, cardSize, seededRandom]);

    return {
        connectionPairsWithColor,
        blobAreas,
    };
}

