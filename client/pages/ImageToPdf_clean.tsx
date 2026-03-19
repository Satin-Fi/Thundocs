import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  Download,
  Plus,
  Grid,
  Layout,
  FileText,
  Move,
  Monitor,
  RotateCw,
  ChevronDown,
} from "lucide-react";
import { UploadingRing } from "@/components/UploadingRing";
import { useDropzone } from "react-dropzone";
import ImageReorderGrid from "./ImageReorderGrid";
import ImageEditor from "@/components/ImageEditor";
import ToolNavbar from "@/components/ToolNavbar";
import { getImageFilter } from "@/utils/imageUtils";
import SplitDownloadCard from "@/components/SplitDownloadCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { LightningBackground } from "@/components/LightningBackground";


interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  width: number;
  height: number;
  rotation: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    highlights: number;
    shadows: number;
    blur: number;
    sepia: number;
    warmth: number;
    tint: number;
    vignette: number;
    grayscale: number;
    hueRotate: number;
    invert: number;
    sharpness: number;
    gamma?: number;
    vibrance?: number;
  };
  activeFilter?: string;
  effects?: {
    vignette?: number;
    noise?: number;
    pixelate?: number;
    duotone?: string;
    vintage?: boolean;
    dramatic?: boolean;
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: string;
  };
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
    color: string;
    position: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  };
}



interface PageSettings {
  orientation: "portrait" | "landscape";
  size: "A4" | "Legal" | "Letter" | "Fit";
  margin: number;
}



const defaultFilters: ImageFile["filters"] = {
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
  gamma: 1,
  vibrance: 0,
};

const defaultEffects: Required<ImageFile>["effects"] = {
  vignette: 0,
  noise: 0,
  pixelate: 0,
  duotone: '',
  vintage: false,
  dramatic: false,
};




