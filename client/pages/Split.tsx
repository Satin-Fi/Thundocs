import React, { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import {
  Upload,
  FileText,
  Scissors,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Archive,
  Layers,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import SplitDownloadCard from "@/components/SplitDownloadCard";

type SplitMode = "range" | "extract" | "every-page" | "every-n";

// Configure PDF.js worker
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function SplitPage() {
  const { themeStyles, isNight, setTheme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("1");
  const [customPages, setCustomPages] = useState("");
  const [chunkSize, setChunkSize] = useState("5");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadIntervalRef = useRef<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [downloadSizeLabel, setDownloadSizeLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isNight) setTheme("night");
  }, []);

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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      canvas.width = 0;
      canvas.height = 0;
      return dataUrl;
    } catch {
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
    setSuccess(null);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const count = pdf.getPageCount();
      setPageCount(count);
      setRangeEnd(String(count));

      // Generate thumbnail
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const thumb = await generateThumbnail(pdfjsDoc);
      setThumbnailUrl(thumb);
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. It might be corrupted or password protected.");
      setFile(null);
    } finally {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
      }, 350);
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current !== null) {
        window.clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const pdfToBytes = async (src: PDFDocument, indices: number[]): Promise<Uint8Array> => {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    return out.save();
  };

  const downloadBlob = (bytes: Uint8Array, name: string) => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setDownloadName(name.replace(/\.pdf$/i, "") + " - Thundocs.pdf");
    setDownloadSizeLabel(formatSizeLabel(blob.size));
    const a = document.createElement("a");
    a.href = url;
    a.download = name.replace(/\.pdf$/i, "") + " - Thundocs.pdf";
    a.click();
  };

  const parseCustomIndices = (str: string): number[] => {
    const parts = str.split(",").map((p) => p.trim());
    const indices = new Set<number>();
    for (const part of parts) {
      if (part.includes("-")) {
        const [s, e] = part.split("-").map(Number);
        if (!isNaN(s) && !isNaN(e))
          for (let i = s; i <= e; i++)
            if (i >= 1 && i <= pageCount) indices.add(i - 1);
      } else {
        const pg = parseInt(part);
        if (!isNaN(pg) && pg >= 1 && pg <= pageCount) indices.add(pg - 1);
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const formatSizeLabel = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    }
    const kb = Math.max(bytes / 1024, 1);
    return `${kb.toFixed(1)} KB`;
  };

  // ── main handler ─────────────────────────────────────────────────────────
  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const baseName = file.name.replace(/\.pdf$/i, "");

      // ── Mode 1: Page Range → single PDF download ────────────────────────
      if (mode === "range") {
        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);
        if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end)
          throw new Error("Invalid page range");
        const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
        const bytes = await pdfToBytes(srcPdf, indices);
        downloadBlob(bytes, `${baseName}_pages_${start}-${end}.pdf`);
        setSuccess(`Downloaded pages ${start}–${end} as a single PDF.`);
      }

      // ── Mode 2: Custom Selection → single PDF ───────────────────────────
      else if (mode === "extract") {
        const indices = parseCustomIndices(customPages);
        if (indices.length === 0) throw new Error("No valid pages selected");
        const bytes = await pdfToBytes(srcPdf, indices);
        downloadBlob(bytes, `${baseName}_selection.pdf`);
        setSuccess(`Downloaded ${indices.length} selected pages as a single PDF.`);
      }

      // ── Mode 3: Every page → ZIP of individual PDFs ─────────────────────
      else if (mode === "every-page") {
        const zip = new JSZip();
        const folder = zip.folder(baseName) ?? zip;
        for (let i = 0; i < pageCount; i++) {
          const bytes = await pdfToBytes(srcPdf, [i]);
          folder.file(`page_${String(i + 1).padStart(3, "0")}.pdf`, bytes);
        }
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName(`${baseName}_all_pages - Thundocs.zip`);
        setDownloadSizeLabel(formatSizeLabel(zipBlob.size));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_all_pages - Thundocs.zip`;
        a.click();
        setSuccess(`Downloaded ${pageCount} individual page PDFs as a ZIP archive.`);
      }

      // ── Mode 4: Every N pages → ZIP of chunks ───────────────────────────
      else if (mode === "every-n") {
        const n = parseInt(chunkSize);
        if (isNaN(n) || n < 1) throw new Error("Chunk size must be at least 1");
        const zip = new JSZip();
        const folder = zip.folder(baseName) ?? zip;
        let part = 1;
        for (let i = 0; i < pageCount; i += n) {
          const indices = Array.from({ length: Math.min(n, pageCount - i) }, (_, k) => i + k);
          const bytes = await pdfToBytes(srcPdf, indices);
          const startPage = i + 1;
          const endPage = Math.min(i + n, pageCount);
          folder.file(`part_${String(part).padStart(2, "0")}_pages_${startPage}-${endPage}.pdf`, bytes);
          part++;
        }
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName(`${baseName}_chunks - Thundocs.zip`);
        setDownloadSizeLabel(formatSizeLabel(zipBlob.size));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_chunks - Thundocs.zip`;
        a.click();
        setSuccess(`Downloaded ${part - 1} chunks of ≤${n} pages each as a ZIP archive.`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to split PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const modeOptions: { value: SplitMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "range", label: "Page Range", desc: "Extract pages e.g. 3–7 → one PDF", icon: <FileText className="w-5 h-5" /> },
    { value: "extract", label: "Custom Selection", desc: "Pick any pages e.g. 1, 3, 5–7", icon: <Scissors className="w-5 h-5" /> },
    { value: "every-page", label: "Every Page", desc: "One PDF per page → downloaded as ZIP", icon: <Archive className="w-5 h-5" /> },
    { value: "every-n", label: "Every N Pages", desc: "Split into N-page chunks → ZIP", icon: <Layers className="w-5 h-5" /> },
  ];

  const showSuccessCard = !!(success && !isProcessing && downloadUrl);

  return (
    <div className={`hero-group relative min-h-screen bg-[#020408] ${themeStyles.text} font-sans transition-colors duration-300`}>
      {/* Background grid + orb + lightning */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
          <svg
            viewBox="0 0 512 512"
            className="thunder-bolt-svg hero-bolt split-bolt w-full h-full"
          >
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>

      <div className="relative z-10">
        <ToolNavbar />

        <div className="container mx-auto px-4 py-6 md:py-10 flex flex-col items-center justify-center min-h-[80vh]">
          <div className={cn("w-full transition-all duration-500 space-y-3", file ? "max-w-4xl" : "max-w-2xl")}>
          {/* Hero (hidden on download success view) */}
          {!showSuccessCard && (
            <div className="text-center space-y-2 mt-4 md:mt-8">
              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
                Split PDF
              </h1>
              <p className="text-sm max-w-2xl mx-auto font-body text-white/80">
                Extract a range, pick specific pages, split every page, or chunk into equal pieces.
              </p>
            </div>
          )}

          {/* Drop zone (hidden when showing success card) */}
          {!file && !showSuccessCard && (
            <div className="w-full flex justify-center">
              <div
                {...getRootProps()}
                className={cn("split-upload-card", isDragActive && "drag-active")}
                role="button"
                aria-label="Upload PDF to split"
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

                <h3 style={{ marginBottom: "0.5rem", fontWeight: 600, fontSize: "1.25rem", color: "#111827" }}>
                  {isDragActive ? "Drop it here!" : "Upload File"}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                  {isDragActive ? "Release to upload" : "Drag & drop or select"}
                </p>

                <button
                  type="button"
                  className="btn-main"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
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
            </div>
          )}

          {/* Options panel (hidden when showing success card) */}
          {file && !showSuccessCard && (
            <motion.div
              key="options-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-3"
            >
              {/* Settings panel */}
              <div
                {...getRootProps()}
                className={`glass-panel rounded-xl p-3 md:p-4 border backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${isDragActive ? "border-cyan-400/50 bg-slate-950/90 ring-2 ring-cyan-500/30" : "border-white/10 bg-slate-950/70"}`}
              >
                {isDragActive && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-cyan-400/50">
                    <p className="text-xl font-medium text-cyan-300">Drop PDF to replace</p>
                  </div>
                )}
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                  {/* Left Side: File Preview */}
                  <div className="flex flex-col items-center lg:items-start lg:w-1/3 xl:w-[160px] shrink-0">
                    <div className="relative group mx-auto lg:mx-0">
                      {/* File Card UI */}
                      <div className="w-36 h-48 rounded-lg bg-white/[0.03] backdrop-blur-md border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group-hover:bg-white/[0.06] transition-all shadow-2xl">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="PDF Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <FileText className="w-12 h-12 text-cyan-400/40" />
                            <span className="text-[9px] uppercase tracking-widest text-cyan-500/50 font-bold">PDF Document</span>
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 px-1.5 py-0.5 rounded bg-slate-900/60 backdrop-blur-xl border border-white/20 text-[9px] font-bold text-white shadow-2xl">
                          {pageCount > 0 ? `${pageCount} PAGES` : "PDF"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5 text-center lg:text-left w-full">
                      <p className={cn("font-bold text-sm truncate", themeStyles.text)} title={file.name}>
                        {file.name}
                      </p>
                      <p className={cn("text-[9px] font-medium tracking-wide uppercase opacity-50", themeStyles.subtext)}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Settings & Action */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <h3 className={cn("text-base font-heading font-bold flex items-center gap-2", themeStyles.text)}>
                          <Scissors className="w-4 h-4 text-cyan-400" />
                          Settings
                        </h3>
                        {/* Mode cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                          {modeOptions.map(({ value, label, icon }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setMode(value)}
                              className={cn(
                                "text-left p-2 rounded-lg border transition-all duration-300",
                                mode === value
                                  ? "border-cyan-500/60 bg-cyan-500/[0.12] shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                  : "border-white/10 bg-white/[0.04] opacity-80 hover:opacity-100",
                                "hover:border-white/30"
                              )}
                            >
                              <div className={cn("mb-1 scale-90 origin-left transition-colors", mode === value ? "text-cyan-400" : "text-white/40")}>
                                {icon}
                              </div>
                              <p className={cn("text-xs font-heading font-bold transition-colors", mode === value ? "text-white" : "text-white/70")}>{label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode-specific controls */}
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-3 min-h-[80px] flex flex-col justify-center">
                        {mode === "range" && (
                          <div className="flex items-end gap-4 w-full">
                            <div className="space-y-1 flex-1">
                              <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>From</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={1}
                                  max={pageCount}
                                  value={rangeStart}
                                  onChange={(e) => setRangeStart(e.target.value)}
                                  className="pr-8 bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all h-8 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center items-center py-0.5 z-10">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRangeStart((p) => {
                                        const v = parseInt(p || "0", 10) + 1;
                                        return v <= pageCount ? v.toString() : pageCount.toString();
                                      })
                                    }
                                    className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors"
                                  >
                                    <ChevronUp className="w-[14px] h-[14px]" strokeWidth={3} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRangeStart((p) => {
                                        const v = parseInt(p || "1", 10) - 1;
                                        return v > 1 ? v.toString() : "1";
                                      })
                                    }
                                    className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors mt-0.5"
                                  >
                                    <ChevronDown className="w-[14px] h-[14px]" strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 flex-1">
                              <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>To</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={1}
                                  max={pageCount}
                                  value={rangeEnd}
                                  onChange={(e) => setRangeEnd(e.target.value)}
                                  className="pr-8 bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all h-8 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center items-center py-0.5 z-10">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRangeEnd((p) => {
                                        const v = parseInt(p || "0", 10) + 1;
                                        return v <= pageCount ? v.toString() : pageCount.toString();
                                      })
                                    }
                                    className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors"
                                  >
                                    <ChevronUp className="w-[14px] h-[14px]" strokeWidth={3} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRangeEnd((p) => {
                                        const v = parseInt(p || "1", 10) - 1;
                                        return v > 1 ? v.toString() : "1";
                                      })
                                    }
                                    className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors mt-0.5"
                                  >
                                    <ChevronDown className="w-[14px] h-[14px]" strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {mode === "extract" && (
                          <div className="space-y-1.5">
                            <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>Pages to Extract</Label>
                            <Input
                              placeholder="e.g. 1, 3-5, 8"
                              value={customPages}
                              onChange={(e) => setCustomPages(e.target.value)}
                              className="bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all h-8 text-xs"
                            />
                          </div>
                        )}
                        {mode === "every-page" && (
                          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-cyan-500/[0.05] border border-cyan-500/20">
                            <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
                            <p className={cn("text-xs leading-tight text-white/80")}>
                              All <strong className="text-white">{pageCount} pages</strong> saved as ZIP.
                            </p>
                          </div>
                        )}
                        {mode === "every-n" && (
                          <div className="space-y-1.5">
                            <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>Pages per Chunk</Label>
                            <div className="w-20 relative">
                              <Input
                                type="number"
                                min={1}
                                max={pageCount}
                                value={chunkSize}
                                onChange={(e) => setChunkSize(e.target.value)}
                                className="w-full pr-8 bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                              />
                              <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center items-center py-0.5 z-10">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setChunkSize((p) => {
                                      const v = parseInt(p || "0", 10) + 1;
                                      return v <= pageCount ? v.toString() : pageCount.toString();
                                    })
                                  }
                                  className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors"
                                >
                                  <ChevronUp className="w-[14px] h-[14px]" strokeWidth={3} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setChunkSize((p) => {
                                      const v = parseInt(p || "1", 10) - 1;
                                      return v > 1 ? v.toString() : "1";
                                    })
                                  }
                                  className="text-white/40 hover:text-white focus:outline-none h-[10px] flex items-center justify-center transition-colors mt-0.5"
                                >
                                  <ChevronDown className="w-[14px] h-[14px]" strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Action Button Row */}
                    <div className="flex flex-col items-end gap-2 pt-1">
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 w-full md:w-auto overflow-hidden"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <p className="text-red-500 text-xs">{error}</p>
                          </motion.div>
                        )}

                        {success && !isProcessing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: 5 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: 5 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 backdrop-blur-md overflow-hidden"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-xs font-heading font-medium tracking-wide whitespace-nowrap">{success}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button
                        size="sm"
                        onClick={handleSplit}
                        disabled={isProcessing}
                        className={cn(
                          "w-full md:w-auto md:min-w-[140px] h-9 text-xs font-heading font-bold transition-all duration-300 rounded-lg shadow-2xl",
                          isProcessing ? "opacity-30 cursor-not-allowed" : "hover:scale-105 hover:bg-white/20 active:scale-95",
                          "bg-white/10 backdrop-blur-md border-none text-white"
                        )}
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{mode === "every-page" || mode === "every-n" ? "Building..." : "Splitting..."}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {mode === "every-page" || mode === "every-n" ? <Archive className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                            <span>
                              {mode === "every-page"
                                ? "Download ZIP"
                                : mode === "every-n"
                                ? "Chunk to ZIP"
                                : "Split PDF"}
                            </span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Centered success card – copy of Compress download card, without blobs, settings, or chevron */}
          {showSuccessCard && downloadUrl && (
            <SplitDownloadCard
              title={success || ""}
              primaryLabel={downloadName?.endsWith(".zip") ? "Download ZIP" : "Download PDF"}
              downloadUrl={downloadUrl}
              onDownload={() => {
                if (!downloadUrl) return;
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = downloadName || "split-document - Thundocs";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              contextLabel="Split complete"
              sizeLabel={downloadSizeLabel || undefined}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
