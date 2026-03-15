import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from "@/lib/utils";

/**
 * PDF File interface used by the grid
 */
export interface PdfFile {
    id: string;
    file: File;
    name: string;
    size: number;
    pageCount: number | null;
    thumbnailUrl: string | null;
}

interface PdfReorderGridProps {
    files: PdfFile[];
    onReorder: (newOrder: PdfFile[]) => void;
    onDelete?: (id: string) => void;
    onSelect?: (id: string) => void;
    selectedId?: string | null;
    onSortStart?: () => void;
    onSortEnd?: () => void;
}

/**
 * HIGH-PERFORMANCE PDF REORDER GRID
 * 
 * Rebuilt from scratch by mirroring ImageReorderGrid implementation exactly.
 * Uses native touch listeners with zero-dependency lifecycle to prevent gesture freezing.
 */
const PdfReorderGrid = React.memo(function PdfReorderGrid({
    files,
    onReorder,
    onDelete,
    onSelect,
    selectedId,
    onSortStart,
    onSortEnd
}: PdfReorderGridProps) {
    const { themeStyles, isNight } = useTheme();

    // Local state for UI updates (dragging state, hover target)
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
    const [isGhostVisible, setIsGhostVisible] = useState(false);
    const [ghostFile, setGhostFile] = useState<PdfFile | null>(null);
    const [lockedHeight, setLockedHeight] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for stable touch tracking (bypassing React render cycles)
    const filesRef = useRef(files);
    const hoverTargetIdRef = useRef<string | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchDragIdRef = useRef<string | null>(null);
    const isTouchDraggingRef = useRef(false);
    const touchIdentifierRef = useRef<number | null>(null);
    const ghostElemRef = useRef<HTMLDivElement | null>(null);
    const touchCardRectRef = useRef<DOMRect | null>(null);

    // Stable refs for callback props to prevent useEffect resets
    const onReorderRef = useRef(onReorder);
    const onSortStartRef = useRef(onSortStart);
    const onSortEndRef = useRef(onSortEnd);
    const onSelectRef = useRef(onSelect);

    // Synchronize refs
    filesRef.current = files;
    hoverTargetIdRef.current = hoverTargetId;
    onReorderRef.current = onReorder;
    onSortStartRef.current = onSortStart;
    onSortEndRef.current = onSortEnd;
    onSelectRef.current = onSelect;

    // Live preview calculation (Pure Memoized)
    const displayFiles = useMemo(() => {
        if (!draggingId || !hoverTargetId || draggingId === hoverTargetId) return files;
        const dragged = files.find(f => f.id === draggingId);
        if (!dragged) return files;
        const without = files.filter(f => f.id !== draggingId);
        if (hoverTargetId === "__append__") return [...without, dragged];
        const insertIdx = without.findIndex(f => f.id === hoverTargetId);
        if (insertIdx === -1) return files;
        const result = [...without];
        result.splice(insertIdx, 0, dragged);
        return result;
    }, [files, draggingId, hoverTargetId]);

    const displayFilesRef = useRef(displayFiles);
    displayFilesRef.current = displayFiles;

    // Imperative ghost update function
    const updateGhostContent = useCallback((file: PdfFile | null) => {
        setGhostFile(file);
        if (!file) {
            setIsGhostVisible(false);
            return;
        }

        // We still use imperative updates for the VERY FIRST frame to avoid lag
        const g = ghostElemRef.current;
        if (g) {
            const img = g.querySelector('[data-ghost-img]') as HTMLImageElement | null;
            const icon = g.querySelector('[data-ghost-icon]') as HTMLElement | null;
            const name = g.querySelector('[data-ghost-name]') as HTMLElement | null;
            const countBadge = g.querySelector('[data-ghost-count]') as HTMLElement | null;

            if (img && icon) {
                if (file.thumbnailUrl) {
                    img.src = file.thumbnailUrl;
                    img.style.display = 'block';
                    icon.style.display = 'none';
                } else {
                    img.style.display = 'none';
                    icon.style.display = 'flex';
                }
            }
            if (name) name.textContent = file.name;
        }
    }, []);

    // Desktop Drag Handlers
    const handleDragStart = (id: string, e: any) => {
        setDraggingId(id);
        setHoverTargetId(null);
        onSortStartRef.current?.();

        if ('dataTransfer' in e && (e as any).dataTransfer) {
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            (e as any).dataTransfer.setDragImage(img, 0, 0);
        }

        if (ghostElemRef.current) {
            const file = filesRef.current.find(f => f.id === id);
            if (file) {
                updateGhostContent(file);
                setIsGhostVisible(true);

                // Keep layout fixed
                if (containerRef.current) {
                    setLockedHeight(containerRef.current.offsetHeight);
                }

                const card = (e.target as HTMLElement | null)?.closest('[data-file-id]') as HTMLElement | null;
                if (card) {
                    const rect = card.getBoundingClientRect();
                    touchCardRectRef.current = rect;
                    ghostElemRef.current.style.width = `${rect.width}px`;
                    ghostElemRef.current.style.height = `${rect.height}px`;
                }
            }
        }
    };

    const handleDrag = (e: any) => {
        if (ghostElemRef.current && 'clientX' in e) {
            ghostElemRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -60%) scale(0.95) rotate(1.5deg)`;
        }
    };

    const handleDragEnd = () => {
        if (draggingId && hoverTargetId && draggingId !== hoverTargetId) {
            onReorderRef.current([...displayFilesRef.current]);
        }
        setDraggingId(null);
        setHoverTargetId(null);
        setIsGhostVisible(false);
        setGhostFile(null);
        setLockedHeight(null);
        onSortEndRef.current?.();
        if (ghostElemRef.current) {
            ghostElemRef.current.style.transform = '';
        }
    };

    // NATIVE TOUCH LISTENERS (The "Scratch" Implementation)
    // Dependencies are EMPTY to ensure listeners never reset during a gesture.
    useEffect(() => {
        const onTouchStart = (e: TouchEvent) => {
            // Don't intercept UI controls
            if ((e.target as HTMLElement).closest('.pdf-controls')) return;

            const card = (e.target as HTMLElement).closest('[data-file-id]') as HTMLElement | null;
            if (!card) return;

            const fileId = card.dataset.fileId;
            if (!fileId) return;

            const fileIdx = filesRef.current.findIndex(f => f.id === fileId);
            if (fileIdx === -1) return;

            // Bit-for-bit mirroring of ImageReorderGrid strategy
            e.preventDefault();

            const touch = e.touches[0];
            touchDragIdRef.current = fileId;
            isTouchDraggingRef.current = false;
            touchIdentifierRef.current = touch.identifier;
            touchCardRectRef.current = card.getBoundingClientRect();
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };

            const file = filesRef.current[fileIdx];
            updateGhostContent(file);

            if (ghostElemRef.current) {
                ghostElemRef.current.style.width = `${touchCardRectRef.current.width}px`;
                ghostElemRef.current.style.height = `${touchCardRectRef.current.height}px`;
            }

            if (containerRef.current) {
                setLockedHeight(containerRef.current.offsetHeight);
            }
            setHoverTargetId(null);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchIdentifierRef.current === null) return;
            const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifierRef.current);
            if (!touch) return;

            e.preventDefault(); // LOCK THE SCROLL

            const start = touchStartRef.current;
            if (!start) return;

            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            const dist = Math.hypot(dx, dy);
            const DRAG_THRESHOLD = 8; // Match ImageReorderGrid exactly

            if (!isTouchDraggingRef.current) {
                if (dist < DRAG_THRESHOLD) return;
                isTouchDraggingRef.current = true;
                setDraggingId(touchDragIdRef.current);
                setIsGhostVisible(true);
                onSortStartRef.current?.();
            }

            if (ghostElemRef.current) {
                ghostElemRef.current.style.transform = `translate3d(${touch.clientX}px, ${touch.clientY}px, 0) translate(-50%, -60%) scale(0.95) rotate(1.5deg)`;
            }

            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const card = target?.closest('[data-file-id]') as HTMLElement | null;
            const hoveredId = card?.dataset.fileId ?? null;

            if (hoveredId && hoveredId !== touchDragIdRef.current) {
                const rect = card!.getBoundingClientRect();
                const relX = (touch.clientX - rect.left) / rect.width;
                const DEADZONE = 0.12;

                if (relX < 0.5 - DEADZONE) {
                    if (hoverTargetIdRef.current !== hoveredId) {
                        hoverTargetIdRef.current = hoveredId;
                        setHoverTargetId(hoveredId);
                    }
                } else if (relX > 0.5 + DEADZONE) {
                    const fs = filesRef.current;
                    const hIdx = fs.findIndex(f => f.id === hoveredId);
                    const next = fs.slice(hIdx + 1).find(f => f.id !== touchDragIdRef.current);
                    const newId = next?.id ?? "__append__";
                    if (hoverTargetIdRef.current !== newId) {
                        hoverTargetIdRef.current = newId;
                        setHoverTargetId(newId);
                    }
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (touchIdentifierRef.current === null) return;
            const ended = Array.from(e.changedTouches).some(t => t.identifier === touchIdentifierRef.current);
            if (!ended) return;

            const wasDragging = isTouchDraggingRef.current;
            const dragId = touchDragIdRef.current;

            // Selection logic: if they tapped without dragging, select the file
            if (!wasDragging && dragId) {
                onSelectRef.current?.(dragId);
            }

            // Reorder commit
            if (wasDragging && dragId && hoverTargetIdRef.current && dragId !== hoverTargetIdRef.current) {
                onReorderRef.current([...displayFilesRef.current]);
            }

            // Cleanup
            isTouchDraggingRef.current = false;
            touchIdentifierRef.current = null;
            touchStartRef.current = null;
            touchDragIdRef.current = null;
            touchCardRectRef.current = null;
            hoverTargetIdRef.current = null;
            setDraggingId(null);
            setHoverTargetId(null);
            setIsGhostVisible(false);
            setGhostFile(null);
            setLockedHeight(null);
            onSortEndRef.current?.();
            if (ghostElemRef.current) {
                ghostElemRef.current.style.transform = '';
            }
        };

        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []); // TRULY EMPTY DEPENDENCIES FOR MAXIMUM GESTURE STABILITY

    const formatFileSize = (bytes: number) => {
        if (bytes <= 0) return "0 KB";
        if (bytes < 1024 * 1024) {
            const kb = Math.max(bytes / 1024, 1);
            return `${kb.toFixed(1)} KB`;
        }
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!draggingId) return;

        if (ghostElemRef.current) {
            ghostElemRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -60%) scale(0.95) rotate(1.5deg)`;
        }

        const target = document.elementFromPoint(e.clientX, e.clientY);
        const card = target?.closest('[data-file-id]') as HTMLElement | null;
        const hoveredId = card?.dataset.fileId ?? null;
        if (!hoveredId || hoveredId === draggingId) return;

        const rect = card.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const DEADZONE = 0.01;
        if (relX < 0.5 - DEADZONE) {
            if (hoverTargetId !== hoveredId) setHoverTargetId(hoveredId);
        } else if (relX > 0.5 + DEADZONE) {
            const hIdx = files.findIndex(f => f.id === hoveredId);
            const next = files.slice(hIdx + 1).find(f => f.id !== draggingId);
            const newId = next?.id ?? "__append__";
            if (hoverTargetId !== newId) setHoverTargetId(newId);
        }
    };

    return (
        <>
            <div
                ref={containerRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                onDragOver={handleGridDragOver}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setHoverTargetId(null);
                    }
                }}
                style={lockedHeight ? { height: `${lockedHeight}px`, overflow: 'hidden' } : {}}
            >
                {displayFiles.map((file, index) => {
                    const isCurrentDragging = file.id === draggingId;
                    const isSorting = draggingId !== null;
                    return (
                        <motion.div
                            key={file.id}
                            layout
                            transition={{
                                layout: { type: "spring", stiffness: 400, damping: 35 },
                                opacity: { duration: 0.15 },
                                scale: { duration: 0.15 },
                            }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            draggable
                            data-file-id={file.id}
                            onDragStart={(e) => {
                                if (touchIdentifierRef.current !== null) {
                                    e.preventDefault();
                                    return;
                                }
                                handleDragStart(file.id, e);
                            }}
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className={cn(
                                "relative group flex flex-col rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none transition-all duration-300",
                                "bg-white/8 border border-white/20 backdrop-blur-3xl shadow-[0_24px_60px_-30px_rgba(15,23,42,0.9)]",
                                isSorting && "opacity-80",
                                !isCurrentDragging && !isSorting && "hover:-translate-y-2 hover:bg-white/14"
                            )}
                            style={{
                                height: "220px",
                                touchAction: "none",
                                WebkitTouchCallout: "none" as any,
                                WebkitUserSelect: "none" as any,
                            }}
                        >
                            {isCurrentDragging ? (
                                <div
                                    className="flex-1 h-full rounded-2xl border-2 border-dashed border-white/35 bg-white/10 backdrop-blur-2xl flex items-center justify-center transition-colors duration-200"
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <div className="text-[11px] font-semibold text-white/80 uppercase tracking-[0.2em] drop-shadow-sm">
                                        Move Here
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative overflow-hidden h-40 bg-gradient-to-br from-white/12 via-white/4 to-slate-900/40 flex items-center justify-center transition-colors duration-500">
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none z-10" />

                                        {file.thumbnailUrl ? (
                                            <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105" draggable={false} />
                                        ) : (
                                            <div className="relative z-0">
                                                <div className="absolute inset-0 bg-white/8 blur-xl rounded-full scale-150 group-hover:scale-110 transition-transform duration-500" />
                                                <FileText className="w-12 h-12 text-white/80 group-hover:text-white transition-colors drop-shadow-md relative z-10" strokeWidth={1.5} />
                                            </div>
                                        )}

                                        <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-violet-500 shadow-[0_6px_16px_rgba(88,28,135,0.7)] flex items-center justify-center z-20 group-hover:bg-violet-400 transition-all duration-300">
                                            <span className="text-xs font-bold text-white drop-shadow-sm">
                                                {index + 1}
                                            </span>
                                        </div>

                                        <div className={cn(
                                            "absolute top-3 right-3 flex gap-2 z-50 transition-all duration-300 pdf-controls",
                                            selectedId === file.id
                                                ? "opacity-100 translate-y-0 visible"
                                                : "opacity-0 -translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible"
                                        )}>
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        onDelete(file.id);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 hover:text-slate-900 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto backdrop-blur-md"
                                                >
                                                    <X className="w-4 h-4" strokeWidth={2.5} />
                                                </button>
                                            )}
                                        </div>

                                        {file.pageCount != null && (
                                            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-slate-900/80 text-white backdrop-blur-md shadow-lg z-20 group-hover:bg-slate-900 transition-colors">
                                                {file.pageCount} PAGES
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-3 py-2 bg-white/12 backdrop-blur-xl flex-1 flex flex-col justify-center">
                                        <p className="text-[13px] font-semibold truncate text-white group-hover:text-white transition-colors">
                                            {file.name}
                                        </p>
                                        <p className="text-[10px] mt-0.5 text-white/70 font-medium tracking-wide">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {createPortal(
                <div
                    ref={ghostElemRef}
                    style={{
                        display: isGhostVisible ? "block" : "none",
                        position: "fixed",
                        left: 0,
                        top: 0,
                        zIndex: 9999,
                        pointerEvents: "none",
                        opacity: 0.92,
                        willChange: "transform",
                        boxShadow: "0 24px 60px -30px rgba(15, 23, 42, 0.9)",
                    }}
                    className="rounded-2xl overflow-hidden bg-white/8 border border-white/20 backdrop-blur-3xl"
                >
                    <div className="relative h-40 bg-gradient-to-br from-white/12 via-white/4 to-slate-900/40 flex items-center justify-center overflow-hidden">
                        <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-violet-500 shadow-[0_6px_16px_rgba(88,28,135,0.7)] flex items-center justify-center z-[11]">
                            <span data-ghost-count className="text-xs font-bold text-white">
                                {draggingId ? displayFiles.findIndex(f => f.id === draggingId) + 1 : ""}
                            </span>
                        </div>
                        {ghostFile?.thumbnailUrl ? (
                            <img src={ghostFile.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-90" draggable={false} />
                        ) : (
                            <FileText className="w-12 h-12 text-white/80" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
                    </div>
                    <div className="px-3 py-2 bg-white/12 backdrop-blur-xl">
                        <p className="text-[13px] font-semibold truncate text-white">
                            {ghostFile?.name}
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

export default PdfReorderGrid;
