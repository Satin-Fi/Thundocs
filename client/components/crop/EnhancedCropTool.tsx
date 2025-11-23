import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface EnhancedCropToolProps {
  image: string;
  aspectRatio: string;
  onCrop: (croppedImageUrl: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize';
  resizeHandle: string;
  startPos: { x: number; y: number };
  startCrop: CropArea;
}

const HANDLE_SIZE = 12;
const MIN_CROP_SIZE = 50;

export function EnhancedCropTool({ image, aspectRatio, onCrop, containerRef }: EnhancedCropToolProps) {
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: 'move',
    resizeHandle: '',
    startPos: { x: 0, y: 0 },
    startCrop: { x: 0, y: 0, width: 0, height: 0 }
  });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  const cropRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
          const imageElements = container.querySelectorAll('img');
          let actualImageElement = null;
          
          // Find the image element that matches our source
          for (const imgEl of imageElements) {
            if ((imgEl as HTMLImageElement).src === img.src) {
              actualImageElement = imgEl as HTMLImageElement;
              break;
            }
          }
          
          if (actualImageElement) {
            const imageRect = actualImageElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate image bounds relative to container
            const displayWidth = imageRect.width;
            const displayHeight = imageRect.height;
            const offsetX = imageRect.left - containerRect.left;
            const offsetY = imageRect.top - containerRect.top;
            
            setImageBounds({ width: displayWidth, height: displayHeight, x: offsetX, y: offsetY });
          } else {
            // Fallback to calculated bounds if we can't find the actual image element
            const containerAspect = containerRect.width / containerRect.height;
            const imageAspect = img.width / img.height;
            
            let displayWidth, displayHeight, offsetX, offsetY;
            
            if (imageAspect > containerAspect) {
              displayWidth = containerRect.width * 0.8;
              displayHeight = displayWidth / imageAspect;
              offsetX = (containerRect.width - displayWidth) / 2;
              offsetY = (containerRect.height - displayHeight) / 2;
            } else {
              displayHeight = containerRect.height * 0.8;
              displayWidth = displayHeight * imageAspect;
              offsetX = (containerRect.width - displayWidth) / 2;
              offsetY = (containerRect.height - displayHeight) / 2;
            }
            
            setImageBounds({ width: displayWidth, height: displayHeight, x: offsetX, y: offsetY });
          }
          
        }
      }, 100); // Small delay to ensure DOM is updated
    };
    img.src = image;
  }, [image, aspectRatio, containerRef]);

  // Initialize crop area after image bounds are set
  useEffect(() => {
    if (imageBounds.width > 0 && imageBounds.height > 0) {
      const getRatio = () => {
        switch (aspectRatio) {
          case 'square': return 1;
          case '4:3': return 4/3;
          case '16:9': return 16/9;
          case '3:2': return 3/2;
          case '9:16': return 9/16;
          default: return 1;
        }
      };
      
      const ratio = getRatio();
      const cropSize = Math.min(imageBounds.width, imageBounds.height) * 0.6;
      const cropWidth = ratio >= 1 ? cropSize : cropSize * ratio;
      const cropHeight = ratio >= 1 ? cropSize / ratio : cropSize;
      
      setCropArea({
        x: imageBounds.x + (imageBounds.width - cropWidth) / 2,
        y: imageBounds.y + (imageBounds.height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      });
    }
  }, [imageBounds, aspectRatio]);

  // Get aspect ratio value
  const getAspectRatioValue = () => {
    switch (aspectRatio) {
      case 'square': return 1;
      case '4:3': return 4/3;
      case '16:9': return 16/9;
      case '3:2': return 3/2;
      case '9:16': return 9/16;
      default: return null; // free form
    }
  };

  // Constrain crop area to image bounds
  const constrainCropArea = (crop: CropArea): CropArea => {
    const ratio = getAspectRatioValue();
    
    let { x, y, width, height } = crop;
    
    // Ensure minimum size
    width = Math.max(width, MIN_CROP_SIZE);
    height = Math.max(height, MIN_CROP_SIZE);
    
    // Apply aspect ratio constraint
    if (ratio) {
      if (width / height > ratio) {
        width = height * ratio;
      } else {
        height = width / ratio;
      }
    }
    
    // Constrain to image bounds
    const maxX = imageBounds.x + imageBounds.width - width;
    const maxY = imageBounds.y + imageBounds.height - height;
    
    x = Math.max(imageBounds.x, Math.min(x, maxX));
    y = Math.max(imageBounds.y, Math.min(y, maxY));
    
    return { x, y, width, height };
  };

  // Handle mouse/touch start
  const handlePointerStart = useCallback((e: React.PointerEvent, type: 'move' | 'resize', handle = '') => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    setDragState({
      isDragging: true,
      dragType: type,
      resizeHandle: handle,
      startPos: { x: clientX, y: clientY },
      startCrop: { ...cropArea }
    });
  }, [cropArea]);

  // Handle mouse/touch move
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) return;
    
    const deltaX = e.clientX - dragState.startPos.x;
    const deltaY = e.clientY - dragState.startPos.y;
    
    let newCrop = { ...dragState.startCrop };
    
    if (dragState.dragType === 'move') {
      newCrop.x += deltaX;
      newCrop.y += deltaY;
    } else if (dragState.dragType === 'resize') {
      const handle = dragState.resizeHandle;
      const ratio = getAspectRatioValue();
      
      if (handle.includes('n')) {
        const newHeight = dragState.startCrop.height - deltaY;
        if (ratio) {
          const newWidth = newHeight * ratio;
          newCrop.width = newWidth;
          newCrop.height = newHeight;
          if (handle.includes('w')) {
            newCrop.x = dragState.startCrop.x + dragState.startCrop.width - newWidth;
          }
          newCrop.y = dragState.startCrop.y + dragState.startCrop.height - newHeight;
        } else {
          newCrop.height = newHeight;
          newCrop.y = dragState.startCrop.y + dragState.startCrop.height - newHeight;
        }
      }
      
      if (handle.includes('s')) {
        const newHeight = dragState.startCrop.height + deltaY;
        if (ratio) {
          const newWidth = newHeight * ratio;
          newCrop.width = newWidth;
          newCrop.height = newHeight;
          if (handle.includes('w')) {
            newCrop.x = dragState.startCrop.x + dragState.startCrop.width - newWidth;
          }
        } else {
          newCrop.height = newHeight;
        }
      }
      
      if (handle.includes('w')) {
        if (!ratio || !handle.includes('n') && !handle.includes('s')) {
          const newWidth = dragState.startCrop.width - deltaX;
          if (ratio) {
            const newHeight = newWidth / ratio;
            newCrop.width = newWidth;
            newCrop.height = newHeight;
            newCrop.y = dragState.startCrop.y + (dragState.startCrop.height - newHeight) / 2;
          } else {
            newCrop.width = newWidth;
          }
          newCrop.x = dragState.startCrop.x + dragState.startCrop.width - newCrop.width;
        }
      }
      
      if (handle.includes('e')) {
        if (!ratio || !handle.includes('n') && !handle.includes('s')) {
          const newWidth = dragState.startCrop.width + deltaX;
          if (ratio) {
            const newHeight = newWidth / ratio;
            newCrop.width = newWidth;
            newCrop.height = newHeight;
            newCrop.y = dragState.startCrop.y + (dragState.startCrop.height - newHeight) / 2;
          } else {
            newCrop.width = newWidth;
          }
        }
      }
    }
    
    setCropArea(constrainCropArea(newCrop));
  }, [dragState, getAspectRatioValue, constrainCropArea]);

  // Handle mouse/touch end
  const handlePointerEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: 'move',
      resizeHandle: '',
      startPos: { x: 0, y: 0 },
      startCrop: { x: 0, y: 0, width: 0, height: 0 }
    });
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

  // Detect image rotation and apply auto-straightening
  const detectAndCorrectRotation = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, sourceImage: HTMLImageElement, cropX: number, cropY: number, cropWidth: number, cropHeight: number) => {
    // Create a temporary canvas for edge detection
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return false;
    
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    
    // Draw the cropped area to temp canvas
    tempCtx.drawImage(
      sourceImage,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    // Simple edge detection to find dominant lines
    const imageData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);
    const data = imageData.data;
    
    // Calculate gradient angles (simplified Sobel operator)
    let angleSum = 0;
    let angleCount = 0;
    const step = 4; // Sample every 4th pixel for performance
    
    for (let y = step; y < cropHeight - step; y += step) {
      for (let x = step; x < cropWidth - step; x += step) {
        const idx = (y * cropWidth + x) * 4;
        
        // Calculate gradients
        const gx = (data[idx + 4] - data[idx - 4]) + 2 * (data[idx + cropWidth * 4 + 4] - data[idx + cropWidth * 4 - 4]) + (data[idx + cropWidth * 8 + 4] - data[idx + cropWidth * 8 - 4]);
        const gy = (data[idx + cropWidth * 8] - data[idx - cropWidth * 8]) + 2 * (data[idx + cropWidth * 8 + 4] - data[idx - cropWidth * 8 + 4]) + (data[idx + cropWidth * 8 + 8] - data[idx - cropWidth * 8 + 8]);
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 30) { // Threshold for significant edges
          const angle = Math.atan2(gy, gx);
          angleSum += angle;
          angleCount++;
        }
      }
    }
    
    if (angleCount === 0) return false;
    
    const avgAngle = angleSum / angleCount;
    const rotationAngle = -avgAngle; // Negative to correct the rotation
    
    // Only apply rotation if it's significant (more than 2 degrees)
    if (Math.abs(rotationAngle) > 0.035) { // ~2 degrees in radians
      // Apply rotation correction
      const centerX = cropWidth / 2;
      const centerY = cropHeight / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle);
      ctx.translate(-centerX, -centerY);
      
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
      
      return true;
    }
    
    return false;
  };

  // Apply crop with auto-straightening
  const applyCrop = useCallback(async () => {
    if (!imageElement || !containerRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate crop coordinates relative to original image
    // Ensure we're using the correct scaling factors
    const scaleX = imageElement.naturalWidth / imageBounds.width;
    const scaleY = imageElement.naturalHeight / imageBounds.height;
    
    // Calculate crop area relative to the image bounds
    const cropX = Math.max(0, (cropArea.x - imageBounds.x) * scaleX);
    const cropY = Math.max(0, (cropArea.y - imageBounds.y) * scaleY);
    const cropWidth = Math.min(cropArea.width * scaleX, imageElement.naturalWidth - cropX);
    const cropHeight = Math.min(cropArea.height * scaleY, imageElement.naturalHeight - cropY);
    
    // Ensure crop dimensions are valid
    if (cropWidth <= 0 || cropHeight <= 0) {
      console.warn('Invalid crop dimensions:', { cropWidth, cropHeight });
      return;
    }
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Try to detect and correct rotation
    const rotationCorrected = detectAndCorrectRotation(canvas, ctx, imageElement, cropX, cropY, cropWidth, cropHeight);
    
    if (!rotationCorrected) {
      // No rotation detected or correction failed, use standard crop
      ctx.drawImage(
        imageElement,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
    }
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    onCrop(croppedImageUrl);
  }, [imageElement, imageBounds, cropArea, onCrop, containerRef]);

  if (!imageElement || imageBounds.width === 0) {
    return null;
  }

  const handleSize = isMobile ? 16 : HANDLE_SIZE;

  return (
    <div className="absolute inset-0 pointer-events-auto">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Crop area */}
      <div
        ref={cropRef}
        className="absolute border-2 border-white shadow-lg cursor-move"
        style={{
          left: cropArea.x,
          top: cropArea.y,
          width: cropArea.width,
          height: cropArea.height,
          background: 'transparent'
        }}
        onPointerDown={(e) => handlePointerStart(e, 'move')}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
        
        {/* Resize handles */}
        {/* Corner handles */}
        <div
          className="absolute bg-white border border-gray-400 cursor-nw-resize"
          style={{
            left: -handleSize/2,
            top: -handleSize/2,
            width: handleSize,
            height: handleSize
          }}
          onPointerDown={(e) => handlePointerStart(e, 'resize', 'nw')}
        />
        <div
          className="absolute bg-white border border-gray-400 cursor-ne-resize"
          style={{
            right: -handleSize/2,
            top: -handleSize/2,
            width: handleSize,
            height: handleSize
          }}
          onPointerDown={(e) => handlePointerStart(e, 'resize', 'ne')}
        />
        <div
          className="absolute bg-white border border-gray-400 cursor-sw-resize"
          style={{
            left: -handleSize/2,
            bottom: -handleSize/2,
            width: handleSize,
            height: handleSize
          }}
          onPointerDown={(e) => handlePointerStart(e, 'resize', 'sw')}
        />
        <div
          className="absolute bg-white border border-gray-400 cursor-se-resize"
          style={{
            right: -handleSize/2,
            bottom: -handleSize/2,
            width: handleSize,
            height: handleSize
          }}
          onPointerDown={(e) => handlePointerStart(e, 'resize', 'se')}
        />
        
        {/* Edge handles (only for free form) */}
        {!getAspectRatioValue() && (
          <>
            <div
              className="absolute bg-white border border-gray-400 cursor-n-resize"
              style={{
                left: '50%',
                top: -handleSize/2,
                width: handleSize,
                height: handleSize,
                transform: 'translateX(-50%)'
              }}
              onPointerDown={(e) => handlePointerStart(e, 'resize', 'n')}
            />
            <div
              className="absolute bg-white border border-gray-400 cursor-s-resize"
              style={{
                left: '50%',
                bottom: -handleSize/2,
                width: handleSize,
                height: handleSize,
                transform: 'translateX(-50%)'
              }}
              onPointerDown={(e) => handlePointerStart(e, 'resize', 's')}
            />
            <div
              className="absolute bg-white border border-gray-400 cursor-w-resize"
              style={{
                left: -handleSize/2,
                top: '50%',
                width: handleSize,
                height: handleSize,
                transform: 'translateY(-50%)'
              }}
              onPointerDown={(e) => handlePointerStart(e, 'resize', 'w')}
            />
            <div
              className="absolute bg-white border border-gray-400 cursor-e-resize"
              style={{
                right: -handleSize/2,
                top: '50%',
                width: handleSize,
                height: handleSize,
                transform: 'translateY(-50%)'
              }}
              onPointerDown={(e) => handlePointerStart(e, 'resize', 'e')}
            />
          </>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
        <button
          onClick={applyCrop}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Apply Crop
        </button>
      </div>
    </div>
  );
}