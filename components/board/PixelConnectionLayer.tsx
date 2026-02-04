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

            // 캔버스 물리 해상도 설정 (Retina 대응)
            if (canvas.width !== boardW * dpr || canvas.height !== boardH * dpr) {
                canvas.width = boardW * dpr;
                canvas.height = boardH * dpr;
                canvas.style.width = `${boardW}px`;
                canvas.style.height = `${boardH}px`;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 연결선 전용 픽셀 크기 (더 세밀하게 표현)
        const LINE_PIXEL_SIZE = 2;
        const ARROW_PIXEL_SIZE = 4;

        const drawPixelLine = (x1: number, y1: number, x2: number, y2: number, color: string, alpha: number) => {
            let x1p = Math.round(x1 / LINE_PIXEL_SIZE);
            let y1p = Math.round(y1 / LINE_PIXEL_SIZE);
            const x2p = Math.round(x2 / LINE_PIXEL_SIZE);
            const y2p = Math.round(y2 / LINE_PIXEL_SIZE);

            const dx = Math.abs(x2p - x1p);
            const dy = Math.abs(y2p - y1p);
            const sx = x1p < x2p ? 1 : -1;
            const sy = y1p < y2p ? 1 : -1;
            let err = dx - dy;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;

            while (true) {
                ctx.fillRect(x1p * LINE_PIXEL_SIZE, y1p * LINE_PIXEL_SIZE, LINE_PIXEL_SIZE, LINE_PIXEL_SIZE);
                if (x1p === x2p && y1p === y2p) break;
                const e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x1p += sx; }
                if (e2 < dx) { err += dx; y1p += sy; }
            }
        };

        const drawArrowhead = (tx: number, ty: number, angle: number, color: string, alpha: number) => {
            ctx.save();
            const ps = ARROW_PIXEL_SIZE;
            const snapX = Math.round(tx / ps) * ps;
            const snapY = Math.round(ty / ps) * ps;
            ctx.translate(snapX, snapY);
            ctx.rotate(angle);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(-ps, -ps / 2, ps, ps);
            ctx.fillRect(-ps * 2, -ps, ps, ps * 2);
            ctx.restore();
        };

        connectionPairs.forEach(pair => {
            const from = getLivePos(pair.from);
            const to = getLivePos(pair.to);
            if (!from || !to) return;

            const isInBlobGroup = blobAreas.some(blob =>
                blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
            );

            const offsetIndex = (pair as any).offsetIndex || 0;
            const totalConnections = (pair as any).totalConnections || 1;
            const lineOffset = totalConnections > 1 ? (offsetIndex - (totalConnections - 1) / 2) * 12 : 0;

            // 엔티티 타입별 중심점 계산
            const getDimensions = (id: string) => {
                const project = projects.find(p => p.id === id);
                if (project) return { centerX: 180, centerY: 60 }; // 360/2, 상단 타이틀 부근
                return CARD_DIMENSIONS[cardSize];
            };

            const fromDim = getDimensions(pair.from);
            const toDim = getDimensions(pair.to);

            // 시작점과 끝점은 절대 픽셀 스냅하지 않음 (카드 위치와 1:1 동기화)
            const fromX = from.x + fromDim.centerX;
            const fromY = from.y + fromDim.centerY;
            const toX = to.x + toDim.centerX;
            const toY = to.y + toDim.centerY;

            const dx_full = toX - fromX;
            const dy_full = toY - fromY;
            const len = Math.max(1, Math.sqrt(dx_full * dx_full + dy_full * dy_full));
            const perpX = -dy_full / (len || 1);
            const perpY = dx_full / (len || 1);

            const aFromX = fromX + perpX * lineOffset;
            const aFromY = fromY + perpY * lineOffset;
            const aToX = toX + perpX * lineOffset;
            const aToY = toY + perpY * lineOffset;

            const midX = (aFromX + aToX) / 2;
            const midY = (aFromY + aToY) / 2;
            // 곡률 강화: 더 유려한 곡선 표현
            const curveOffset = Math.min(80, len * 0.25);
            const cx = midX - (dy_full / (len || 1)) * curveOffset;
            const cy = midY + (dx_full / (len || 1)) * curveOffset;

            const isLineHovered = hoveredBlobId && blobAreas.some(blob =>
                blob.id === hoveredBlobId && blob.memoryIds.includes(pair.from) && blob.memoryIds.includes(pair.to)
            );
            const alpha = isInBlobGroup ? (isLineHovered ? 0.7 : 0.4) : 1.0;

            // 최적화: 모바일이거나 드래그 중(isPaused=true)인 경우 계산량 대폭 감소
            // 드래그 중에도 선이 끊어져 보이지 않도록 최소 density 확보
            const steps = (isPaused || isMobile)
                ? Math.max(8, Math.floor(len / 10)) 
                : Math.max(15, Math.floor(len / 6));

            let lx = aFromX;
            let ly = aFromY;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const currX = (1 - t) * (1 - t) * aFromX + 2 * (1 - t) * t * cx + t * t * aToX;
                const currY = (1 - t) * (1 - t) * aFromY + 2 * (1 - t) * t * cy + t * t * aToY;
                
                // 드래그 중이거나 모바일인 경우에도 drawPixelLine을 사용하여 선이 이어지게 함
                // 대신 steps를 조절하여 전체 연산량을 제어합니다.
                drawPixelLine(lx, ly, currX, currY, pair.color, alpha);
                
                lx = currX;
                ly = currY;
            }

            if (!isInBlobGroup) {
                const angle = Math.atan2(aToY - cy, aToX - cx);
                drawArrowhead(aToX, aToY, angle, pair.color, alpha);
            }
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
