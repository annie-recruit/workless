'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent, FocusEvent as ReactFocusEvent } from 'react';

export type ActivityMetrics = {
    hoverMsTotal: number;
    editMsTotal: number;
    editCount: number;
    lastActiveAt: number;
    hoverStartAt?: number;
    editStartAt?: number;
};

export type ContentLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
};

interface UseActivityTrackingProps {
    isHighlightMode: boolean;
}

export function useActivityTracking({ isHighlightMode }: UseActivityTrackingProps) {
    const activityByContentIdRef = useRef<Record<string, ActivityMetrics>>({});
    const contentLayoutRef = useRef<Record<string, ContentLayout>>({});
    const hoveredContentIdRef = useRef<string | null>(null);
    const isHighlightModeRef = useRef(isHighlightMode);

    const [highlightedContentIds, setHighlightedContentIds] = useState<string[]>([]);
    const highlightedContentIdSet = useMemo(() => new Set(highlightedContentIds), [highlightedContentIds]);

    useEffect(() => {
        isHighlightModeRef.current = isHighlightMode;
        if (!isHighlightMode) {
            hoveredContentIdRef.current = null;
            activityByContentIdRef.current = {};
            setHighlightedContentIds([]);
        }
    }, [isHighlightMode]);

    const getOrCreateMetrics = useCallback((contentId: string) => {
        const existing = activityByContentIdRef.current[contentId];
        if (existing) return existing;
        const next: ActivityMetrics = {
            hoverMsTotal: 0,
            editMsTotal: 0,
            editCount: 0,
            lastActiveAt: Date.now(),
        };
        activityByContentIdRef.current[contentId] = next;
        return next;
    }, []);

    const markActive = useCallback((contentId: string) => {
        if (!isHighlightModeRef.current) return;
        const metrics = getOrCreateMetrics(contentId);
        metrics.lastActiveAt = Date.now();
    }, [getOrCreateMetrics]);

    const startHover = useCallback((contentId: string) => {
        if (!isHighlightModeRef.current) return;
        const metrics = getOrCreateMetrics(contentId);
        if (metrics.hoverStartAt == null) metrics.hoverStartAt = performance.now();
        markActive(contentId);
    }, [getOrCreateMetrics, markActive]);

    const endHover = useCallback((contentId: string) => {
        if (!isHighlightModeRef.current) return;
        const metrics = activityByContentIdRef.current[contentId];
        if (!metrics || metrics.hoverStartAt == null) return;
        const delta = performance.now() - metrics.hoverStartAt;
        metrics.hoverMsTotal += Math.max(0, delta);
        metrics.hoverStartAt = undefined;
        markActive(contentId);
    }, [markActive]);

    const startEdit = useCallback((contentId: string) => {
        if (!isHighlightModeRef.current) return;
        const metrics = getOrCreateMetrics(contentId);
        if (metrics.editStartAt == null) metrics.editStartAt = performance.now();
        markActive(contentId);
    }, [getOrCreateMetrics, markActive]);

    const endEdit = useCallback((contentId: string, commit: boolean) => {
        if (!isHighlightModeRef.current) return;
        const metrics = activityByContentIdRef.current[contentId];
        if (!metrics || metrics.editStartAt == null) return;
        const delta = performance.now() - metrics.editStartAt;
        metrics.editMsTotal += Math.max(0, delta);
        metrics.editStartAt = undefined;
        if (commit) metrics.editCount += 1;
        markActive(contentId);
    }, [markActive]);

    useEffect(() => {
        if (!isHighlightMode) return;

        const TOP_N = 5;
        const HOVER_MIN_MS = 500;

        const scoreOf = (hoverMs: number, editMs: number, editCount: number) =>
            hoverMs + editMs * 2 + editCount * 2000;

        const recalc = (isJustEnabled: boolean) => {
            const nowPerf = performance.now();
            const now = Date.now();

            // ensure metrics
            Object.keys(contentLayoutRef.current).forEach((contentId) => {
                const m = getOrCreateMetrics(contentId);
                m.lastActiveAt = m.lastActiveAt || now;
            });

            const allContentIds = Array.from(
                new Set([
                    ...Object.keys(contentLayoutRef.current),
                    ...Object.keys(activityByContentIdRef.current),
                ]),
            );

            const entries = allContentIds
                .map((contentId) => {
                    const metrics = getOrCreateMetrics(contentId);
                    const hoverMs =
                        metrics.hoverMsTotal + (metrics.hoverStartAt == null ? 0 : Math.max(0, nowPerf - metrics.hoverStartAt));
                    const editMs =
                        metrics.editMsTotal + (metrics.editStartAt == null ? 0 : Math.max(0, nowPerf - metrics.editStartAt));
                    const score = scoreOf(hoverMs, editMs, metrics.editCount);
                    return { contentId, hoverMs, editMs, editCount: metrics.editCount, score, lastActiveAt: metrics.lastActiveAt };
                })
                .filter((e) => contentLayoutRef.current[e.contentId] != null);

            const eligible = entries.filter((e) => e.hoverMs >= HOVER_MIN_MS || e.editCount >= 1 || e.score >= HOVER_MIN_MS);

            const forcedIds = isJustEnabled
                ? entries
                    .slice()
                    .sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0))
                    .slice(0, 3)
                    .map((e) => e.contentId)
                : [];

            const nextIds = [
                ...forcedIds,
                ...eligible
                    .sort((a, b) => b.score - a.score)
                    .map((e) => e.contentId),
            ]
                .filter((id, idx, arr) => arr.indexOf(id) === idx)
                .slice(0, TOP_N);

            setHighlightedContentIds(nextIds);
        };

        recalc(true);
        const immediateRetry = window.setTimeout(() => recalc(true), 120);
        const interval = window.setInterval(() => recalc(false), 1200);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(immediateRetry);
        };
    }, [isHighlightMode, getOrCreateMetrics]);

    const getContentIdFromTarget = useCallback((target: EventTarget | null) => {
        if (!(target instanceof Element)) return null;
        const memoryId = target.closest('[data-memory-card]')?.getAttribute('data-memory-card');
        if (memoryId) return `memory:${memoryId}`;
        const calendarId = target.closest('[data-calendar-block]')?.getAttribute('data-calendar-block');
        if (calendarId) return `block:${calendarId}`;
        const viewerId = target.closest('[data-viewer-block]')?.getAttribute('data-viewer-block');
        if (viewerId) return `block:${viewerId}`;
        const meetingId = target.closest('[data-meeting-recorder-block]')?.getAttribute('data-meeting-recorder-block');
        if (meetingId) return `block:${meetingId}`;
        const databaseId = target.closest('[data-database-block]')?.getAttribute('data-database-block');
        if (databaseId) return `block:${databaseId}`;
        const minimapId = target.closest('[data-minimap-block]')?.getAttribute('data-minimap-block');
        if (minimapId) return `block:${minimapId}`;
        return null;
    }, []);

    const handleActivityPointerOverCapture = useCallback((e: ReactPointerEvent) => {
        if (!isHighlightModeRef.current) return;
        const nextId = getContentIdFromTarget(e.target);
        if (!nextId) return;

        const prevId = hoveredContentIdRef.current;
        if (prevId === nextId) return;

        if (prevId) endHover(prevId);
        hoveredContentIdRef.current = nextId;
        startHover(nextId);
    }, [endHover, getContentIdFromTarget, startHover]);

    const handleActivityPointerOutCapture = useCallback((e: ReactPointerEvent) => {
        if (!isHighlightModeRef.current) return;
        const fromId = getContentIdFromTarget(e.target);
        if (!fromId) return;

        const toId = getContentIdFromTarget((e as any).relatedTarget);
        if (toId === fromId) return;

        if (hoveredContentIdRef.current === fromId) {
            endHover(fromId);
            hoveredContentIdRef.current = null;
        }
    }, [endHover, getContentIdFromTarget]);

    const handleActivityPointerLeaveBoard = useCallback(() => {
        if (!isHighlightModeRef.current) return;
        const prevId = hoveredContentIdRef.current;
        if (prevId) endHover(prevId);
        hoveredContentIdRef.current = null;
    }, [endHover]);

    const handleActivityFocusCapture = useCallback((e: ReactFocusEvent) => {
        if (!isHighlightModeRef.current) return;
        const contentId = getContentIdFromTarget(e.target);
        if (!contentId) return;
        if (contentId.startsWith('memory:')) return;
        startEdit(contentId);
    }, [getContentIdFromTarget, startEdit]);

    const handleActivityBlurCapture = useCallback((e: ReactFocusEvent) => {
        if (!isHighlightModeRef.current) return;
        const contentId = getContentIdFromTarget(e.target);
        if (!contentId) return;
        if (contentId.startsWith('memory:')) return;

        const relatedContentId = getContentIdFromTarget((e as any).relatedTarget);
        if (relatedContentId === contentId) return;
        endEdit(contentId, true);
    }, [endEdit, getContentIdFromTarget]);

    return {
        activityByContentIdRef,
        contentLayoutRef,
        highlightedContentIds,
        setHighlightedContentIds,
        highlightedContentIdSet,
        startEdit,
        endEdit,
        handleActivityPointerOverCapture,
        handleActivityPointerOutCapture,
        handleActivityPointerLeaveBoard,
        handleActivityFocusCapture,
        handleActivityBlurCapture,
    };
}
