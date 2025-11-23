import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Move, Download, RotateCcw, Crop } from 'lucide-react';

export interface CropPoint {
  x: number;
  y: number;
}

export interface QuadrilateralCropperProps {
  image: string;
  onCrop: (croppedImage: string) => void;
  className?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
}

// Enhanced quadrilateral crop function based on the working gallery implementation
const getQuadrilateralCroppedImg = async (
  imageSrc: string,
  cropPoints: CropPoint[],
  imageDimensions: ImageDimensions
): Promise<string | null> => {
  try {
    console.log('🔧 Starting quadrilateral crop with enhanced method');

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSrc;
    });

    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');

    if (!outputCtx) {
      console.error('❌ Failed to get canvas context');
      return null;
    }

    console.log('📄 Processing quadrilateral crop:', {
      imageSize: { width: img.width, height: img.height },
      imageDimensions: imageDimensions,
      cropPoints: cropPoints.map(p => ({ x: p.x.toFixed(3), y: p.y.toFixed(3) }))
    });

    // Scale corners to actual image coordinates
    const scaledCorners = cropPoints.map(corner => ({
      x: corner.x * img.width,
      y: corner.y * img.height
    }));
    
    console.log('📐 Scaled corners:', scaledCorners.map(p => ({ x: p.x.toFixed(1), y: p.y.toFixed(1) })));
    
    // Calculate bounding box
    const minX = Math.min(...scaledCorners.map(c => c.x));
    const maxX = Math.max(...scaledCorners.map(c => c.x));
    const minY = Math.min(...scaledCorners.map(c => c.y));
    const maxY = Math.max(...scaledCorners.map(c => c.y));
    
    // Set canvas size to bounding box
    outputCanvas.width = maxX - minX;
    outputCanvas.height = maxY - minY;
    
    console.log('📏 Output dimensions:', { width: outputCanvas.width.toFixed(1), height: outputCanvas.height.toFixed(1) });
    
    // Create clipping path using the quadrilateral shape
    outputCtx.save();
    
    // Translate corners to canvas coordinates
    const canvasCorners = scaledCorners.map(corner => ({
      x: corner.x - minX,
      y: corner.y - minY
    }));
    
    // Create quadrilateral clipping path
    outputCtx.beginPath();
    outputCtx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
    canvasCorners.slice(1).forEach(corner => outputCtx.lineTo(corner.x, corner.y));
    outputCtx.closePath();
    outputCtx.clip();
    
    console.log('✂️ Clipping corners:', canvasCorners.map(p => ({ x: p.x.toFixed(1), y: p.y.toFixed(1) })));
    
    // Draw the cropped section of the image
    outputCtx.drawImage(
      img,
      minX, minY, maxX - minX, maxY - minY,
      0, 0, outputCanvas.width, outputCanvas.height
    );
    
    outputCtx.restore();

    const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.95);
    console.log('✅ Quadrilateral crop completed');
    
    return dataUrl;
  } catch (error) {
    console.error('❌ Error creating quadrilateral crop:', error);
    return null;
  }
};

