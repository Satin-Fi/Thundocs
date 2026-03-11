import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';
// import PerspT from 'perspective-transform'; // Temporarily disabled due to browser compatibility
import { HomographyCalculator } from '@/utils/HomographyCalculator';
import { CropOptimizer } from '@/utils/CropOptimizer';

// --- New Crosshair Lens Component ---
interface CrosshairLensProps {
  visible: boolean;
  x: number;      // Screen position X (left)
  y: number;      // Screen position Y (top)
  focusX: number; // Focus point X relative to rendered image
  focusY: number; // Focus point Y relative to rendered image
  imageSrc: string;
  imageWidth: number;  // Rendered image width
  imageHeight: number; // Rendered image height
}

const CrosshairLens: React.FC<CrosshairLensProps> = ({
  visible, x, y, focusX, focusY, imageSrc, imageWidth, imageHeight
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ZOOM = 3;
  const SIZE = 120;
  const HALF = SIZE / 2;

  // Calculate background position to center the focus point
  const bgPosX = -(focusX * ZOOM - HALF);
  const bgPosY = -(focusY * ZOOM - HALF);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none rounded-full border-4 border-blue-500 shadow-2xl bg-white overflow-hidden transition-opacity duration-150"
      style={{
        left: x,
        top: y,
        width: SIZE,
        height: SIZE,
        opacity: visible ? 1 : 0,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Magnified Image Layer */}
      <div
        className="absolute inset-0 bg-white"
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `${bgPosX}px ${bgPosY}px`,
          backgroundSize: `${imageWidth * ZOOM}px ${imageHeight * ZOOM}px`,
          willChange: 'background-position'
        }}
      />

      {/* Crosshair Overlay - SVG */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="opacity-80 drop-shadow-sm">
          {/* Horizontal line */}
          <line
            x1="0"
            y1={HALF}
            x2={SIZE}
            y2={HALF}
            stroke="#3b82f6"
            strokeWidth="1.5"
          />
          {/* Vertical line */}
          <line
            x1={HALF}
            y1="0"
            x2={HALF}
            y2={SIZE}
            stroke="#3b82f6"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>,
    document.body
  );
};

interface CropPoint {
  x: number;
  y: number;
}

