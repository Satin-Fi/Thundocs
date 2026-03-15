import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { getImageFilter, getVignetteStyle, getWarmthOverlayStyle, FilterValues } from '@/utils/imageUtils';
import { getPaperAspectRatio, getRotationFitScale, getImageInsetPercent } from '@/utils/layoutUtils';

export interface PageSettings {
  orientation: "portrait" | "landscape";
  size: "A4" | "Legal" | "Letter" | "Fit";
  margin: number;
}

type ImageItem = {
  id: string;
  url: string;
  name: string;
  width?: number;
  height?: number;
  filters?: FilterValues;
  activeFilter?: string;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
};

interface ImageReorderGridProps {
  images: ImageItem[];
  onReorder: (newOrder: ImageItem[]) => void;
  onDelete?: (imageId: string) => void;
  onEdit?: (imageId: string) => void;
  onSelect?: (imageId: string) => void;
  onHoverChange?: (imageId: string | null) => void;
  selectedId?: string | null;
  onSortStart?: () => void;
  onSortEnd?: () => void;
  pageSettings?: PageSettings;
  thumbnailSize?: "small" | "medium" | "large";
}

const ImageReorderGrid = React.memo(function ImageReorderGrid({ images, onReorder, onDelete, onEdit, onSelect, onHoverChange, selectedId, onSortStart, onSortEnd, pageSettings, thumbnailSize = "medium" }: ImageReorderGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const { themeStyles, isNight } = useTheme();

  // Unified Refs for native listeners (mirroring Merge.tsx)
  const imagesRef = useRef(images);
  const displayImagesRef = useRef<ImageItem[]>([]);
  const hoverTargetIdRef = useRef<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragIdRef = useRef<string | null>(null);
  const isTouchDraggingRef = useRef(false);
  const touchIdentifierRef = useRef<number | null>(null);
  const ghostElemRef = useRef<HTMLDivElement | null>(null);
  const touchCardRectRef = useRef<DOMRect | null>(null);

  imagesRef.current = images;
  hoverTargetIdRef.current = hoverTargetId;

  const baseAspectRatio = pageSettings ? getPaperAspectRatio(pageSettings.size) : 1;
  const aspectRatio =
    pageSettings?.orientation === "landscape"
      ? 1 / baseAspectRatio
      : baseAspectRatio;
  const padding = pageSettings ? `${pageSettings.margin * 0.4}px` : '0px';

  const displayImages = useMemo(() => {
    if (!draggingId || !hoverTargetId || draggingId === hoverTargetId) return images;
    const dragged = images.find((img) => img.id === draggingId);
    if (!dragged) return images;
    const without = images.filter((img) => img.id !== draggingId);
    if (hoverTargetId === "__append__") {
      return [...without, dragged];
    }
    const insertIdx = without.findIndex((img) => img.id === hoverTargetId);
    if (insertIdx === -1) return images;
    const result = [...without];
    result.splice(insertIdx, 0, dragged);
    return result;
  }, [images, draggingId, hoverTargetId]);

  displayImagesRef.current = displayImages;

  const handleDelete = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(imageId);
    }
  };

  const handleEdit = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      onEdit(imageId);
    }
  };

  if (images.length === 0) {
    return (
      <div className={`text-center py-12 ${themeStyles.secondaryText}`}>
        <p>No images uploaded yet. Add some images to get started!</p>
      </div>
    );
  }

  const sizeConfig = {
    small: { base: "96px", md: "150px", gap: "12px", pad: "12px" },
    medium: { base: "120px", md: "180px", gap: "14px", pad: "14px" },
    large: { base: "150px", md: "220px", gap: "16px", pad: "16px" },
  }[thumbnailSize];

  const scaledSize = {
    base: sizeConfig.base,
    md: sizeConfig.md,
    gap: sizeConfig.gap,
    pad: sizeConfig.pad,
  };

  const updateGhostBadge = (id: string) => {
    const g = ghostElemRef.current;
    if (!g) return;
    const countBadge = g.querySelector('[data-ghost-count]') as HTMLElement | null;
    if (countBadge) {
      const idx = displayImagesRef.current.findIndex(img => img.id === id);
      countBadge.textContent = idx !== -1 ? (idx + 1).toString() : "";
    }
  };

  const updateGhostContent = (image: ImageItem) => {
    const g = ghostElemRef.current;
    if (!g) return;
    const img = g.querySelector('[data-ghost-img]') as HTMLImageElement | null;
    const name = g.querySelector('[data-ghost-name]') as HTMLElement | null;

    if (img) {
      img.src = image.url;
      const rotation = image.rotation ?? 0;
      const scale = getRotationFitScale(image.width ?? 0, image.height ?? 0, rotation, aspectRatio);
      const sx = (image.flipHorizontal ? -1 : 1) * scale;
      const sy = (image.flipVertical ? -1 : 1) * scale;
      img.style.transform = `rotate(${rotation}deg) scale(${sx}, ${sy})`;
      img.style.filter = image.filters ? getImageFilter({ filters: image.filters, activeFilter: image.activeFilter }, false) : 'none';
    }
    if (name) name.textContent = image.name;
    updateGhostBadge(image.id);
  };

  const handleDragStart = (index: number, id: string, e: MouseEvent | TouchEvent | PointerEvent) => {
    setDraggingId(id);
    setHoverTargetId(null);
    onSortStart?.();

    if ('dataTransfer' in e && (e as unknown as React.DragEvent).dataTransfer) {
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      (e as unknown as React.DragEvent).dataTransfer.setDragImage(img, 0, 0);
    }

    if (ghostElemRef.current) {
      const image = imagesRef.current.find(img => img.id === id);
      if (image) {
        updateGhostContent(image);
        const card = (e.target as HTMLElement | null)?.closest('[data-image-id]') as HTMLElement | null;
        if (card) {
          const rect = card.getBoundingClientRect();
          touchCardRectRef.current = rect;
          ghostElemRef.current.style.width = `${rect.width}px`;
          ghostElemRef.current.style.height = `${rect.height}px`;
        }
      }
      ghostElemRef.current.style.display = 'block';
    }
  };

  const handleDrag = (e: React.DragEvent | React.MouseEvent | any) => {
    if (ghostElemRef.current && 'clientX' in e) {
      ghostElemRef.current.style.left = `${e.clientX}px`;
      ghostElemRef.current.style.top = `${e.clientY}px`;
    }
  };

  const handleDragEnd = () => {
    if (draggingId && hoverTargetId && draggingId !== hoverTargetId) {
      onReorder([...displayImagesRef.current]);
    }
    setDraggingId(null);
    setHoverTargetId(null);
    onSortEnd?.();
    if (ghostElemRef.current) ghostElemRef.current.style.display = 'none';
  };

  // Sync ghost badge with preview order in real-time
  useEffect(() => {
    if (draggingId) {
      updateGhostBadge(draggingId);
    }
  }, [displayImages, draggingId]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.image-controls')) return;

      const card = (e.target as HTMLElement).closest('[data-image-id]') as HTMLElement | null;
      if (!card) return;

      const imageId = card.dataset.imageId;
      if (!imageId) return;

      const imageIdx = imagesRef.current.findIndex(img => img.id === imageId);
      if (imageIdx === -1) return;

      e.preventDefault();

      const touch = e.touches[0];
      touchDragIdRef.current = imageId;
      isTouchDraggingRef.current = false;
      touchIdentifierRef.current = touch.identifier;
      touchCardRectRef.current = card.getBoundingClientRect();
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };

      const image = imagesRef.current[imageIdx];
      updateGhostContent(image);

      if (ghostElemRef.current) {
        ghostElemRef.current.style.display = 'none';
        ghostElemRef.current.style.width = `${touchCardRectRef.current.width}px`;
        ghostElemRef.current.style.height = `${touchCardRectRef.current.height}px`;
      }
      setHoverTargetId(null);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchIdentifierRef.current === null) return;
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifierRef.current);
      if (!touch) return;

      const start = touchStartRef.current;
      if (!start) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      const DRAG_THRESHOLD = 8;

      if (!isTouchDraggingRef.current) {
        if (dist < DRAG_THRESHOLD) return;
        isTouchDraggingRef.current = true;
        setDraggingId(touchDragIdRef.current);
        onSortStart?.();
        if (ghostElemRef.current) ghostElemRef.current.style.display = 'block';
      }

      if (ghostElemRef.current) {
        ghostElemRef.current.style.left = `${touch.clientX}px`;
        ghostElemRef.current.style.top = `${touch.clientY}px`;
      }

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = target?.closest('[data-image-id]') as HTMLElement | null;
      const hoveredId = card?.dataset.imageId ?? null;

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
          const fs = imagesRef.current;
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

      if (touchDragIdRef.current && hoverTargetIdRef.current && touchDragIdRef.current !== hoverTargetIdRef.current) {
        onReorder([...displayImagesRef.current]);
      }

      isTouchDraggingRef.current = false;
      touchIdentifierRef.current = null;
      touchStartRef.current = null;
      touchDragIdRef.current = null;
      touchCardRectRef.current = null;
      hoverTargetIdRef.current = null;
      setDraggingId(null);
      setHoverTargetId(null);
      onSortEnd?.();
      if (ghostElemRef.current) ghostElemRef.current.style.display = 'none';
    };

    const resetDrag = () => {
      setDraggingId(null);
      setHoverTargetId(null);
      onSortEnd?.();
      if (ghostElemRef.current) ghostElemRef.current.style.display = 'none';
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
  }, [onSortStart, onSortEnd, onReorder]);

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggingId) return;

    // Update ghost position
    if (ghostElemRef.current) {
      ghostElemRef.current.style.left = `${e.clientX}px`;
      ghostElemRef.current.style.top = `${e.clientY}px`;
    }

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const card = target?.closest('[data-image-id]') as HTMLElement | null;
    const hoveredId = card?.dataset.imageId ?? null;
    if (!hoveredId || hoveredId === draggingId) return;

    const rect = card.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const DEADZONE = 0.01;
    const isRight = relX > 0.5 + DEADZONE;
    const isLeft = relX < 0.5 - DEADZONE;
    if (isLeft) {
      if (hoverTargetId !== hoveredId) setHoverTargetId(hoveredId);
    } else if (isRight) {
      const hoveredOrigIdx = images.findIndex((img) => img.id === hoveredId);
      const next = images.slice(hoveredOrigIdx + 1).find((img) => img.id !== draggingId);
      const newId = next?.id ?? "__append__";
      if (hoverTargetId !== newId) setHoverTargetId(newId);
    }
  };

  const handleGridDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setHoverTargetId(null);
    }
  };

  return (
    <>
      <style>{`
        .image-reorder-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(var(--thumb-size), 1fr));
          gap: var(--thumb-gap);
          padding: var(--thumb-pad);
        }

        @media (min-width: 768px) {
          .image-reorder-grid {
            grid-template-columns: repeat(auto-fill, minmax(var(--thumb-size-md), 1fr));
          }
        }

        .image-card {
          transition: aspect-ratio 280ms ease, padding 280ms ease, transform 200ms ease, box-shadow 200ms ease;
          will-change: aspect-ratio, padding;
        }

        .image-preview {
          transition: transform 280ms ease;
        }

        .image-overlay {
          z-index: 5;
        }

        .image-reorder-grid[data-orientation="landscape"] .image-card {
          border-radius: 14px;
        }
      `}</style>

      <div
        className="image-reorder-grid"
        style={{
          ["--thumb-size" as any]: scaledSize.base,
          ["--thumb-size-md" as any]: scaledSize.md,
          ["--thumb-gap" as any]: scaledSize.gap,
          ["--thumb-pad" as any]: scaledSize.pad,
        }}
        data-orientation={pageSettings?.orientation ?? "portrait"}
        ref={gridRef}
        onDragOver={handleGridDragOver}
        onDragLeave={handleGridDragLeave}
      >
        <AnimatePresence>
          {displayImages.map((image, index) => {
            const isCurrentDragging = image.id === draggingId;
            const isGhostSlot = hoverTargetId === image.id && draggingId && draggingId !== image.id;
            const draggedImage = draggingId ? images.find((img) => img.id === draggingId) : null;

            return (
              <motion.div
                key={image.id}
                data-id={image.id}
                data-image-id={image.id}
                data-orientation={pageSettings?.orientation ?? "portrait"}
                className={`image-card group relative rounded-xl overflow-hidden cursor-grab transition-all duration-200 ${!isCurrentDragging ? "hover:shadow-lg" : ""}`}
                style={{
                  aspectRatio: aspectRatio,
                  padding: padding,
                  touchAction: "none",
                  WebkitTouchCallout: "none" as any,
                  WebkitUserSelect: "none" as any,
                  backgroundColor: 'transparent',
                  background: 'none',
                  boxShadow: 'none'
                }}
                layout
                layoutId={draggingId === image.id ? undefined : image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  layout: { type: "spring", stiffness: 400, damping: 35 },
                  opacity: { duration: 0.15 },
                  scale: { duration: 0.15 }
                }}
                draggable
                onDragStart={(e: any) => {
                  if (touchStartRef.current) { e.preventDefault(); return; }
                  handleDragStart(index, image.id, e.nativeEvent);
                }}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onTap={() => onSelect?.(image.id)}
                onClick={(e: React.MouseEvent) => {
                  // Fallback for non-Framer Tap events
                  if (!e.defaultPrevented) onSelect?.(image.id);
                }}
              >
                {isCurrentDragging ? (
                  <div className={`flex-1 h-full rounded-xl border-2 border-dashed transition-colors duration-200 bg-transparent ${isNight ? "border-white/20" : "border-black/15"}`} style={{ minHeight: "160px" }} />
                ) : (
                  <>
                    {/* Explicit background wrapper to prevent layoutId color bleeding */}
                    <div className="absolute inset-0 -z-10 bg-white/95 shadow-sm" />

                    {/* Selection Ring - Anchored to card corners */}
                    {selectedId === image.id && (
                      <div className="absolute inset-0 ring-2 ring-cyan-400/70 rounded-xl pointer-events-none z-[12]" />
                    )}

                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg pointer-events-none z-[11]">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>


                    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                      <div className="absolute inset-0 pointer-events-none image-overlay">
                      </div>
                      {/* Warmth Overlay */}
                      {image.filters && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            zIndex: 1,
                            ...getWarmthOverlayStyle({ filters: image.filters, activeFilter: image.activeFilter })
                          }}
                        />
                      )}

                      {/* Vignette Overlay */}
                      {image.filters && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            zIndex: 2,
                            ...getVignetteStyle({ filters: image.filters, activeFilter: image.activeFilter })
                          }}
                        />
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none" />

                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-contain block pointer-events-none image-preview"
                        style={{
                          transform: (() => {
                            const rotation = image.rotation ?? 0;
                            const scale = getRotationFitScale(
                              image.width ?? 0,
                              image.height ?? 0,
                              rotation,
                              aspectRatio
                            );
                            const sx = (image.flipHorizontal ? -1 : 1) * scale;
                            const sy = (image.flipVertical ? -1 : 1) * scale;
                            return `rotate(${rotation}deg) scale(${sx}, ${sy})`;
                          })(),
                          transformOrigin: "center",
                          filter: image.filters ? getImageFilter({ filters: image.filters, activeFilter: image.activeFilter }, false) : 'none',
                        }}
                      />
                    </div>

                    {/* Action Buttons - Moved to end for stacking */}
                    <div
                      className={`absolute top-2 right-2 flex gap-2 z-50 transition-all duration-300 image-controls ${selectedId === image.id
                        ? "opacity-100 translate-y-0 visible"
                        : "opacity-0 -translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible"
                        }`}
                    >
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEdit(image.id, e);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-90 pointer-events-auto backdrop-blur-md ${isNight ? 'bg-blue-600/90 hover:bg-blue-500' : 'bg-cyan-500/90 hover:bg-cyan-400'}`}
                          title="Edit Image"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDelete(image.id, e);
                          }}
                          className="w-7 h-7 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-90 pointer-events-auto backdrop-blur-md"
                          title="Remove Image"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {createPortal(
        <div
          ref={ghostElemRef}
          style={{
            display: "none",
            position: "fixed",
            left: 0,
            top: 0,
            width: 180,
            transform: "translate(-50%, -50%) scale(1.05) rotate(2deg)",
            zIndex: 9999,
            pointerEvents: "none",
            opacity: 0.9,
            padding: padding,
            touchAction: "none"
          }}
          className="rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/40 bg-white/95"
        >
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg z-[11]">
              <span data-ghost-count className="text-xs font-bold text-white"></span>
            </div>
            <img
              data-ghost-img
              src=""
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div className="absolute inset-0 bg-indigo-500/10" />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p data-ghost-name className="text-[10px] font-medium truncate text-white"></p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export default ImageReorderGrid;
