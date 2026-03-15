import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
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
  Wand2,
  SlidersHorizontal,
  Stars,
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
  ChevronDown,
  Move,
  ZoomIn,
  ZoomOut,
  MoreHorizontal,
  Brush,
  Eraser,
  Sun,
  Moon,
  Zap,
  Droplet,
  Thermometer,
  Aperture,
  Palette,
  Triangle,
  Activity,
  Contrast,
  Circle,
  Layers
} from 'lucide-react';

type AdjustControlId = keyof FilterValues;

type AdjustControl = {
  id: AdjustControlId;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

type AdjustGroup = {
  title: string;
  controls: readonly AdjustControl[];
};

// Enhanced crop tool components
import { EnhancedCropTool } from './crop/EnhancedCropTool';
import { FourPointCropper, FourPointCropperHandle } from './crop/FourPointCropper';
import { CenteredSlider } from '@/components/ui/centered-slider';
import { filterPresets, getImageFilter, getVignetteStyle, getWarmthOverlayStyle, FilterValues } from '@/utils/imageUtils';
import { MosaicBrushOverlay, MosaicBrushOverlayHandle } from './MosaicBrushOverlay';
import { EraserBrushOverlay, EraserBrushOverlayHandle } from './EraserBrushOverlay';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  rotation: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  filters: FilterValues;
  activeFilter?: string;
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
  onApplyToAll?: (updatedImage: ImageFile) => void;
  onResetAll?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  currentIndex?: number;
  totalImages?: number;
}

type Tool = 'crop' | 'rotate' | 'filters' | 'adjust' | 'effects' | 'text' | 'brush' | 'eraser';
type AspectRatio = 'free' | 'square' | '4:3' | '16:9' | '3:2' | '9:16';
type CropMode = 'rectangle' | 'freeform';

const aspectRatios = [
  { name: 'Free', value: 'free', ratio: null, icon: Maximize2 },
  { name: 'Square', value: 'square', ratio: 1, icon: Square },
  { name: '4:3', value: '4:3', ratio: 4 / 3, icon: Grid3X3 },
  { name: '16:9', value: '16:9', ratio: 16 / 9, icon: Maximize },
  { name: '3:2', value: '3:2', ratio: 3 / 2, icon: ImageIcon },
  { name: '9:16', value: '9:16', ratio: 9 / 16, icon: Maximize },
];

const tools = [
  { id: 'crop', name: 'Crop', icon: Crop, color: 'from-blue-500 to-blue-600' },
  { id: 'rotate', name: 'Rotate', icon: RotateCw, color: 'from-green-500 to-green-600' },
  { id: 'filters', name: 'Filters', icon: Wand2, color: 'from-purple-500 to-purple-600' },
  { id: 'adjust', name: 'Adjust', icon: SlidersHorizontal, color: 'from-orange-500 to-orange-600' },
  { id: 'effects', name: 'Effects', icon: Stars, color: 'from-pink-500 to-pink-600' },
  { id: 'text', name: 'Text', icon: Type, color: 'from-indigo-500 to-indigo-600' },
];

const adjustGroups: readonly AdjustGroup[] = [
  {
    title: 'Light',
    controls: [
      { id: 'brightness', name: 'Brightness', icon: Sun, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'exposure', name: 'Exposure', icon: Zap, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'contrast', name: 'Contrast', icon: Contrast, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'highlights', name: 'Highlights', icon: Sun, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'shadows', name: 'Shadows', icon: Moon, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'vignette', name: 'Vignette', icon: Aperture, min: -100, max: 100, step: 1, defaultValue: 0 },
    ]
  },
  {
    title: 'Colour',
    controls: [
      { id: 'saturation', name: 'Saturation', icon: Droplet, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'warmth', name: 'Warmth', icon: Thermometer, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'tint', name: 'Tint', icon: Palette, min: -100, max: 100, step: 1, defaultValue: 0 },
      { id: 'sharpness', name: 'Sharpness', icon: Activity, min: -100, max: 100, step: 1, defaultValue: 0 },
    ]
  }
];

