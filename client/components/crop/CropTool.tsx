import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Square, Maximize2, Grid3X3, Maximize, Image as ImageIcon } from 'lucide-react';
import RectangleCropper from './RectangleCropper';
import QuadrilateralCropper from './QuadrilateralCropper';

// Types
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPoint {
  x: number;
  y: number;
}

export type CropMode = 'rectangle' | 'quadrilateral';
export type AspectRatio = 'free' | 'square' | '4:3' | '16:9' | '3:2' | '9:16';

export interface CropToolProps {
  image: string;
  mode: CropMode;
  aspectRatio: AspectRatio;
  onCrop: (croppedImage: string) => void;
  onModeChange?: (mode: CropMode) => void;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  className?: string;
}

// Aspect ratio configurations
const aspectRatios = [
  { name: 'Free', value: 'free' as AspectRatio, ratio: null, icon: Maximize2 },
  { name: 'Square', value: 'square' as AspectRatio, ratio: 1, icon: Square },
  { name: '4:3', value: '4:3' as AspectRatio, ratio: 4/3, icon: Grid3X3 },
  { name: '16:9', value: '16:9' as AspectRatio, ratio: 16/9, icon: Maximize },
  { name: '3:2', value: '3:2' as AspectRatio, ratio: 3/2, icon: ImageIcon },
  { name: '9:16', value: '9:16' as AspectRatio, ratio: 9/16, icon: Maximize },
];

// Hook for managing crop state
function useCropState(initialMode: CropMode, initialAspectRatio: AspectRatio) {
  const [mode, setMode] = useState<CropMode>(initialMode);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = useCallback((newMode: CropMode) => {
    setMode(newMode);
    setError(null);
  }, []);

  const handleAspectRatioChange = useCallback((newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
    // Switch to quadrilateral mode for free aspect ratio
    if (newRatio === 'free' && mode === 'rectangle') {
      setMode('quadrilateral');
    }
    // Switch to rectangle mode for fixed aspect ratios
    if (newRatio !== 'free' && mode === 'quadrilateral') {
      setMode('rectangle');
    }
  }, [mode]);

  return {
    mode,
    aspectRatio,
    isLoading,
    error,
    setIsLoading,
    setError,
    handleModeChange,
    handleAspectRatioChange,
  };
}

// Main CropTool component
export default function CropTool({
  image,
  mode: initialMode = 'rectangle',
  aspectRatio: initialAspectRatio = 'square',
  onCrop,
  onModeChange,
  onAspectRatioChange,
  className = '',
}: CropToolProps) {
  const {
    mode,
    aspectRatio,
    isLoading,
    error,
    setIsLoading,
    setError,
    handleModeChange,
    handleAspectRatioChange,
  } = useCropState(initialMode, initialAspectRatio);

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mode changes
  const onInternalModeChange = useCallback((newMode: CropMode) => {
    handleModeChange(newMode);
    onModeChange?.(newMode);
  }, [handleModeChange, onModeChange]);

  // Handle aspect ratio changes
  const onInternalAspectRatioChange = useCallback((newRatio: AspectRatio) => {
    handleAspectRatioChange(newRatio);
    onAspectRatioChange?.(newRatio);
  }, [handleAspectRatioChange, onAspectRatioChange]);

  // Handle crop completion
  const handleCropComplete = useCallback(async (croppedImage: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await onCrop(croppedImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process crop');
    } finally {
      setIsLoading(false);
    }
  }, [onCrop]);

  return (
    <div className={`crop-tool ${className}`} ref={containerRef}>
      {/* Crop Area */}
      <div className="crop-area relative w-full h-full">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-red-600 text-white p-2 rounded text-sm">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <div className="text-white text-sm">Processing...</div>
          </div>
        )}

        {/* Crop Implementation */}
        {mode === 'quadrilateral' ? (
          <QuadrilateralCropper
            image={image}
            onCrop={handleCropComplete}
            className="w-full h-full"
          />
        ) : (
          <RectangleCropper
            image={image}
            aspectRatio={aspectRatio}
            onCrop={handleCropComplete}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}

// Export types and utilities
export { aspectRatios, useCropState };
