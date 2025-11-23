import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  X,
  Check,
  Undo,
  Redo,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Filter,
  Sliders,
  Sparkles,
  Type,
  Download,
  RefreshCw,
  Square,
  Maximize,
  Grid3X3,
  Maximize2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Move,
  ZoomIn,
  ZoomOut,
  MoreHorizontal
} from 'lucide-react';

// Enhanced crop tool components
import { EnhancedCropTool } from './crop/EnhancedCropTool';
import { FourPointCropper } from './crop/FourPointCropper';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  rotation: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sepia: number;
    grayscale: number;
    hueRotate: number;
    invert: number;
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: string;
  };
}

interface ImageEditorProps {
  image: ImageFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedImage: ImageFile) => void;
}

type Tool = 'crop' | 'rotate' | 'filters' | 'adjust' | 'effects' | 'text';
type AspectRatio = 'free' | 'square' | '4:3' | '16:9' | '3:2' | '9:16';
type CropMode = 'rectangle' | 'freeform';

const aspectRatios = [
  { name: 'Free', value: 'free', ratio: null, icon: Maximize2 },
  { name: 'Square', value: 'square', ratio: 1, icon: Square },
  { name: '4:3', value: '4:3', ratio: 4/3, icon: Grid3X3 },
  { name: '16:9', value: '16:9', ratio: 16/9, icon: Maximize },
  { name: '3:2', value: '3:2', ratio: 3/2, icon: ImageIcon },
  { name: '9:16', value: '9:16', ratio: 9/16, icon: Maximize },
];

const tools = [
  { id: 'crop', name: 'Crop', icon: Crop, color: 'from-blue-500 to-blue-600' },
  { id: 'rotate', name: 'Rotate', icon: RotateCw, color: 'from-green-500 to-green-600' },
  { id: 'filters', name: 'Filters', icon: Filter, color: 'from-purple-500 to-purple-600' },
  { id: 'adjust', name: 'Adjust', icon: Sliders, color: 'from-orange-500 to-orange-600' },
  { id: 'effects', name: 'Effects', icon: Sparkles, color: 'from-pink-500 to-pink-600' },
  { id: 'text', name: 'Text', icon: Type, color: 'from-indigo-500 to-indigo-600' },
];

