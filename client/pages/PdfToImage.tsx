import React, { useState, useCallback, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ConvertedImage {
  page: number;
  objectUrl: string;
  width: number;
  height: number;
  blob: Blob;
}

export default function PdfToImagePage() {
  const { isNight, setTheme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Options
  const [format, setFormat] = useState<"png" | "jpeg">("jpeg");
  const [scale, setScale] = useState("1.5");
  const [mode, setMode] = useState<"all" | "specific">("all");
  const [customPages, setCustomPages] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadIntervalRef = useRef<number | null>(null);

  // Set dark mode by default for this premium UI
  useEffect(() => {
    if (!isNight) {
      setTheme("night");
    }
  }, [isNight, setTheme]);

  // Clean up intervals
  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      convertedImages.forEach(img => URL.revokeObjectURL(img.objectUrl));
    };
  }, [convertedImages]);

  const generateThumbnail = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<string | null> => {
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.75));
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a valid PDF file");
      return;
    }

    if (uploadIntervalRef.current !== null) {
      window.clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setFile(selectedFile);
    convertedImages.forEach(img => URL.revokeObjectURL(img.objectUrl));
    setConvertedImages([]);
    setCustomPages("");

    uploadIntervalRef.current = window.setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + 5;
        return next >= 90 ? 90 : next;
      });
    }, 100);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);

      const thumb = await generateThumbnail(pdf);
      setThumbnailUrl(thumb);

      setUploadProgress(100);
    } catch (err) {
      console.error(err);
      setError("Failed to read PDF file.");
    } finally {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setTimeout(() => setIsUploading(false), 300);
    }
  }, [convertedImages]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const parseCustomPages = (input: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(",").map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(n => parseInt(n));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const n = parseInt(part);
        if (!isNaN(n) && n >= 1 && n <= maxPages) {
          pages.add(n);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const activeProgress = isUploading || isProcessing ? uploadProgress : 0;
  const dialValue =
    activeProgress < 0
      ? 0
      : activeProgress > 100
        ? 100
        : Math.round(activeProgress);

  const convertToImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    convertedImages.forEach(img => URL.revokeObjectURL(img.objectUrl));
    setConvertedImages([]);

    uploadIntervalRef.current = window.setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + 2;
        return next >= 90 ? 90 : next;
      });
    }, 200);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let pagesToConvert: number[] = [];
      if (mode === "all") {
        pagesToConvert = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
      } else {
        pagesToConvert = parseCustomPages(customPages, pdf.numPages);
        if (pagesToConvert.length === 0) {
          throw new Error("Invalid page selection");
        }
      }

      const images: ConvertedImage[] = [];
      const numPages = pagesToConvert.length;

      for (let i = 0; i < numPages; i++) {
        const pageNum = pagesToConvert[i];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: parseFloat(scale) });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport } as any).promise;

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), `image/${format}`, format === 'jpeg' ? 0.85 : undefined);
        });

        if (blob) {
          images.push({
            page: pageNum,
            objectUrl: URL.createObjectURL(blob),
            width: viewport.width,
            height: viewport.height,
            blob
          });
        }

        // Update progress more accurately taking render time into account
        const calculatedProgress = Math.min(95, Math.round(((i + 1) / numPages) * 90));
        setUploadProgress(Math.max(uploadProgress, calculatedProgress));
      }

      setConvertedImages(images);
      setUploadProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to convert PDF. Please try again.");
    } finally {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setTimeout(() => setIsProcessing(false), 400);
    }
  };

  const downloadImage = (img: ConvertedImage) => {
    const a = document.createElement("a");
    a.href = img.objectUrl;
    a.download = `${file?.name?.replace('.pdf', '')}_page_${img.page} - Thundocs.${format}`;
    a.click();
  };

  const [isZipping, setIsZipping] = useState(false);

  const downloadAllAsZip = async () => {
    if (convertedImages.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const baseName = file?.name?.replace('.pdf', '') ?? 'pdf';
      const folder = zip.folder(baseName) ?? zip;
      for (const img of convertedImages) {
        const arrayBuffer = await img.blob.arrayBuffer();
        folder.file(`page_${String(img.page).padStart(3, '0')}.${format}`, arrayBuffer);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_images - Thundocs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="min-h-screen relative overflow-hidden pdf-to-image-bg text-white font-sans selection:bg-rose-500/30">
      <ToolNavbar />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
        <div className="w-full max-w-4xl space-y-8">

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-rose-200 via-pink-300 to-rose-400 bg-clip-text text-transparent"
            >
              PDF to Image
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-rose-100/60 max-w-lg mx-auto"
            >
              Convert PDF pages to high-quality images. Save as PNG or JPG.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload-area"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full flex justify-center"
              >
                {isUploading ? (
                  <UploadingRing label="Reading PDF..." value={dialValue} />
                ) : (
                  <div
                    {...getRootProps()}
                    className={cn("split-upload-card", isDragActive && "drag-active")}
                    role="button"
                    aria-label="Upload PDF to extract images"
                  >
                    <input {...getInputProps()} />

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
                      {isDragActive ? "Drop your PDF here" : "Upload PDF"}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                      Drag & drop PDF or click to browse
                    </p>

                    <button
                      type="button"
                      className="btn-main"
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                    >
                      Choose PDF
                    </button>
                  </div>
                )}
              </motion.div>
            ) : convertedImages.length === 0 ? (
              <motion.div
                key="options-area"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-2xl mx-auto space-y-6"
              >
                {isProcessing ? (
                  <UploadingRing label="Extracting images..." value={dialValue} />
                ) : (
                  <div
                    {...getRootProps()}
                    className={`glass-panel rounded-2xl p-8 border backdrop-blur-xl text-left relative overflow-hidden transition-all duration-300 ${isDragActive ? "border-rose-400/50 bg-slate-950/90 ring-2 ring-rose-500/30" : "border-slate-800/80 bg-slate-950/70"}`}
                  >
                    {isDragActive && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-rose-400/50">
                        <p className="text-xl font-medium text-rose-300">Drop PDF to replace</p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        convertedImages.forEach(img => URL.revokeObjectURL(img.objectUrl));
                        setConvertedImages([]);
                        setCustomPages("");
                        setThumbnailUrl(null);
                      }}
                      className="absolute right-4 top-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full z-20"
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <div className="flex flex-col items-center gap-4 mb-4 relative z-10">
                      <div className="w-24 h-32 rounded-2xl bg-gradient-to-br from-rose-500/25 via-pink-600/25 to-purple-900/40 border border-white/15 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)] flex items-center justify-center overflow-hidden">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-10 h-10 text-rose-200" />
                        )}
                      </div>
                      <div className="text-center max-w-[14rem] mx-auto">
                        <p className="font-medium text-white line-clamp-2">{file.name}</p>
                        <p className="text-sm text-rose-200/70">{formatFileSize(file.size)} • {pageCount} {pageCount === 1 ? 'page' : 'pages'}</p>
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4 relative z-10">
                      <div className="space-y-2 lg:col-span-1">
                        <p className="text-xs font-medium text-rose-100/80 uppercase tracking-wide">Format</p>
                        <Select value={format} onValueChange={(v: "png" | "jpeg") => setFormat(v)} disabled={isProcessing}>
                          <SelectTrigger className="h-9 border-white/15 bg-white/5 text-xs text-rose-50 disabled:opacity-60 disabled:cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-rose-50 rounded-2xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)]">
                            <SelectItem value="jpeg" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">JPEG (Smaller)</SelectItem>
                            <SelectItem value="png" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">PNG (Lossless)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 lg:col-span-1">
                        <p className="text-xs font-medium text-rose-100/80 uppercase tracking-wide">Quality</p>
                        <Select value={scale} onValueChange={setScale} disabled={isProcessing}>
                          <SelectTrigger className="h-9 border-white/15 bg-white/5 text-xs text-rose-50 disabled:opacity-60 disabled:cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-rose-50 rounded-2xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)]">
                            <SelectItem value="1.0" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">Standard</SelectItem>
                            <SelectItem value="1.5" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">High</SelectItem>
                            <SelectItem value="2.0" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">Maximum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <p className="text-xs font-medium text-rose-100/80 uppercase tracking-wide">Pages</p>
                        <div className="flex items-center gap-2">
                          <Select value={mode} onValueChange={(v: "all" | "specific") => setMode(v)} disabled={isProcessing}>
                            <SelectTrigger className="h-9 border-white/15 bg-white/5 text-xs text-rose-50 disabled:opacity-60 disabled:cursor-not-allowed w-28 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-rose-50 rounded-2xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.9)]">
                              <SelectItem value="all" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">All Pages</SelectItem>
                              <SelectItem value="specific" className="rounded-xl bg-transparent data-[highlighted]:bg-white/10 data-[state=checked]:bg-rose-500/15 data-[state=checked]:text-rose-50">Custom</SelectItem>
                            </SelectContent>
                          </Select>

                          {mode === "specific" && (
                            <Input
                              placeholder={`e.g. 1, 3-5 (Max ${pageCount})`}
                              value={customPages}
                              onChange={(e) => setCustomPages(e.target.value)}
                              className="h-9 border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white/5 text-xs text-rose-50 placeholder:text-rose-200/40 disabled:opacity-60 disabled:cursor-not-allowed w-full min-w-[120px]"
                              disabled={isProcessing}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-4 flex items-center gap-2 text-red-200 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm justify-center">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <div className="mt-auto pt-8 flex justify-end">
                      <Button
                        onClick={convertToImages}
                        className="bg-white/10 backdrop-blur-md border-none text-white font-medium px-8 rounded-xl h-12 shadow-2xl transition-all hover:scale-105 hover:bg-white/20 active:scale-95 w-full md:w-auto"
                      >
                        Convert to Images
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="gallery-area"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full space-y-6"
              >
                {/* Top action bar */}
                <div className="glass-panel flex flex-col md:flex-row gap-4 items-center justify-between p-4 px-6 rounded-[24px] bg-slate-950/70 border-slate-800/80">
                  <div className="flex items-center gap-3">

                    <div>
                      <p className="font-medium">{convertedImages.length} Images Extracted</p>
                      <p className="text-xs text-rose-200/60 uppercase tracking-wider">{file?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 mt-4 md:mt-0">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        for (const img of convertedImages) {
                          downloadImage(img);
                          await new Promise(resolve => setTimeout(resolve, 250));
                        }
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl w-full md:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Images
                    </Button>
                    <Button
                      onClick={downloadAllAsZip}
                      disabled={isZipping}
                      className="bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-lg shadow-rose-500/20 px-6 font-medium border-none w-full md:w-auto"
                    >
                      {isZipping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                      Download ZIP
                    </Button>
                  </div>
                </div>

                {/* Masonry Gallery inside glass container */}
                <div className="glass-panel p-6 rounded-[32px] bg-slate-950/40 border-white/5 backdrop-blur-sm">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {convertedImages.map((img, index) => (
                      <div
                        key={`img-${img.page}-${index}`}
                        className="group relative glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)] hover:z-10 bg-slate-900/50 border border-white/5"
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img src={img.objectUrl} alt={`Page ${img.page}`} className="w-full h-auto object-cover" />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-sm">
                          <Maximize2 className="w-8 h-8 text-white drop-shadow-lg mb-4" />
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-white text-rose-950 hover:bg-rose-50 font-medium px-4 rounded-xl shadow-[0_0_16px_-6px_rgba(255,255,255,0.4)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img);
                            }}
                          >
                            <Download className="w-4 h-4 mr-1.5" />
                            Download Page
                          </Button>
                        </div>

                        {/* Page Indicator */}
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white shadow-sm pointer-events-none">
                          Page {img.page}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setSelectedImageIndex(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 md:top-6 md:right-6 text-white/60 hover:text-white hover:bg-white/10 rounded-full z-10"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {convertedImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-14 w-14"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) =>
                      prev !== null ? (prev === 0 ? convertedImages.length - 1 : prev - 1) : 0
                    );
                  }}
                >
                  <ChevronLeft className="w-10 h-10" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-14 w-14"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) =>
                      prev !== null ? (prev === convertedImages.length - 1 ? 0 : prev + 1) : 0
                    );
                  }}
                >
                  <ChevronRight className="w-10 h-10" />
                </Button>
              </>
            )}

            <motion.div
              className="relative max-w-full max-h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={convertedImages[selectedImageIndex].objectUrl}
                alt={`Page ${convertedImages[selectedImageIndex].page}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-md shadow-[0_0_50px_-10px_rgba(244,63,94,0.3)] ring-1 ring-white/10"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-[20px] shadow-2xl">
                <p className="text-white font-medium text-sm">
                  Page {convertedImages[selectedImageIndex].page}
                </p>
                <div className="w-px h-6 bg-white/20" />
                <Button
                  onClick={() => downloadImage(convertedImages[selectedImageIndex])}
                  className="bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-lg border-none h-9 text-sm px-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
