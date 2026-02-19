'use client';

import { useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { ActionProject } from '@/types';
import { CARD_DIMENSIONS } from '@/board/boardUtils';

interface PixelConnectionLayerProps {
    connectionPairs: any[];
    getLivePos: (id: string) => { x: number; y: number } | undefined;
    cardSize: 's' | 'm' | 'l';
    boardSize: { width: number; height: number };
    isPaused: boolean;
    isEnabled: boolean;
    hoveredBlobId: string | null;
    blobAreas: any[];
    projects?: ActionProject[];
    isMobile?: boolean;
}

export interface PixelConnectionLayerHandle {
    redraw: () => void;
}

// 카드 테두리와 직선이 만나는 교차점 계산
function getBorderPoint(
    cardX: number, cardY: number, cardW: number, cardH: number,
    targetCX: number, targetCY: number
): { x: number; y: number } {
    const cx = cardX + cardW / 2;
    const cy = cardY + cardH / 2;
    const dx = targetCX - cx;
    const dy = targetCY - cy;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
    const hw = cardW / 2;
    const hh = cardH / 2;
    const tx = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
    const ty = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
    const t = Math.min(tx, ty);
    return { x: cx + dx * t, y: cy + dy * t };
}

// 타입별 시각 스타일
function getLinkStyle(linkType: string | undefined) {
    switch (linkType) {
        case 'depends-on':
            return { fixedColor: '#F97316', lineWidth: 3, lineDash: [] as number[], bidirectional: false, arrowLen: 14, arrowWidth: 7 };
        case 'derives-from':
            return { fixedColor: '#8B5CF6', lineWidth: 1.5, lineDash: [] as number[], bidirectional: false, arrowLen: 12, arrowWidth: 5 };
        case 'related':
        default:
            return { fixedColor: null, lineWidth: 2, lineDash: [6, 4] as number[], bidirectional: true, arrowLen: 10, arrowWidth: 5 };
    }
}

// 화살촉 그리기
function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    tipX: number, tipY: number,
    angle: number,
    arrowLen: number, arrowWidth: number,
    color: string
) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
        tipX - arrowLen * Math.cos(angle) + arrowWidth * Math.sin(angle),
        tipY - arrowLen * Math.sin(angle) - arrowWidth * Math.cos(angle)
    );
    ctx.lineTo(
        tipX - arrowLen * Math.cos(angle) - arrowWidth * Math.sin(angle),
        tipY - arrowLen * Math.sin(angle) + arrowWidth * Math.cos(angle)
    );
    ctx.closePath();
    ctx.fill();
}

const PixelConnectionLayer = forwardRef<PixelConnectionLayerHandle, PixelConnectionLayerProps>(({
    connectionPairs,
    getLivePos,
    cardSize,
    boardSize,
    isPaused,
    isEnabled,
    hoveredBlobId,
    blobAreas,
    projects = [],
    isMobile = false,
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const renderOnce = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx || !isEnabled) return;

        const parent = canvas.parentElement;
        if (parent) {
            const dpr = window.devicePixelRatio || 1;
            const boardW = boardSize.width;
            const boardH = boardSize.height;

            if (canvas.width !== boardW * dpr || canvas.height !== boardH * dpr) {
                canvas.width = boardW * dpr;
                canvas.height = boardH * dpr;
                canvas.style.width = `${boardW}px`;
                canvas.style.height = `${boardH}px`;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        connectionPairs.forEach(pair => {
            const from = getLivePos(pair.from);
            const to = getLivePos(pair.to);
            if (!from || !to) return;

            const isInBlobGroup = blobAreas.some(blob =>
                blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
            );

            const offsetIndex = pair.offsetIndex || 0;
            const totalConnections = pair.totalConnections || 1;
            const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;

            const getDimensions = (id: string) => {
                const project = projects.find(p => p.id === id);
                if (project) return { width: 360, height: 120 };
                return CARD_DIMENSIONS[cardSize];
            };

            const fromDim = getDimensions(pair.from);
            const toDim = getDimensions(pair.to);

            // 각 카드의 중앙점
            const fromCX = from.x + fromDim.width / 2;
            const fromCY = from.y + fromDim.height / 2;
            const toCX = to.x + toDim.width / 2;
            const toCY = to.y + toDim.height / 2;

            // 중앙-중앙 방향 벡터 (perp offset 계산용)
            const dx = toCX - fromCX;
            const dy = toCY - fromCY;
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const perpX = -dy / len;
            const perpY = dx / len;

            // 테두리 교차점 계산
            const borderFrom = getBorderPoint(from.x, from.y, fromDim.width, fromDim.height, toCX, toCY);
            const borderTo = getBorderPoint(to.x, to.y, toDim.width, toDim.height, fromCX, fromCY);

            // 중복 연결 시 perp offset 적용
            const aFromX = borderFrom.x + perpX * lineOffset;
            const aFromY = borderFrom.y + perpY * lineOffset;
            const aToX = borderTo.x + perpX * lineOffset;
            const aToY = borderTo.y + perpY * lineOffset;

            // 베지어 제어점
            const midX = (aFromX + aToX) / 2;
            const midY = (aFromY + aToY) / 2;
            const curveOffset = Math.min(80, len * 0.25);
            const cx = midX - (dy / len) * curveOffset;
            const cy = midY + (dx / len) * curveOffset;

            const isLineHovered = hoveredBlobId && blobAreas.some(blob =>
                blob.id === hoveredBlobId && blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
            );
            const alpha = isInBlobGroup ? (isLineHovered ? 0.7 : 0.4) : 1.0;

            const style = getLinkStyle(pair.linkType);
            const strokeColor = style.fixedColor || pair.color;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = style.lineWidth;
            ctx.lineCap = 'round';
            ctx.setLineDash(style.lineDash);
            ctx.beginPath();
            ctx.moveTo(aFromX, aFromY);
            ctx.quadraticCurveTo(cx, cy, aToX, aToY);
            ctx.stroke();

            // 화살촉 (점선 끄고 그리기)
            if (!isInBlobGroup) {
                ctx.setLineDash([]);

                // to 방향 화살촉 (항상)
                const angleToEnd = Math.atan2(aToY - cy, aToX - cx);
                drawArrowHead(ctx, aToX, aToY, angleToEnd, style.arrowLen, style.arrowWidth, strokeColor);

                // from 방향 화살촉 (related = bidirectional)
                if (style.bidirectional) {
                    const angleToStart = Math.atan2(aFromY - cy, aFromX - cx);
                    drawArrowHead(ctx, aFromX, aFromY, angleToStart, style.arrowLen, style.arrowWidth, strokeColor);
                }
            }
            ctx.restore();
        });
    }, [connectionPairs, getLivePos, cardSize, boardSize, isEnabled, hoveredBlobId, blobAreas, projects, isPaused, isMobile]);

    useImperativeHandle(ref, () => ({
        redraw: () => {
            renderOnce();
        }
    }), [renderOnce]);

    useEffect(() => {
        let animationId: number | undefined;
        const renderLoop = () => {
            renderOnce();
            if (!isPaused) {
                animationId = requestAnimationFrame(renderLoop);
            }
        };
        renderLoop();
        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [isPaused, renderOnce]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1, opacity: isEnabled ? 1 : 0 }}
        />
    );
});

PixelConnectionLayer.displayName = 'PixelConnectionLayer';

export default PixelConnectionLayer;
