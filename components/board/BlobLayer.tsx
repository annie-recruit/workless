'use client';

import { useEffect, useRef } from 'react';

interface BlobArea {
    id: string;
    color: string;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    center: { x: number; y: number };
    radius: { x: number; y: number };
    memoryIds: string[];
}

interface BlobLayerProps {
    blobAreas?: BlobArea[];
    hoveredBlobId: string | null;
    hoveredMemoryId: string | null;
    isPaused?: boolean;
    isEnabled?: boolean;
    isHighlightMode?: boolean;
    boardSize?: { width: number; height: number };
}

export default function BlobLayer({
    blobAreas,
    hoveredBlobId,
    hoveredMemoryId,
    isPaused = false,
    isEnabled = true,
    isHighlightMode = false,
    boardSize,
}: BlobLayerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!isEnabled || !blobAreas || blobAreas.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        // 부모 컨테이너(보드) 크기에 맞춤
        if (boardSize) {
            canvas.width = boardSize.width;
            canvas.height = boardSize.height;
        } else {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        }

        if (isPaused) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 픽셀 크기 및 해상도 최적화
        const PIXEL_SIZE = 4;
        const SCALE_FACTOR = 2; // 캔버스 해상도를 1/2로 낮춤 (계산량 1/4로 감소)

        const render = () => {
            // 선택적 애니메이션: 호버 중(블롭 또는 메모리 카드)이거나 하이라이트 모드일 때만 움직임
            const shouldAnimate = hoveredBlobId !== null || hoveredMemoryId !== null || isHighlightMode;
            const time = shouldAnimate ? (Date.now() - startTimeRef.current) / 1000 : 0;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 전체 캔버스 스케일링 적용 (저해상도 렌더링 후 브라우저가 확대)
            ctx.save();
            ctx.scale(1 / SCALE_FACTOR, 1 / SCALE_FACTOR);

            blobAreas.forEach((blob) => {
                let r = 0, g = 0, b = 0;
                const hex = blob.color.replace('#', '');
                if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                }

                const isHovered = hoveredBlobId === blob.id;
                const centerAlphaMin = isHovered ? 0.12 : 0.08;
                const edgeAlphaMax = isHovered ? 0.85 : 0.75;
                const gamma = 1.4;

                const waveAmp = 4;
                const avgRadius = (blob.radius.x + blob.radius.y) / 2;

                const padding = PIXEL_SIZE * 4;
                const startX = Math.max(0, Math.floor((blob.bounds.minX - padding) / PIXEL_SIZE) * PIXEL_SIZE);
                const startY = Math.max(0, Math.floor((blob.bounds.minY - padding) / PIXEL_SIZE) * PIXEL_SIZE);
                const endX = Math.min(canvas.width * SCALE_FACTOR, Math.ceil((blob.bounds.maxX + padding) / PIXEL_SIZE) * PIXEL_SIZE);
                const endY = Math.min(canvas.height * SCALE_FACTOR, Math.ceil((blob.bounds.maxY + padding) / PIXEL_SIZE) * PIXEL_SIZE);

                const width = endX - startX;
                const height = endY - startY;

                if (width <= 0 || height <= 0) return;

                // 루프 내 반복 계산 최적화
                const centerX = blob.center.x;
                const centerY = blob.center.y;
                const radX2 = blob.radius.x * blob.radius.x;
                const radY2 = blob.radius.y * blob.radius.y;

                for (let py = 0; py < height; py += PIXEL_SIZE) {
                    const y = startY + py;
                    const dy = y - centerY;
                    const dy2 = dy * dy;

                    for (let px = 0; px < width; px += PIXEL_SIZE) {
                        const x = startX + px;
                        const dx = x - centerX;

                        const distBase = Math.sqrt((dx * dx) / radX2 + dy2 / radY2);
                        const angle = Math.atan2(dy, dx);
                        const noise = Math.sin(angle * 3 + time * 0.5) * 0.5 +
                            Math.sin(angle * 7 - time * 0.3) * 0.3 +
                            Math.sin(angle * 11 + time * 0.2) * 0.2;

                        const effectiveDist = distBase - (noise * waveAmp) / avgRadius;

                        if (effectiveDist <= 1.0) {
                            const falloffStart = 0.85;
                            let alpha = centerAlphaMin;

                            if (effectiveDist > falloffStart) {
                                const outerT = (effectiveDist - falloffStart) / (1.0 - falloffStart);
                                alpha = centerAlphaMin + (edgeAlphaMax - centerAlphaMin) * Math.pow(outerT, gamma);

                                // 디더링 최적화
                                const bx = Math.abs(Math.floor(x / PIXEL_SIZE)) % 2;
                                const by = Math.abs(Math.floor(y / PIXEL_SIZE)) % 2;
                                if (1.0 - outerT * 0.65 < ((bx + by * 2) + 0.5) / 4.0) continue;
                            }

                            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                            ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
                        }
                    }
                }
            });

            ctx.restore();

            if (shouldAnimate) {
                requestRef.current = requestAnimationFrame(render);
            } else {
                requestRef.current = undefined;
            }
        };

        render();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [blobAreas, hoveredBlobId, hoveredMemoryId, isPaused, isEnabled, isHighlightMode, boardSize]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{ zIndex: 0, opacity: isEnabled && blobAreas && blobAreas.length > 0 ? 1 : 0 }}
        />
    );
}