export default function QuadrilateralCropper({
  image,
  onCrop,
  className = '',
}: QuadrilateralCropperProps) {
  console.log('🔄 QuadrilateralCropper component mounted/re-rendered with image:', image);
  
  const [corners, setCorners] = useState<CropPoint[]>([
    { x: 0.1, y: 0.1 }, // Top-left
    { x: 0.9, y: 0.1 }, // Top-right
    { x: 0.9, y: 0.9 }, // Bottom-right
    { x: 0.1, y: 0.9 }, // Bottom-left
  ]);
  
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showZoomLens, setShowZoomLens] = useState(false);
  const [zoomLensPos, setZoomLensPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    console.log('🖼️ Image loaded in QuadrilateralCropper');
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Use a timeout to ensure layout is stable
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the scale to fit image within container with some padding
        const padding = 20; // Add some padding to prevent edge clipping
        const availableWidth = containerRect.width - padding;
        const availableHeight = containerRect.height - padding;
        
        const scale = Math.min(
          availableWidth / img.naturalWidth,
          availableHeight / img.naturalHeight
        );
        
        // Calculate actual displayed dimensions
        const displayWidth = img.naturalWidth * scale;
        const displayHeight = img.naturalHeight * scale;
        
        const dimensions = {
          width: displayWidth,
          height: displayHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          scale,
        };
        
        console.log('📐 Setting image dimensions:', dimensions);
        setImageDimensions(dimensions);
        setImageLoaded(true);
      }, 100); // Increased timeout for better stability
      
      // Auto-adjust quad corners when image size changes
      if (corners[0].x === 0.1 && corners[0].y === 0.1) {
        const newCorners = [
          { x: 0.15, y: 0.15 },
          { x: 0.85, y: 0.15 },
          { x: 0.85, y: 0.85 },
          { x: 0.15, y: 0.85 }
        ];
        setCorners(newCorners);
        console.log('🔄 Auto-adjusted corners:', newCorners);
      }
      
      // Draw initial overlay
      drawCanvas();
    } else {
      console.error('❌ Missing image or container ref');
    }
  }, [corners]);

  // Handle container resize and viewport changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current && imageRef.current && imageLoaded) {
          // Recalculate dimensions when container size changes
          handleImageLoad();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    // Also listen for window resize events
    const handleWindowResize = () => {
      if (imageRef.current && containerRef.current && imageLoaded) {
        setTimeout(() => handleImageLoad(), 150);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [imageLoaded, handleImageLoad]);

  // Draw the canvas overlay with quadrilateral and zoom lens
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !imageLoaded || !imageDimensions) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container dimensions for proper canvas sizing
    const containerRect = container.getBoundingClientRect();
    
    // Set canvas size to match the container dimensions
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    
    // Calculate the offset to center the image within the canvas
    const offsetX = (containerRect.width - imageDimensions.width) / 2;
    const offsetY = (containerRect.height - imageDimensions.height) / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw overlay (semi-transparent dark layer)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create quadrilateral clipping area (adjusted for image position)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(
      offsetX + corners[0].x * imageDimensions.width, 
      offsetY + corners[0].y * imageDimensions.height
    );
    corners.slice(1).forEach(corner => 
      ctx.lineTo(
        offsetX + corner.x * imageDimensions.width, 
        offsetY + corner.y * imageDimensions.height
      )
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Draw quadrilateral outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      offsetX + corners[0].x * imageDimensions.width, 
      offsetY + corners[0].y * imageDimensions.height
    );
    corners.slice(1).forEach(corner => 
      ctx.lineTo(
        offsetX + corner.x * imageDimensions.width, 
        offsetY + corner.y * imageDimensions.height
      )
    );
    ctx.closePath();
    ctx.stroke();
    
    // Draw corner handles (adjusted for image position)
    corners.forEach((corner, index) => {
      const isHover = hoverIndex === index;
      const isDragging = dragIndex === index;
      
      // Larger handle when hovering or dragging
      const handleSize = isHover || isDragging ? 14 : 10;
      
      const x = offsetX + corner.x * imageDimensions.width;
      const y = offsetY + corner.y * imageDimensions.height;
      
      // Outer glow effect
      if (isHover || isDragging) {
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 15;
      }
      
      ctx.fillStyle = isHover || isDragging ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, handleSize, 0, 2 * Math.PI);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // White border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Corner number
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
       ctx.fillText((index + 1).toString(), x, y);
     });
  }, [corners, hoverIndex, dragIndex, imageLoaded, imageDimensions, containerRef]);

  // Draw zoom lens
  const drawZoomLens = useCallback(() => {
    const zoomCanvas = zoomCanvasRef.current;
    const img = imageRef.current;
    if (!zoomCanvas || !img || !showZoomLens) return;

    const ctx = zoomCanvas.getContext('2d');
    if (!ctx) return;

    const zoomLevel = 3;
    const lensSize = 120;
    const sourceSize = lensSize / zoomLevel;

    zoomCanvas.width = lensSize;
    zoomCanvas.height = lensSize;

    // Clear canvas
    ctx.clearRect(0, 0, lensSize, lensSize);

    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(lensSize / 2, lensSize / 2, lensSize / 2 - 3, 0, 2 * Math.PI);
    ctx.clip();

    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, lensSize, lensSize);

    // Draw zoomed image portion
    const sourceX = Math.max(0, mousePos.x - sourceSize / 2);
    const sourceY = Math.max(0, mousePos.y - sourceSize / 2);
    
    if (imageDimensions) {
      const scaleX = img.naturalWidth / imageDimensions.width;
      const scaleY = img.naturalHeight / imageDimensions.height;

      ctx.drawImage(
        img,
        sourceX * scaleX,
        sourceY * scaleY,
        sourceSize * scaleX,
        sourceSize * scaleY,
        0,
        0,
        lensSize,
        lensSize
      );
    }
    
    ctx.restore();
    
    // Draw crosshair
    const centerX = lensSize / 2;
    const centerY = lensSize / 2;
    const crosshairLength = 20;
    
    // White background for contrast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - crosshairLength, centerY);
    ctx.lineTo(centerX + crosshairLength, centerY);
    ctx.moveTo(centerX, centerY - crosshairLength);
    ctx.lineTo(centerX, centerY + crosshairLength);
    ctx.stroke();
    
    // Red crosshair on top
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - crosshairLength, centerY);
    ctx.lineTo(centerX + crosshairLength, centerY);
    ctx.moveTo(centerX, centerY - crosshairLength);
    ctx.lineTo(centerX, centerY + crosshairLength);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Lens border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(lensSize / 2, lensSize / 2, lensSize / 2 - 2, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lensSize / 2, lensSize / 2, lensSize / 2 - 1, 0, 2 * Math.PI);
    ctx.stroke();
  }, [mousePos, showZoomLens, imageDimensions]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (showZoomLens) {
      drawZoomLens();
    }
  }, [drawZoomLens]);

  // Get corner at position
  const getCornerAtPosition = useCallback((x: number, y: number, tolerance = 25) => {
    if (!imageDimensions || !containerRef.current) return -1;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = (containerRect.width - imageDimensions.width) / 2;
    const offsetY = (containerRect.height - imageDimensions.height) / 2;
    
    for (let i = 0; i < corners.length; i++) {
      const cornerX = offsetX + corners[i].x * imageDimensions.width;
      const cornerY = offsetY + corners[i].y * imageDimensions.height;
      const distance = Math.sqrt((x - cornerX) ** 2 + (y - cornerY) ** 2);
      if (distance <= tolerance) {
        return i;
      }
    }
     return -1;
   }, [corners, imageDimensions, containerRef]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageDimensions || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Check if hovering over a corner
    const cornerIndex = getCornerAtPosition(x, y);
    
    if (cornerIndex >= 0) {
      setHoverIndex(cornerIndex);
      setShowZoomLens(true);
      setZoomLensPos({ 
        x: e.clientX + 30, 
        y: e.clientY - 60 
      });
    } else {
      setHoverIndex(null);
      if (dragIndex === null) {
        setShowZoomLens(false);
      }
    }
    
    // Handle dragging
    if (dragIndex !== null) {
      const containerRect = canvasRef.current.getBoundingClientRect();
      const offsetX = (containerRect.width - imageDimensions.width) / 2;
      const offsetY = (containerRect.height - imageDimensions.height) / 2;
      
      const imageX = x - offsetX;
      const imageY = y - offsetY;
      
      const relativeX = Math.max(0, Math.min(1, imageX / imageDimensions.width));
      const relativeY = Math.max(0, Math.min(1, imageY / imageDimensions.height));
      
      setCorners(prev => prev.map((corner, index) => 
        index === dragIndex ? { x: relativeX, y: relativeY } : corner
      ));
      
      // Update zoom lens position while dragging
      setZoomLensPos({ 
        x: e.clientX + 30, 
        y: e.clientY - 60 
      });
    }
  }, [getCornerAtPosition, dragIndex]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageDimensions || !canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cornerIndex = getCornerAtPosition(x, y);
    
    if (cornerIndex >= 0) {
      setDragIndex(cornerIndex);
      setShowZoomLens(true);
      e.preventDefault();
    }
  }, [getCornerAtPosition, imageDimensions, containerRef]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setDragIndex(null);
    if (hoverIndex === null) {
      setShowZoomLens(false);
    }
  }, [hoverIndex]);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
    setDragIndex(null);
    setShowZoomLens(false);
  }, []);

  // Apply crop
  const handleApplyCrop = async () => {
    console.log('🚀 Apply Crop button clicked!');
    console.log('📊 Current crop points:', corners);
    console.log('📐 Image dimensions:', imageDimensions);
    
    if (!imageDimensions) {
      console.error('❌ No image dimensions available');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('⏳ Starting crop processing...');
      const croppedImage = await getQuadrilateralCroppedImg(
        image,
        corners,
        imageDimensions
      );
      if (croppedImage) {
        console.log('✅ Crop successful, calling onCrop callback');
        onCrop(croppedImage);
      } else {
        console.error('❌ Crop failed - no cropped image returned');
      }
    } catch (error) {
      console.error('❌ Error applying quadrilateral crop:', error);
    } finally {
      setIsProcessing(false);
      console.log('🏁 Crop processing finished');
    }
  };

  // Download crop for testing
  const handleDownloadCrop = async () => {
    if (!imageDimensions) return;

    try {
      setIsProcessing(true);
      const croppedImage = await getQuadrilateralCroppedImg(
        image,
        corners,
        imageDimensions
      );
      
      if (croppedImage) {
        const link = document.createElement('a');
        link.href = croppedImage;
        link.download = `cropped-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('❌ Error downloading crop:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset corners
  const handleReset = () => {
    setCorners([
      { x: 0.15, y: 0.15 },
      { x: 0.85, y: 0.15 },
      { x: 0.85, y: 0.85 },
      { x: 0.15, y: 0.85 },
    ]);
    setShowZoomLens(false);
  };

  return (
    <div className={`quadrilateral-cropper ${className}`}>
      {/* Main Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden" ref={containerRef}>
        {/* Image Container */}
        <div className="relative w-full h-full flex items-center justify-center">
        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <div className="text-gray-300 text-sm">Loading image...</div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <div className="text-white text-sm font-medium">Processing crop...</div>
            </div>
          </div>
        )}

          {/* Image */}
          <img
            ref={imageRef}
            src={image}
            alt="Crop preview"
            className="w-full h-full object-contain rounded-lg"
            onLoad={handleImageLoad}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />

          {/* Interactive Canvas Overlay */}
          {imageLoaded && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair pointer-events-auto"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </div>

        {/* Zoom Lens */}
        {showZoomLens && (
          <div 
            className="fixed pointer-events-none z-40 shadow-2xl rounded-full overflow-hidden"
            style={{ 
              left: `${zoomLensPos.x}px`, 
              top: `${zoomLensPos.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <canvas 
              ref={zoomCanvasRef}
              className="block"
              style={{ 
                width: '120px', 
                height: '120px',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
              }}
            />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              3x Zoom + Crosshair
            </div>
          </div>
        )}

        {/* Instructions */}
        {imageLoaded && !isProcessing && (
          <div className="absolute top-4 left-4 bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Move className="h-4 w-4" />
              <span>Drag corners to adjust crop area</span>
            </div>
            <div className="text-xs text-blue-100 mt-1">
              💡 Hover over corners for precision zoom lens
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mt-6 px-4">
        <Button
          onClick={handleApplyCrop}
          disabled={!imageLoaded || isProcessing}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 flex-1 max-w-xs"
        >
          <Crop className="h-4 w-4" />
          <span>{isProcessing ? 'Processing...' : 'Apply Crop'}</span>
        </Button>
        
        <Button
          onClick={handleDownloadCrop}
          disabled={!imageLoaded || isProcessing}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 flex-1 max-w-xs"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </Button>
        
        <Button
          onClick={handleReset}
          disabled={!imageLoaded || isProcessing}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 flex-1 max-w-xs"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );
}

// Export utilities
export { getQuadrilateralCroppedImg };