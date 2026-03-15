import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';

export interface EraserBrushOverlayHandle {
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
}

interface EraserBrushOverlayProps {
    width: number | string;
    height: number | string;
    isActive: boolean;
    brushSize: number;
    onChange?: (hasStrokes: boolean) => void;
}

export const EraserBrushOverlay = forwardRef<EraserBrushOverlayHandle, EraserBrushOverlayProps>(
    ({ width, height, isActive, brushSize, onChange }, ref) => {
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

                        const maskCanvas = document.createElement('canvas');
                        maskCanvas.width = naturalWidth;
                        maskCanvas.height = naturalHeight;
                        const mCtx = maskCanvas.getContext('2d');
                        if (!mCtx) return reject('No context');
                        mCtx.fillStyle = 'black';
                        mCtx.fillRect(0, 0, naturalWidth, naturalHeight);

                        mCtx.strokeStyle = 'white';
                        mCtx.lineCap = 'round';
                        mCtx.lineJoin = 'round';
                        strokes.forEach(stroke => {
                            if (stroke.points.length < 2) {
                                if (stroke.points.length === 1) {
                                    mCtx.lineWidth = stroke.size * Math.max(scaleX, scaleY);
                                    mCtx.beginPath();
                                    mCtx.arc(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY, stroke.size * scaleX / 2, 0, Math.PI * 2);
                                    mCtx.fill();
                                }
                                return;
                            }
                            mCtx.lineWidth = stroke.size * Math.max(scaleX, scaleY);
                            mCtx.beginPath();
                            mCtx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
                            for (let i = 1; i < stroke.points.length; i++) {
                                mCtx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
                            }
                            mCtx.stroke();
                        });

                        // 3. Healing Brush Approximation (Heavy Blur)
                        const blurredCanvas = document.createElement('canvas');
                        blurredCanvas.width = naturalWidth;
                        blurredCanvas.height = naturalHeight;
                        const bCtx = blurredCanvas.getContext('2d');
                        if (!bCtx) return reject('No context');

                        // Find the largest stroke to determine how much we need to blur to hide details
                        let strokeSizeMax = 20;
                        if (strokes.length > 0) {
                            strokeSizeMax = Math.max(...strokes.map(s => s.size * Math.max(scaleX, scaleY)));
                        }

                        // Apply a strong blur to the original image to act as the "healed" background
                        bCtx.filter = `blur(${Math.max(15, strokeSizeMax * 0.8)}px)`;
                        bCtx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
                        bCtx.filter = 'none';

                        // 4. Composite
                        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
                        ctx.globalCompositeOperation = 'source-over';

                        const finalMaskCanvas = document.createElement('canvas');
                        finalMaskCanvas.width = naturalWidth;
                        finalMaskCanvas.height = naturalHeight;
                        const fmCtx = finalMaskCanvas.getContext('2d');
                        if (!fmCtx) return reject('No context');

                        // Soften the brush edges for blending
                        fmCtx.filter = `blur(${Math.max(8, strokeSizeMax * 0.4)}px)`;
                        fmCtx.drawImage(maskCanvas, 0, 0);
                        fmCtx.filter = 'none';

                        fmCtx.globalCompositeOperation = 'source-in';
                        fmCtx.drawImage(blurredCanvas, 0, 0);

                        ctx.drawImage(finalMaskCanvas, 0, 0);
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

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.filter = `blur(2px)`; // Slight blur on brush stroke preview

            const drawStroke = (stroke: Stroke) => {
                if (stroke.points.length < 2) {
                    if (stroke.points.length === 1) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.beginPath();
                        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    return;
                }
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
            setCurrentStroke({ points: [coords], size: brushSize });
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