export default function ImageEditor({
  image,
  isOpen,
  onClose,
  onSave,
  onApplyToAll,
  onResetAll,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  currentIndex = 0,
  totalImages = 0
}: ImageEditorProps) {
  const [currentImage, setCurrentImage] = useState<ImageFile>(image);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('square');

  // Reset dirty states when tool changes
  useEffect(() => {
    setIsCropDirty(false);
  }, [activeTool]);
  const [cropMode, setCropMode] = useState<CropMode>('rectangle');
  const [history, setHistory] = useState<ImageFile[]>([image]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [showToolPanel, setShowToolPanel] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fourPointRef = useRef<FourPointCropperHandle | null>(null);
  const isMobile = useIsMobile();
  const mouseStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMousePanning, setIsMousePanning] = useState(false);
  const [mousePanEnabled, setMousePanEnabled] = useState(false);
  // Track the last "stable" orientation (0, 90, 180, 270) to prevent layout flipping during small slider adjustments
  const lastOrientationRef = useRef(Math.round(image.rotation / 90) * 90);
  const [rotatePreview, setRotatePreview] = useState(0);
  const [isCropDirty, setIsCropDirty] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [isRotating, setIsRotating] = useState(false);
  const [applyToAllFeedback, setApplyToAllFeedback] = useState(false);
  const [resetAllFeedback, setResetAllFeedback] = useState(false);
  const [isAppliedToAll, setIsAppliedToAll] = useState(false);

  // Always keep a ref to the ORIGINAL image prop so hasModifications compares to the true baseline
  const originalImageRef = useRef<ImageFile>(image);
  useEffect(() => { originalImageRef.current = image; }, [image]);


  const [isBrushDirty, setIsBrushDirty] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const brushOverlayRef = useRef<MosaicBrushOverlayHandle>(null);
  
  const [isEraserDirty, setIsEraserDirty] = useState(false);
  const [eraserSize, setEraserSize] = useState(30);
  const eraserOverlayRef = useRef<EraserBrushOverlayHandle>(null);

  const [activeAdjustTool, setActiveAdjustTool] = useState<string | null>(null);
  const [isOriginalPreview, setIsOriginalPreview] = useState(false);

  const handleToolChange = (newTool: Tool) => {
    // Tapping the same tool toggles it off (closes secondary toolbar on mobile)
    if (activeTool === newTool) {
      setActiveTool(null);
      setIsCropDirty(false);
      setRotatePreview(0);
      setIsRotating(false);
      setIsFreeCropVisible(false);
      setIsBrushDirty(false);
      setIsEraserDirty(false);
      setActiveAdjustTool(null);
      return;
    }

    // Switching to a different tool
    setIsCropDirty(false);
    setRotatePreview(0);
    setIsRotating(false);
    setIsFreeCropVisible(false);
    setIsBrushDirty(false);
    setIsEraserDirty(false);

    setActiveTool(newTool);

    // Initialize per-tool sub state so mobile secondary UI shows immediately
    if (newTool === 'adjust') {
      const firstControl = adjustGroups[0]?.controls[0];
      if (firstControl) {
        setActiveAdjustTool(firstControl.id);
      }
    } else {
      setActiveAdjustTool(null);
    }

    if (newTool === 'crop') {
      setIsFreeCropVisible(true);
      setToolStartState(currentImage);
    }
  };


  // Reset "Applied to All" status when the current image changes (e.g. user edits filters)
  useEffect(() => {
    setIsAppliedToAll(false);
  }, [currentImage.filters, currentImage.activeFilter]);

  const defaultFilters: FilterValues = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    sharpness: 0,
    blur: 0,
    warmth: 0,
    tint: 0,
    vignette: 0,
    grayscale: 0,
    invert: 0,
    sepia: 0,
    hueRotate: 0,
  };

  const handleApplyToAllClick = () => {
    if (onApplyToAll) {
      onApplyToAll(currentImage);
      setApplyToAllFeedback(true);
      setIsAppliedToAll(true);
      setTimeout(() => setApplyToAllFeedback(false), 2000);
    }
  };

  const handleResetAllClick = () => {
    if (onResetAll) {
      onResetAll();
      // Reset local filters
      setCurrentImage(prev => ({
        ...prev,
        filters: { ...defaultFilters },
        activeFilter: undefined
      }));
      setResetAllFeedback(true);
      // Note: isAppliedToAll will be reset to false by the useEffect when currentImage changes
      setTimeout(() => setResetAllFeedback(false), 2000);
    }
  };

  const [toolStartState, setToolStartState] = useState<ImageFile | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSliderRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastSignRef = useRef(0);
  const dragBaseRef = useRef(0);

  // Capture state when entering crop tool
  useEffect(() => {
    if (activeTool === 'crop') {
      setToolStartState(currentImage);
    }
  }, [activeTool]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanges = React.useMemo(() => {
    // If not in crop tool or not initialized, rely on isCropDirty or false
    if (!toolStartState) return isCropDirty;

    // Calculate current effective rotation
    let currentRotation = currentImage.rotation;
    if (isRotating) {
      currentRotation = dragBaseRef.current + rotatePreview;
    }

    // Normalize
    const normalize = (deg: number) => {
      const d = deg % 360;
      return d < 0 ? d + 360 : d;
    };

    let rotDiff = Math.abs(normalize(currentRotation) - normalize(toolStartState.rotation));
    if (rotDiff > 180) rotDiff = 360 - rotDiff;
    const rotationChanged = rotDiff > 0.01;

    const flipsChanged = currentImage.flipHorizontal !== toolStartState.flipHorizontal ||
      currentImage.flipVertical !== toolStartState.flipVertical;

    return isCropDirty || rotationChanged || flipsChanged;
  }, [isCropDirty, currentImage, rotatePreview, isRotating, toolStartState]);

  const hasModifications = React.useMemo(() => {
    // Use the original image prop as baseline (not history[0] which gets reset)
    const original = originalImageRef.current;
    if (!original) return false;

    // 1. Check for pending 4-point crop
    if (activeTool === 'crop' && isCropDirty && !isRotating) return true;

    // 2. Calculate Effective Rotation
    let effectiveRotation = currentImage.rotation;
    if (activeTool === 'crop' && isRotating) {
      effectiveRotation = dragBaseRef.current + rotatePreview;
    }

    // Normalize and Compare Rotation
    const normalize = (deg: number) => {
      const d = deg % 360;
      return d < 0 ? d + 360 : d;
    };

    if (Math.abs(normalize(effectiveRotation) - normalize(original.rotation)) > 0.01) return true;

    // 3. Compare other structural properties
    if (currentImage.flipHorizontal !== original.flipHorizontal) return true;
    if (currentImage.flipVertical !== original.flipVertical) return true;

    // 4. Compare Preview (Committed Crops)
    if (currentImage.preview !== original.preview) return true;

    // 5. Compare Filters
    const keys = Object.keys(defaultFilters) as (keyof FilterValues)[];
    for (const key of keys) {
      if ((currentImage.filters[key] ?? 0) !== (original.filters[key] ?? 0)) return true;
    }

    // 6. Compare Active Filter
    if ((currentImage.activeFilter ?? 'Original') !== (original.activeFilter ?? 'Original')) return true;

    // 7. Brush dirty
    if (activeTool === 'brush' && isBrushDirty) return true;

    return false;
  }, [currentImage, activeTool, isCropDirty, isRotating, rotatePreview, defaultFilters, isBrushDirty]);


  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Filter state
  const [selectedFilterName, setSelectedFilterName] = useState('Original');

  // Measure canvas size
  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate visual orientation and safe optical offset 
  const { isPortrait, verticalOffset, maxW, maxH, imgW, imgH, isRotatedSides } = React.useMemo(() => {
    if (!imgDimensions.width || !imgDimensions.height || !canvasSize.width || !canvasSize.height) {
      return { isPortrait: false, verticalOffset: 0, maxW: 0, maxH: 0, imgW: 0, imgH: 0, isRotatedSides: false };
    }

    // Safe Containment Logic:
    // Ensure the image fits within the canvas with a guaranteed safe margin on all sides.
    // 24px padding ensures handles are never cut off by phone screen edges.
    const SAFE_PADDING = 24;
    const availableW = canvasSize.width - SAFE_PADDING * 2;
    const availableH = canvasSize.height - SAFE_PADDING * 2;

    if (availableW <= 0 || availableH <= 0) {
      return { isPortrait: false, verticalOffset: 0, maxW: 0, maxH: 0, imgW: 0, imgH: 0, isRotatedSides: false };
    }

    // Account for rotation 
    const normalizedRotation = (currentImage.rotation + 360) % 360;

    // Determine Layout Orientation (Base 90-degree step)
    // We use a "sticky" approach: resolve ambiguity at 45-degree boundaries by favoring the previous orientation.
    // This ensures the frame doesn't flip when dragging the slider to limits, but DOES flip when rotating 90 degrees.
    const candidates = [0, 90, 180, 270];
    const validCandidates = candidates.filter(base => {
      let diff = Math.abs(normalizedRotation - base);
      if (diff > 180) diff = 360 - diff;
      return diff <= 45.1; // Epsilon for float precision
    });

    if (validCandidates.length === 1) {
      lastOrientationRef.current = validCandidates[0];
    } else if (validCandidates.length > 1) {
      // Ambiguous boundary (e.g. 45 degrees). Pick closest to last known orientation.
      let bestBase = validCandidates[0];
      let minDist = 360;

      validCandidates.forEach(base => {
        let dist = Math.abs(base - lastOrientationRef.current);
        if (dist > 180) dist = 360 - dist;
        if (dist < minDist) {
          minDist = dist;
          bestBase = base;
        }
      });
      lastOrientationRef.current = bestBase;
    }

    const effectiveOrientation = lastOrientationRef.current;
    const isRotatedSides = effectiveOrientation === 90 || effectiveOrientation === 270;

    const naturalWidth = isRotatedSides ? imgDimensions.height : imgDimensions.width;
    const naturalHeight = isRotatedSides ? imgDimensions.width : imgDimensions.height;
    const isPort = naturalHeight > naturalWidth;

    // Calculate fit scale to ensure it fits STRICTLY within available safe space
    const scaleW = availableW / naturalWidth;
    const scaleH = availableH / naturalHeight;
    const currentFitScale = Math.min(scaleW, scaleH);

    // Use the current fit scale to allow the image to expand when rotated
    const fitScale = currentFitScale;

    // Container dimensions (Swapped if rotated)
    const maxW = naturalWidth * fitScale;
    const maxH = naturalHeight * fitScale;

    // Image content dimensions (Unswapped, matching original image structure)
    // We size the inner element to these dimensions so the rotation transform applies correctly
    const imgW = imgDimensions.width * fitScale;
    const imgH = imgDimensions.height * fitScale;

    const finalOffset = 0;

    return { isPortrait: isPort, verticalOffset: finalOffset, maxW, maxH, imgW, imgH, isRotatedSides };
  }, [imgDimensions, currentImage.rotation, rotatePreview, canvasSize]);

  // Update dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Ensure dimensions are captured if image is already loaded (e.g. from cache)
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImgDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  }, [currentImage.preview]);



  // Touch gesture states
  const [touchState, setTouchState] = useState({
    isZooming: false,
    isPanning: false,
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 }
  });


  // Sync rotatePreview with currentImage.rotation (deviation from nearest 90)
  // This ensures the slider always reflects the current straighten angle
  useEffect(() => {
    if (isRotating) return;

    const rotation = currentImage.rotation % 360;
    const normalized = (rotation + 360) % 360;
    const nearest90 = Math.round(normalized / 90) * 90;
    const diff = normalized - nearest90;

    setRotatePreview(prev => {
      // Handle 45 degree ambiguity to prevent slider jumping
      // If the rotation is exactly 45 degrees off, it could be interpreted as +45 or -45
      // We check the previous value to maintain continuity
      if (Math.abs(Math.abs(diff) - 45) < 0.1) {
        if (lastSignRef.current > 0) return 45;
        if (lastSignRef.current < 0) return -45;
        if (prev > 0) return 45;
        if (prev < 0) return -45;
      }
      return diff;
    });
  }, [currentImage.rotation, isRotating]);
  const [isFreeCropVisible, setIsFreeCropVisible] = useState(true);

  // Helper to get rotation deviation from nearest 90 degrees
  const getRotationDeviation = (rotation: number) => {
    const normalized = ((rotation % 360) + 360) % 360; // Ensure positive 0-360
    const nearest90 = Math.round(normalized / 90) * 90;
    let deviation = normalized - nearest90;

    // Handle wrap-around cases (e.g. 355 should be -5 from 360/0)
    if (deviation < -45) deviation += 360;
    if (deviation > 45) deviation -= 360;

    return deviation;
  };

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

    // Ensure activeFilter is initialized
    if (!initializedImage.activeFilter) {
      initializedImage.activeFilter = 'Original';
    }

    setCurrentImage(initializedImage);
    setHistory([initializedImage]);
    setHistoryIndex(0);
    setSelectedFilterName(initializedImage.activeFilter || 'Original');
    setRotatePreview(getRotationDeviation(initializedImage.rotation));

    // Reset tool start state for the new image to ensure dirty checks are correct
    setToolStartState(initializedImage);
  }, [image]);

  const allAdjustControls: AdjustControl[] = React.useMemo(
    () => adjustGroups.flatMap(group => group.controls),
    []
  );

  // Save to history
  const saveToHistory = useCallback((newImage: ImageFile) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newImage);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    setCurrentImage(newImage);
    setSelectedFilterName(newImage.activeFilter ?? 'Original');
    setRotatePreview(getRotationDeviation(newImage.rotation));
    setToolStartState(newImage);
  }, [historyIndex]);

  // Undo/Redo functions
  const handleUndo = () => {
    if (activeTool === 'brush') {
      brushOverlayRef.current?.undo();
      return;
    }
    if (activeTool === 'eraser') {
      eraserOverlayRef.current?.undo();
      return;
    }

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setHistoryIndex(newIndex);
      setCurrentImage(previousState);
      setSelectedFilterName(previousState.activeFilter ?? 'Original');
      setRotatePreview(getRotationDeviation(previousState.rotation));
      setToolStartState(previousState);
      if (activeTool === 'crop') setIsCropDirty(false);
    }
  };

  const handleRedo = () => {
    if (activeTool === 'brush') {
      brushOverlayRef.current?.redo();
      return;
    }
    if (activeTool === 'eraser') {
      eraserOverlayRef.current?.redo();
      return;
    }

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setHistoryIndex(newIndex);
      setCurrentImage(nextState);
      setSelectedFilterName(nextState.activeFilter ?? 'Original');
      setRotatePreview(getRotationDeviation(nextState.rotation));
      setToolStartState(nextState);
      if (activeTool === 'crop') setIsCropDirty(false);
    }
  };

  const handleReset = useCallback(() => {
    if (activeTool === 'brush') {
      brushOverlayRef.current?.clearStrokes();
      setIsBrushDirty(false);
      return;
    }
    if (activeTool === 'eraser') {
      eraserOverlayRef.current?.clearStrokes();
      setIsEraserDirty(false);
      return;
    }

    const originalImage = history[0];
    setCurrentImage(originalImage);
    setHistory([originalImage]);
    setHistoryIndex(0);
    setActiveTool(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsCropDirty(false);
    setToolStartState(originalImage);
    setRotatePreview(getRotationDeviation(originalImage.rotation));
  }, [history, activeTool]);

  const handleSave = useCallback(() => {
    onSave(currentImage);
    onClose();
  }, [currentImage, onSave, onClose]);

  // Image transformation functions
  // --- Rotation Slider Handlers (See below for implementation) ---

  const getImageTransform = (img: ImageFile, extraScale: number = 1) => {
    const { rotation, flipHorizontal, flipVertical } = img;

    // Calculate effective rotation
    // When rotating via slider, use the base 90-degree snap + slider value
    // Otherwise use the committed rotation value
    let effectiveRotation = rotation;
    if (isRotating) {
      // Use the stable base captured at drag start to prevent jumping at 45-degree boundaries
      effectiveRotation = dragBaseRef.current + rotatePreview;
    }

    return [
      `rotate(${effectiveRotation}deg)`,
      `scale(${extraScale})`,
      flipHorizontal ? 'scaleX(-1)' : '',
      flipVertical ? 'scaleY(-1)' : ''
    ].filter(Boolean).join(' ');
  };

  // Calculate auto-zoom to fill frame during rotation
  const autoZoomScale = React.useMemo(() => {
    // Only apply auto-zoom when there is a rotation deviation (slider usage)
    if (!imgDimensions.width || !imgDimensions.height || rotatePreview === 0) return 1;

    const radians = Math.abs(rotatePreview * (Math.PI / 180));
    const ratio = imgDimensions.width / imgDimensions.height;

    // The scale factor required to cover the box (W x H) with a rotated box (W x H)
    // s = cos(theta) + sin(theta) * max(W/H, H/W)
    const maxRatio = Math.max(ratio, 1 / ratio);
    return Math.cos(radians) + Math.sin(radians) * maxRatio;
  }, [rotatePreview, imgDimensions]);

  const effectiveImage = isOriginalPreview && originalImageRef.current
    ? originalImageRef.current
    : currentImage;

  const currentFilterCss = isOriginalPreview ? 'none' : getImageFilter(currentImage);

  const updateFilter = (name: keyof ImageFile['filters'], value: number) => {
    const newImage = {
      ...currentImage,
      filters: {
        ...currentImage.filters,
        [name]: value,
      },
    };
    saveToHistory(newImage);
  };

  const handleRotate = (degrees: number) => {
    const newImage = {
      ...currentImage,
      rotation: currentImage.rotation + degrees
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
        activeFilter: filterName
      };

      // If "Original" is selected, reset all manual adjustments to bring it back to normal
      if (filterName === 'Original') {
        newImage.filters = { ...defaultFilters };
      }

      setSelectedFilterName(filterName);
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
    setIsCropDirty(false);
    setToolStartState(newImage);
    console.log('✨ Crop tool deactivated');
  };

  const applyRotationAndCrop = async () => {
    if (!imgDimensions.width || !imgDimensions.height) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = imgDimensions;
    canvas.width = width;
    canvas.height = height;

    // Create an image element to draw
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage.preview;

    await new Promise((resolve) => {
      if (img.complete) resolve(null);
      img.onload = () => resolve(null);
    });

    // Calculate scale to crop outside area
    // We reuse the autoZoomScale logic but recalculated here for safety
    const rotation = currentImage.rotation;
    const deviation = getRotationDeviation(rotation);

    const radians = Math.abs(deviation * (Math.PI / 180));
    const ratio = width / height;
    const maxRatio = Math.max(ratio, 1 / ratio);
    const scale = Math.cos(radians) + Math.sin(radians) * maxRatio;

    // Draw
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    if (currentImage.flipHorizontal) ctx.scale(-1, 1);
    if (currentImage.flipVertical) ctx.scale(1, -1);

    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    const newPreview = canvas.toDataURL('image/png');

    const newImage = {
      ...currentImage,
      preview: newPreview,
      rotation: 0, // Reset rotation as it's baked in
      flipHorizontal: false, // Reset flips
      flipVertical: false
    };

    saveToHistory(newImage);
    onSave(newImage);
    setActiveTool(null);
  };

  const handleApply = async () => {
    if (activeTool === 'brush' && isBrushDirty) {
      const composited = await brushOverlayRef.current?.getCompositedImage(
        currentImage.preview, imgDimensions.width, imgDimensions.height
      );
      if (composited) {
        const newImage = { ...currentImage, preview: composited };
        saveToHistory(newImage);
        onSave(newImage);
        brushOverlayRef.current?.clearStrokes();
        setIsBrushDirty(false);
        setActiveTool(null);
      }
    } else if (activeTool === 'eraser' && isEraserDirty) {
      const composited = await eraserOverlayRef.current?.getCompositedImage(
        currentImage.preview, imgDimensions.width, imgDimensions.height
      );
      if (composited) {
        const newImage = { ...currentImage, preview: composited };
        saveToHistory(newImage);
        onSave(newImage);
        eraserOverlayRef.current?.clearStrokes();
        setIsEraserDirty(false);
        setActiveTool(null);
      }
    } else if (activeTool === 'crop' && hasChanges) {
      if (fourPointRef.current) {
        fourPointRef.current.apply();
      } else {
        applyRotationAndCrop();
      }
      setIsCropDirty(false);
    } else {
      onSave(currentImage);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom <= 1 && !touchState.isZooming && !touchState.isPanning) {
      // Single-finger hold: temporary original preview for comparison
      setIsOriginalPreview(true);
      return;
    }

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

    if (isOriginalPreview) {
      // While comparing, ignore move logic; preview stays until touch end.
      return;
    }

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
    setIsOriginalPreview(false);
    setTouchState({
      isZooming: false,
      isPanning: false,
      lastDistance: 0,
      lastCenter: { x: 0, y: 0 },
      startPan: { x: 0, y: 0 }
    });
  }, []);

  // Mouse pan handlers (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!mousePanEnabled && zoom <= 1) return; // Allow pan if zoomed or mode enabled
    setIsMousePanning(true);
    mouseStartPanRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [mousePanEnabled, zoom, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMousePanning) return;
    const newOffset = {
      x: e.clientX - mouseStartPanRef.current.x,
      y: e.clientY - mouseStartPanRef.current.y,
    };
    setPanOffset(newOffset);
  }, [isMousePanning]);

  const handleMouseUp = useCallback(() => {
    setIsMousePanning(false);
  }, []);

  // Reset zoom, pan, and revert image to original state
  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });

    if (history.length > 0) {
      const originalImage = history[0];
      setCurrentImage(originalImage);

      // Reset history to just the original image
      setHistory([originalImage]);
      setHistoryIndex(0);

      // Reset tool specific states
      setRotatePreview(0);
      setIsCropDirty(false);

      // If we are in crop tool, we need to reset the start state reference
      // so that hasChanges calculation is correct (comparing current vs current)
      if (activeTool === 'crop') {
        setToolStartState(originalImage);
        if (fourPointRef.current) {
          fourPointRef.current.reset();
        }
      }
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.max(0.5, Math.min(3, +(prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, Math.min(3, +(prev - 0.1).toFixed(2))));
  };

  // Render custom resize handle
  const renderHandle = (position: string) => (
    <div className={`absolute w-2 h-2 bg-white/90 border border-gray-400/30 shadow-sm z-50 pointer-events-none rounded-[1px]
      ${position === 'tl' ? '-top-1 -left-1' : ''}
      ${position === 'tc' ? '-top-1 left-1/2 -translate-x-1/2' : ''}
      ${position === 'tr' ? '-top-1 -right-1' : ''}
      ${position === 'ml' ? 'top-1/2 -translate-y-1/2 -left-1' : ''}
      ${position === 'mr' ? 'top-1/2 -translate-y-1/2 -right-1' : ''}
      ${position === 'bl' ? '-bottom-1 -left-1' : ''}
      ${position === 'bc' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
      ${position === 'br' ? '-bottom-1 -right-1' : ''}
    `} />
  );

  // Helper to generate gamma table values for Highlights/Shadows
  const getGammaTable = (shadows: number, highlights: number) => {
    // Shadows: -100 to 100.
    // +100 means brighten shadows (lift blacks).
    // -100 means darken shadows (crush blacks).

    // Highlights: -100 to 100.
    // +100 means brighten highlights (blow out whites).
    // -100 means darken highlights (recover details).

    // We generate a lookup table of 21 points (0, 0.05, 0.1 ... 1.0)
    const points = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      let x = i / steps;
      let y = x;

      // Apply Shadows adjustment (affects lower range more)
      // Simple lift: y = x + (1-x) * factor? No.
      // Gamma correction is better: y = x ^ (1/gamma)
      // But we want to target shadows specifically.

      // Simplified curve bending:
      // Shadows boost: add a sine wave hump at the low end.
      if (shadows !== 0) {
        const sFactor = shadows / 200; // -0.5 to 0.5
        // Peak effect at x=0.25
        const weight = Math.max(0, 1 - Math.abs(x - 0.25) * 4);
        y += sFactor * weight;
      }

      // Apply Highlights adjustment (affects upper range more)
      if (highlights !== 0) {
        const hFactor = highlights / 200; // -0.5 to 0.5
        // Peak effect at x=0.75
        const weight = Math.max(0, 1 - Math.abs(x - 0.75) * 4);
        y += hFactor * weight;
      }

      // Clamp
      y = Math.max(0, Math.min(1, y));
      points.push(y.toFixed(3));
    }
    return points.join(' ');
  };

  // --- Rotation Slider Handlers (Infinite Scrubber) ---
  const handleSliderPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    lastPointerXRef.current = e.clientX;
    isDraggingSliderRef.current = true;

    // Capture the base 90-degree angle by subtracting the current preview
    // This ensures consistency even at 45-degree boundaries
    const currentRot = currentImage.rotation;
    const base = Math.round((currentRot - rotatePreview) / 90) * 90;
    dragBaseRef.current = base;

    setIsRotating(true);
    setIsFreeCropVisible(false);

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSliderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSliderRef.current || !sliderContainerRef.current) return;

    e.preventDefault();

    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;

    const rect = sliderContainerRef.current.getBoundingClientRect();
    if (rect.width < 50) return; // Safety check

    // Sensitivity: Full width = 45 degrees
    const degreesPerPixel = 45 / rect.width;
    const deltaDegrees = deltaX * degreesPerPixel;

    // Dragging Right (Positive) -> Decrease Angle (Scale moves Right)
    let newRotation = Math.max(-45, Math.min(45, rotatePreview - deltaDegrees));

    // Snap to 0 if close enough (within 0.5 degrees)
    if (Math.abs(newRotation) < 0.5) {
      newRotation = 0;
    }

    if (newRotation !== rotatePreview) {
      setRotatePreview(newRotation);
      if (Math.abs(newRotation) > 0.1) {
        lastSignRef.current = Math.sign(newRotation);
      }
    }
  };

  const handleSliderPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingSliderRef.current) return;

    isDraggingSliderRef.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);

    // Commit Rotation & Reset Preview
    // This implements the "Infinite Scrubber" behavior where the slider snaps back to center
    // but the image retains the rotation.
    // Use the same base we started with to ensure "What You See Is What You Get"
    const newRotation = dragBaseRef.current + rotatePreview;

    const newImage = {
      ...currentImage,
      rotation: newRotation % 360
    };
    saveToHistory(newImage);

    setIsRotating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Hidden SVG Filter Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0">
        <defs>
          <filter id="adjust-filter" x="-10%" y="-10%" width="120%" height="120%">
            {/* Sharpness: Only if > 0 */}
            {currentImage.filters.sharpness > 0 && (
              <feConvolveMatrix
                order="3"
                kernelMatrix={`0 -${currentImage.filters.sharpness / 100} 0 -${currentImage.filters.sharpness / 100} ${1 + 4 * (currentImage.filters.sharpness / 100)} -${currentImage.filters.sharpness / 100} 0 -${currentImage.filters.sharpness / 100} 0`}
                preserveAlpha="true"
              />
            )}

            {/* Highlights and Shadows mapping */}
            <feComponentTransfer>
              <feFuncR type="table" tableValues={getGammaTable(currentImage.filters.shadows, currentImage.filters.highlights)} />
              <feFuncG type="table" tableValues={getGammaTable(currentImage.filters.shadows, currentImage.filters.highlights)} />
              <feFuncB type="table" tableValues={getGammaTable(currentImage.filters.shadows, currentImage.filters.highlights)} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="glass-panel w-full sm:max-w-6xl h-[82vh] sm:h-[90vh] rounded-3xl flex flex-col overflow-hidden text-gray-300 font-sans select-none relative shadow-2xl">

        {/* TOP TOOLBAR */}
        <div className="h-12 sm:h-16 bg-white/10 border-b border-white/15 flex items-center justify-between px-3 sm:px-6 flex-none z-50 backdrop-blur-xl gap-2">

          {/* LEFT SECTION */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-lg border border-white/10 flex-none">
              <button onClick={handleZoomOut} className="p-1 sm:p-1.5 hover:text-white transition-colors hover:bg-white/10 rounded"><ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
              <span className="text-[10px] sm:text-xs font-medium text-white min-w-[2.5rem] sm:min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 sm:p-1.5 hover:text-white transition-colors hover:bg-[#333] rounded"><ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
            </div>

            <div className="h-4 sm:h-6 w-px bg-white/10 flex-none" />

            <div className="flex items-center gap-0.5 sm:gap-1 flex-none">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleUndo}
                      disabled={activeTool === 'brush' ? !brushOverlayRef.current?.canUndo : !hasModifications}
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all duration-200 ${(activeTool === 'brush' ? brushOverlayRef.current?.canUndo : hasModifications)
                        ? 'text-gray-400 hover:text-white hover:bg-[#333]'
                        : 'text-gray-700 opacity-40 cursor-not-allowed hover:bg-transparent'
                        }`}
                    >
                      <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-white/10 text-gray-900 border-white/40 backdrop-blur-xl">
                    <p>Undo</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRedo}
                      disabled={activeTool === 'brush' ? !brushOverlayRef.current?.canRedo : historyIndex >= history.length - 1}
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all duration-200 ${(activeTool === 'brush' ? brushOverlayRef.current?.canRedo : historyIndex < history.length - 1)
                        ? 'text-gray-400 hover:text-white hover:bg-[#333]'
                        : 'text-gray-700 opacity-40 cursor-not-allowed hover:bg-transparent'
                        }`}
                    >
                      <Redo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-white/10 text-gray-900 border-white/40 backdrop-blur-xl">
                    <p>Redo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="w-px h-4 bg-[#333] mx-1" />

              <Button
                onClick={handleReset}
                disabled={activeTool === 'brush' ? !isBrushDirty : !hasModifications}
                variant="ghost"
                className={`text-[10px] sm:text-xs font-medium h-7 sm:h-8 px-2 sm:px-3 rounded-lg transition-colors ${(activeTool === 'brush' ? isBrushDirty : hasModifications)
                  ? 'text-gray-400 hover:text-white hover:bg-[#333]'
                  : 'text-gray-700 opacity-40 cursor-not-allowed hover:bg-transparent'
                  }`}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* CENTER SECTION — tool tabs */}
          <div className="hidden sm:flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar gap-1 sm:gap-2 bg-white/5 p-1 rounded-xl border border-white/10 max-w-[50vw] sm:max-w-none">
            {[
              { id: 'crop', icon: Crop, label: 'Crop' },
              { id: 'filters', icon: Wand2, label: 'Filters' },
              { id: 'adjust', icon: SlidersHorizontal, label: 'Adjust' },
              { id: 'brush', icon: Brush, label: 'Brush' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' }
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id as Tool)}
                className={`p-2 rounded-lg transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                  activeTool === tool.id
                    ? 'text-blue-400 bg-blue-500/10 shadow-sm'
                    : 'hover:bg-white/10 text-white'
                }`}
                title={tool.label}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-none sm:flex-1">
            {totalImages > 0 && (
              <div className="flex items-center justify-center mr-2 sm:mr-4 px-3 py-1.5 rounded-lg bg-white/20 border border-white/40">
                <span className="text-sm font-medium text-gray-400 select-none">
                  <span className="text-gray-200">{currentIndex + 1}</span>
                  <span className="mx-1.5 text-gray-600">/</span>
                  <span>{totalImages}</span>
                </span>
              </div>
            )}
            <Button
              onClick={handleApply}
              disabled={!hasModifications}
              className={`h-8 sm:h-9 px-3 sm:px-6 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200
                ${hasModifications
                  ? 'text-blue-50 bg-blue-500/70 shadow-sm hover:bg-blue-500'
                  : 'bg-white/5 text-gray-400 cursor-not-allowed opacity-50'}`}
            >
              Apply
            </Button>
            <Button onClick={onClose} variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-lg">
              Close
            </Button>
          </div>
        </div>

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-white/5">

          {/* MAIN COLUMN: CANVAS + BOTTOM CONTROLS */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">

            {/* CANVAS AREA */}
            <div
              ref={canvasRef}
              className="flex-1 relative overflow-hidden flex items-center justify-center bg-white/5 p-2 sm:p-8"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >

              {/* Navigation Buttons (Overlay) */}
              {(onPrevious || onNext) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all duration-200 border border-white/10 backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNext}
                    disabled={!hasNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all duration-200 border border-white/10 backdrop-blur-sm"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                </>
              )}

              <div
                ref={containerRef}
                className="relative group shadow-2xl flex items-center justify-center"
                style={{
                  width: maxW,
                  height: maxH,
                  transform: `translate(${panOffset.x}px, ${panOffset.y + verticalOffset}px) scale(${zoom})`,
                  transition: isMousePanning ? 'none' : 'transform 0.1s ease-out',
                  cursor: mousePanEnabled ? (isMousePanning ? 'grabbing' : 'grab') : 'default',
                  flexShrink: 0,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* 5. TRANSFORM FRAME & IMAGE WRAPPER */}
                <div
                  ref={imageWrapperRef}
                  className={`relative shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden`}
                  style={{
                    width: maxW,
                    height: maxH
                  }}
                >
                  {/* 1. DIMMED LAYER */}
                  <div className="absolute inset-0 overflow-visible z-10">
                    <div
                      style={{
                        position: 'absolute',
                        width: imgW,
                        height: imgH,
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) ${getImageTransform(currentImage, autoZoomScale)}`,
                        transformOrigin: 'center center',
                        transition: touchState.isZooming || touchState.isPanning ? 'none' : 'transform 0.2s ease-out'
                      }}
                    >
                      <AnimatePresence mode='wait'>
                        <motion.div
                          key={currentImage.preview}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative w-full h-full"
                        >
                          <div className="absolute inset-0 z-10 pointer-events-none" style={isOriginalPreview ? {} : getWarmthOverlayStyle(currentImage)} />
                          <img
                            src={effectiveImage.preview}
                            alt="Editing Background"
                            className="block object-contain pointer-events-none bg-transparent"
                            style={{
                              filter: currentFilterCss,
                              width: '100%',
                              height: '100%',
                              transition: 'filter 0.1s ease-out'
                            }}
                            draggable={false}
                          />
                          <div className="absolute inset-0 z-20 pointer-events-none" style={isOriginalPreview ? {} : getVignetteStyle(currentImage)} />
                          {/* THE DIMMING OVERLAY */}
                          {activeTool === 'crop' && !isFreeCropVisible && (
                            <div className="absolute inset-0 z-30 bg-black/60 pointer-events-none" />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 2. BRIGHT LAYER (clipped by outer wrapper's overflow-hidden) */}
                  <div className="absolute inset-0 overflow-visible z-20">
                    <div
                      style={{
                        position: 'absolute',
                        width: imgW,
                        height: imgH,
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) ${getImageTransform(currentImage, autoZoomScale)}`,
                        transformOrigin: 'center center',
                        transition: touchState.isZooming || touchState.isPanning ? 'none' : 'transform 0.2s ease-out'
                      }}
                    >
                      <AnimatePresence mode='wait'>
                        <motion.div
                          key={currentImage.preview}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative w-full h-full"
                        >
                          <div className="absolute inset-0 z-10 pointer-events-none" style={isOriginalPreview ? {} : getWarmthOverlayStyle(currentImage)} />
                          <img
                            ref={imageRef}
                            src={effectiveImage.preview}
                            alt="Editing Foreground"
                            onLoad={handleImageLoad}
                            className="block object-contain pointer-events-none bg-transparent"
                            style={{
                              filter: currentFilterCss,
                              width: '100%',
                              height: '100%',
                              transition: 'filter 0.1s ease-out'
                            }}
                            draggable={false}
                          />
                          <div className="absolute inset-0 z-20 pointer-events-none" style={isOriginalPreview ? {} : getVignetteStyle(currentImage)} />
                          {activeTool === 'brush' && (
                            <MosaicBrushOverlay
                              ref={brushOverlayRef}
                              width={imgW}
                              height={imgH}
                              isActive={true}
                              brushSize={brushSize}
                              color={brushColor}
                              onChange={setIsBrushDirty}
                            />
                          )}
                          {activeTool === 'eraser' && (
                            <EraserBrushOverlay
                              ref={eraserOverlayRef}
                              width={imgW}
                              height={imgH}
                              isActive={true}
                              brushSize={eraserSize}
                              onChange={setIsEraserDirty}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* FRAME HANDLES & GRID — only visible when using rotation slider */}
                  {activeTool === 'crop' && !isFreeCropVisible && isRotating && (
                    <div className="absolute inset-0 pointer-events-none z-40" style={{ transition: 'opacity 0.2s ease' }}>
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {/* Slim corner handles */}
                        <g stroke="rgba(255,255,255,0.85)" strokeWidth="0.6" strokeLinecap="round">
                          {/* Top-left */}
                          <line x1="0.5" y1="0.5" x2="6" y2="0.5" />
                          <line x1="0.5" y1="0.5" x2="0.5" y2="6" />
                          {/* Top-right */}
                          <line x1="94" y1="0.5" x2="99.5" y2="0.5" />
                          <line x1="99.5" y1="0.5" x2="99.5" y2="6" />
                          {/* Bottom-left */}
                          <line x1="0.5" y1="94" x2="0.5" y2="99.5" />
                          <line x1="0.5" y1="99.5" x2="6" y2="99.5" />
                          {/* Bottom-right */}
                          <line x1="99.5" y1="94" x2="99.5" y2="99.5" />
                          <line x1="94" y1="99.5" x2="99.5" y2="99.5" />
                          {/* Mid-edge center strips */}
                          <line x1="47" y1="0.5" x2="53" y2="0.5" />
                          <line x1="47" y1="99.5" x2="53" y2="99.5" />
                          <line x1="0.5" y1="47" x2="0.5" y2="53" />
                          <line x1="99.5" y1="47" x2="99.5" y2="53" />
                        </g>

                        {/* Rule-of-thirds grid */}
                        <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.4">
                          <line x1="0" y1="33.33" x2="100" y2="33.33" />
                          <line x1="0" y1="66.67" x2="100" y2="66.67" />
                          <line x1="33.33" y1="0" x2="33.33" y2="100" />
                          <line x1="66.67" y1="0" x2="66.67" y2="100" />
                        </g>
                      </svg>
                    </div>
                  )}
                  {/* Crop Tool Overlay - controlled by isFreeCropVisible and slider rotation */}
                </div>
                {activeTool === 'crop' && isFreeCropVisible && !isRotating && (
                  <div className="absolute inset-0 z-50 overflow-visible pointer-events-none">
                    <div
                      className="pointer-events-auto"
                      style={{
                        position: 'absolute',
                        width: imgW,
                        height: imgH,
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) ${getImageTransform(currentImage, autoZoomScale)}`,
                        transformOrigin: 'center center'
                      }}
                    >
                      <FourPointCropper
                        ref={fourPointRef}
                        image={currentImage.preview}
                        onCrop={handleCropComplete}
                        containerRef={imageWrapperRef}
                        contentRef={imageRef}
                        showInlineActions={false}
                        useContainerBounds={true}
                        explicitWidth={imgW * autoZoomScale}
                        explicitHeight={imgH * autoZoomScale}
                        rotation={currentImage.rotation}
                        transformScale={autoZoomScale}
                        onChange={setIsCropDirty}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. & 7. BOTTOM UI (Desktop Only) */}
            {!isMobile && (
              <motion.div
                initial={false}
                animate={{
                  height:
                    activeTool === 'crop' ||
                    activeTool === 'brush' ||
                    activeTool === 'eraser'
                      ? '10rem'
                      : 0,
                  opacity:
                    activeTool === 'crop' ||
                    activeTool === 'brush' ||
                    activeTool === 'eraser'
                      ? 1
                      : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-white/8 flex flex-col items-center justify-center z-50 overflow-hidden"
              >
              {activeTool === 'crop' && (
                <>
                  <div className="w-full max-w-xs sm:max-w-sm md:w-96 mb-4 px-4 sm:px-0">
                    <div className="text-center text-xs font-medium text-gray-400 mb-2">
                      {Math.round(rotatePreview)}°
                    </div>
                    <div
                      ref={sliderContainerRef}
                      className="relative h-6 flex items-center group overflow-hidden"
                    >
                      {/* Ticks */}
                      <div
                        className="absolute top-0 bottom-0 flex justify-between px-1 pointer-events-none transition-transform duration-75 will-change-transform"
                        style={{
                          width: '200%',
                          left: '-50%',
                          transform: `translateX(${-rotatePreview * (50 / 45)}%)`
                        }}
                      >
                        {Array.from({ length: 41 }).map((_, i) => {
                          if (i === 20) {
                            return (
                              <div key={i} className="w-px h-3 relative self-center flex items-center justify-center">
                                <span className="absolute text-xs font-semibold text-gray-200">0</span>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className={`w-px ${i % 5 === 0 ? 'h-3 bg-gray-200' : 'h-1.5 bg-gray-600'} self-center`} />
                          );
                        })}
                      </div>

                      {/* Interactive Layer */}
                      <div
                        className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none"
                        onPointerDown={handleSliderPointerDown}
                        onPointerMove={handleSliderPointerMove}
                        onPointerUp={handleSliderPointerUp}
                        onPointerCancel={handleSliderPointerUp}
                      />

                      {/* Hidden Input for A11y */}
                      <input
                        type="range"
                        min={-45}
                        max={45}
                        value={rotatePreview}
                        onChange={() => { }}
                        className="sr-only pointer-events-none"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      {/* Knob */}
                      <div
                        className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full shadow border border-gray-300 pointer-events-none transition-all"
                        style={{ transform: 'translateX(-50%) translateY(-50%)' }}
                      />
                    </div>
                  </div>

                  {/* Mode Label & Icons */}
                  <div className="flex items-center gap-12">
                    {/* Left Icons */}
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleRotate(-90)} className="text-gray-400 hover:text-white transition-colors"><RotateCcw className="w-5 h-5" /></button>
                      <button onClick={() => handleRotate(90)} className="text-gray-400 hover:text-white transition-colors"><RotateCw className="w-5 h-5" /></button>
                    </div>

                    {/* Label */}
                    <button
                      type="button"
                      onClick={() => {
                        // Stay in crop tool and switch to free 4-point mode
                        setIsFreeCropVisible(true);

                        // Always reset rotation to 0 when entering Free crop mode
                        // This ensures we start with a straight image for 4-point cropping
                        if (currentImage.rotation !== 0 || rotatePreview !== 0) {
                          setRotatePreview(0);
                          const newImage = { ...currentImage, rotation: 0 };
                          saveToHistory(newImage);
                        }
                      }}
                      className="text-sm font-medium text-gray-200 hover:text-white focus:outline-none"
                    >
                      Free
                    </button>

                    {/* Right Icons */}
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleFlip('horizontal')} className="text-gray-400 hover:text-white transition-colors"><FlipHorizontal className="w-5 h-5" /></button>
                      <button onClick={() => handleFlip('vertical')} className="text-gray-400 hover:text-white transition-colors"><FlipVertical className="w-5 h-5" /></button>
                    </div>
                  </div>
                </>
              )}

              {activeTool === 'brush' && (
                <div className="w-96 flex flex-col items-center gap-6 px-4 py-2">
                  <div className="w-full flex flex-col gap-2">
                    <div className="text-center text-xs font-medium text-white flex justify-between w-full">
                      <span>Brush Size</span>
                      <span>{brushSize}px</span>
                    </div>
                    <div className="w-full flex items-center gap-4">
                      <span className="text-xs text-white">10</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ 
                          accentColor: brushColor,
                          backgroundColor: '#374151',
                          backgroundImage: `linear-gradient(${brushColor}, ${brushColor})`,
                          backgroundSize: `${((brushSize - 10) / 90) * 100}% 100%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                      <span className="text-xs text-white">100</span>
                    </div>
                  </div>
                  
                  <div className="w-full flex flex-col gap-2">
                    <div className="text-xs font-medium text-white">Brush Color</div>
                    <div className="flex items-center justify-start gap-3 flex-wrap">
                      {/* Preset Colors */}
                      {['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#d946ef'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setBrushColor(c)} 
                          className={`w-8 h-8 rounded-full border-2 ${brushColor === c ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'} transition-all`} 
                          style={{backgroundColor: c}} 
                          title="Preset Color"
                        />
                      ))}
                      {/* Custom Color Picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:scale-105 transition-all outline-none" 
                            title="Custom Color"
                          >
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 pointer-events-none" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-3 bg-[#1e2330] border-white/10 shadow-xl rounded-xl">
                          <HexColorPicker color={brushColor} onChange={setBrushColor} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTool === 'eraser' && (
                <div className="w-96 flex flex-col items-center gap-6 px-4 py-2">
                  <div className="w-full flex flex-col gap-2">
                    <div className="text-center text-xs font-medium text-white flex justify-between w-full">
                      <span>Eraser Size</span>
                      <span>{eraserSize}px</span>
                    </div>
                    <div className="w-full flex items-center gap-4">
                      <span className="text-xs text-white">10</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={eraserSize}
                        onChange={(e) => setEraserSize(parseInt(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-white"
                        style={{
                          backgroundColor: '#374151',
                          backgroundImage: 'linear-gradient(#ffffff, #ffffff)',
                          backgroundSize: `${((eraserSize - 10) / 90) * 100}% 100%`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                      <span className="text-xs text-white">100</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
            )}
          </div>

          {/* TOOL PANEL: ADJUST — right sidebar on desktop, bottom sheet on mobile */}
          {activeTool === 'adjust' && !isMobile && (
            <div className="sm:w-[340px] w-full sm:max-h-full max-h-[45vh] bg-white/6 sm:border-l border-t border-white/20 flex flex-col overflow-y-auto p-5 shadow-[-4px_0_24px_rgba(15,23,42,0.35)] z-10">
              {adjustGroups.map((group) => (
                <div key={group.title} className="mb-8 last:mb-0">
                  <h3 className="text-sm font-semibold text-white mb-4">{group.title}</h3>
                  <div className="space-y-6">
                    {group.controls.map((control) => (
                      <div key={control.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <control.icon className="w-4 h-4 text-white" />
                            <label className="text-xs font-medium text-white">
                              {control.name}
                            </label>
                          </div>
                          <span className="text-xs text-white font-mono">
                            {Math.round(currentImage.filters[control.id as keyof ImageFile['filters']] as number || 0)}
                          </span>
                        </div>
                        <CenteredSlider
                          value={[currentImage.filters[control.id as keyof ImageFile['filters']] as number || 0]}
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          onValueChange={([val]) => updateFilter(control.id as keyof ImageFile['filters'], val)}
                          className="py-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Apply to All Button */}
              {onApplyToAll && (
                <div className="mt-6 pt-6 border-t border-white/15 space-y-3">
                  <button
                    onClick={isAppliedToAll ? handleResetAllClick : handleApplyToAllClick}
                    disabled={applyToAllFeedback || resetAllFeedback}
                    className={`w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-3 flex items-center justify-center gap-2 transition-all group shadow-sm text-sm font-medium ${applyToAllFeedback ? 'text-green-500' :
                      resetAllFeedback ? 'text-red-400' :
                        isAppliedToAll ? 'text-red-400' : 'text-gray-200'
                      }`}
                  >
                    {applyToAllFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Applied to All!
                      </>
                    ) : resetAllFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-red-400" />
                        Removed from All!
                      </>
                    ) : isAppliedToAll ? (
                      <>
                        <RotateCw className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                        Remove from All
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        Apply to All
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-500 text-center mt-2">
                    {isAppliedToAll ? "Remove adjustments from all images" : "Apply current adjustments to all images"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TOOL PANEL: FILTERS — right sidebar on desktop, bottom sheet on mobile */}
          {activeTool === 'filters' && !isMobile && (
            <div className="sm:w-[340px] w-full sm:max-h-full max-h-[45vh] bg-white/6 sm:border-l border-t border-white/20 flex flex-col overflow-y-auto p-5 shadow-[-4px_0_24px_rgba(15,23,42,0.35)] z-10">
              {/* Auto Enhance Card */}
              <div className="mb-6">
                <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 flex items-center justify-center gap-3 transition-all group shadow-sm">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-transform">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-200">Auto Enhance</span>
                </button>
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-3 gap-3">
                {filterPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      applyFilter(preset.name);
                      setSelectedFilterName(preset.name);
                    }}
                    className="group relative flex flex-col items-center gap-2"
                  >
                    <div className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedFilterName === preset.name ? 'border-transparent ring-2 ring-white/20' : 'border-transparent group-hover:border-white/20'}`}>
                      <img
                        src={currentImage.preview}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        style={{
                          filter: [
                            `brightness(${100 + preset.filters.brightness}%)`,
                            `contrast(${100 + preset.filters.contrast}%)`,
                            `saturate(${100 + preset.filters.saturation}%)`,
                            `blur(${preset.filters.blur}px)`,
                            `sepia(${preset.filters.sepia}%)`,
                            `grayscale(${preset.filters.grayscale}%)`,
                            `hue-rotate(${preset.filters.hueRotate}deg)`,
                            `invert(${preset.filters.invert}%)`
                          ].join(' ')
                        }}
                      />

                      {/* Selection Overlay */}
                      {selectedFilterName === preset.name && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <Check className="w-6 h-6 text-white drop-shadow-md" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${selectedFilterName === preset.name ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Apply to All Button */}
              {onApplyToAll && (
                <div className="mt-6 pt-6 border-t border-white/15 space-y-3">
                  <button
                    onClick={isAppliedToAll ? handleResetAllClick : handleApplyToAllClick}
                    disabled={applyToAllFeedback || resetAllFeedback}
                    className={`w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-3 flex items-center justify-center gap-2 transition-all group shadow-sm text-sm font-medium ${
                      applyToAllFeedback
                        ? 'text-emerald-400'
                        : resetAllFeedback
                          ? 'text-red-400'
                          : isAppliedToAll
                            ? 'text-red-400'
                            : 'text-gray-200'
                    }`}
                  >
                    {applyToAllFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Applied to All!
                      </>
                    ) : resetAllFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-red-400" />
                        Removed from All!
                      </>
                    ) : isAppliedToAll ? (
                      <>
                        <RotateCw className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                        Remove from All
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        Apply to All
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    {isAppliedToAll ? "Remove filters from all images" : "Apply current filters to all images"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- MOBILE BOTTOM UI (Google Photos Style) --- */}
        {isMobile && (
          <div className="flex flex-col w-full flex-none bg-black/40 backdrop-blur-2xl border-t border-white/10 pb-4 pt-1 z-50 select-none">
            {/* LEVEL 3: ACTIVE SLIDER (only when a tool with slider is active) */}
            <div
              className={`px-6 flex items-center justify-center w-full ${
                activeTool === 'adjust' ||
                activeTool === 'crop' ||
                activeTool === 'brush' ||
                activeTool === 'eraser'
                  ? 'py-2 min-h-[64px]'
                  : 'py-0 min-h-0'
              }`}
            >
              {activeTool === 'adjust' && activeAdjustTool && (
                <div className="w-full max-w-sm flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-mono w-8 text-right">
                    {Math.round(currentImage.filters[activeAdjustTool as keyof ImageFile['filters']] as number || 0)}
                  </span>
                  {(() => {
                    const control = allAdjustControls.find(c => c.id === activeAdjustTool);
                    const min = control?.min ?? -100;
                    const max = control?.max ?? 100;
                    const step = control?.step ?? 1;
                    const value = currentImage.filters[activeAdjustTool as keyof ImageFile['filters']] as number || 0;
                    return (
                  <CenteredSlider
                    value={[value]}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={([val]) => updateFilter(activeAdjustTool as keyof ImageFile['filters'], val)}
                    className="flex-1"
                  />
                    );
                  })()}
                </div>
              )}
              {activeTool === 'crop' && (
                <div className="w-full max-w-xs">
                  <div className="text-center text-[10px] font-medium text-gray-400 mb-1">
                    {Math.round(rotatePreview)}°
                  </div>
                  <div ref={sliderContainerRef} className="relative h-6 flex items-center group overflow-hidden">
                    {/* Ticks */}
                    <div
                      className="absolute top-0 bottom-0 flex justify-between px-1 pointer-events-none transition-transform duration-75 will-change-transform"
                      style={{
                        width: '200%',
                        left: '-50%',
                        transform: `translateX(${-rotatePreview * (50 / 45)}%)`
                      }}
                    >
                      {Array.from({ length: 41 }).map((_, i) => (
                        <div key={i} className={`w-px ${i === 20 ? 'h-3 bg-white' : i % 5 === 0 ? 'h-3 bg-gray-400' : 'h-1.5 bg-gray-600'} self-center relative flex items-center justify-center`}>
                          {i === 20 && <span className="absolute -top-4 text-xs font-semibold text-white">0</span>}
                        </div>
                      ))}
                    </div>
                    {/* Interactive Layer */}
                    <div
                      className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none"
                      onPointerDown={handleSliderPointerDown}
                      onPointerMove={handleSliderPointerMove}
                      onPointerUp={handleSliderPointerUp}
                      onPointerCancel={handleSliderPointerUp}
                    />
                    <input type="range" min={-45} max={45} value={rotatePreview} onChange={() => { }} className="sr-only" aria-hidden="true" tabIndex={-1} />
                    {/* Knob */}
                    <div
                      className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full shadow border border-gray-300 pointer-events-none transition-all"
                      style={{ transform: 'translateX(-50%) translateY(-50%)' }}
                    />
                  </div>
                </div>
              )}
              {activeTool === 'brush' && (
                <div className="w-full max-w-xs flex items-center gap-4">
                  <span className="text-xs text-gray-500">10</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none"
                    style={{ 
                      accentColor: brushColor,
                      backgroundColor: '#1f2937',
                      backgroundImage: `linear-gradient(${brushColor}, ${brushColor})`,
                      backgroundSize: `${((brushSize - 10) / 90) * 100}% 100%`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                  <span className="text-xs text-gray-500">100</span>
                </div>
              )}
              {activeTool === 'eraser' && (
                <div className="w-full max-w-xs flex items-center gap-4">
                  <span className="text-xs text-gray-500">10</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(parseInt(e.target.value))}
                    className="flex-1 accent-white h-1 rounded-full appearance-none"
                    style={{ 
                      backgroundColor: '#1f2937',
                      backgroundImage: `linear-gradient(#ffffff, #ffffff)`,
                      backgroundSize: `${((eraserSize - 10) / 90) * 100}% 100%`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                  <span className="text-xs text-gray-500">100</span>
                </div>
              )}
            </div>

            {/* LEVEL 2: SUB-TOOLS (only visible for active tool) */}
            <div
              className={`flex items-center overflow-x-auto no-scrollbar px-4 gap-4 w-full transition-all ${
                activeTool === 'filters' ||
                activeTool === 'adjust' ||
                activeTool === 'brush' ||
                activeTool === 'crop'
                  ? 'h-[76px] border-b border-white/5 pb-2'
                  : 'h-0 border-b-0 pb-0'
              } ${
                activeTool === 'filters' || activeTool === 'adjust' || activeTool === 'brush'
                  ? 'justify-start'
                  : 'justify-center'
              }`}
            >
              {activeTool === 'brush' && (
                <div className="flex items-center gap-4 px-2">
                  {/* Preset Colors */}
                  {['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#d946ef'].map(c => (
                    <button 
                      key={c} 
                      onClick={() => setBrushColor(c)} 
                      className={`w-8 h-8 flex-shrink-0 rounded-full border-2 ${brushColor === c ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'} transition-all`} 
                      style={{backgroundColor: c}} 
                      title="Preset Color"
                    />
                  ))}
                  {/* Custom Color Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border-2 border-transparent hover:scale-105 transition-all outline-none" 
                        title="Custom Color"
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 pointer-events-none" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-auto p-3 bg-[#1e2330] border-white/10 shadow-xl rounded-xl">
                      <HexColorPicker color={brushColor} onChange={setBrushColor} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {activeTool === 'adjust' && allAdjustControls.map(control => (
                <button
                  key={control.id}
                  onClick={() => setActiveAdjustTool(control.id)}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeAdjustTool === control.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>
                    <control.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium ${activeAdjustTool === control.id ? 'text-white' : 'text-gray-500'}`}>
                    {control.name}
                  </span>
                </button>
              ))}

              {activeTool === 'filters' && filterPresets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    applyFilter(preset.name);
                    setSelectedFilterName(preset.name);
                  }}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                >
                  <div className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${selectedFilterName === preset.name ? 'border-white' : 'border-transparent'}`}>
                    <img
                      src={currentImage.preview}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      style={{
                        filter: [
                          `brightness(${100 + preset.filters.brightness}%)`,
                          `contrast(${100 + preset.filters.contrast}%)`,
                          `saturate(${100 + preset.filters.saturation}%)`,
                          `blur(${preset.filters.blur}px)`,
                          `sepia(${preset.filters.sepia}%)`,
                          `grayscale(${preset.filters.grayscale}%)`,
                          `hue-rotate(${preset.filters.hueRotate}deg)`,
                          `invert(${preset.filters.invert}%)`
                        ].join(' ')
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${selectedFilterName === preset.name ? 'text-white' : 'text-gray-500'}`}>
                    {preset.name}
                  </span>
                </button>
              ))}

              {activeTool === 'crop' && (
                <>
                  <button onClick={() => { 
                    setIsFreeCropVisible(true);
                    if (currentImage.rotation !== 0 || rotatePreview !== 0) {
                      setRotatePreview(0);
                      saveToHistory({ ...currentImage, rotation: 0 });
                    }
                  }} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400"><Crop className="w-5 h-5" /></div>
                    <span className="text-[10px] font-medium text-gray-500">Free</span>
                  </button>
                  <button onClick={() => handleRotate(-90)} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400"><RotateCcw className="w-5 h-5" /></div>
                    <span className="text-[10px] font-medium text-gray-500">-90°</span>
                  </button>
                  <button onClick={() => handleRotate(90)} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400"><RotateCw className="w-5 h-5" /></div>
                    <span className="text-[10px] font-medium text-gray-500">+90°</span>
                  </button>
                  <button onClick={() => handleFlip('horizontal')} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400"><FlipHorizontal className="w-5 h-5" /></div>
                    <span className="text-[10px] font-medium text-gray-500">Mirror</span>
                  </button>
                  <button onClick={() => handleFlip('vertical')} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-gray-400"><FlipVertical className="w-5 h-5" /></div>
                    <span className="text-[10px] font-medium text-gray-500">Flip</span>
                  </button>
                </>
              )}
            </div>

            {/* LEVEL 1: MAIN TOOLS TABS */}
            <div className="h-14 flex items-center justify-center overflow-x-auto no-scrollbar gap-1.5 px-3 mt-1 min-h-[56px] min-w-full">
              {[
                { id: 'crop', label: 'Crop' },
                { id: 'filters', label: 'Filters' },
                { id: 'adjust', label: 'Adjust' },
                { id: 'brush', label: 'Brush' },
                { id: 'eraser', label: 'Eraser' }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolChange(tool.id as Tool)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${activeTool === tool.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
