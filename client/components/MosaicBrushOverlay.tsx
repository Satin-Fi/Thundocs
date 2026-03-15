import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';

export interface MosaicBrushOverlayHandle {
    getCompositedImage: (baseImageUrl: string, naturalWidth: number, naturalHeight: number) => Promise<string>;
    hasStrokes: boolean; // if strokes are dirty
    canUndo: boolean;
    canRedo: boolean;
    clearStrokes: () => void;
    undo: () => void;
    redo: () => void;
}

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    points: Point[];
    size: number;
    color: string;
}

interface MosaicBrushOverlayProps {
    width: number | string;
    height: number | string;
    isActive: boolean;
    brushSize: number;
    color: string;
    onChange?: (hasStrokes: boolean) => void;
}

export const MosaicBrushOverlay = forwardRef<MosaicBrushOverlayHandle, MosaicBrushOverlayProps>(
    ({ width, height, isActive, brushSize, color, onChange }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [strokes, setStrokes] = useState<Stroke[]>([]);
        const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
        const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
        const isDrawing = useRef(false);

        useImperativeHandle(ref, () => ({
            getCompositedImage: async (baseImageUrl, naturalWidth, naturalHeight) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = naturalWidth;
                        canvas.height = naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return reject('No context');

                        // Draw base image
                        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

                        // Calculate scale ratio from display size to natural size
                        const rect = canvasRef.current?.getBoundingClientRect();
                        const displayW = rect?.width || naturalWidth;
                        const displayH = rect?.height || naturalHeight;
                        const scaleX = naturalWidth / displayW;
                        const scaleY = naturalHeight / displayH;

                        // Precompute a blurred version of the image for a "healing" effect
                        const blurCanvas = document.createElement('canvas');
                        blurCanvas.width = naturalWidth;
                        blurCanvas.height = naturalHeight;
                        const blurCtx = blurCanvas.getContext('2d');
                        if (blurCtx) {
                            blurCtx.filter = 'blur(8px)';
                            blurCtx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
                            blurCtx.filter = 'none';
                        }

                        // Use strokes as masks to reveal the blurred image in those areas
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        const maxScale = Math.max(scaleX, scaleY);

                        strokes.forEach(stroke => {
                            if (stroke.points.length === 0) return;

                            ctx.save();

                            // Build path in image (natural) coordinates
                            ctx.beginPath();
                            if (stroke.points.length === 1) {
                                const p = stroke.points[0];
                                const cx = p.x * scaleX;
                                const cy = p.y * scaleY;
                                const radius = (stroke.size * maxScale) / 2;
                                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                            } else {
                                const first = stroke.points[0];
                                ctx.moveTo(first.x * scaleX, first.y * scaleY);
                                for (let i = 1; i < stroke.points.length; i++) {
                                    const p = stroke.points[i];
                                    ctx.lineTo(p.x * scaleX, p.y * scaleY);
                                }
                            }

                            ctx.strokeStyle = '#000';
                            ctx.lineWidth = stroke.size * maxScale;
                            ctx.stroke();

                            if (blurCtx) {
                                ctx.globalCompositeOperation = 'source-atop';
                                ctx.drawImage(blurCanvas, 0, 0);
                                ctx.globalCompositeOperation = 'source-over';
                            }

                            ctx.restore();
                        });

                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = reject;
                    img.src = baseImageUrl;
                });
            },
            hasStrokes: strokes.length > 0,
            canUndo: strokes.length > 0,
            canRedo: undoneStrokes.length > 0,
            clearStrokes: () => {
                setStrokes([]);
                setUndoneStrokes([]);
                onChange?.(false);
            },
            undo: () => {
                setStrokes(prev => {
                    if (prev.length === 0) return prev;
                    const next = prev.slice(0, -1);
                    const popped = prev[prev.length - 1];
                    setUndoneStrokes(u => [...u, popped]);
                    onChange?.(next.length > 0);
                    return next;
                });
            },
            redo: () => {
                setUndoneStrokes(prev => {
                    if (prev.length === 0) return prev;
                    const popped = prev[prev.length - 1];
                    const next = prev.slice(0, -1);
                    setStrokes(s => {
                        const nextStrokes = [...s, popped];
                        onChange?.(nextStrokes.length > 0);
                        return nextStrokes;
                    });
                    return next;
                });
            }
        }));

        const drawStrokes = useCallback((ctx: CanvasRenderingContext2D, allStrokes: Stroke[], activeStroke: Stroke | null) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const drawStroke = (stroke: Stroke) => {
                if (stroke.points.length < 2) {
                    if (stroke.points.length === 1) {
                        ctx.fillStyle = stroke.color;
                        ctx.beginPath();
                        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    return;
                }
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size;
                ctx.beginPath();
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                ctx.stroke();
            };

            allStrokes.forEach(drawStroke);
            if (activeStroke) {
                drawStroke(activeStroke);
            }
        }, []);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Use actual CSS dimensions of the element, NOT bounded box which breaks on rotations
            const targetW = canvas.offsetWidth || Number(width) || 100;
            const targetH = canvas.offsetHeight || Number(height) || 100;

            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }

            drawStrokes(ctx, strokes, currentStroke);
        }, [strokes, currentStroke, drawStrokes, width, height]);

        const getCoordinates = (e: React.PointerEvent) => {
            return {
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY
            };
        };

        const handlePointerDown = (e: React.PointerEvent) => {
            if (!isActive) return;
            e.stopPropagation();
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);

            const coords = getCoordinates(e);
            if (!coords) return;

            isDrawing.current = true;
            setCurrentStroke({ points: [coords], size: brushSize, color: color });
        };

        const handlePointerMove = (e: React.PointerEvent) => {
            if (!isActive || !isDrawing.current) return;
            e.stopPropagation();
            e.preventDefault();

            const coords = getCoordinates(e);
            if (!coords) return;

            setCurrentStroke(prev => {
                if (!prev) return prev;
                return { ...prev, points: [...prev.points, coords] };
            });
        };

        const handlePointerUp = (e: React.PointerEvent) => {
            if (!isActive || !isDrawing.current) return;
            e.stopPropagation();
            e.preventDefault();
            e.currentTarget.releasePointerCapture(e.pointerId);

            isDrawing.current = false;

            // Adding a new stroke clears redo history
            setUndoneStrokes([]);

            if (currentStroke) {
                setStrokes(prev => {
                    const next = [...prev, currentStroke];
                    onChange?.(next.length > 0);
                    return next;
                });
                setCurrentStroke(null);
            }
        };

        return (
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 30, pointerEvents: isActive ? 'auto' : 'none', touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
        );
    }
);
