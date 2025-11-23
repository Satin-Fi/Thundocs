import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
// import PerspT from 'perspective-transform'; // Temporarily disabled due to browser compatibility
import { HomographyCalculator } from '@/utils/HomographyCalculator';
import { CropOptimizer } from '@/utils/CropOptimizer';

interface CropPoint {
  x: number;
  y: number;
}

interface FourPointCropperProps {
  image: string;
  onCrop: (croppedImageUrl: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
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

export function FourPointCropper({ image, onCrop, containerRef }: FourPointCropperProps) {
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
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  // Zoom lens state
  const [showZoomLens, setShowZoomLens] = useState(false);
  const [zoomLensPos, setZoomLensPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  
  const cropRef = useRef<HTMLDivElement>(null);
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

  // Load image and calculate bounds
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageElement(img);
      
      // Add a small delay to ensure the image is rendered in the DOM
      setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          const containerRect = container.getBoundingClientRect();
          
          // Find the actual image element in the DOM to get its rendered size
          const imgElement = container.querySelector('img');
          let displayWidth = 0;
          let displayHeight = 0;
          let offsetX = 0;
          let offsetY = 0;
          
          if (imgElement) {
            const imgRect = imgElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            displayWidth = imgRect.width;
            displayHeight = imgRect.height;
            offsetX = imgRect.left - containerRect.left;
            offsetY = imgRect.top - containerRect.top;
          } else {
            // Fallback: calculate based on container and image aspect ratio
            const imageAspect = img.naturalWidth / img.naturalHeight;
            const containerAspect = containerRect.width / containerRect.height;
            
            if (imageAspect > containerAspect) {
              // Image is wider than container
              displayWidth = containerRect.width * 0.8;
              displayHeight = displayWidth / imageAspect;
              offsetX = (containerRect.width - displayWidth) / 2;
              offsetY = (containerRect.height - displayHeight) / 2;
            } else {
              // Image is taller than container
              displayHeight = containerRect.height * 0.8;
              displayWidth = displayHeight * imageAspect;
              offsetX = (containerRect.width - displayWidth) / 2;
              offsetY = (containerRect.height - displayHeight) / 2;
            }
          }
          
          setImageBounds({ width: displayWidth, height: displayHeight, x: offsetX, y: offsetY });
          
          // Initialize crop points to form a rectangle in the center
          const margin = Math.min(displayWidth, displayHeight) * 0.2;
          const centerX = offsetX + displayWidth / 2;
          const centerY = offsetY + displayHeight / 2;
          const halfWidth = (displayWidth - margin * 2) / 2;
          const halfHeight = (displayHeight - margin * 2) / 2;
          
          setCropPoints([
            { x: centerX - halfWidth, y: centerY - halfHeight }, // top-left
            { x: centerX + halfWidth, y: centerY - halfHeight }, // top-right
            { x: centerX + halfWidth, y: centerY + halfHeight }, // bottom-right
            { x: centerX - halfWidth, y: centerY + halfHeight }  // bottom-left
          ]);
        }
      }, 100); // Small delay to ensure DOM is updated
    };
    img.src = image;
  }, [image, containerRef]);

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
    
    const margin = Math.min(imageBounds.width, imageBounds.height) * 0.2;
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

  // Handle pointer start (mouse/touch)
  const handlePointerStart = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    setDragState({
      isDragging: true,
      dragIndex: index,
      startPos: { x: clientX, y: clientY },
      startPoints: [...cropPoints]
    });
  }, [cropPoints, containerRef]);

  // Handle pointer move - optimized for smooth corner dragging
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging || dragState.dragIndex === -1 || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const deltaX = currentX - dragState.startPos.x;
    const deltaY = currentY - dragState.startPos.y;
    
    const newPoints = [...dragState.startPoints];
    const proposedPoint = {
      x: dragState.startPoints[dragState.dragIndex].x + deltaX,
      y: dragState.startPoints[dragState.dragIndex].y + deltaY
    };
    
    // Enhanced bounds checking - keep points well within image bounds
    const margin = Math.min(imageBounds.width, imageBounds.height) * 0.05; // 5% margin
    proposedPoint.x = Math.max(
      imageBounds.x + margin, 
      Math.min(imageBounds.x + imageBounds.width - margin, proposedPoint.x)
    );
    proposedPoint.y = Math.max(
      imageBounds.y + margin, 
      Math.min(imageBounds.y + imageBounds.height - margin, proposedPoint.y)
    );
    
    newPoints[dragState.dragIndex] = proposedPoint;
    
    // Always update the corner position immediately for smooth dragging
    setCropPoints(newPoints);
    
    // Update mouse position for zoom lens during dragging
    setMousePos({ x: currentX, y: currentY });
  }, [dragState, containerRef, imageBounds]);

  // Handle pointer end
  const handlePointerEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      dragIndex: -1,
      startPos: { x: 0, y: 0 },
      startPoints: []
    });
    
    // Hide zoom lens when dragging ends
    if (!hoveredPointIndex) {
      setShowZoomLens(false);
    }
  }, [hoveredPointIndex]);

  // Throttled mouse tracking for performance
  const lastMouseMoveTime = useRef(0);
  const mouseTrackingThrottle = 8; // ~120fps max
  
  // Handle mouse move for zoom lens with optimized performance
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastMouseMoveTime.current < mouseTrackingThrottle) return;
    lastMouseMoveTime.current = now;
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePos({ x: mouseX, y: mouseY });
    
    // Optimized hover detection with early exit and squared distance
    const pointSize = isMobile ? TOUCH_POINT_SIZE : POINT_SIZE;
    const hoverRadius = pointSize + 15; // Slightly larger for better UX
    const hoverRadiusSquared = hoverRadius * hoverRadius; // Avoid sqrt calculation
    
    let nearestPointIndex: number | null = null;
    let minDistanceSquared = Infinity;
    
    // Early exit optimization - check bounds first
    for (let i = 0; i < cropPoints.length; i++) {
      const point = cropPoints[i];
      const dx = mouseX - point.x;
      const dy = mouseY - point.y;
      
      // Quick bounds check before distance calculation
      if (Math.abs(dx) <= hoverRadius && Math.abs(dy) <= hoverRadius) {
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared <= hoverRadiusSquared && distanceSquared < minDistanceSquared) {
          minDistanceSquared = distanceSquared;
          nearestPointIndex = i;
        }
      }
    }
    
    setHoveredPointIndex(nearestPointIndex);
    
    if (nearestPointIndex !== null && !dragState.isDragging) {
      // Enhanced zoom lens positioning - position outside image to avoid covering it
      const lensSize = 120;
      const offset = 30; // Distance from cursor
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Get viewport boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate initial position - try to position outside the image area
      let lensX = e.clientX + offset;
      let lensY = e.clientY - lensSize - offset;
      
      // Check if lens would be outside viewport and adjust
      if (lensX + lensSize > viewportWidth - 20) {
        lensX = e.clientX - lensSize - offset; // Position to the left of cursor
      }
      if (lensY < 20) {
        lensY = e.clientY + offset; // Position below cursor
      }
      
      // Final viewport boundary checks
      lensX = Math.max(20, Math.min(viewportWidth - lensSize - 20, lensX));
      lensY = Math.max(20, Math.min(viewportHeight - lensSize - 20, lensY));
      
      setZoomLensPos({ x: lensX, y: lensY });
      setShowZoomLens(true);
    } else if (!dragState.isDragging) {
      setShowZoomLens(false);
    }
  }, [containerRef, cropPoints, isMobile, dragState.isDragging]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!dragState.isDragging) {
      setShowZoomLens(false);
      setHoveredPointIndex(null);
    }
  }, [dragState.isDragging]);

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

  if (!imageElement || imageBounds.width === 0) {
    return null;
  }

  const pointSize = isMobile ? TOUCH_POINT_SIZE : POINT_SIZE;

  return (
    <div 
      className="absolute inset-0 pointer-events-auto"
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
          className={`absolute bg-white border-2 rounded-full cursor-move shadow-lg transition-all duration-200 ${
            dragState.isDragging && dragState.dragIndex === index 
              ? 'border-blue-600 scale-125 shadow-blue-500/50' 
              : hoveredPointIndex === index
                ? 'border-blue-500 scale-110 shadow-blue-400/50'
                : 'border-blue-500 hover:scale-105'
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
      
      {/* Crosshair Zoom Lens - Optimized for smooth movement */}
      {showZoomLens && hoveredPointIndex !== null && imageElement && (
        <div
          className="fixed pointer-events-none z-50 transition-opacity duration-150 ease-out"
          style={{
            left: zoomLensPos.x,
            top: zoomLensPos.y,
            transform: 'translateZ(0)', // Force hardware acceleration
            willChange: 'transform, opacity', // Optimize for animations
          }}
        >
          <div className="relative w-32 h-32 bg-white rounded-full border-4 border-blue-500 shadow-2xl overflow-hidden transform-gpu">
            {/* Magnified image background - optimized positioning */}
            <div
              className="absolute inset-0 transform-gpu"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: `${Math.round(imageBounds.width * 3)}px ${Math.round(imageBounds.height * 3)}px`,
                backgroundPosition: `${Math.round(-(cropPoints[hoveredPointIndex].x - imageBounds.x) * 3 + 64)}px ${Math.round(-(cropPoints[hoveredPointIndex].y - imageBounds.y) * 3 + 64)}px`,
                backgroundRepeat: 'no-repeat',
                willChange: 'background-position', // Optimize background positioning
              }}
            />
            
            {/* Crosshair overlay - optimized rendering */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Horizontal crosshair */}
              <div 
                className="absolute bg-red-500 opacity-80"
                style={{
                  width: '100%',
                  height: '2px',
                  top: '50%',
                  left: 0,
                  transform: 'translateY(-50%) translateZ(0)',
                }}
              />
              {/* Vertical crosshair */}
              <div 
                className="absolute bg-red-500 opacity-80"
                style={{
                  width: '2px',
                  height: '100%',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%) translateZ(0)',
                }}
              />
              {/* Center dot */}
              <div 
                className="absolute bg-red-600 rounded-full"
                style={{
                  width: '6px',
                  height: '6px',
                  transform: 'translate(-50%, -50%) translateZ(0)',
                }}
              />
            </div>
            
            {/* Zoom level indicator - performance optimized */}
            <div 
              className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded transform-gpu"
              style={{ fontSize: '10px', willChange: 'auto' }}
            >
              3x
            </div>
          </div>
        </div>
      )}
      
      {/* Action buttons - Optimally positioned for better UX */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            console.log('🔥 Apply Crop button clicked - direct handler!');
            applyCrop();
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
    </div>
  );
}