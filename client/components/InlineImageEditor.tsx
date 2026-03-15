import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { CropTool, QuadrilateralCropper } from './crop';


import {
  Crop,
  RotateCw,
  Filter,
  Settings,
  X,
  Check,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Square,
  Maximize,
  RefreshCw,
  Sparkles,
  Contrast,
  Droplets,
  Scissors,
  Zap,
  Camera,
  Palette,
  Sun,
  Moon,
  Eye,
  Aperture,
  Undo,
  Redo,
  Download,
  Upload,
  Sliders,
  Image as ImageIcon,
  Paintbrush,
  Layers,
  Grid3X3,
  Maximize2,
  RotateCcw as Reset,
  Type,
  FileText,
} from "lucide-react";

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
    warmth: number;
    tint: number;
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

interface InlineImageEditorProps {
  image: ImageFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedImage: ImageFile) => void;
}

type Tool = 'crop' | 'rotate' | 'filters' | 'adjust' | 'effects' | 'text';
type AspectRatio = 'free' | 'square' | '4:3' | '16:9' | '3:2' | '9:16';

interface FilterPreset {
  name: string;
  icon: React.ComponentType<any>;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sepia: number;
    warmth: number;
    tint: number;
    grayscale: number;
    hueRotate: number;
    invert: number;
  };
}