interface FourPointCropperProps {
  image: string;
  onCrop: (croppedImageUrl: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  showInlineActions?: boolean;
  useContainerBounds?: boolean;
  contentRef?: React.RefObject<HTMLElement>;
  onChange?: (isDirty: boolean) => void;
  explicitWidth?: number;
  explicitHeight?: number;
  rotation?: number;
  transformScale?: number;
}

export interface FourPointCropperHandle {
  apply: () => void;
  reset: () => void;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number;
  startPos: { x: number; y: number };
  startPoints: CropPoint[];
}

const POINT_SIZE = 16;
const TOUCH_POINT_SIZE = 24;
const MIN_DISTANCE = 30;

export const FourPointCropper = forwardRef<FourPointCropperHandle, FourPointCropperProps>(function FourPointCropper({ image, onCrop, containerRef, showInlineActions = true, useContainerBounds = false, contentRef, onChange, explicitWidth, explicitHeight, rotation = 0, transformScale = 1 }: FourPointCropperProps, ref) {
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([
    { x: 100, y: 100 }, // top-left
    { x: 300, y: 100 }, // top-right
    { x: 300, y: 300 }, // bottom-right
    { x: 100, y: 300 }  // bottom-left
  ]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    startPos: { x: 0, y: 0 },
    startPoints: []
  });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 });

  // Lens state - consolidated
  const [lensState, setLensState] = useState({
    visible: false,
    x: 0,
    y: 0,
    focusX: 0,
    focusY: 0
  });
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const isResettingRef = useRef(false);

  // Check if points match full image bounds
  const checkIsDirty = useCallback((points: CropPoint[], bounds: DOMRect | { width: number, height: number, x: number, y: number }) => {
    if (!bounds || bounds.width === 0) return false;

    // Using a slightly larger tolerance for float comparison
    const tolerance = 2;

    const p0 = points[0]; // TL
    const p1 = points[1]; // TR
    const p2 = points[2]; // BR
    const p3 = points[3]; // BL

    // Expected corners
    const tl = { x: bounds.x, y: bounds.y };
    const tr = { x: bounds.x + bounds.width, y: bounds.y };
    const br = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    const bl = { x: bounds.x, y: bounds.y + bounds.height };

    const isTL = Math.abs(p0.x - tl.x) < tolerance && Math.abs(p0.y - tl.y) < tolerance;
    const isTR = Math.abs(p1.x - tr.x) < tolerance && Math.abs(p1.y - tr.y) < tolerance;
    const isBR = Math.abs(p2.x - br.x) < tolerance && Math.abs(p2.y - br.y) < tolerance;
    const isBL = Math.abs(p3.x - bl.x) < tolerance && Math.abs(p3.y - bl.y) < tolerance;

    return !(isTL && isTR && isBR && isBL);
  }, []);

  // Reset when image source changes
  useEffect(() => {
    setImageBounds({ x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 });
    setCropPoints([]);
  }, [image]);

  const cropRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isMobile = useIsMobile();

  // Perspective transform cache for performance
  const perspectiveCache = useRef<Map<string, any>>(new Map());

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      perspectiveCache.current.clear();
      HomographyCalculator.clearCache();
    };
  }, []);

  // Calculate bounds helper
  const calculateBounds = useCallback(() => {
    if (!containerRef.current || !imageElement) return null;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Find the actual image element in the DOM to get its rendered size
    const imgElement = container.querySelector('img');
    let displayWidth = 0;
    let displayHeight = 0;
    let offsetX = 0;
    let offsetY = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (explicitWidth !== undefined && explicitHeight !== undefined) {
      return { 
        width: explicitWidth, 
        height: explicitHeight, 
        x: 0, 
        y: 0, 
        scaleX: 1, 
        scaleY: 1 
      };
    }

    if (useContainerBounds) {
      // Trust the container bounds completely

      displayWidth = containerRect.width / scaleX;
      displayHeight = containerRect.height / scaleY;
      offsetX = 0;
      offsetY = 0;
      // Use actual CSS dimensions of the element, NOT bounded box which breaks on rotations
      const targetW = contentRef.current.offsetWidth || 100;
      const targetH = contentRef.current.offsetHeight || 100;

      displayWidth = targetW;
      displayHeight = targetH;

      // The container for FourPointCropper is already rotated via CSS transform in the parent,
      // so the local coordinate system inside FourPointCropper strictly matches the unrotated
      // image dimensions. We don't want to swap width/height here!
      
      offsetX = 0;
      offsetY = 0;
      scaleX = 1;
      scaleY = 1;
    } else if (imgElement) {
      const imgRect = imgElement.getBoundingClientRect();

      if (imgElement.offsetWidth > 0) scaleX = imgRect.width / imgElement.offsetWidth;
      if (imgElement.offsetHeight > 0) scaleY = imgRect.height / imgElement.offsetHeight;

      displayWidth = imgRect.width / scaleX;
      displayHeight = imgRect.height / scaleY;
      offsetX = (imgRect.left - containerRect.left) / scaleX;
      offsetY = (imgRect.top - containerRect.top) / scaleY;
    } else {
      // Fallback: calculate based on container and image aspect ratio
      if (container.offsetWidth > 0) scaleX = containerRect.width / container.offsetWidth;
      if (container.offsetHeight > 0) scaleY = containerRect.height / container.offsetHeight;

      const imageAspect = imageElement.naturalWidth / imageElement.naturalHeight;
      const containerAspect = containerRect.width / containerRect.height;

      let scaledDisplayWidth, scaledDisplayHeight, scaledOffsetX, scaledOffsetY;

      if (imageAspect > containerAspect) {
        // Image is wider than container
        scaledDisplayWidth = containerRect.width * 0.8;
        scaledDisplayHeight = scaledDisplayWidth / imageAspect;
        scaledOffsetX = (containerRect.width - scaledDisplayWidth) / 2;
        scaledOffsetY = (containerRect.height - scaledDisplayHeight) / 2;
      } else {
        // Image is taller than container
        scaledDisplayHeight = containerRect.height * 0.8;
        scaledDisplayWidth = scaledDisplayHeight * imageAspect;
        scaledOffsetX = (containerRect.width - scaledDisplayWidth) / 2;
        scaledOffsetY = (containerRect.height - scaledDisplayHeight) / 2;
      }

      displayWidth = scaledDisplayWidth / scaleX;
      displayHeight = scaledDisplayHeight / scaleY;
      offsetX = scaledOffsetX / scaleX;
      offsetY = scaledOffsetY / scaleY;
    }

    return { width: displayWidth, height: displayHeight, x: offsetX, y: offsetY, scaleX, scaleY };
  }, [containerRef, imageElement, useContainerBounds, contentRef, explicitWidth, explicitHeight]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageElement(img);
    };
    img.src = image;
  }, [image]);

  // Handle resize and bounds update
  useEffect(() => {
    if (!containerRef.current || !imageElement) return;

    const handleResize = () => {
      const bounds = calculateBounds();
      if (!bounds) return;

      setImageBounds(prevBounds => {
        // If bounds haven't changed meaningfully, do nothing
        if (Math.abs(bounds.width - prevBounds.width) < 1 &&
          Math.abs(bounds.x - prevBounds.x) < 1 &&
          Math.abs(bounds.y - prevBounds.y) < 1 &&
          Math.abs((bounds.scaleX || 1) - (prevBounds.scaleX || 1)) < 0.001 &&
          Math.abs((bounds.scaleY || 1) - (prevBounds.scaleY || 1)) < 0.001 &&
          prevBounds.width > 0) {
          return prevBounds;
        }

        setCropPoints(prevPoints => {
          // Initialize if first time, reset, or points are missing
          if (prevBounds.width === 0 || prevPoints.length !== 4) {
            const margin = 0;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const halfWidth = (bounds.width - margin * 2) / 2;
            const halfHeight = (bounds.height - margin * 2) / 2;

            return [
              { x: centerX - halfWidth, y: centerY - halfHeight },
              { x: centerX + halfWidth, y: centerY - halfHeight },
              { x: centerX + halfWidth, y: centerY + halfHeight },
              { x: centerX - halfWidth, y: centerY + halfHeight }
            ];
          }

          // Scale existing points to new bounds
          return prevPoints.map(p => ({
            x: bounds.x + ((p.x - prevBounds.x) / prevBounds.width) * bounds.width,
            y: bounds.y + ((p.y - prevBounds.y) / prevBounds.height) * bounds.height
          }));
        });

        return bounds;
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    if (contentRef?.current) {
      resizeObserver.observe(contentRef.current);
    }

    // Initial check
    requestAnimationFrame(handleResize);

    return () => resizeObserver.disconnect();
  }, [containerRef, imageElement, calculateBounds, contentRef]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      if (isResettingRef.current) {
        onChange(false);
        isResettingRef.current = false;
      } else {
        const isDirty = checkIsDirty(cropPoints, imageBounds);
        onChange(isDirty);
      }
    }
  }, [cropPoints, imageBounds, onChange, checkIsDirty]);

  // Validate crop points geometry
  const validateCropPoints = useCallback((points: CropPoint[]) => {
    if (points.length !== 4) return false;

    // Check if all points are within image bounds with some tolerance
    const tolerance = 10;
    const isWithinBounds = points.every(point =>
      point.x >= imageBounds.x - tolerance &&
      point.x <= imageBounds.x + imageBounds.width + tolerance &&
      point.y >= imageBounds.y - tolerance &&
      point.y <= imageBounds.y + imageBounds.height + tolerance
    );

    if (!isWithinBounds) {
      console.warn('Points are outside image bounds');
      return false;
    }

    // Check for minimum distances between points
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const distance = Math.sqrt(
          Math.pow(points[i].x - points[j].x, 2) +
          Math.pow(points[i].y - points[j].y, 2)
        );
        if (distance < MIN_DISTANCE) {
          console.warn(`Points ${i} and ${j} are too close: ${distance}px`);
          return false;
        }
      }
    }

    return true;
  }, [imageBounds]);

  // Calculate quadrilateral area using shoelace formula
  const calculateQuadrilateralArea = useCallback((points: CropPoint[]) => {
    if (points.length !== 4) return 0;

    let area = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }, []);

  // Check if quadrilateral is self-intersecting
  const isQuadrilateralSelfIntersecting = useCallback((points: CropPoint[]) => {
    // Check if any two non-adjacent edges intersect
    const doLinesIntersect = (p1: CropPoint, p2: CropPoint, p3: CropPoint, p4: CropPoint) => {
      const d1 = direction(p3, p4, p1);
      const d2 = direction(p3, p4, p2);
      const d3 = direction(p1, p2, p3);
      const d4 = direction(p1, p2, p4);

      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
      }

      return false;
    };

    // Check edges 0-1 vs 2-3, and 1-2 vs 3-0
    return doLinesIntersect(points[0], points[1], points[2], points[3]) ||
      doLinesIntersect(points[1], points[2], points[3], points[0]);
  }, []);

  // Calculate direction of three points (cross product)
  const direction = (a: CropPoint, b: CropPoint, c: CropPoint) => {
    return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
  };

  // Check if quadrilateral is approximately rectangular (optimization)
  const isApproximatelyRectangular = useCallback((points: CropPoint[], tolerance = 0.1) => {
    const optimizer = new CropOptimizer();
    return CropOptimizer.isApproximatelyRectangular(points, tolerance);
  }, []);

  // Calculate perspective transformation matrix
  const calculatePerspectiveTransform = useCallback((srcPoints: CropPoint[], dstWidth: number, dstHeight: number) => {
    if (!validateCropPoints(srcPoints)) {
      throw new Error('Invalid source points for perspective transformation');
    }

    // Use custom homography for all transformations (perspective-transform library disabled)
    console.log('Using custom homography transformation for all crops');

    // Use custom 8-point homography for complex shapes
    console.log('Using custom homography transformation');
    try {
      const homographyMatrix = HomographyCalculator.calculateHomography(
        srcPoints.map(p => [p.x, p.y]),
        [
          [0, 0],
          [dstWidth, 0],
          [dstWidth, dstHeight],
          [0, dstHeight]
        ]
      );

      if (homographyMatrix) {
        return {
          homography: {
            a: homographyMatrix[0], b: homographyMatrix[1], c: homographyMatrix[2],
            d: homographyMatrix[3], e: homographyMatrix[4], f: homographyMatrix[5],
            g: homographyMatrix[6], h: homographyMatrix[7]
          }
        };
      }
    } catch (error) {
      console.error('Perspective calculation failed:', error);
      throw error;
    }
  }, [validateCropPoints, isApproximatelyRectangular]);

  // Apply perspective transformation to canvas with optimized pixel processing
  const applyPerspectiveTransform = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, transform: any): Promise<void> => {
    return new Promise((resolve) => {
      if (transform.homography) {
        // Use custom homography transformation with performance optimizations
        const h = transform.homography;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const transformedData = ctx.createImageData(canvas.width, canvas.height);

        // Pre-calculate constants for better performance
        const width = canvas.width;
        const height = canvas.height;
        const srcData = imageData.data;
        const dstData = transformedData.data;

        // Use batch processing for better performance
        const batchSize = Math.min(1000, height); // Process in batches to avoid blocking
        let currentRow = 0;

        const processBatch = () => {
          const endRow = Math.min(currentRow + batchSize, height);

          for (let y = currentRow; y < endRow; y++) {
            for (let x = 0; x < width; x++) {
              // Apply inverse homography transformation
              const denominator = h.g * x + h.h * y + 1;
              if (Math.abs(denominator) > 1e-10) {
                const srcX = Math.round((h.a * x + h.b * y + h.c) / denominator);
                const srcY = Math.round((h.d * x + h.e * y + h.f) / denominator);

                if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                  const srcIndex = (srcY * width + srcX) * 4;
                  const dstIndex = (y * width + x) * 4;

                  // Copy RGBA values efficiently
                  dstData[dstIndex] = srcData[srcIndex];
                  dstData[dstIndex + 1] = srcData[srcIndex + 1];
                  dstData[dstIndex + 2] = srcData[srcIndex + 2];
                  dstData[dstIndex + 3] = srcData[srcIndex + 3];
                }
              }
            }
          }

          currentRow = endRow;

          // Continue processing or finish
          if (currentRow < height) {
            // Use requestAnimationFrame for non-blocking processing
            requestAnimationFrame(processBatch);
          } else {
            // Processing complete, update canvas
            ctx.putImageData(transformedData, 0, 0);
            resolve();
          }
        };

        // Start batch processing
        processBatch();
      } else {
        resolve();
      }
    });
  }, []);

  // Calculate optimal scaling to fit cropped content within original canvas dimensions
  const calculateOptimalScaling = useCallback((cropWidth: number, cropHeight: number, originalWidth: number, originalHeight: number) => {
    // Calculate scale factors to fit within original dimensions while preserving aspect ratio
    const scaleX = originalWidth / cropWidth;
    const scaleY = originalHeight / cropHeight;

    // Use the smaller scale factor to ensure the entire cropped image fits (zoom-out effect)
    const optimalScale = Math.min(scaleX, scaleY);

    // Calculate final dimensions maintaining aspect ratio
    const finalWidth = Math.round(cropWidth * optimalScale);
    const finalHeight = Math.round(cropHeight * optimalScale);

    // Calculate centering offsets
    const offsetX = Math.round((originalWidth - finalWidth) / 2);
    const offsetY = Math.round((originalHeight - finalHeight) / 2);

    return {
      scale: optimalScale,
      finalWidth,
      finalHeight,
      offsetX,
      offsetY
    };
  }, []);

  // Optimized four-point crop with custom perspective correction and auto-scaling
  const applyCrop = useCallback(async () => {
    console.log('🚀 Apply Crop button clicked!');
    console.log('📊 Debug info:', {
      imageElement: !!imageElement,
      containerRef: !!containerRef.current
    });

    if (!imageElement || !containerRef.current) {
      console.warn('❌ Early return - missing requirements:', {
        imageElement: !!imageElement,
        containerRef: !!containerRef.current
      });
      return;
    }

    // Calculate crop coordinates relative to original image
    const scaleX = imageElement.naturalWidth / imageBounds.width;
    const scaleY = imageElement.naturalHeight / imageBounds.height;

    const scaledPoints = cropPoints.map(point => ({
      x: (point.x - imageBounds.x) * scaleX,
      y: (point.y - imageBounds.y) * scaleY
    }));

    // Calculate output dimensions
    const distances = [
      Math.hypot(scaledPoints[1].x - scaledPoints[0].x, scaledPoints[1].y - scaledPoints[0].y), // top
      Math.hypot(scaledPoints[2].x - scaledPoints[3].x, scaledPoints[2].y - scaledPoints[3].y), // bottom
      Math.hypot(scaledPoints[3].x - scaledPoints[0].x, scaledPoints[3].y - scaledPoints[0].y), // left
      Math.hypot(scaledPoints[2].x - scaledPoints[1].x, scaledPoints[2].y - scaledPoints[1].y)  // right
    ];

    const cropWidth = Math.max(distances[0], distances[1]);
    const cropHeight = Math.max(distances[2], distances[3]);

    // Calculate optimal scaling for zoom-out effect
    const originalWidth = imageElement.naturalWidth;
    const originalHeight = imageElement.naturalHeight;
    const scaling = calculateOptimalScaling(cropWidth, cropHeight, originalWidth, originalHeight);

    try {
      // Validate crop points
      if (!validateCropPoints(scaledPoints)) {
        throw new Error('Invalid crop points - geometry validation failed');
      }

      // Check for self-intersection
      if (isQuadrilateralSelfIntersecting(scaledPoints)) {
        throw new Error('Invalid crop points - quadrilateral is self-intersecting');
      }

      // Calculate area to ensure it's reasonable
      const area = calculateQuadrilateralArea(scaledPoints);
      if (area < 100) { // Minimum area threshold
        throw new Error('Crop area too small');
      }

      // Calculate perspective transformation
      const transform = calculatePerspectiveTransform(scaledPoints, cropWidth, cropHeight);

      // Create canvas for the cropped image with original dimensions for zoom-out effect
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas to original image dimensions to maintain the zoom-out effect
      canvas.width = originalWidth;
      canvas.height = originalHeight;

      // Fill with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create temporary canvas for perspective transformation
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = Math.round(cropWidth);
      tempCanvas.height = Math.round(cropHeight);

      // Draw the original image on temp canvas
      tempCtx.drawImage(imageElement, 0, 0);

      // Apply perspective transformation to temporary canvas
      await applyPerspectiveTransform(tempCanvas, tempCtx, transform);

      // Draw the transformed image onto the main canvas with scaling and centering
      ctx.drawImage(
        tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        scaling.offsetX, scaling.offsetY, scaling.finalWidth, scaling.finalHeight
      );

      // Convert to blob and call onCrop
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          console.log('✅ Calling onCrop with cropped image URL:', url);
          onCrop(url);
        } else {
          console.error('❌ Failed to create blob from canvas');
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.warn('Perspective correction failed, using fallback:', error);

      // Fallback: Use simple rectangular crop
      const [tl, tr, br, bl] = scaledPoints;

      // Calculate the bounding rectangle of the crop area
      const minX = Math.max(0, Math.min(tl.x, tr.x, br.x, bl.x));
      const maxX = Math.min(imageElement.naturalWidth, Math.max(tl.x, tr.x, br.x, bl.x));
      const minY = Math.max(0, Math.min(tl.y, tr.y, br.y, bl.y));
      const maxY = Math.min(imageElement.naturalHeight, Math.max(tl.y, tr.y, br.y, bl.y));

      // Ensure we have valid dimensions
      const fallbackWidth = Math.max(1, maxX - minX);
      const fallbackHeight = Math.max(1, maxY - minY);

      // Create fallback canvas
      const fallbackCanvas = document.createElement('canvas');
      const fallbackCtx = fallbackCanvas.getContext('2d');
      if (!fallbackCtx) return;

      fallbackCanvas.width = fallbackWidth;
      fallbackCanvas.height = fallbackHeight;

      // Draw the cropped image
      fallbackCtx.drawImage(
        imageElement,
        minX, minY, fallbackWidth, fallbackHeight,
        0, 0, fallbackWidth, fallbackHeight
      );

      // Convert fallback to blob
      fallbackCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          console.log('✅ Fallback crop - calling onCrop with URL:', url);
          onCrop(url);
        } else {
          console.error('❌ Fallback crop - failed to create blob from canvas');
        }
      }, 'image/png', 0.95);
    }
  }, [imageElement, cropPoints, imageBounds, onCrop, validateCropPoints, calculateQuadrilateralArea, isQuadrilateralSelfIntersecting, calculatePerspectiveTransform, applyPerspectiveTransform]);

  // Reset to rectangle
  const resetToRectangle = () => {
    if (imageBounds.width === 0) return;

    isResettingRef.current = true;
    const margin = 0;
    const centerX = imageBounds.x + imageBounds.width / 2;
    const centerY = imageBounds.y + imageBounds.height / 2;
    const halfWidth = (imageBounds.width - margin * 2) / 2;
    const halfHeight = (imageBounds.height - margin * 2) / 2;

    setCropPoints([
      { x: centerX - halfWidth, y: centerY - halfHeight },
      { x: centerX + halfWidth, y: centerY - halfHeight },
      { x: centerX + halfWidth, y: centerY + halfHeight },
      { x: centerX - halfWidth, y: centerY + halfHeight }
    ]);
  };

  useImperativeHandle(ref, () => ({
    apply: () => {
      void applyCrop();
    },
    reset: () => {
      resetToRectangle();
    }
  }), [applyCrop, resetToRectangle]);

  // Handle pointer start (mouse/touch)
  const handlePointerStart = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate scale factor
    let scaleX = 1;
    let scaleY = 1;
    if (containerRef.current.offsetWidth > 0) {
      scaleX = rect.width / containerRef.current.offsetWidth;
    }
    if (containerRef.current.offsetHeight > 0) {
      scaleY = rect.height / containerRef.current.offsetHeight;
    }

    const clientX = (e.clientX - rect.left) / scaleX;
    const clientY = (e.clientY - rect.top) / scaleY;

    setDragState({
      isDragging: true,
      dragIndex: index,
      startPos: { x: clientX, y: clientY },
      startPoints: [...cropPoints]
    });

    // Update ref immediately to prevent race conditions
    isDraggingRef.current = true;

    // Show zoom lens immediately on drag start
    const lensSize = 120;
    const offset = 24;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate lens position
    const cursorScreenX = e.clientX;
    const cursorScreenY = e.clientY;

    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;

    let lensX: number;
    if (spaceRight >= lensSize + offset + 20) {
      lensX = rect.right + offset;
    } else if (spaceLeft >= lensSize + offset + 20) {
      lensX = rect.left - lensSize - offset;
    } else {
      lensX = cursorScreenX + offset;
      if (lensX + lensSize > viewportWidth - 20) {
        lensX = cursorScreenX - lensSize - offset;
      }
    }

    let lensY = cursorScreenY - lensSize / 2;
    lensY = Math.max(20, Math.min(viewportHeight - lensSize - 20, lensY));

    // Focus point relative to rendered image
    const focusX = cropPoints[index].x - imageBounds.x;
    const focusY = cropPoints[index].y - imageBounds.y;

    setLensState({
      visible: true,
      x: lensX,
      y: lensY,
      focusX,
      focusY
    });
    setHoveredPointIndex(index);
  }, [cropPoints, containerRef, imageBounds]);

  // Handle pointer move - optimized for smooth corner dragging
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging || dragState.dragIndex === -1 || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate scale factor
    let scaleX = 1;
    let scaleY = 1;
    if (containerRef.current.offsetWidth > 0) {
      scaleX = rect.width / containerRef.current.offsetWidth;
    }
    if (containerRef.current.offsetHeight > 0) {
      scaleY = rect.height / containerRef.current.offsetHeight;
    }

    const currentX = (e.clientX - rect.left) / scaleX;
    const currentY = (e.clientY - rect.top) / scaleY;

    let deltaX = currentX - dragState.startPos.x;
    let deltaY = currentY - dragState.startPos.y;

    // Apply inverse zoom scale
    deltaX /= transformScale;
    deltaY /= transformScale;

    // Apply inverse rotation manually so mouse screen tracking 
    // correctly aligns with the local rotated coordinate system 
    const theta = rotation * (Math.PI / 180);
    const localDeltaX = deltaX * Math.cos(theta) + deltaY * Math.sin(theta);
    const localDeltaY = -deltaX * Math.sin(theta) + deltaY * Math.cos(theta);

    const newPoints = [...dragState.startPoints];
    const proposedPoint = {
      x: dragState.startPoints[dragState.dragIndex].x + localDeltaX,
      y: dragState.startPoints[dragState.dragIndex].y + localDeltaY
    };

    // Enhanced bounds checking - keep points well within image bounds
    // Removed margin restriction to allow selecting full image
    const margin = 0;
    proposedPoint.x = Math.max(
      imageBounds.x + margin,
      Math.min(imageBounds.x + imageBounds.width - margin, proposedPoint.x)
    );
    proposedPoint.y = Math.max(
      imageBounds.y + margin,
      Math.min(imageBounds.y + imageBounds.height - margin, proposedPoint.y)
    );

    // Check if the new quadrilateral is convex
    // This prevents "bow-tie" shapes and ensures diagonals intersect internally
    // effectively preventing corners from crossing the "center"
    const isConvex = (points: CropPoint[]) => {
      const crossProduct = (a: CropPoint, b: CropPoint, c: CropPoint) => {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      };

      const signs = [];
      for (let i = 0; i < 4; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 4];
        const p3 = points[(i + 2) % 4];
        signs.push(Math.sign(crossProduct(p1, p2, p3)));
      }

      // All cross products must have the same sign (ignoring zeros for collinear points, though strictly we want non-zero)
      // Since we start with a rectangle (clockwise or ccw), we expect all to be same sign.
      // If any sign differs from the others (and is non-zero), it's not convex.
      const firstNonZero = signs.find(s => s !== 0);
      if (firstNonZero === undefined) return true; // Degenerate line

      return signs.every(s => s === 0 || s === firstNonZero);
    };

    newPoints[dragState.dragIndex] = proposedPoint;

    if (isConvex(newPoints)) {
      // Always update the corner position immediately for smooth dragging
      setCropPoints(newPoints);
    }

    // Update lens state
    const lensSize = 120;
    const offset = 24;
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Lens screen position
    const cursorScreenX = e.clientX;
    const cursorScreenY = e.clientY;

    // Position lens relative to cursor based on side of screen
    // Preference: Outside container > Cursor side > Flip side

    // Determine which side of the image/container the cursor is on
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const isRightSide = cursorScreenX >= containerCenterX;

    const spaceRight = viewportWidth - containerRect.right;
    const spaceLeft = containerRect.left;

    let lensX: number;

    if (isRightSide) {
      // Try placing outside to the right
      if (spaceRight >= lensSize + offset + 20) {
        lensX = containerRect.right + offset;
      } else {
        // No space outside, place right of cursor (overlaying image)
        lensX = cursorScreenX + offset;
        // If goes off screen right, flip to left of cursor
        if (lensX + lensSize > viewportWidth - 20) {
          lensX = cursorScreenX - lensSize - offset;
        }
      }
    } else {
      // Try placing outside to the left
      if (spaceLeft >= lensSize + offset + 20) {
        lensX = containerRect.left - lensSize - offset;
      } else {
        // No space outside, place left of cursor (overlaying image)
        lensX = cursorScreenX - lensSize - offset;
        // If goes off screen left, flip to right of cursor
        if (lensX < 20) {
          lensX = cursorScreenX + offset;
        }
      }
    }

    let lensY = cursorScreenY - lensSize / 2;
    lensY = Math.max(20, Math.min(viewportHeight - lensSize - 20, lensY));

    // Focus point relative to rendered image (for background position)
    const focusX = newPoints[dragState.dragIndex].x - imageBounds.x;
    const focusY = newPoints[dragState.dragIndex].y - imageBounds.y;

    setLensState({
      visible: true,
      x: lensX,
      y: lensY,
      focusX,
      focusY
    });

    setHoveredPointIndex(dragState.dragIndex);
  }, [dragState, containerRef, imageBounds]);

  // Handle pointer end
  const handlePointerEnd = useCallback(() => {
    isDraggingRef.current = false;
    setDragState({
      isDragging: false,
      dragIndex: -1,
      startPos: { x: 0, y: 0 },
      startPoints: []
    });

    // Hide zoom lens when dragging ends
    setLensState(prev => ({ ...prev, visible: false }));
  }, [hoveredPointIndex]);

  // Throttled mouse tracking for performance
  const lastMouseMoveTime = useRef(0);
  const mouseTrackingThrottle = 8; // ~120fps max

  // Handle mouse move for zoom lens with optimized performance
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastMouseMoveTime.current < mouseTrackingThrottle) return;
    lastMouseMoveTime.current = now;

    // Check if dragging - if so, let handlePointerMove handle everything
    // Use ref to avoid stale closure issues during state updates
    if (isDraggingRef.current) return;

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate scale factor
    let scaleX = 1;
    let scaleY = 1;
    if (containerRef.current.offsetWidth > 0) {
      scaleX = rect.width / containerRef.current.offsetWidth;
    }
    if (containerRef.current.offsetHeight > 0) {
      scaleY = rect.height / containerRef.current.offsetHeight;
    }

    const mouseX = (e.clientX - rect.left) / scaleX;
    const mouseY = (e.clientY - rect.top) / scaleY;

    // Optimized hover detection
    const pointSize = isMobile ? TOUCH_POINT_SIZE : POINT_SIZE;
    const hoverRadius = pointSize + 15;
    const hoverRadiusSquared = hoverRadius * hoverRadius;

    let nearestPointIndex: number | null = null;
    let minDistanceSquared = Infinity;

    for (let i = 0; i < cropPoints.length; i++) {
      const point = cropPoints[i];
      const dx = mouseX - point.x;
      const dy = mouseY - point.y;

      if (Math.abs(dx) <= hoverRadius && Math.abs(dy) <= hoverRadius) {
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= hoverRadiusSquared && distanceSquared < minDistanceSquared) {
          minDistanceSquared = distanceSquared;
          nearestPointIndex = i;
        }
      }
    }

    setHoveredPointIndex(nearestPointIndex);
  }, [cropPoints, isMobile]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    // Use ref to avoid hiding lens during drag if mouse leaves container
    if (!isDraggingRef.current) {
      setLensState(prev => ({ ...prev, visible: false }));
      setHoveredPointIndex(null);
    }
  }, []);

  // Add global event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerEnd);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerEnd);
      };
    }
  }, [dragState.isDragging, handlePointerMove, handlePointerEnd]);

  // Create SVG path for the crop area
  const createCropPath = () => {
    return `M ${cropPoints[0].x} ${cropPoints[0].y} ` +
      `L ${cropPoints[1].x} ${cropPoints[1].y} ` +
      `L ${cropPoints[2].x} ${cropPoints[2].y} ` +
      `L ${cropPoints[3].x} ${cropPoints[3].y} Z`;
  };

  if (!imageElement || imageBounds.width === 0 || cropPoints.length !== 4) {
    return null;
  }

  const pointSize = isMobile ? TOUCH_POINT_SIZE : POINT_SIZE;

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-50"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* SVG overlay for crop area visualization */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="cropMask">
            <rect width="100%" height="100%" fill="white" />
            <path d={createCropPath()} fill="black" />
          </mask>
        </defs>

        {/* Darkened overlay */}
        <rect
          width="100%"
          height="100%"
          fill="black"
          fillOpacity="0.5"
          mask="url(#cropMask)"
        />

        {/* Crop area outline */}
        <path
          d={createCropPath()}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Grid lines inside crop area */}
        <g stroke="white" strokeWidth="1" strokeOpacity="0.3">
          {/* Horizontal grid lines */}
          <line
            x1={cropPoints[0].x + (cropPoints[1].x - cropPoints[0].x) / 3}
            y1={cropPoints[0].y + (cropPoints[3].y - cropPoints[0].y) / 3}
            x2={cropPoints[1].x + (cropPoints[2].x - cropPoints[1].x) / 3}
            y2={cropPoints[1].y + (cropPoints[2].y - cropPoints[1].y) / 3}
          />
          <line
            x1={cropPoints[0].x + (cropPoints[1].x - cropPoints[0].x) * 2 / 3}
            y1={cropPoints[0].y + (cropPoints[3].y - cropPoints[0].y) * 2 / 3}
            x2={cropPoints[1].x + (cropPoints[2].x - cropPoints[1].x) * 2 / 3}
            y2={cropPoints[1].y + (cropPoints[2].y - cropPoints[1].y) * 2 / 3}
          />

          {/* Vertical grid lines */}
          <line
            x1={cropPoints[0].x + (cropPoints[3].x - cropPoints[0].x) / 3}
            y1={cropPoints[0].y + (cropPoints[1].y - cropPoints[0].y) / 3}
            x2={cropPoints[3].x + (cropPoints[2].x - cropPoints[3].x) / 3}
            y2={cropPoints[3].y + (cropPoints[2].y - cropPoints[3].y) / 3}
          />
          <line
            x1={cropPoints[0].x + (cropPoints[3].x - cropPoints[0].x) * 2 / 3}
            y1={cropPoints[0].y + (cropPoints[1].y - cropPoints[0].y) * 2 / 3}
            x2={cropPoints[3].x + (cropPoints[2].x - cropPoints[3].x) * 2 / 3}
            y2={cropPoints[3].y + (cropPoints[2].y - cropPoints[3].y) * 2 / 3}
          />
        </g>
      </svg>

      {/* Crop points */}
      {cropPoints.map((point, index) => (
        <div
          key={index}
          className={`absolute bg-white border-2 rounded-full cursor-move shadow-lg ${dragState.isDragging && dragState.dragIndex === index
              ? 'border-blue-600 scale-125 shadow-blue-500/50'
              : hoveredPointIndex === index
                ? 'border-blue-500 scale-110 shadow-blue-400/50 transition-transform duration-200'
                : 'border-blue-500 hover:scale-105 transition-transform duration-200'
            }`}
          style={{
            left: point.x - pointSize / 2,
            top: point.y - pointSize / 2,
            width: pointSize,
            height: pointSize,
            touchAction: 'none'
          }}
          onPointerDown={(e) => handlePointerStart(e, index)}
        >
        </div>
      ))}

      {/* New Crosshair Lens Component */}
      <CrosshairLens
        visible={lensState.visible}
        x={lensState.x}
        y={lensState.y}
        focusX={lensState.focusX}
        focusY={lensState.focusY}
        imageSrc={image}
        imageWidth={imageBounds.width * (imageBounds.scaleX || 1)}
        imageHeight={imageBounds.height * (imageBounds.scaleY || 1)}
      />

      {showInlineActions && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => {
              void applyCrop();
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg backdrop-blur-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apply
          </button>
          <button
            onClick={resetToRectangle}
            className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors shadow-lg backdrop-blur-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      )}
    </div>
  );
});