const filterPresets = [
  { name: 'Original', filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'Vivid', filters: { brightness: 110, contrast: 120, saturation: 130, blur: 0, sepia: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'B&W', filters: { brightness: 100, contrast: 110, saturation: 0, blur: 0, sepia: 0, grayscale: 100, hueRotate: 0, invert: 0 } },
  { name: 'Sepia', filters: { brightness: 110, contrast: 100, saturation: 80, blur: 0, sepia: 80, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'Cool', filters: { brightness: 105, contrast: 105, saturation: 110, blur: 0, sepia: 0, grayscale: 0, hueRotate: 180, invert: 0 } },
  { name: 'Warm', filters: { brightness: 110, contrast: 100, saturation: 120, blur: 0, sepia: 20, grayscale: 0, hueRotate: 30, invert: 0 } },
];

export default function ImageEditor({ image, isOpen, onClose, onSave }: ImageEditorProps) {
  const [currentImage, setCurrentImage] = useState<ImageFile>(image);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('square');
  const [cropMode, setCropMode] = useState<CropMode>('rectangle');
  const [history, setHistory] = useState<ImageFile[]>([image]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [showToolPanel, setShowToolPanel] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Touch gesture states
  const [touchState, setTouchState] = useState({
    isZooming: false,
    isPanning: false,
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 }
  });

  // Update current image when prop changes
  useEffect(() => {
    setCurrentImage(image);
    setHistory([image]);
    setHistoryIndex(0);
  }, [image]);

  // Save to history
  const saveToHistory = useCallback((newImage: ImageFile) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newImage);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    setCurrentImage(newImage);
  }, [historyIndex]);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleReset = useCallback(() => {
    const originalImage = history[0];
    setCurrentImage(originalImage);
    setHistory([originalImage]);
    setHistoryIndex(0);
    setActiveTool(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [history]);

  const handleSave = useCallback(() => {
    onSave(currentImage);
    onClose();
  }, [currentImage, onSave, onClose]);

  // Image transformation functions
  const getImageStyle = (img: ImageFile) => {
    const { rotation, flipHorizontal, flipVertical, filters } = img;
    const transform = [
      `scale(${zoom})`,
      `translate(${panOffset.x}px, ${panOffset.y}px)`,
      `rotate(${rotation}deg)`,
      flipHorizontal ? 'scaleX(-1)' : '',
      flipVertical ? 'scaleY(-1)' : ''
    ].filter(Boolean).join(' ');

    const filter = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `blur(${filters.blur}px)`,
      `sepia(${filters.sepia}%)`,
      `grayscale(${filters.grayscale}%)`,
      `hue-rotate(${filters.hueRotate}deg)`,
      `invert(${filters.invert}%)`
    ].join(' ');

    return {
      transform,
      transformOrigin: 'center',
      filter,
      transition: touchState.isZooming || touchState.isPanning ? 'none' : 'transform 0.2s ease-out'
    };
  };

  const handleRotate = (degrees: number) => {
    const newImage = {
      ...currentImage,
      rotation: (currentImage.rotation + degrees) % 360
    };
    saveToHistory(newImage);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    const newImage = {
      ...currentImage,
      [direction === 'horizontal' ? 'flipHorizontal' : 'flipVertical']: 
        !currentImage[direction === 'horizontal' ? 'flipHorizontal' : 'flipVertical']
    };
    saveToHistory(newImage);
  };

  const applyFilter = (filterName: string) => {
    const preset = filterPresets.find(p => p.name === filterName);
    if (preset) {
      const newImage = {
        ...currentImage,
        filters: preset.filters
      };
      saveToHistory(newImage);
    }
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    console.log('🎯 handleCropComplete called with URL:', croppedImageUrl);
    const newImage = {
      ...currentImage,
      preview: croppedImageUrl
    };
    console.log('💾 Saving cropped image to history');
    saveToHistory(newImage);
    setActiveTool(null);
    console.log('✨ Crop tool deactivated');
  };

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two finger gesture - zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      setTouchState(prev => ({
        ...prev,
        isZooming: true,
        lastDistance: distance,
        lastCenter: center
      }));
    } else if (e.touches.length === 1 && zoom > 1) {
      // Single finger gesture on zoomed image - pan
      const touch = e.touches[0];
      setTouchState(prev => ({
        ...prev,
        isPanning: true,
        startPan: { x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y }
      }));
    }
  }, [zoom, panOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (touchState.isZooming && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scale = distance / touchState.lastDistance;
      const newZoom = Math.max(0.5, Math.min(3, zoom * scale));
      
      setZoom(newZoom);
      setTouchState(prev => ({ ...prev, lastDistance: distance }));
    } else if (touchState.isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      const newOffset = {
        x: touch.clientX - touchState.startPan.x,
        y: touch.clientY - touchState.startPan.y
      };
      setPanOffset(newOffset);
    }
  }, [touchState, zoom]);

  const handleTouchEnd = useCallback(() => {
    setTouchState({
      isZooming: false,
      isPanning: false,
      lastDistance: 0,
      lastCenter: { x: 0, y: 0 },
      startPan: { x: 0, y: 0 }
    });
  }, []);

  // Reset zoom and pan
  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/90 z-40" 
        onClick={onClose}
      />

      {/* Main Editor */}
      <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-gray-900 w-full h-full flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Edit Image</h2>
              {!isMobile && (
                <span className="text-sm text-gray-400 px-2 py-1 rounded bg-gray-700">
                  {currentImage.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              {historyIndex > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyIndex === 0}
                    className="text-white hover:bg-gray-700"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex === history.length - 1}
                    className="text-white hover:bg-gray-700"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-white hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                {!isMobile && <span className="ml-1">Close</span>}
              </Button>
              
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Check className="w-4 h-4" />
                {!isMobile && <span className="ml-1">Save</span>}
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Image Canvas */}
            <div className="flex-1 relative bg-gray-950 overflow-hidden">
              <div 
                ref={containerRef}
                className="w-full h-full flex items-center justify-center relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-sm">Loading...</div>
                  </div>
                )}
                
                <img
                  ref={imageRef}
                  src={currentImage.preview}
                  alt={currentImage.name}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{
                    ...getImageStyle(currentImage),
                    opacity: isImageLoading ? 0 : 1,
                  }}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => setIsImageLoading(false)}
                  draggable={false}
                />
                
                {/* Crop Tool Overlay */}
                {activeTool === 'crop' && !isImageLoading && (
                  <div className="absolute inset-0">
                    {selectedAspectRatio === 'free' ? (
                      <FourPointCropper
                        image={currentImage.preview}
                        onCrop={handleCropComplete}
                        containerRef={containerRef}
                      />
                    ) : (
                      <EnhancedCropTool
                        image={currentImage.preview}
                        aspectRatio={selectedAspectRatio}
                        onCrop={handleCropComplete}
                        containerRef={containerRef}
                      />
                    )}
                  </div>
                )}
                
                {/* Zoom Controls */}
                {(zoom !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetView}
                      className="bg-black/50 text-white hover:bg-black/70"
                    >
                      Reset View
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Sidebar */}
            {!isMobile && (
              <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                {/* Tool Selection */}
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Tools</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {tools.map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as Tool)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                            activeTool === tool.id
                              ? `bg-gradient-to-br ${tool.color} text-white shadow-lg`
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-xs font-medium">{tool.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tool Options */}
                {activeTool && (
                  <div className="flex-1 p-4 overflow-y-auto">
                    {activeTool === 'crop' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Aspect Ratio</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {aspectRatios.map((ratio) => {
                              const IconComponent = ratio.icon;
                              return (
                                <button
                                  key={ratio.value}
                                  onClick={() => setSelectedAspectRatio(ratio.value as AspectRatio)}
                                  className={`flex items-center gap-2 p-2 rounded text-sm transition-all ${
                                    selectedAspectRatio === ratio.value
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  <IconComponent className="w-4 h-4" />
                                  {ratio.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {activeTool === 'rotate' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleRotate(-90)}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                          >
                            <RotateCcw className="w-6 h-6" />
                            <span className="text-sm">Rotate Left</span>
                          </button>
                          <button
                            onClick={() => handleRotate(90)}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                          >
                            <RotateCw className="w-6 h-6" />
                            <span className="text-sm">Rotate Right</span>
                          </button>
                          <button
                            onClick={() => handleFlip('horizontal')}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                          >
                            <FlipHorizontal className="w-6 h-6" />
                            <span className="text-sm">Flip H</span>
                          </button>
                          <button
                            onClick={() => handleFlip('vertical')}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                          >
                            <FlipVertical className="w-6 h-6" />
                            <span className="text-sm">Flip V</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {activeTool === 'filters' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                          {filterPresets.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => applyFilter(preset.name)}
                              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-left transition-all"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Bottom Toolbar */}
          {isMobile && (
            <>
              {/* Tool Options Panel */}
              <AnimatePresence>
                {activeTool && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-gray-800 border-t border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">
                        {tools.find(t => t.id === activeTool)?.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTool(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {activeTool === 'crop' && (
                      <div className="space-y-3">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {aspectRatios.map((ratio) => {
                            const IconComponent = ratio.icon;
                            return (
                              <button
                                key={ratio.value}
                                onClick={() => setSelectedAspectRatio(ratio.value as AspectRatio)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all ${
                                  selectedAspectRatio === ratio.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4" />
                                {ratio.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {activeTool === 'rotate' && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleRotate(-90)}
                          className="flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg text-white"
                        >
                          <RotateCcw className="w-5 h-5" />
                          Left
                        </button>
                        <button
                          onClick={() => handleRotate(90)}
                          className="flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg text-white"
                        >
                          <RotateCw className="w-5 h-5" />
                          Right
                        </button>
                        <button
                          onClick={() => handleFlip('horizontal')}
                          className="flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg text-white"
                        >
                          <FlipHorizontal className="w-5 h-5" />
                          Flip H
                        </button>
                        <button
                          onClick={() => handleFlip('vertical')}
                          className="flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg text-white"
                        >
                          <FlipVertical className="w-5 h-5" />
                          Flip V
                        </button>
                      </div>
                    )}
                    
                    {activeTool === 'filters' && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {filterPresets.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => applyFilter(preset.name)}
                            className="px-4 py-2 bg-gray-700 rounded-full text-white whitespace-nowrap"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Main Toolbar */}
              <div className="bg-gray-800 border-t border-gray-700 p-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {tools.map((tool) => {
                    const IconComponent = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as Tool)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                          activeTool === tool.id
                            ? `bg-gradient-to-r ${tool.color} text-white shadow-lg`
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        {tool.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}