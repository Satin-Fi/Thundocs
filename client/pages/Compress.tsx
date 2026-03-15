import React, { useState, useCallback, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ToolNavbar from "@/components/ToolNavbar";
import {
  FileText,
  Upload,
  Download,
  X,
  Minimize2,
  RefreshCw,
  Loader2,
  ChevronUp,
  ChevronDown,
  FileUp,
  FileDown,
  Activity,
} from "lucide-react";
import { UploadingRing } from "@/components/UploadingRing";
import DropzoneDownloadPanel from "@/components/DropzoneDownloadPanel";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  settings: {
    dpi: number;
    qualityPercent: number;
    colorMode: "color" | "grayscale";
    targetSizeKb: number | null;
    actualDpi: number;
    actualJpegQ: number;
    isForced: boolean;
  };
}

function PdfViewer({ url }: { url: string }) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    pdfjsLib.getDocument(url).promise.then((doc) => {
      if (active) {
        setPdf(doc);
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Error loading PDF:", err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [url]);

  if (loading) return <div className="w-full h-full flex items-center justify-center text-white/50">Loading PDF...</div>;
  if (!pdf) return <div className="w-full h-full flex items-center justify-center text-red-400">Failed to load inline preview.</div>;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map(pageNum => (
        <PdfPage key={pageNum} pdf={pdf} pageNum={pageNum} />
      ))}
    </div>
  );
}

function PdfPage({ pdf, pageNum }: { pdf: pdfjsLib.PDFDocumentProxy, pageNum: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let renderTask: any;
    pdf.getPage(pageNum).then(page => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Adjust scale dynamically based on container width or use a reasonable fixed scale
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      } as any;
      renderTask = page.render(renderContext);
    });

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNum]);

  return (
    <div className="bg-white shadow-lg overflow-hidden shrink-0" style={{ maxWidth: "100%" }}>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
}