const filterPresets = [
  { name: 'Original', icon: RefreshCw, filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0, sepia: 0, warmth: 0, tint: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'Vivid', icon: Zap, filters: { brightness: 10, contrast: 20, saturation: 30, blur: 0, sepia: 0, warmth: 0, tint: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'Dramatic', icon: Contrast, filters: { brightness: -5, contrast: 40, saturation: 10, blur: 0, sepia: 0, warmth: 0, tint: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'B&W', icon: Moon, filters: { brightness: 0, contrast: 10, saturation: -100, blur: 0, sepia: 0, warmth: 0, tint: 0, grayscale: 100, hueRotate: 0, invert: 0 } },
  { name: 'Sepia', icon: Camera, filters: { brightness: 10, contrast: 0, saturation: -20, blur: 0, sepia: 80, warmth: 0, tint: 0, grayscale: 0, hueRotate: 0, invert: 0 } },
  { name: 'Cool', icon: Droplets, filters: { brightness: 5, contrast: 5, saturation: 10, blur: 0, sepia: 0, warmth: -20, tint: 0, grayscale: 0, hueRotate: 180, invert: 0 } },
  { name: 'Warm', icon: Sun, filters: { brightness: 10, contrast: 0, saturation: 20, blur: 0, sepia: 20, warmth: 30, tint: 0, grayscale: 0, hueRotate: 30, invert: 0 } },
  { name: 'Vintage', icon: Aperture, filters: { brightness: 5, contrast: -5, saturation: -15, blur: 0.5, sepia: 30, warmth: 20, tint: 0, grayscale: 10, hueRotate: 15, invert: 0 } },
];

const aspectRatios = [
  { name: 'Free', value: 'free', ratio: null, icon: Maximize2 },
  { name: 'Square', value: 'square', ratio: 1, icon: Square },
  { name: '4:3', value: '4:3', ratio: 4/3, icon: Grid3X3 },
  { name: '16:9', value: '16:9', ratio: 16/9, icon: Maximize },
  { name: '3:2', value: '3:2', ratio: 3/2, icon: ImageIcon },
  { name: '9:16', value: '9:16', ratio: 9/16, icon: Maximize },
];

const toolCategories = [
  {
    id: 'basic',
    name: 'Basic',
    tools: [
      { id: 'crop', name: 'Crop', icon: Crop, description: 'Crop and resize your image' },
      { id: 'rotate', name: 'Rotate', icon: RotateCw, description: 'Rotate and flip your image' },
    ]
  },
  {
    id: 'enhance',
    name: 'Enhance',
    tools: [
      { id: 'filters', name: 'Filters', icon: Filter, description: 'Apply preset filters' },
      { id: 'adjust', name: 'Adjust', icon: Sliders, description: 'Fine-tune image properties' },
    ]
  },
  {
    id: 'creative',
    name: 'Creative',
    tools: [
      { id: 'effects', name: 'Effects', icon: Sparkles, description: 'Add creative effects' },
      { id: 'text', name: 'Text', icon: Type, description: 'Add text overlays' },
    ]
  }
];

// CSS for scrollbar-hide class
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('scrollbar-hide-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'scrollbar-hide-styles';
  styleElement.textContent = scrollbarHideStyles;
  document.head.appendChild(styleElement);
}

export default function InlineImageEditor({ image, isOpen, onClose, onSave }: InlineImageEditorProps) {
  const [currentImage, setCurrentImage] = useState<ImageFile>(image);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeAdjustment, setActiveAdjustment] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('square');
  const [history, setHistory] = useState<ImageFile[]>([image]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [lastRotateAction, setLastRotateAction] = useState<'left' | 'right' | null>(null);
  const [lastFlipAction, setLastFlipAction] = useState<'horizontal' | 'vertical' | null>(null);

  const [isImageLoading, setIsImageLoading] = useState(false);
  const [cropMode, setCropMode] = useState<'rectangle' | 'quadrilateral'>('rectangle');
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // Handle image loading
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    console.error('Failed to load image:', currentImage.preview);
  }, [currentImage.preview]);

  // Track viewport height for responsive sizing
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle image loading state
  useEffect(() => {
    setIsImageLoading(false);
  }, [currentImage.preview]);

  // Check if any actions have been performed
  const hasActionsPerformed = historyIndex > 0 || history.length > 1;




  // Update current image when prop changes
  useEffect(() => {
    let initializedImage = { ...image };
    
    // Check for legacy filter values (100-based) and convert to 0-based
    if (initializedImage.filters.brightness === 100 && 
        initializedImage.filters.contrast === 100 && 
        initializedImage.filters.saturation === 100) {
      initializedImage.filters = {
        ...initializedImage.filters,
        brightness: 0,
        contrast: 0,
        saturation: 0
      };
    }

    setCurrentImage(initializedImage);
    setHistory([initializedImage]);
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
    setActiveAdjustment(null);
  }, [history]);

  const handleSave = useCallback(() => {
    onSave(currentImage);
    onClose();
  }, [currentImage, onSave, onClose]);

  const handleToolChange = (newTool: Tool | null) => {
    // Revert to original/last saved image when switching tools
    setCurrentImage(image);
    setHistory([image]);
    setHistoryIndex(0);
    
    setActiveTool(newTool);
    
    // Reset tool-specific states
    setActiveAdjustment(null);
    setActiveFilter(null);
    setSelectedFilter(null);
    setFilterIntensity(100);
    setLastRotateAction(null);
    setLastFlipAction(null);
    setCropMode('rectangle');
  };

  // Image transformation functions
  const getImageStyle = (img: ImageFile) => {
    const { rotation, flipHorizontal, flipVertical, filters } = img;
    const transform = [
      `rotate(${rotation}deg)`,
      flipHorizontal ? 'scaleX(-1)' : '',
      flipVertical ? 'scaleY(-1)' : ''
    ].filter(Boolean).join(' ');

    const warmthSepia = Math.max(0, filters.warmth || 0);
    const totalSepia = Math.min(100, (filters.sepia || 0) + warmthSepia);
    const hueRotateVal = (filters.hueRotate || 0) + (filters.tint || 0);

    const filter = [
      `brightness(${100 + filters.brightness}%)`,
      `contrast(${100 + filters.contrast}%)`,
      `saturate(${100 + filters.saturation}%)`,
      `blur(${filters.blur}px)`,
      `sepia(${totalSepia}%)`,
      `grayscale(${filters.grayscale}%)`,
      `hue-rotate(${hueRotateVal}deg)`,
      `invert(${filters.invert}%)`
    ].join(' ');

    return {
      transform,
      transformOrigin: 'center',
      filter
    };
  };

  const getWarmthOverlayStyle = (img: ImageFile) => {
    const warmth = img.filters.warmth || 0;
    if (warmth <= 0) {
        // Cooling: Blue overlay
        const opacity = Math.abs(warmth) / 200; // 0.5 max opacity
        return {
            backgroundColor: 'rgba(0, 100, 255, 1)',
            opacity: opacity,
            mixBlendMode: 'overlay' as const
        };
    }
    // Warming is handled by Sepia filter mostly, but we can add a slight orange overlay for better tone
    return {
        backgroundColor: 'rgba(255, 100, 0, 1)',
        opacity: warmth / 400, // Subtle
        mixBlendMode: 'overlay' as const
    };
  };

  const handleRotate = (degrees: number) => {
    const newImage = {
      ...currentImage,
      rotation: (currentImage.rotation + degrees) % 360
    };
    setLastRotateAction(degrees > 0 ? 'right' : 'left');
    setLastFlipAction(null); // Clear flip selection when rotating
    saveToHistory(newImage);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    const newImage = {
      ...currentImage,
      [direction === 'horizontal' ? 'flipHorizontal' : 'flipVertical']: 
        !currentImage[direction === 'horizontal' ? 'flipHorizontal' : 'flipVertical']
    };
    setLastFlipAction(direction);
    setLastRotateAction(null); // Clear rotate selection when flipping
    saveToHistory(newImage);
  };

  // Crop handling function
  const handleCropComplete = useCallback((croppedImageUrl: string) => {
    // Convert the cropped image URL to a File and update the current image
    fetch(croppedImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const croppedFile = new File([blob], currentImage.name, { type: 'image/jpeg' });
        const newImage = {
          ...currentImage,
          file: croppedFile,
          preview: croppedImageUrl,
        };
        saveToHistory(newImage);
      })
      .catch(error => {
        console.error('Error processing cropped image:', error);
      });
  }, [currentImage, saveToHistory]);

  // Handle crop mode change
  const handleCropModeChange = useCallback((mode: 'rectangle' | 'quadrilateral') => {
    setCropMode(mode);
  }, []);

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
    setSelectedAspectRatio(ratio);
    // Auto-switch crop mode based on aspect ratio
    if (ratio === 'free') {
      setCropMode('quadrilateral');
    } else {
      setCropMode('rectangle');
    }
  }, []);





  const handleFilterChange = (filterName: string, value: number) => {
    const newImage = {
      ...currentImage,
      filters: {
        ...currentImage.filters,
        [filterName]: value
      }
    };
    saveToHistory(newImage);
  };

  const applyFilterPreset = (preset: typeof filterPresets[0]) => {
    const newImage = {
      ...currentImage,
      filters: { ...preset.filters }
    };
    saveToHistory(newImage);
    setSelectedFilter(preset);
    setFilterIntensity(100);
  };

  const applyFilterWithIntensity = (preset: typeof filterPresets[0], intensity: number) => {
    const originalFilters = filterPresets[0].filters; // Original/default filters
    const targetFilters = preset.filters;
    const factor = intensity / 100;
    
    // Interpolate between original and target filters based on intensity
    const blendedFilters = {
      brightness: originalFilters.brightness + (targetFilters.brightness - originalFilters.brightness) * factor,
      contrast: originalFilters.contrast + (targetFilters.contrast - originalFilters.contrast) * factor,
      saturation: originalFilters.saturation + (targetFilters.saturation - originalFilters.saturation) * factor,
      blur: originalFilters.blur + (targetFilters.blur - originalFilters.blur) * factor,
      sepia: originalFilters.sepia + (targetFilters.sepia - originalFilters.sepia) * factor,
      warmth: originalFilters.warmth + (targetFilters.warmth - originalFilters.warmth) * factor,
      tint: originalFilters.tint + (targetFilters.tint - originalFilters.tint) * factor,
      grayscale: originalFilters.grayscale + (targetFilters.grayscale - originalFilters.grayscale) * factor,
      hueRotate: originalFilters.hueRotate + (targetFilters.hueRotate - originalFilters.hueRotate) * factor,
      invert: originalFilters.invert + (targetFilters.invert - originalFilters.invert) * factor,
    };
    
    const newImage = {
      ...currentImage,
      filters: blendedFilters
    };
    saveToHistory(newImage);
  };

  const handleFilterIntensityChange = (intensity: number) => {
    setFilterIntensity(intensity);
    if (selectedFilter) {
      applyFilterWithIntensity(selectedFilter as typeof filterPresets[0], intensity);
    }
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'crop':
        return (
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-200 text-base">Crop Settings</h4>
            
            {/* Aspect Ratio Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {aspectRatios.map((ratio) => {
                  const IconComponent = ratio.icon;
                  const displayName = ratio.value === 'free' ? '4-Point' : ratio.name;
                  return (
                    <button
                      key={ratio.value}
                      onClick={() => handleAspectRatioChange(ratio.value as AspectRatio)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                        selectedAspectRatio === ratio.value
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs font-medium">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>


          </div>
        );

      case 'rotate':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-200 text-base">Rotate & Flip</h4>
            <div className={`${isMobile ? 'flex gap-3 overflow-x-scroll scrollbar-hide pb-2' : 'grid grid-cols-2 gap-3'}`} style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}>
              <button
                onClick={() => handleRotate(-90)}
                className={`flex flex-col items-center gap-2 p-4 ${lastRotateAction === 'left' ? 'bg-blue-600 text-white' : 'bg-gray-950 text-gray-300 hover:bg-gray-800 hover:text-white'} rounded-lg transition-colors duration-200 border border-gray-700 shadow-lg ${isMobile ? 'min-w-fit flex-shrink-0' : ''}`}
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">Rotate Left</span>
              </button>
              <button
                onClick={() => handleRotate(90)}
                className={`flex flex-col items-center gap-2 p-4 ${lastRotateAction === 'right' ? 'bg-blue-600 text-white' : 'bg-gray-950 text-gray-300 hover:bg-gray-800 hover:text-white'} rounded-lg transition-colors duration-200 border border-gray-700 shadow-lg ${isMobile ? 'min-w-fit flex-shrink-0' : ''}`}
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">Rotate Right</span>
              </button>
              <button
                onClick={() => handleFlip('horizontal')}
                className={`flex flex-col items-center gap-2 p-4 ${lastFlipAction === 'horizontal' ? 'bg-blue-600 text-white' : 'bg-gray-950 text-gray-300 hover:bg-gray-800 hover:text-white'} rounded-lg transition-colors duration-200 border border-gray-700 shadow-lg ${isMobile ? 'min-w-fit flex-shrink-0' : ''}`}
              >
                <FlipHorizontal className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">Flip H</span>
              </button>
              <button
                onClick={() => handleFlip('vertical')}
                className={`flex flex-col items-center gap-2 p-4 ${lastFlipAction === 'vertical' ? 'bg-blue-600 text-white' : 'bg-gray-950 text-gray-300 hover:bg-gray-800 hover:text-white'} rounded-lg transition-colors duration-200 border border-gray-700 shadow-lg ${isMobile ? 'min-w-fit flex-shrink-0' : ''}`}
              >
                <FlipVertical className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">Flip V</span>
              </button>
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-200 text-base">Filters</h4>
            {!activeFilter ? (
              <div className={`${isMobile ? 'flex gap-3 overflow-x-scroll scrollbar-hide pb-2' : 'grid grid-cols-2 gap-3'}`} style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}>
                {filterPresets.map((preset) => {
                  const IconComponent = preset.icon;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        if (preset.name === 'Original') {
                          applyFilterPreset(preset);
                          setSelectedFilter(null);
                          setFilterIntensity(100);
                        } else {
                          setActiveFilter(preset.name);
                          setSelectedFilter(preset);
                          setFilterIntensity(100);
                          applyFilterPreset(preset);
                        }
                      }}
                      className={`flex flex-col items-center gap-2 p-4 bg-gray-950 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-200 shadow-lg ${
                        isMobile ? 'min-w-fit flex-shrink-0' : ''
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-sm font-medium whitespace-nowrap">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <span className="text-sm font-medium text-blue-400 bg-gray-700 px-3 py-1 rounded-lg">
                    {activeFilter}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-end items-center">
                    <span className="text-sm text-blue-400 bg-gray-700 px-3 py-1 rounded-lg">
                      {filterIntensity}
                    </span>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[filterIntensity]}
                      onValueChange={([value]) => handleFilterIntensityChange(value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'adjust':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-200 text-base">Adjustments</h4>
            {!activeAdjustment ? (
              <div className={`${isMobile ? 'flex gap-3 overflow-x-scroll scrollbar-hide pb-2' : 'grid grid-cols-2 gap-3'}`} style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}>
                {[
                  { key: 'brightness', label: 'Brightness', icon: Sun },
                  { key: 'contrast', label: 'Contrast', icon: Contrast },
                  { key: 'saturation', label: 'Saturation', icon: Droplets },
                  { key: 'blur', label: 'Blur', icon: Eye },
                  { key: 'sepia', label: 'Sepia', icon: Camera },
                  { key: 'warmth', label: 'Warmth', icon: Sun },
                  { key: 'tint', label: 'Tint', icon: Palette },
                  { key: 'grayscale', label: 'Grayscale', icon: Moon },
                  { key: 'hueRotate', label: 'Hue', icon: Palette },
                  { key: 'invert', label: 'Invert', icon: Aperture },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveAdjustment(key)}
                    className={`flex flex-col items-center gap-2 p-4 ${activeAdjustment === key ? 'bg-blue-600 text-white' : 'bg-gray-950 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'} rounded-lg transition-colors duration-200 shadow-lg ${isMobile ? 'min-w-fit flex-shrink-0' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setActiveAdjustment(null)}
                    className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <span className="text-sm font-medium text-blue-400 bg-gray-700 px-3 py-1 rounded-lg capitalize">
                    {activeAdjustment}
                  </span>
                </div>
                {(() => {
                  const adjustmentConfig = {
                    brightness: { min: -100, max: 100, step: 1, unit: '%' },
                    contrast: { min: -100, max: 100, step: 1, unit: '%' },
                    saturation: { min: -100, max: 100, step: 1, unit: '%' },
                    blur: { min: 0, max: 10, step: 0.1, unit: 'px' },
                    sepia: { min: 0, max: 100, step: 1, unit: '%' },
                    warmth: { min: -100, max: 100, step: 1, unit: '%' },
                    tint: { min: -100, max: 100, step: 1, unit: '°' },
                    grayscale: { min: 0, max: 100, step: 1, unit: '%' },
                    hueRotate: { min: 0, max: 360, step: 1, unit: '°' },
                    invert: { min: 0, max: 100, step: 1, unit: '%' },
                  }[activeAdjustment];
                  
                  if (!adjustmentConfig) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-end items-center">
                        <span className="text-sm text-blue-400 bg-gray-700 px-3 py-1 rounded-lg">
                          {currentImage.filters[activeAdjustment as keyof typeof currentImage.filters]}{adjustmentConfig.unit}
                        </span>
                      </div>
                      <div className="relative">
                        <Slider
                          value={[currentImage.filters[activeAdjustment as keyof typeof currentImage.filters]]}
                          onValueChange={([value]) => handleFilterChange(activeAdjustment, value)}
                          min={adjustmentConfig.min}
                          max={adjustmentConfig.max}
                          step={adjustmentConfig.step}
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <button
              onClick={() => applyFilterPreset(filterPresets[0])}
              className="w-full p-3 bg-gray-950 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-200 shadow-lg"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              <span className="text-sm font-medium">Reset All</span>
            </button>
          </div>
        );

      case 'effects':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-200 text-base">Effects</h4>
            <div className="text-center text-gray-400 text-sm bg-gray-950 p-6 rounded-lg border border-gray-700 shadow-lg">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-70 text-gray-400" />
              <p className="font-medium text-white">Effects coming soon</p>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-200 text-base">Text Overlay</h4>
            <div className="text-center text-gray-400 text-sm bg-gray-950 p-6 rounded-lg border border-gray-700 shadow-lg">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-70 text-gray-400" />
              <p className="font-medium text-white">Text overlay coming soon</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
               <div className="rounded-lg p-8 bg-gray-800 border border-gray-700">
                 <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-700 border border-gray-600">
                   <Settings className="w-8 h-8 text-gray-300" />
                 </div>
                 <h3 className="text-lg font-semibold text-white mb-2">Select a Tool</h3>
                 <p className="text-gray-400">Choose a tool from the toolbar to start editing your image.</p>
               </div>
             </div>
        );
    }
  };

  const renderMobileToolContent = () => {
    switch (activeTool) {
      case 'crop':
        return (
          <div className="space-y-4">
            {/* Aspect Ratio Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {aspectRatios.map((ratio) => {
                  const IconComponent = ratio.icon;
                  const displayName = ratio.value === 'free' ? '4-Point' : ratio.name;
                  return (
                    <button
                      key={ratio.value}
                      onClick={() => handleAspectRatioChange(ratio.value as AspectRatio)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                        selectedAspectRatio === ratio.value
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs font-medium">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>


          </div>
        );

      case 'adjust':
        return (
          <div className="space-y-4">
            {!activeAdjustment ? (
              <div className="flex gap-2 overflow-x-scroll scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {[
                  { key: 'brightness', label: 'Brightness', icon: Sun },
                  { key: 'contrast', label: 'Contrast', icon: Contrast },
                  { key: 'saturation', label: 'Saturation', icon: Droplets },
                  { key: 'blur', label: 'Blur', icon: Eye },
                  { key: 'sepia', label: 'Sepia', icon: Camera },
                  { key: 'warmth', label: 'Warmth', icon: Sun },
                  { key: 'tint', label: 'Tint', icon: Palette },
                  { key: 'grayscale', label: 'Grayscale', icon: Moon },
                  { key: 'hueRotate', label: 'Hue', icon: Palette },
                  { key: 'invert', label: 'Invert', icon: Aperture },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveAdjustment(key)}
                    className={`flex flex-col items-center gap-2 p-3 ${activeAdjustment === key ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'} rounded-xl transition-all duration-200 min-w-fit flex-shrink-0`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setActiveAdjustment(null)}
                    className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <span className="text-sm font-medium text-blue-400 bg-gray-700 px-3 py-1 rounded-lg capitalize">{activeAdjustment}</span>
                </div>
                {(() => {
                  const adjustmentConfig = {
                    brightness: { min: -100, max: 100, step: 1, unit: '%' },
                    contrast: { min: -100, max: 100, step: 1, unit: '%' },
                    saturation: { min: -100, max: 100, step: 1, unit: '%' },
                    blur: { min: 0, max: 10, step: 0.1, unit: 'px' },
                    sepia: { min: 0, max: 100, step: 1, unit: '%' },
                    warmth: { min: -100, max: 100, step: 1, unit: '%' },
                    tint: { min: -100, max: 100, step: 1, unit: '°' },
                    grayscale: { min: 0, max: 100, step: 1, unit: '%' },
                    hueRotate: { min: 0, max: 360, step: 1, unit: '°' },
                    invert: { min: 0, max: 100, step: 1, unit: '%' },
                  };
                  const config = adjustmentConfig[activeAdjustment as keyof typeof adjustmentConfig];
                  const currentValue = currentImage.filters[activeAdjustment as keyof typeof currentImage.filters];
                  
                  // Calculate center-based value (0 at center, negative/positive for backward/forward)
                  const centerValue = config.min + (config.max - config.min) / 2;
                  const displayValue = Math.round(currentValue - centerValue);
                  const displaySign = displayValue > 0 ? '+' : '';
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <span className="text-lg font-medium text-white bg-gray-700 px-4 py-2 rounded-full">{displaySign}{displayValue}</span>
                      </div>
                      <div className="px-4">
                        <div className="relative flex w-full touch-none select-none items-center py-4">
                          {/* Scale markings */}
                          <div className="absolute w-full h-8 flex items-center">
                            {Array.from({ length: 21 }, (_, i) => {
                              const isMainTick = i % 5 === 0;
                              const isMidTick = i % 5 === 2 || i % 5 === 3;
                              const tickHeight = isMainTick ? 'h-4' : isMidTick ? 'h-3' : 'h-2';
                              return (
                                <div
                                  key={i}
                                  className={`absolute bg-gray-400 w-px ${tickHeight}`}
                                  style={{ left: `${(i / 20) * 100}%` }}
                                />
                              );
                            })}
                          </div>
                          
                          {/* Dynamic thumb indicator */}
                          <div 
                            className="absolute w-0.5 h-8 bg-white transition-all duration-150 ease-out"
                            style={{ 
                              left: `${((currentValue - config.min) / (config.max - config.min)) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          />
                          
                          {/* Invisible input for touch interaction */}
                          <input
                            type="range"
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            value={currentValue}
                            onChange={(e) => handleFilterChange(activeAdjustment, parseFloat(e.target.value))}
                            className="absolute w-full h-8 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case 'filters':
        return (
          <div className="space-y-4">
            {!activeFilter ? (
              <div className="flex gap-2 overflow-x-scroll scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {filterPresets.map((preset) => {
                  const IconComponent = preset.icon;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        if (preset.name === 'Original') {
                          applyFilterPreset(preset);
                          setSelectedFilter(null);
                          setFilterIntensity(100);
                        } else {
                          setActiveFilter(preset.name);
                          setSelectedFilter(preset);
                          setFilterIntensity(100);
                          applyFilterPreset(preset);
                        }
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 min-w-fit flex-shrink-0 ${selectedFilter?.name === preset.name ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'}`}
                    >
                      <IconComponent className="w-6 h-6" />
                      <span className="text-xs font-medium whitespace-nowrap">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <span className="text-sm font-medium text-blue-400 bg-gray-700 px-3 py-1 rounded-lg">
                    {activeFilter}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <span className="text-lg font-medium text-white bg-gray-700 px-4 py-2 rounded-full">{filterIntensity}</span>
                  </div>
                  <div className="px-4">
                    <div className="relative flex w-full touch-none select-none items-center py-4">
                      {/* Scale markings */}
                      <div className="absolute w-full h-8 flex items-center">
                        {Array.from({ length: 21 }, (_, i) => {
                          const isMainTick = i % 5 === 0;
                          const isMidTick = i % 5 === 2 || i % 5 === 3;
                          const tickHeight = isMainTick ? 'h-4' : isMidTick ? 'h-3' : 'h-2';
                          return (
                            <div
                              key={i}
                              className={`absolute bg-gray-400 w-px ${tickHeight}`}
                              style={{ left: `${(i / 20) * 100}%` }}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Dynamic thumb indicator */}
                      <div 
                        className="absolute w-0.5 h-8 bg-white transition-all duration-150 ease-out"
                        style={{ 
                          left: `${filterIntensity}%`,
                          transform: 'translateX(-50%)'
                        }}
                      />
                      
                      {/* Invisible input for touch interaction */}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={filterIntensity}
                        onChange={(e) => handleFilterIntensityChange(parseInt(e.target.value))}
                        className="absolute w-full h-8 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'rotate':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRotate(-90)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${lastRotateAction === 'left' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'}`}
              >
                <RotateCcw className="w-8 h-8" />
                <span className="text-xs font-medium">Rotate Left</span>
              </button>
              <button
                onClick={() => handleRotate(90)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${lastRotateAction === 'right' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'}`}
              >
                <RotateCw className="w-8 h-8" />
                <span className="text-xs font-medium">Rotate Right</span>
              </button>
              <button
                onClick={() => handleFlip('horizontal')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${lastFlipAction === 'horizontal' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'}`}
              >
                <FlipHorizontal className="w-8 h-8" />
                <span className="text-xs font-medium">Flip H</span>
              </button>
              <button
                onClick={() => handleFlip('vertical')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${lastFlipAction === 'vertical' ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white'}`}
              >
                <FlipVertical className="w-8 h-8" />
                <span className="text-xs font-medium">Flip V</span>
              </button>
            </div>
          </div>
        );

      case 'effects':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <Sparkles className="w-8 h-8" />
                <span className="text-xs font-medium">Glow</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <Layers className="w-8 h-8" />
                <span className="text-xs font-medium">Shadow</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <Paintbrush className="w-8 h-8" />
                <span className="text-xs font-medium">Vignette</span>
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <Type className="w-8 h-8" />
                <span className="text-xs font-medium">Add Text</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <FileText className="w-8 h-8" />
                <span className="text-xs font-medium">Caption</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white rounded-xl transition-all duration-200">
                <Layers className="w-8 h-8" />
                <span className="text-xs font-medium">Watermark</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  // Add error boundary for mobile rendering
  if (!currentImage || !currentImage.preview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <p>Error: Image not found</p>
          <button onClick={onClose} className="mt-2 px-4 py-2 bg-white text-red-600 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-40" 
        onClick={onClose}
      />

      {/* Main Editor */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="bg-[#1a1a1a] rounded-lg md:rounded-3xl w-full h-[85vh] md:w-[75vw] md:h-[80vh] max-w-5xl flex flex-col overflow-hidden border border-gray-800/50 pointer-events-auto"
          style={{
            boxShadow: '0px 8px 10px -6px rgba(0,0,0,0.2), 0px 20px 25px -5px rgba(0,0,0,0.14), 0px 8px 32px 4px rgba(0,0,0,0.12)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 bg-[#262626]" style={{
              boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
            }}>
            <div className="flex items-center gap-3 md:gap-6">
                <h2 className="text-lg md:text-xl font-medium text-white/87" style={{ fontFamily: 'Roboto, sans-serif' }}>Edit Image</h2>
              <span className="hidden sm:inline text-sm text-gray-300 px-3 py-1 rounded-full bg-gray-800 border border-gray-700">{currentImage.name}</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {/* Compact Undo/Redo buttons in header - only show when actions have been performed */}
              {hasActionsPerformed && (
                <>
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex === 0}
                    className="p-2 rounded-lg bg-[#2a2a2a] text-white/87 hover:bg-[#333333] disabled:opacity-38 disabled:cursor-not-allowed transition-all duration-200 border border-gray-700/30"
                    style={{
                      boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                    }}
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                     disabled={historyIndex === history.length - 1}
                     className="p-2 rounded-lg bg-[#2a2a2a] text-white/87 hover:bg-[#333333] disabled:opacity-38 disabled:cursor-not-allowed transition-all duration-200 border border-gray-700/30"
                    style={{
                      boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                    }}
                    title="Redo"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-lg bg-[#2a2a2a] text-white/87 hover:bg-[#333333] transition-all duration-200 border border-gray-700/30"
                    style={{
                      boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                    }}
                    title="Reset"
                  >
                    <Reset className="w-4 h-4" />
                  </button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex items-center gap-1 md:gap-2 text-white/87 hover:text-white bg-[#2a2a2a] hover:bg-[#333333] border border-gray-700/30 transition-all duration-200 px-2 md:px-4"
                style={{
                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                }}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
              </Button>
              <Button
                onClick={handleSave}
                className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 transition-all duration-200 px-2 md:px-4"
                style={{
                  boxShadow: '0px 2px 4px -1px rgba(25,118,210,0.2), 0px 4px 5px 0px rgba(25,118,210,0.14), 0px 1px 10px 0px rgba(25,118,210,0.12)'
                }}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Desktop Layout: Image Left, Options Right */}
            <div className="hidden md:flex flex-1 overflow-hidden">
              {/* Left Side - Image */}
              <div className="flex-1 flex flex-col">
                {/* Image Preview */}
                <div className="flex-1 flex items-center justify-center p-8 bg-[#0f0f0f] border-r border-gray-700/30 relative" style={{
                  overflow: activeTool === 'crop' && selectedAspectRatio === 'free' ? 'visible' : 'hidden'
                }}>
                  <div className={`relative w-full h-full max-w-4xl flex items-center justify-center rounded-xl bg-[#2a2a2a] border border-gray-600/50 ${
                    activeTool === 'crop' && selectedAspectRatio === 'free' ? '' : 'max-h-[600px]'
                  }`} style={{
                       boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                     }}>
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a] rounded-xl">
                      <div className="text-white text-sm">Loading image...</div>
                    </div>
                  )}
                  <img
                    ref={imageRef}
                    src={currentImage.preview}
                    alt={currentImage.name}
                    className="w-full h-full object-contain"
                    style={{
                      ...getImageStyle(currentImage),
                      opacity: isImageLoading ? 0 : 1,
                      transition: 'opacity 0.3s ease'
                    }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />

                  {/* Warmth Overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none z-10"
                    style={getWarmthOverlayStyle(currentImage)}
                  />
                  
                  {/* Crop Tool Overlay for Desktop */}
                  {activeTool === 'crop' && !isImageLoading && (
                    <div className="absolute inset-0">
                      {selectedAspectRatio === 'free' ? (
                        <QuadrilateralCropper
                          image={currentImage.preview}
                          onCrop={handleCropComplete}
                        />
                      ) : (
                        <CropTool
                          image={currentImage.preview}
                          mode={cropMode}
                          aspectRatio={selectedAspectRatio}
                          onCrop={handleCropComplete}
                          onModeChange={handleCropModeChange}
                          onAspectRatioChange={handleAspectRatioChange}
                        />
                      )}
                    </div>
                  )}
                  

                  </div>
                </div>
              </div>
              
              {/* Right Side - Primary Vertical Toolbar */}
              <div className="flex">
                {/* Primary Toolbar - Always Visible */}
                <div className="w-28 flex flex-col p-6 bg-[#1f1f1f] border-r border-gray-700/50" style={{
                   boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                 }}>
                  <h3 className="text-xs font-bold text-gray-400 mb-8 text-center tracking-wide">TOOLS</h3>
                  <div className="space-y-6 flex-1">
                    {toolCategories.flatMap(category => category.tools).map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleToolChange(activeTool === tool.id ? null : tool.id as Tool);
                          }}
                          className={`w-full flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                            activeTool === tool.id
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/50'
                            : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] hover:text-white border border-gray-700/30'
                          }`}
                          title={tool.name}
                        >
                          <IconComponent className="w-6 h-6" />
                          <span className="text-xs font-semibold text-center leading-tight">{tool.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Secondary Vertical Toolbar - Opens when tool is selected */}
                {activeTool && (
                  <div className="w-80 flex flex-col transition-all duration-300 ease-out bg-[#1f1f1f] border-r border-gray-700/50" style={{
                     boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                   }}>
                     {/* Header with Back Button */}
                     <div className="p-8 border-b border-gray-700/50 bg-[#262626]" style={{
                       boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                     }}>
                      <button
                        onClick={() => {
                          handleToolChange(null);
                        }}
                        className="flex items-center gap-3 text-white/87 hover:text-white transition-all duration-200 p-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] border border-gray-700/30"
                        style={{
                          boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">Close {toolCategories.flatMap(c => c.tools).find(t => t.id === activeTool)?.name}</span>
                      </button>
                    </div>
                    
                    {/* Tool Content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                      <div className="rounded-lg p-6 bg-[#2a2a2a] border border-gray-600/50">
                        {renderToolContent()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Layout: Centered image with proper spacing */}
            <div className="md:hidden flex-1 flex flex-col relative" style={{ minHeight: '0' }}>
              {/* Image Preview - Properly Centered Container */}
              <div className="flex-1 flex items-center justify-center p-4 bg-[#0f0f0f] relative" style={{ 
                paddingBottom: activeTool ? '18rem' : '8rem',
                paddingTop: '1rem',
                minHeight: '200px',
                maxHeight: activeTool === 'crop' && selectedAspectRatio === 'free' ? 'none' : `${viewportHeight - (activeTool ? 300 : 160)}px`,
                overflow: activeTool === 'crop' && selectedAspectRatio === 'free' ? 'visible' : 'hidden'
              }}>
                <div className="relative w-full h-full max-w-lg flex items-center justify-center rounded-xl bg-[#2a2a2a] border border-gray-600/50 z-10" style={{
                   boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)',
                   maxHeight: activeTool === 'crop' && selectedAspectRatio === 'free' ? 'none' : `${Math.min(480, viewportHeight - (activeTool ? 320 : 210))}px`
                 }}>
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a] rounded-xl">
                      <div className="text-white text-sm">Loading image...</div>
                    </div>
                  )}
                  <img
                    ref={imageRef}
                    src={currentImage.preview}
                    alt={currentImage.name}
                    className="w-full h-full object-contain"
                    style={{
                      ...getImageStyle(currentImage),
                      opacity: isImageLoading ? 0 : 1,
                      transition: 'opacity 0.3s ease'
                    }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />

                  {/* Warmth Overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none z-10"
                    style={getWarmthOverlayStyle(currentImage)}
                  />
                  
                  {/* Crop Tool Overlay for Mobile */}
                  {activeTool === 'crop' && !isImageLoading && (
                    <div className="absolute inset-0">
                      {selectedAspectRatio === 'free' ? (
                        <QuadrilateralCropper
                          image={currentImage.preview}
                          onCrop={handleCropComplete}
                        />
                      ) : (
                        <CropTool
                          image={currentImage.preview}
                          mode={cropMode}
                          aspectRatio={selectedAspectRatio}
                          onCrop={handleCropComplete}
                          onModeChange={handleCropModeChange}
                          onAspectRatioChange={handleAspectRatioChange}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Grid Secondary Toolbar for Mobile - appears above main toolbar when tool is active */}
              {activeTool && (
                <div className="absolute bottom-20 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800/70 z-40" style={{
                   boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                 }}>
                  <div className="p-4">
                    <div className="rounded-xl p-4 bg-[#1a1a1a] border border-gray-700/70 shadow-lg">
                      {renderMobileToolContent()}
                    </div>
                  </div>
                </div>
              )}
              

              
              {/* Mobile Bottom Toolbar */}
              <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800/70 z-50" style={{
                   boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)'
                 }}>
                {/* Main Mobile Toolbar */}
                <div className="p-4">
                  <div className="flex gap-2 overflow-x-scroll scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {toolCategories.flatMap(category => category.tools).map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleToolChange(activeTool === tool.id ? null : tool.id as Tool);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap ${
                          activeTool === tool.id
                            ? 'bg-white text-black shadow-lg'
                            : 'text-white/70 hover:text-white bg-transparent border border-gray-600/50 hover:border-gray-500'
                        }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="text-sm font-medium">{tool.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
     </>
    );
}