export default function ImageToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const interactionTimerRef = useRef<number | null>(null);
  const [isSorting, setIsSorting] = useState(false);

  const [pageSettings, setPageSettings] = useState<PageSettings>({
    orientation: "portrait",
    size: "A4",
    margin: 20,
  });
  const [thumbnailSize, setThumbnailSize] = useState<"small" | "medium" | "large">("small");
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [downloadSizeLabel, setDownloadSizeLabel] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showPageSettingsMobile, setShowPageSettingsMobile] = useState(false);

  const normalizePageSize = (size: PageSettings["size"]) => {
    if (size === "A4" || size === "Legal" || size === "Letter" || size === "Fit") return size;
    return "A4";
  };

  const getPdfFormat = (size: PageSettings["size"]) => {
    const normalized = normalizePageSize(size);
    return normalized.toLowerCase() as "a4" | "legal" | "letter" | "fit";
  };

  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });

  const renderImageForPdf = async (img: ImageFile) => {
    const imageEl = await loadImageElement(img.preview);
    const rotation = ((img.rotation ?? 0) % 360 + 360) % 360;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const width = imageEl.naturalWidth || imageEl.width;
    const height = imageEl.naturalHeight || imageEl.height;
    const canvasWidth = Math.ceil(width * cos + height * sin);
    const canvasHeight = Math.ceil(width * sin + height * cos);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const filter = getImageFilter({ filters: img.filters, activeFilter: img.activeFilter }, false).replace(/\s*url\([^)]+\)/g, "");
    ctx.filter = filter;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(radians);
    ctx.scale(img.flipHorizontal ? -1 : 1, img.flipVertical ? -1 : 1);
    ctx.drawImage(imageEl, -width / 2, -height / 2, width, height);

    return canvas.toDataURL("image/jpeg", 0.92);
  };


  const [isProcessing, setIsProcessing] = useState(false);
  const [inlineEditorOpen, setInlineEditorOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  // Optimized batch reordering function for drag operations
  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    setImages((prev) => {
      if (fromIndex >= prev.length || toIndex > prev.length) return prev;

      const newImages = [...prev];
      const [movedItem] = newImages.splice(fromIndex, 1);

      // Insert at the target position
      newImages.splice(toIndex, 0, movedItem);

      return newImages;
    });
  }, []);

  // Enhanced keyboard navigation for Image Hopper functionality
  const [focusedImageIndex, setFocusedImageIndex] = useState<number | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  // Define removeImage function before useEffect that uses it
  const removeImage = useCallback((imageId: string) => {
    const removed = images.find((img) => img.id === imageId);
    if (removed) {
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
      setInteractionMessage(`Removed "${removed.name}"`);
      interactionTimerRef.current = window.setTimeout(() => {
        setInteractionMessage(null);
      }, 1500);
    }
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, [images]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field or dialog
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.closest('[role="dialog"]'))) {
        return;
      }

      // Image Hopper keyboard navigation
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setIsKeyboardMode(true);
          if (focusedImageIndex === null) {
            setFocusedImageIndex(0);
          } else if (focusedImageIndex > 0) {
            if (e.ctrlKey || e.metaKey) {
              // Move image left
              reorderImages(focusedImageIndex, focusedImageIndex - 1);
              setFocusedImageIndex(focusedImageIndex - 1);
            } else {
              // Navigate left
              setFocusedImageIndex(focusedImageIndex - 1);
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          setIsKeyboardMode(true);
          if (focusedImageIndex === null) {
            setFocusedImageIndex(0);
          } else if (focusedImageIndex < images.length - 1) {
            if (e.ctrlKey || e.metaKey) {
              // Move image right
              reorderImages(focusedImageIndex, focusedImageIndex + 1);
              setFocusedImageIndex(focusedImageIndex + 1);
            } else {
              // Navigate right
              setFocusedImageIndex(focusedImageIndex + 1);
            }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          setIsKeyboardMode(true);
          if (focusedImageIndex === null) {
            setFocusedImageIndex(0);
          } else {
            // Navigate up in grid (move 4 positions left for 4-column grid)
            const newIndex = Math.max(0, focusedImageIndex - 4);
            setFocusedImageIndex(newIndex);
          }
          break;

        case 'ArrowDown':
          if (focusedImageIndex === null) {
            setFocusedImageIndex(0);
          } else {
            // Navigate down in grid (move 4 positions right for 4-column grid)
            const newIndex = Math.min(images.length - 1, focusedImageIndex + 4);
            setFocusedImageIndex(newIndex);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedImageIndex !== null && images[focusedImageIndex]) {
            setEditingImageId(images[focusedImageIndex].id);
            setInlineEditorOpen(true);
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (focusedImageIndex !== null && images[focusedImageIndex]) {
            removeImage(images[focusedImageIndex].id);
            // Adjust focus after deletion
            if (focusedImageIndex >= images.length - 1) {
              setFocusedImageIndex(Math.max(0, images.length - 2));
            }
          }
          break;

        case 'Home':
          e.preventDefault();
          setIsKeyboardMode(true);
          setFocusedImageIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setIsKeyboardMode(true);
          setFocusedImageIndex(images.length - 1);
          break;

        case 'Escape':
          setFocusedImageIndex(null);
          setIsKeyboardMode(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedImageIndex, images, reorderImages, removeImage]);

  // Reset focus when images change
  useEffect(() => {
    if (focusedImageIndex !== null && focusedImageIndex >= images.length) {
      setFocusedImageIndex(images.length > 0 ? images.length - 1 : null);
    }
  }, [images.length, focusedImageIndex]);

  // Mouse interaction resets keyboard mode
  const handleMouseInteraction = useCallback(() => {
    setIsKeyboardMode(false);
    setFocusedImageIndex(null);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);

    const newImages: ImageFile[] = await Promise.all(acceptedFiles.map(async (file) => {
      const id = Math.random().toString(36).substring(7);
      const preview = URL.createObjectURL(file);
      let width = 0;
      let height = 0;
      try {
        const imgEl = await loadImageElement(preview);
        width = imgEl.naturalWidth || imgEl.width;
        height = imgEl.naturalHeight || imgEl.height;
      } catch {
      }

      return {
        id,
        file,
        preview,
        name: file.name,
        size: file.size,
        width,
        height,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        filters: { ...defaultFilters },
        effects: { ...defaultEffects },
      };
    }));

    setImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);
  }, [loadImageElement]);

  useEffect(() => {
    return () => {
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, []);

  // Debug function to get current image order (similar to reference document)
  const logImageOrder = useCallback(() => {
    const order = images.map((img, index) => ({
      index: index + 1,
      name: img.name,
      id: img.id,
      size: `${(img.size / 1024 / 1024).toFixed(1)}MB`
    }));
    console.log('Current Image Order:', order);
    return order;
  }, [images]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp", ".webp"],
    },
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled: isSorting,
  });

  const handleImageDoubleClick = (imageId: string) => {
    setEditingImageId(imageId);
    setInlineEditorOpen(true);
    const img = images.find((item) => item.id === imageId);
    if (img) {
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
      setInteractionMessage(`Editing "${img.name}"`);
      interactionTimerRef.current = window.setTimeout(() => {
        setInteractionMessage(null);
      }, 1500);
    }
  };



  const handleInlineEditorSave = (updatedImage: ImageFile) => {
    setImages(prev => prev.map(img =>
      img.id === updatedImage.id ? updatedImage : img
    ));
  };

  const handleApplyToAll = (sourceImage: ImageFile) => {
    setImages(prev => prev.map(img =>
      img.id === sourceImage.id
        ? sourceImage
        : {
          ...img,
          filters: { ...sourceImage.filters },
          activeFilter: sourceImage.activeFilter
        }
    ));
  };

  const handleResetAll = () => {
    setImages(prev => prev.map(img => ({
      ...img,
      filters: { ...defaultFilters },
      activeFilter: undefined
    })));
  };

  const handleClearAllImages = () => {
    setImages([]);
    setSelectedImageId(null);
    setDownloadUrl(null);
    setDownloadName(null);
    setDownloadSizeLabel(null);
    setConversionError(null);
    setInlineEditorOpen(false);
    setEditingImageId(null);
  };

  const handleRotateAll = () => {
    setImages(prev => prev.map(img => ({
      ...img,
      rotation: img.rotation + 90
    })));
  };

  const handleInlineEditorCancel = () => {
    setInlineEditorOpen(false);
    setEditingImageId(null);
  };

  const formatSizeLabel = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    }
    const kb = Math.max(bytes / 1024, 1);
    return `${kb.toFixed(1)} KB`;
  };



  return (
    <LightningBackground className="text-white font-sans selection:bg-cyan-500/30">
      <ToolNavbar />

      <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center min-h-[90vh]">
        <div className="w-full max-w-6xl space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              Image to PDF
            </h1>
            <p className="text-lg text-blue-100/60 max-w-lg mx-auto">
              Convert images into a clean, shareable PDF in seconds.
            </p>
          </div>
          <input {...getInputProps()} className="sr-only" />

          {downloadUrl && (
            <div className="flex justify-center mt-8">
              <SplitDownloadCard
                title="Your PDF has been created from images"
                primaryLabel="Download PDF"
                downloadUrl={downloadUrl}
                onDownload={() => {
                  const a = document.createElement("a");
                  a.href = downloadUrl;
                  a.download = downloadName || "converted - Thundocs.pdf";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                contextLabel="Converted"
                sizeLabel={downloadSizeLabel || undefined}
              />
            </div>
          )}

          {!downloadUrl && images.length === 0 && !isUploading && (
            <div className="flex justify-center w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex justify-center"
              >
                <div
                  {...getRootProps()}
                  className={`split-upload-card ${isDragActive ? "drag-active" : ""}`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 15,
                        background: "rgba(255,255,255,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "1rem",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>

                    <h3
                      style={{
                        marginBottom: "0.5rem",
                        fontWeight: 600,
                        fontSize: "1.25rem",
                        color: "#111827",
                      }}
                    >
                      {isDragActive ? "Drop files here" : "Images to PDF"}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                      JPG, PNG, BMP, WebP, GIF • drag & drop or click
                    </p>

                    <button
                      type="button"
                      className="btn-main outline-none focus:outline-none focus:ring-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                    >
                      Select Images
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {!downloadUrl && isUploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UploadingRing label="Uploading images..." />
            </motion.div>
          )}

          {!downloadUrl && images.length > 0 && (
            isProcessing ? (
              <UploadingRing label="Converting images to PDF..." />
            ) : (
            <>
              <div className="grid gap-6 md:grid-cols-[220px_1fr] items-start">
                <div className="space-y-3">
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setShowPageSettingsMobile((prev) => !prev)}
                      className="w-full flex items-center justify-between rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 text-xs font-medium text-[#FFFFFF] transition-all"
                    >
                      <span>Page Settings</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showPageSettingsMobile ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}

                  {(!isMobile || showPageSettingsMobile) && (
                    <div
                      className="glass-panel rounded-2xl p-4 space-y-4"
                      style={{
                        boxShadow:
                          "-1.5px -1.5px 2px -2px var(--white, rgba(255, 255, 255, 1)), 5px 5px 30px rgba(0, 0, 0, 0.2)",
                        border: "0.5px solid",
                        borderColor:
                          "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.3) transparent rgba(255, 255, 255, 0.3)",
                        backgroundImage:
                          "linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))",
                      }}
                    >
                      <div>
                        <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide">
                          Page Settings
                        </p>
                        <p className="text-xs text-[#FFFFFF] mt-1">Layout controls</p>
                      </div>

                      <div className="space-y-3">
                    <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide flex items-center gap-2">
                      <Layout className="w-3.5 h-3.5 text-[#FFFFFF]" />
                      Orientation
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setPageSettings((prev) => ({ ...prev, orientation: "portrait" }))}
                        className={`rounded-xl border px-3 py-2 text-xs transition-all outline-none focus:outline-none focus:ring-0 ${pageSettings.orientation === "portrait"
                          ? "bg-cyan-500/15 border-cyan-400/40 text-[#FFFFFF]"
                          : "bg-white/5 border-white/10 text-[#FFFFFF] hover:bg-white/10 hover:text-[#FFFFFF]"
                          }`}
                      >
                        Portrait
                      </button>
                      <button
                        onClick={() => setPageSettings((prev) => ({ ...prev, orientation: "landscape" }))}
                        className={`rounded-xl border px-3 py-2 text-xs transition-all outline-none focus:outline-none focus:ring-0 ${pageSettings.orientation === "landscape"
                          ? "bg-cyan-500/15 border-cyan-400/40 text-[#FFFFFF]"
                          : "bg-white/5 border-white/10 text-[#FFFFFF] hover:bg-white/10 hover:text-[#FFFFFF]"
                          }`}
                      >
                        Landscape
                      </button>
                    </div>
                      </div>

                      <div className="space-y-2">
                    <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#FFFFFF]" />
                      Page Size
                    </p>
                    <Select
                      value={pageSettings.size}
                      onValueChange={(value) =>
                        setPageSettings((prev) => ({
                          ...prev,
                          size: value as PageSettings["size"],
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 border-white/15 bg-white/5 text-xs text-[#FFFFFF]">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-[#FFFFFF] rounded-2xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)]">
                        <SelectItem value="A4" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          A4
                        </SelectItem>
                        <SelectItem value="Legal" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Legal
                        </SelectItem>
                        <SelectItem value="Letter" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Letter
                        </SelectItem>
                        <SelectItem value="Fit" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Fit to Image
                        </SelectItem>
                      </SelectContent>
                    </Select>
                      </div>

                      <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide flex items-center gap-2">
                        <Move className="w-3.5 h-3.5 text-[#FFFFFF]" />
                        Margin
                      </p>
                      <span className="text-xs text-[#FFFFFF]">{pageSettings.margin}px</span>
                    </div>
                    <Slider
                      value={[pageSettings.margin]}
                      onValueChange={([value]) =>
                        setPageSettings((prev) => ({ ...prev, margin: value }))
                      }
                      max={100}
                      min={0}
                      step={5}
                    />
                    <div className="flex justify-between gap-2 pt-1">
                      {[
                        { label: "No margin", value: 0 },
                        { label: "Default", value: 20 },
                        { label: "Print safe", value: 35 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setPageSettings((prev) => ({ ...prev, margin: preset.value }))}
                          className={`text-[8px] px-1.5 py-0.5 rounded transition-colors outline-none focus:outline-none focus:ring-0 ${pageSettings.margin === preset.value
                            ? "text-[#FFFFFF] bg-cyan-500/10 border border-cyan-500/20"
                            : "text-[#FFFFFF] hover:bg-white/5"
                            }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                      </div>

                      <div className="space-y-2">
                    <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide">Thumbnail Size</p>
                    <Select value={thumbnailSize} onValueChange={(value) => setThumbnailSize(value as typeof thumbnailSize)}>
                      <SelectTrigger className="h-9 border-white/15 bg-white/5 text-xs text-[#FFFFFF]">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-[#FFFFFF] rounded-2xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)]">
                        <SelectItem value="small" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Small
                        </SelectItem>
                        <SelectItem value="medium" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Medium
                        </SelectItem>
                        <SelectItem value="large" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-cyan-500/15 data-[state=checked]:text-[#FFFFFF]">
                          Large
                        </SelectItem>
                      </SelectContent>
                    </Select>
                      </div>

                      <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleRotateAll}
                      className="w-full h-9 text-xs border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-[#FFFFFF] hover:text-[#FFFFFF] transition-all flex items-center justify-center gap-2 outline-none focus:outline-none focus-visible:ring-0"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rotate All Images
                    </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div 
                    className="glass-panel rounded-2xl p-6"
                    style={{
                      boxShadow: "-1.5px -1.5px 2px -2px var(--white, rgba(255, 255, 255, 1)), 5px 5px 30px rgba(0, 0, 0, 0.2)",
                      border: "0.5px solid",
                      borderColor: "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.3) transparent rgba(255, 255, 255, 0.3)",
                      backgroundImage: "linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))"
                    }}
                  >
                    {conversionError && (
                      <div className="mb-4 text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2">
                        {conversionError}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-[#FFFFFF] uppercase tracking-wide">Images Ready</p>
                        <p className="text-sm text-[#FFFFFF]">{images.length} {images.length === 1 ? "image" : "images"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          onClick={handleClearAllImages}
                          className="h-9 px-3 text-xs text-[#FFFFFF] hover:text-[#FFFFFF] hover:bg-white/10 outline-none focus:outline-none focus-visible:ring-0"
                        >
                          Clear all
                        </Button>
                        <Button
                          className="bg-white/10 backdrop-blur-md border border-white/20 text-white h-10 px-6 rounded-xl font-medium uppercase tracking-[0.2em] text-xs shadow-xl hover:shadow-white/10 hover:border-white/40 transition-all hover:scale-105 active:scale-95 outline-none focus:outline-none focus-visible:ring-0"
                          disabled={isProcessing || images.length === 0}
                          onClick={async () => {
                            setIsProcessing(true);
                            setConversionError(null);
                            try {
                              const { jsPDF } = await import("jspdf");
                              const doc = new jsPDF({
                                orientation: pageSettings.orientation,
                                unit: "mm",
                                format: getPdfFormat(pageSettings.size),
                              });

                              for (let i = 0; i < images.length; i++) {
                                const img = images[i];
                                if (i > 0) doc.addPage();

                                const imgData = await renderImageForPdf(img);

                                const pageWidth = doc.internal.pageSize.getWidth();
                                const pageHeight = doc.internal.pageSize.getHeight();
                                const margin = pageSettings.margin;
                                const availableWidth = pageWidth - margin * 2;
                                const availableHeight = pageHeight - margin * 2;

                                const imgProps = doc.getImageProperties(imgData);
                                const imgRatio = imgProps.width / imgProps.height;

                                let finalWidth = availableWidth;
                                let finalHeight = availableWidth / imgRatio;

                                if (finalHeight > availableHeight) {
                                  finalHeight = availableHeight;
                                  finalWidth = availableHeight * imgRatio;
                                }

                                const x = margin + (availableWidth - finalWidth) / 2;
                                const y = margin + (availableHeight - finalHeight) / 2;

                                doc.addImage(imgData, "JPEG", x, y, finalWidth, finalHeight, undefined, "FAST");
                              }

                              const fileName = "converted - Thundocs.pdf";
                              const pdfBlob = doc.output("blob") as Blob;
                              if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                              const url = URL.createObjectURL(pdfBlob);
                              setDownloadUrl(url);
                              setDownloadName(fileName);
                              setDownloadSizeLabel(formatSizeLabel(pdfBlob.size));

                              const a = document.createElement("a");
                              a.href = url;
                              a.download = fileName;
                              a.click();
                            } catch (error) {
                              console.error("Error generating PDF:", error);
                              setConversionError("Failed to generate PDF. Please try again.");
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                        >
                          Convert to PDF
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div
                    {...getRootProps()}
                    className={`glass-panel rounded-2xl p-6 space-y-6 transition-all relative outline-none focus:outline-none focus:ring-0 ${isDragActive ? "ring-1 ring-white/20" : ""}`}
                    style={{
                      boxShadow: "-1.5px -1.5px 2px -2px var(--white, rgba(255, 255, 255, 1)), 5px 5px 30px rgba(0, 0, 0, 0.2)",
                      border: "0.5px solid",
                      borderColor: "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.3) transparent rgba(255, 255, 255, 0.3)",
                      backgroundImage: "linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))"
                    }}
                  >
                    {isDragActive && !isSorting && (
                      <div className="absolute inset-0 rounded-2xl backdrop-blur-md bg-black/30 flex items-center justify-center text-sm text-[#FFFFFF] pointer-events-none z-20">
                        Drop it like it's hot
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                          <Grid className="h-5 w-5 text-cyan-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#FFFFFF]">Image Gallery</h3>
                          <p className="text-sm text-[#FFFFFF]">
                            {images.length} {images.length === 1 ? "image" : "images"} ready for conversion
                          </p>
                          {interactionMessage && (
                            <p className="text-xs text-[#FFFFFF] mt-1" aria-live="polite">
                              {interactionMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={open}
                          className="h-9 w-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center transition-all shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 outline-none focus:outline-none focus:ring-0"
                          aria-label="Add more images"
                        >
                          <Plus className="h-5 w-5 text-cyan-300" />
                        </motion.button>
                      </div>
                    </div>

                    <div aria-live="polite" aria-atomic="true" className="sr-only">
                      {isKeyboardMode && focusedImageIndex !== null && (
                        `Image ${focusedImageIndex + 1} of ${images.length} focused. ${images[focusedImageIndex]?.name}`
                      )}
                    </div>

                    <ImageReorderGrid
                      images={images.map((img) => ({
                        id: img.id,
                        url: img.preview,
                        name: img.name,
                        width: img.width,
                        height: img.height,
                        filters: img.filters,
                        activeFilter: img.activeFilter,
                        rotation: img.rotation,
                        flipHorizontal: img.flipHorizontal,
                        flipVertical: img.flipVertical,
                      }))}
                      onReorder={(newOrder) => {
                        setImages((prev) => newOrder.map((o) => prev.find((img) => img.id === o.id)!));
                      }}
                      onDelete={removeImage}
                      onEdit={handleImageDoubleClick}
                      onSelect={(imageId) => {
                        setSelectedImageId(imageId);
                      }}
                      selectedId={selectedImageId}
                      onSortStart={() => setIsSorting(true)}
                      onSortEnd={() => setIsSorting(false)}
                      pageSettings={pageSettings}
                      thumbnailSize={thumbnailSize}
                    />
                  </div>
                </div>
              </div>
            </>
            )
          )}
        </div>
      </div>

      {/* Image Editor */}
      {inlineEditorOpen && editingImageId && (
        <ImageEditor
          image={images.find(img => img.id === editingImageId)!}
          isOpen={inlineEditorOpen}
          onClose={handleInlineEditorCancel}
          onSave={handleInlineEditorSave}
          onApplyToAll={handleApplyToAll}
          onResetAll={handleResetAll}
          onNext={() => {
            const currentIndex = images.findIndex(img => img.id === editingImageId);
            if (currentIndex < images.length - 1) {
              setEditingImageId(images[currentIndex + 1].id);
            }
          }}
          onPrevious={() => {
            const currentIndex = images.findIndex(img => img.id === editingImageId);
            if (currentIndex > 0) {
              setEditingImageId(images[currentIndex - 1].id);
            }
          }}
          hasNext={images.findIndex(img => img.id === editingImageId) < images.length - 1}
          hasPrevious={images.findIndex(img => img.id === editingImageId) > 0}
          currentIndex={images.findIndex(img => img.id === editingImageId)}
          totalImages={images.length}
        />
      )}
  </LightningBackground>
  );
}