export default function CompressPage() {
  const { setTheme, isNight } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dpi, setDpi] = useState(150);
  const [qualityPercent, setQualityPercent] = useState(80);
  const [colorMode, setColorMode] = useState<"color" | "grayscale">("color");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [targetSizeKb, setTargetSizeKb] = useState<string>("");
  const [targetMode, setTargetMode] = useState<"safe" | "force">("safe");
  const [targetUnit, setTargetUnit] = useState<"KB" | "MB">("MB");
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [compressedThumbnailUrl, setCompressedThumbnailUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadIntervalRef = useRef<number | null>(null);
  const hasTarget = targetSizeKb.trim().length > 0 && parseInt(targetSizeKb, 10) > 0;
  const [showDetails, setShowDetails] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<"extreme" | "recommended" | "light">("recommended");

  // Set dark mode by default for this premium UI
  useEffect(() => {
    if (!isNight) {
      setTheme("night");
    }
  }, [isNight, setTheme]);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  const generateThumbnail = useCallback(async (selectedFile: File) => {
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.22 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (!context) return;
      await page.render({ canvasContext: context, viewport } as any).promise;
      const dataUrl = canvas.toDataURL("image/png");
      setThumbnailUrl(dataUrl);
    } catch (err) {
      console.error(err);
      setThumbnailUrl(null);
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setIsUploading(true);
      setUploadProgress(0);
      uploadIntervalRef.current = window.setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 4;
          return next >= 90 ? 90 : next;
        });
      }, 120);
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setProgress(0);
      // Auto-select unit: files < 4MB are likely targeting KB, others MB
      setTargetUnit(selectedFile.size < 4 * 1024 * 1024 ? "KB" : "MB");
      setTargetSizeKb("");
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
      setDownloadName("");
      setThumbnailUrl(null);
      setCompressedBlob(null);
      // Generate preview thumbnail in the background so upload feels instant
      void generateThumbnail(selectedFile);
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
      }, 350);
    },
    [generateThumbnail]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const activeProgress = isUploading ? uploadProgress : progress;
  const dialValue =
    activeProgress < 0
      ? 0
      : activeProgress > 100
        ? 100
        : Math.round(activeProgress);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const applyCompressionPreset = (level: "extreme" | "recommended" | "light") => {
    setCompressionLevel(level);

    if (level === "extreme") {
      setQualityPercent(35);
      setDpi(96);
    } else if (level === "recommended") {
      setQualityPercent(70);
      setDpi(150);
    } else {
      setQualityPercent(90);
      setDpi(220);
    }
  };

  const handleCompress = async (force: boolean = false) => {
    if (!file || isUploading) return;

    // Immediate UI feedback: collapse the settings panel
    setShowDetails(false);

    setIsCompressing(true);
    setProgress(0);
    setError(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      const trimmedTarget = targetSizeKb.trim();

      const params = new URLSearchParams();
      // Keep a reasonable default bucket for DPI/pdfSettings,
      // but drive JPEG quality directly via jpegQ.
      let backendQuality: "high" | "medium" | "low";
      if (qualityPercent >= 90) backendQuality = "high";
      else if (qualityPercent >= 70) backendQuality = "medium";
      else backendQuality = "low";

      params.set("quality", backendQuality);
      params.set("jpegQ", qualityPercent.toString());
      params.set("dpi", dpi.toString());
      params.set("colorMode", colorMode);
      if (trimmedTarget !== "") {
        const finalKb = targetUnit === "MB"
          ? (Number(trimmedTarget) * 1024).toString()
          : trimmedTarget;
        params.set("targetSizeKb", finalKb);
      }
      if (force) {
        params.set("force", "true");
      }

      const response = await fetch(`/api/compress-pdf?${params.toString()}`, {
        method: "POST",
        body: file,
      });

      clearInterval(interval);
      setProgress(100);

      if (!response.ok) {
        setError("Failed to compress PDF");
        setIsCompressing(false);
        return;
      }

      const originalHeader = response.headers.get("X-Original-Size");
      const originalSize = originalHeader ? parseInt(originalHeader, 10) : file.size;

      const blob = await response.blob();
      const compressedSize = blob.size;

      const ratio = Math.round((1 - compressedSize / originalSize) * 100);

      setCompressedBlob(blob);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(
        file ? `compressed_${file.name.replace(/\.[^/.]+$/, "")} - Thundocs.pdf` : "compressed - Thundocs.pdf"
      );

      let targetBytes: number | null = null;
      if (trimmedTarget !== "") {
        const numeric = Number(trimmedTarget);
        if (!Number.isNaN(numeric) && numeric > 0) {
          targetBytes = Math.floor(numeric * 1024);
        }
      }

      const actualDpi = parseInt(response.headers.get("X-Actual-DPI") || "0", 10) || dpi;
      const actualJpegQ = parseInt(response.headers.get("X-Actual-JpegQ") || "0", 10);
      const isForced = response.headers.get("X-Is-Forced") === "true";

      setResult({
        originalSize,
        compressedSize,
        ratio,
        settings: {
          dpi,
          qualityPercent,
          colorMode,
          targetSizeKb: trimmedTarget !== "" ? Number(trimmedTarget) : null,
          actualDpi,
          actualJpegQ,
          isForced: force,
        },
      });

      // Generate compressed-output thumbnail
      try {
        const compressedBuf = await blob.arrayBuffer();
        const cpdf = await pdfjsLib.getDocument({ data: compressedBuf }).promise;
        const cpage = await cpdf.getPage(1);
        const cviewport = cpage.getViewport({ scale: 0.3 });
        const ccanvas = document.createElement("canvas");
        const cctx = ccanvas.getContext("2d");
        ccanvas.width = cviewport.width;
        ccanvas.height = cviewport.height;
        if (cctx) {
          await cpage.render({ canvasContext: cctx, viewport: cviewport } as any).promise;
          setCompressedThumbnailUrl(ccanvas.toDataURL("image/png"));
        }
      } catch { /* non-fatal */ }

      setIsCompressing(false);
    } catch (err) {
      clearInterval(interval);
      setIsCompressing(false);
      setError("Failed to compress PDF");
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = downloadName || "compressed - Thundocs.pdf";
    a.click();
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setError(null);
    setThumbnailUrl(null);
    setCompressedBlob(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setDownloadName("");
    setCompressedThumbnailUrl(null);
    setIsUploading(false);
    setUploadProgress(0);
    if (uploadIntervalRef.current !== null) {
      window.clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-100 font-sans text-slate-900">
      <ToolNavbar />
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={cn("w-full transition-all duration-500 compress-hero", file ? "max-w-xl mx-auto" : "max-w-6xl")}
            >
              <div className={cn("transition-all duration-500", file ? "w-full" : "hero-grid")}>
                {!file && (
                  <div className="space-y-6">
                    <span className="label-text">The workflow</span>
                    <div>
                      <h1 className="hero-title">Shape Your Documents</h1>
                      <p className="hero-desc">
                        An intuitive suite of PDF utilities designed for fluidity. Merge, split, and convert with drag-and-drop simplicity.
                      </p>
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-orange-500 font-semibold">
                      v 2.0.1 Active
                    </div>
                  </div>
                )}

                <div className="space-y-4 w-full">
                  {error && (
                    <div
                      className="text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2"
                      role="alert"
                      aria-live="assertive"
                    >
                      {error}
                    </div>
                  )}

                  <div className="composition-layer mx-auto w-full">
                    <div className="ribbon r-1"></div>
                    <div className="ribbon r-3"></div>
                    <div className="ribbon r-2"></div>

                    <div className="relative w-full h-full">
                      {!file ? (
                        <div
                          {...getRootProps()}
                          className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
                          role="button"
                          aria-label="Upload PDF file"
                        >
                          <input {...getInputProps()} />

                          <div style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                          </div>

                          <h3 style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '1.25rem' }}>
                            {isDragActive ? "Drop it here!" : "Upload File"}
                          </h3>
                          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: 0 }}>
                            {isDragActive ? "Release to upload" : "Drag \u0026 drop or select"}
                          </p>

                          <button
                            type="button"
                            className="btn-main"
                            onClick={(e) => { e.stopPropagation(); open(); }}
                          >
                            Choose File
                          </button>

                          <div className="upload-progress-track mt-8">
                            <div
                              className="upload-progress-fill"
                              style={{
                                width: `${isUploading ? uploadProgress : 40}%`,
                                opacity: isUploading ? 1 : 0.45,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          {...getRootProps()}
                          className={cn(
                            "upload-zone upload-card p-8 border text-left flex flex-col justify-between transition-all duration-300 !h-[600px] overflow-visible",
                            isDragActive
                              ? "border-orange-300 bg-white/70 ring-2 ring-orange-200/70"
                              : "border-white/70 bg-white/55"
                          )}
                          aria-busy={false}
                        >
                          {isDragActive && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-orange-300">
                              <p className="text-xl font-semibold text-orange-500">Drop PDF to replace</p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFile(null)}
                            className="absolute right-4 top-4 text-black/40 hover:text-black hover:bg-black/5 rounded-full z-20"
                            disabled={isCompressing || isUploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>

                          {!isCompressing && (
                            <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
                              <div className="w-16 h-20 rounded-xl bg-white/70 border border-white/80 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.25)] flex items-center justify-center overflow-hidden">
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt={file ? file.name : "PDF preview"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <motion.div
                                      animate={{ y: [0, -4, 0] }}
                                      transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <FileText className="w-10 h-10 text-orange-500/70" />
                                    </motion.div>
                                    <motion.div
                                      className="flex gap-1"
                                      initial={{ opacity: 0.4 }}
                                      animate={{ opacity: [0.4, 1, 0.4] }}
                                      transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                    </motion.div>
                                  </div>
                                )}
                              </div>
                              <div className="text-center max-w-xs">
                                <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                                <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                                {!thumbnailUrl && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Preparing a smart preview...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {isUploading && (
                            <div className="upload-progress-track">
                              <div
                                className="upload-progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          )}

                          {/* ── Settings / Loading ───────────────────────── */}
                          <div className="mt-4 space-y-1 relative z-10 flex-1 flex flex-col">
                            {isCompressing ? (
                              <div className="flex-1 flex flex-col px-2 py-4">
                                <div className="text-center mb-2">
                                  <div className="text-3xl md:text-4xl font-semibold text-slate-900">
                                    Compressing PDF…
                                  </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="w-full max-w-xs space-y-3 text-center">
                                    <div className="text-5xl md:text-6xl font-extrabold text-slate-900">
                                      {progress}%
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-300/70 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400 transition-all duration-300 ease-out"
                                        style={{ width: `${Math.min(Math.max(progress, 5), 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col rounded-3xl bg-white/35 backdrop-blur-xl border border-white/60 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.45)] overflow-hidden">
                                  {/* Compression level presets card */}
                                  {!hasTarget && (
                                    <div className="px-2 py-3 border-b border-white/40">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500/80 mb-2">
                                        Compression level
                                      </p>
                                      <div className="space-y-2">
                                        <button
                                          type="button"
                                          onClick={() => applyCompressionPreset("extreme")}
                                          disabled={isCompressing || isUploading}
                                          className={cn(
                                            "w-full text-left px-5 py-3 rounded-2xl border transition-all duration-300",
                                            compressionLevel === "extreme"
                                              ? "bg-[#FCF9E8] border-[#EBDCB7] ring-1 ring-[#EBDCB7] shadow-sm"
                                              : "bg-[#FCF9E8]/50 border-white/60 hover:bg-[#FCF9E8]"
                                          )}
                                        >
                                          <p className="font-bold tracking-[0.12em] text-[11px] text-slate-800 uppercase">
                                            MAXIMUM COMPRESSION
                                          </p>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            Smallest file size, lowest quality
                                          </p>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => applyCompressionPreset("recommended")}
                                          disabled={isCompressing || isUploading}
                                          className={cn(
                                            "w-full text-left px-5 py-3 rounded-2xl border transition-all duration-300",
                                            compressionLevel === "recommended"
                                              ? "bg-[#E9FBF1] border-[#B5E6CD] ring-1 ring-[#B5E6CD] shadow-sm"
                                              : "bg-[#E9FBF1]/50 border-white/60 hover:bg-[#E9FBF1]"
                                          )}
                                        >
                                          <p className="font-bold tracking-[0.12em] text-[11px] text-[#1D6047] uppercase">
                                            RECOMMENDED COMPRESSION
                                          </p>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            Optimal balance of size and quality
                                          </p>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => applyCompressionPreset("light")}
                                          disabled={isCompressing || isUploading}
                                          className={cn(
                                            "w-full text-left px-5 py-3 rounded-2xl border transition-all duration-300",
                                            compressionLevel === "light"
                                              ? "bg-[#F7F8FB] border-[#D5D8DF] ring-1 ring-[#D5D8DF] shadow-sm"
                                              : "bg-[#F7F8FB]/50 border-white/60 hover:bg-[#F7F8FB]"
                                          )}
                                        >
                                          <p className="font-bold tracking-[0.12em] text-[11px] text-slate-800 uppercase">
                                            MINIMAL COMPRESSION
                                          </p>
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            Largest file size, highest quality
                                          </p>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Color row */}
                                  <div className="flex items-center justify-between px-2 py-2 border-b border-white/35">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500/80">Colors</p>
                                    <div className="flex items-center gap-1">
                                      {(["color", "grayscale"] as const).map((c) => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() => setColorMode(c)}
                                          disabled={isCompressing || isUploading || hasTarget}
                                          className={cn(
                                            "px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-300 flex items-center gap-2",
                                            colorMode === c
                                              ? "bg-[#E5E9FC] text-[#111827] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]"
                                              : "text-[#6B7280] hover:text-[#374151] bg-transparent"
                                          )}
                                        >
                                          {c === "color" && <span className="text-[14px]">🎨</span>}
                                          {c === "grayscale" && <div className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-90" />}
                                          <span>{c === "color" ? "Color" : "Gray"}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Target size row */}
                                <div className="flex items-center justify-between px-2 py-1 gap-2 mt-1">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500/80">Target size</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Leave empty for auto</p>
                                  </div>
                                  {/* Input with embedded unit toggle */}
                                  <div className="flex items-center gap-0 rounded-lg bg-white/40 overflow-hidden h-8 shadow-inner border border-white/50 backdrop-blur-md">
                                    <div className="relative flex items-center">
                                      <input
                                        type="number"
                                        min={1}
                                        value={targetSizeKb}
                                        onChange={(e) => setTargetSizeKb(e.target.value)}
                                        placeholder="—"
                                        className="w-12 h-8 px-2 bg-transparent text-[13px] font-bold text-slate-900 placeholder:text-slate-400 outline-none text-center"
                                        disabled={isCompressing || isUploading}
                                      />
                                    </div>
                                    {/* Divider */}
                                    <div className="w-px h-4 bg-black/10" />
                                    {/* Unit toggle */}
                                    <div className="flex items-center h-8 p-0.5 gap-0 bg-transparent">
                                      {(["KB", "MB"] as const).map((u) => (
                                        <button
                                          key={u}
                                          type="button"
                                          onClick={() => setTargetUnit(u)}
                                          className={cn(
                                            "px-2 h-full rounded-md text-[10px] font-bold transition-all duration-200",
                                            targetUnit === u
                                              ? "bg-white text-slate-900 shadow-sm"
                                              : "text-slate-500 hover:text-slate-800"
                                          )}
                                        >
                                          {u}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Mode selector — expands when target is set */}
                                {hasTarget && (
                                  <div className="border-t border-white/40 px-2 py-2 grid grid-cols-2 gap-2 mt-1 bg-white/20 backdrop-blur-lg rounded-2xl">
                                    {(["safe", "force"] as const).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => setTargetMode(m)}
                                        className={cn(
                                          "flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all duration-200",
                                          m === "safe" && targetMode === "safe" && "bg-cyan-50 border-cyan-200 ring-1 ring-cyan-200 text-cyan-800 shadow-sm",
                                          m === "safe" && targetMode !== "safe" && "bg-[#F7F8FB]/50 border-white/60 hover:bg-[#F7F8FB] text-slate-500",
                                          m === "force" && targetMode === "force" && "bg-orange-50 border-orange-200 ring-1 ring-orange-200 text-orange-800 shadow-sm",
                                          m === "force" && targetMode !== "force" && "bg-[#F7F8FB]/50 border-white/60 hover:bg-[#F7F8FB] text-slate-500",
                                        )}
                                      >
                                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] leading-none">
                                          {m === "safe" ? "Near target" : "Force size"}
                                        </span>
                                        <span className="text-[10px] opacity-80 leading-tight mt-0.5">
                                          {m === "safe" ? "Best approx." : "Exact target"}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Primary Action */}
                                <div className="!mt-auto pt-2 flex justify-end">
                                  <Button
                                    onClick={() => handleCompress(hasTarget && targetMode === "force")}
                                    disabled={isCompressing || isUploading}
                                    className={cn(
                                      "border-none text-white font-semibold px-8 rounded-full h-12 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed",
                                      hasTarget && targetMode === "force"
                                        ? "bg-black hover:bg-black/90"
                                        : "bg-black hover:bg-black/90"
                                    )}
                                  >
                                    {hasTarget && targetMode === "force" ? "Force Compress" : "Compress Now"}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={cn("w-full max-w-[1100px] compress-hero transition-all duration-300", showDetails && "details-open")}
            >
              {downloadUrl && result ? (
                showDetails ? (
                  <div className="flex flex-col-reverse md:flex-row gap-[16px] md:gap-[2px] justify-center items-center md:items-start transition-all duration-300 w-full px-4 md:px-0">
                    {/* Left Column: Info + Settings (Now below Download Card on mobile) */}
                    <div className="flex flex-col gap-[16px] md:gap-[2px] w-full md:w-[600px]">
                      <div className="composition-layer info-composition w-full !h-[600px]">
                        <div className="ribbon r-1"></div>
                        <div className="ribbon r-3"></div>
                        <div className="ribbon r-2"></div>
                        <div className="upload-zone info-card inline-card border p-6 md:p-8 h-full">
                          <div className="relative z-10 flex flex-col gap-5 h-full">
                            <div className="flex items-start gap-4">
                              <button
                                type="button"
                                onClick={() => downloadUrl && setShowPreview(true)}
                                className={cn(
                                  "w-16 h-22 flex-shrink-0 rounded-xl bg-white/70 border border-white/80 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)] flex items-center justify-center overflow-hidden transition-all duration-200",
                                  downloadUrl ? "cursor-pointer hover:scale-105 hover:border-orange-300 hover:shadow-[0_0_18px_-6px_rgba(251,146,60,0.45)]" : "cursor-default"
                                )}
                                style={{ height: "5.5rem" }}
                                title={downloadUrl ? "Click to preview all pages" : undefined}
                              >
                                {compressedThumbnailUrl ? (
                                  <img src={compressedThumbnailUrl} alt="Compressed PDF preview" className="w-full h-full object-cover" />
                                ) : thumbnailUrl ? (
                                  <img src={thumbnailUrl} alt="PDF preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <FileText className="w-7 h-7 text-orange-500/70" />
                                    <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500">PDF</span>
                                  </div>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 mb-1">Compressed PDF</p>
                                <p className="font-semibold text-slate-900 text-sm truncate">
                                  {file ? file.name : "Your PDF"}
                                </p>
                                {downloadUrl && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">Tap thumbnail to preview</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-3xl bg-white/40 border border-white/60 p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm transition-all hover:bg-white/60">
                                <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center mb-2">
                                  <FileUp className="w-4 h-4 text-slate-500" />
                                </div>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Original</p>
                                <p className="font-bold text-slate-900 text-sm whitespace-nowrap">{formatFileSize(result.originalSize)}</p>
                              </div>
                              <div className="rounded-3xl bg-orange-500/5 border border-orange-200/50 p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm transition-all hover:bg-orange-500/10">
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mb-2">
                                  <FileDown className="w-4 h-4 text-orange-600" />
                                </div>
                                <p className="text-[9px] uppercase tracking-wider text-orange-600 font-bold mb-0.5">Compressed</p>
                                <p className="font-bold text-orange-700 text-sm whitespace-nowrap">{formatFileSize(result.compressedSize)}</p>
                              </div>
                              <div className="rounded-3xl bg-emerald-500/5 border border-emerald-200/50 p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm transition-all hover:bg-emerald-500/10">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                  <Activity className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">Saved</p>
                                <p className="font-bold text-emerald-700 text-sm whitespace-nowrap">{result.ratio}%</p>
                              </div>
                            </div>

                            <div className="rounded-3xl bg-white/20 border border-white/40 p-4 transition-all hover:bg-white/30 backdrop-blur-md">
                              <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-2">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">Processing Logs</p>
                                <div className="flex gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-3 text-[11px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Resolution</span>
                                  <span className="font-bold text-slate-700">{result.settings.actualDpi} DPI</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Image Quality</span>
                                  <span className="font-bold text-slate-700">
                                    {result.settings.isForced ? "Forced Lossy" : `${result.settings.qualityPercent}%`}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Encoding</span>
                                  <span className="font-bold text-slate-700">{result.settings.colorMode === "grayscale" ? "Grayscale" : "Full Color"}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Target</span>
                                  <span className="font-bold text-slate-700">{result.settings.targetSizeKb ? `${result.settings.targetSizeKb} KB` : "Auto-Optimize"}</span>
                                </div>
                              </div>
                            </div>

                            {result.compressedSize >= result.originalSize && (
                              <div className="rounded-3xl bg-amber-500/5 border border-amber-200/50 p-4 flex items-start gap-3 backdrop-blur-md">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                  <Activity className="w-4 h-4 text-amber-600 rotate-180" />
                                </div>
                                <div>
                                  <p className="font-bold uppercase tracking-[0.16em] text-[9px] text-amber-600 mb-0.5">Optimization Limit Reached</p>
                                  <p className="text-[11px] text-amber-700/80 leading-snug">This document is already highly optimized. Further compression would compromise quality without reducing file size.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Settings Bar */}
                      <div className="relative w-full">
                        <div
                          className={cn(
                            "transition-opacity duration-300",
                            isCompressing ? "opacity-0 pointer-events-none" : "opacity-100",
                          )}
                        >
                          <div className="composition-layer settings-composition w-full overflow-hidden rounded-[30px]">
                            <div
                              className="upload-card inline-card flex-grow h-auto py-5 px-5 flex items-center justify-start no-scrollbar backdrop-blur-2xl rounded-[30px]"
                              style={{
                                background: 'rgba(255, 255, 255, 0.45)',
                                border: '1px solid rgba(255, 255, 255, 0.65)',
                                boxShadow: '0 20px 50px -20px rgba(15, 23, 42, 0.12)'
                              }}
                            >
                              <div className="flex flex-wrap md:flex-nowrap items-center justify-start gap-4 w-full">
                                {/* Image Quality Numeric Input */}
                                <div className="space-y-1.5 min-w-[100px] flex-shrink-0">
                                  <label className="text-[9px] font-bold tracking-[0.18em] text-slate-500/80 uppercase block ml-0.5">Image Quality</label>
                                  <div className="relative group">
                                    <Input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={qualityPercent}
                                      onChange={(e) => setQualityPercent(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                                      disabled={isCompressing || isUploading}
                                      className="h-9 w-full border-white/50 bg-white/40 backdrop-blur-md text-xs text-slate-800 rounded-xl ring-1 ring-white/5 disabled:opacity-60 shadow-sm transition-all hover:bg-white/60 focus:bg-white/70 focus:ring-slate-300 pr-7 text-center font-mono font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                                  </div>
                                </div>

                                <div className="hidden md:block h-10 w-[1px] bg-slate-200/60 self-center" />

                                {/* Color Setting */}
                                <div className="space-y-1.5 min-w-[95px] flex-shrink-0">
                                  <label className="text-[9px] font-bold tracking-[0.18em] text-slate-500/80 uppercase block ml-0.5">Color Mode</label>
                                  <Select value={colorMode} onValueChange={(v) => setColorMode(v as typeof colorMode)} disabled={isCompressing || isUploading}>
                                    <SelectTrigger className="h-9 w-full border-white/50 bg-white/40 backdrop-blur-md text-xs text-slate-800 rounded-xl ring-1 ring-white/5 disabled:opacity-60 shadow-sm transition-all hover:bg-white/60">
                                      <SelectValue placeholder="Color" />
                                    </SelectTrigger>
                                    <SelectContent side="top" className="bg-white/80 backdrop-blur-3xl border-white/40 text-xs text-slate-800 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden">
                                      <SelectItem value="color" className="rounded-xl data-[highlighted]:bg-black/5">No change</SelectItem>
                                      <SelectItem value="grayscale" className="rounded-xl data-[highlighted]:bg-black/5">Gray</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="hidden md:block h-10 w-[1px] bg-slate-200/60 self-center" />

                                {/* Manual Resolution (DPI) Input */}
                                <div className="flex-grow min-w-[140px] max-w-[180px] space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-bold tracking-[0.18em] text-slate-500/80 uppercase block ml-0.5">Resolution</label>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[7px] font-bold tracking-widest whitespace-nowrap transition-all duration-300 ring-1 shadow-sm",
                                      dpi < 100 ? "text-cyan-700 bg-cyan-100/50 ring-cyan-200/50" :
                                        dpi < 220 ? "text-slate-600 bg-slate-50/50 ring-slate-200/50" :
                                          "text-amber-700 bg-amber-50/40 ring-amber-200/50"
                                    )}>
                                      {dpi < 100 ? "WEB" : dpi < 220 ? "STD" : "PRINT"}
                                    </span>
                                  </div>
                                  <div className="relative group">
                                    <Input
                                      type="number"
                                      min="36"
                                      max="600"
                                      value={dpi}
                                      onChange={(e) =>
                                        setDpi(Math.min(600, Math.max(36, parseInt(e.target.value) || 36)))
                                      }
                                      disabled={isCompressing || isUploading}
                                      className="h-9 w-full border-white/50 bg-white/40 backdrop-blur-md text-xs text-slate-800 rounded-xl ring-1 ring-white/5 disabled:opacity-60 shadow-sm transition-all hover:bg-white/60 focus:bg-white/70 focus:ring-slate-300 pr-9 text-center font-mono font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">DPI</span>
                                  </div>
                                </div>

                                <div className="hidden md:block h-10 w-[1px] bg-slate-200/60 self-center ml-auto" />

                                <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0 flex justify-end">
                                  <button
                                    onClick={() => handleCompress(false)}
                                    disabled={isCompressing || isUploading}
                                    className="group relative h-11 w-20 rounded-2xl bg-black text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center overflow-hidden"
                                  >
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Update</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Right Column: Download Card (Now above Info on mobile due to flex-col-reverse) */}
                    <div className="w-full md:w-[380px] relative">
                      <DropzoneDownloadPanel
                        title="Your PDF has been compressed successfully"
                        downloadUrl={downloadUrl}
                        onDownload={handleDownload}
                        compressionRatio={result.ratio}
                        showDetails={showDetails}
                        onToggleDetails={() => setShowDetails(false)}
                        isLoading={isCompressing}
                        progress={progress}
                        compressedSizeLabel={formatFileSize(result.compressedSize)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-4 px-4 md:px-0">
                    <div className="w-full md:w-[380px] h-auto md:h-[600px] relative">
                      <DropzoneDownloadPanel
                        title="Your PDF has been compressed successfully"
                        downloadUrl={downloadUrl}
                        onDownload={handleDownload}
                        compressionRatio={result.ratio}
                        showDetails={showDetails}
                        onToggleDetails={() => setShowDetails(true)}
                        isLoading={isCompressing}
                        progress={progress}
                        compressedSizeLabel={formatFileSize(result.compressedSize)}
                      />
                    </div>
                  </div>
                )
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compressed PDF Preview Modal */}
      <AnimatePresence>
        {showPreview && downloadUrl && (
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex flex-col items-center gap-4 w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-white">Quality Preview</p>
                  <p className="text-xs text-blue-200/60">All pages — scroll to navigate</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className="w-full rounded-2xl overflow-hidden border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] bg-slate-950"
                style={{ height: "70vh" }}
              >
                {downloadUrl ? (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar bg-slate-900 overflow-x-hidden">
                    <PdfViewer url={downloadUrl} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-200/50 text-sm">
                    PDF not available
                  </div>
                )}
              </div>

              {result && (
                <div className="w-full flex items-center justify-center gap-6 text-xs text-blue-200/70">
                  <span>
                    <span className="text-white/50">Size: </span>
                    <span className="font-medium text-emerald-300">
                      {(result.compressedSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </span>
                  <span>
                    <span className="text-white/50">Saved: </span>
                    <span className="font-medium text-cyan-300">{result.ratio}%</span>
                  </span>
                  <span>
                    <span className="text-white/50">DPI: </span>
                    <span className="font-medium text-white/90">{result.settings.actualDpi}</span>
                  </span>
                  {result.settings.isForced && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] uppercase tracking-wider">
                      Forced
                    </span>
                  )}
                </div>
              )}

              <p className="text-[10px] text-white/30">Click outside to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

