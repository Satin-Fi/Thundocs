import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import { Upload, AlertCircle, Loader2, Monitor, Plus, Merge } from "lucide-react";
import { cn } from "@/lib/utils";
import PdfReorderGrid, { PdfFile } from "./PdfReorderGrid";
import SplitDownloadCard from "@/components/SplitDownloadCard";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function MergePage() {
  const { themeStyles, isNight } = useTheme();
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("merged-document - Thundocs.pdf");
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const loadPageCount = async (buf: ArrayBuffer): Promise<number | null> => {
    try { const pdf = await PDFDocument.load(buf.slice(0)); return pdf.getPageCount(); }
    catch { return null; }
  };

  const generateThumbnail = async (buf: ArrayBuffer): Promise<string | null> => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      // Release GPU memory
      canvas.width = 0;
      canvas.height = 0;
      return dataUrl;
    } catch {
      return null;
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setIsUploading(true);
    try {
      const items = await Promise.all(
        acceptedFiles.map(async (file) => {
          const buf = await file.arrayBuffer();
          const [pageCount, thumbnailUrl] = await Promise.all([
            loadPageCount(buf),
            generateThumbnail(buf),
          ]);
          return {
            id: Math.random().toString(36).substring(7),
            file,
            name: file.name,
            size: file.size,
            pageCount,
            thumbnailUrl,
          };
        })
      );
      setFiles((prev) => [...prev, ...items]);
      setError(null);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
      setSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });
  const removeFile = (id: string) => {
    setFiles((p) => p.filter((f) => f.id !== id));
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setSuccess(false);
  };


  const handleMerge = async () => {
    if (files.length < 2) { setError("Please select at least 2 PDF files."); return; }
    setIsProcessing(true); setError(null);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const pdfFile of files) {
        const buf = await pdfFile.file.arrayBuffer();
        let pdf: PDFDocument;
        try {
          pdf = await PDFDocument.load(buf);
        } catch (loadErr: any) {
          const msg = String(loadErr?.message ?? "");
          if (msg.toLowerCase().includes("encrypt")) {
            throw new Error(`"${pdfFile.name}" is password-protected — unlock or remove it first.`);
          }
          throw new Error(`"${pdfFile.name}" could not be read. It may be corrupted.`);
        }
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
      }
      const bytes = await mergedPdf.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName("merged-document - Thundocs.pdf");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to merge PDFs.");
    } finally { setIsProcessing(false); }
  };

  const totalPages = files.reduce((s, f) => s + (f.pageCount ?? 0), 0);

  return (
    <div className={`min-h-screen merge-bg ${themeStyles.text} font-sans transition-colors duration-300`}>
      <ToolNavbar />

      {/* Hidden file input for all "My Computer" / open() triggers */}
      <input {...getInputProps()} className="hidden" />

      <div className={cn(
        "container mx-auto px-4 py-8 md:py-16 flex flex-col items-center min-h-[90vh] relative z-10",
        files.length === 0 ? "justify-center" : "justify-start"
      )} style={{ scrollbarGutter: 'stable' }}>
        <div className="w-full max-w-4xl space-y-8">

          {/* ---- EMPTY STATE ---- */}
          {files.length === 0 ? (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h1 className={cn("text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md pb-2")}>
                  Merge PDF
                </h1>
                <p className={cn("text-base md:text-lg max-w-2xl mx-auto text-white/90 font-medium drop-shadow-sm")}>
                  Extract a range, pick specific pages, split every page, or chunk into equal pieces.
                </p>
              </div>

              {isUploading ? (
                <UploadingRing label="Uploading PDFs..." />
              ) : (
                <div className="flex justify-center w-full">
                  <div
                    {...getRootProps()}
                    className={cn("split-upload-card", isDragActive && "drag-active")}
                  >
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
                      <Upload className="w-6 h-6 text-black" strokeWidth={2} />
                    </div>

                    <h3
                      style={{
                        marginBottom: "0.5rem",
                        fontWeight: 600,
                        fontSize: "1.25rem",
                        color: "#111827",
                      }}
                    >
                      {isDragActive ? "Drop PDF here" : "Merge PDF"}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                      Select 2 or more PDFs to combine
                    </p>

                    <button
                      type="button"
                      className="btn-main"
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                    >
                      Select Files
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ---- FILLED STATE ---- */
            <div className="space-y-6">
              {success && !isProcessing && downloadUrl ? (
                <div className="text-center p-4">
                  <SplitDownloadCard
                    title="Your PDFs have been merged into a single file"
                    primaryLabel="Download PDF"
                    downloadUrl={downloadUrl}
                    onDownload={() => {
                      const a = document.createElement("a");
                      a.href = downloadUrl;
                      a.download = downloadName || "merged-document - Thundocs.pdf";
                      a.click();
                    }}
                    contextLabel="Merged"
                  />
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={cn(
                    "glass-panel rounded-2xl p-6 space-y-6 transition-all relative outline-none focus:outline-none focus:ring-0",
                    isDragActive ? "ring-1 ring-white/20" : ""
                  )}
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
                  {isDragActive && !isSorting && (
                    <div className="absolute inset-0 rounded-2xl backdrop-blur-md bg-black/30 flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-4">
                        <Upload className="w-12 h-12 text-white animate-bounce" />
                        <span className="text-2xl font-bold text-white drop-shadow-md">
                          Drop PDFs to Add
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4 pl-2">
                    <div>
                      <h3 className="flex items-baseline gap-2 drop-shadow-sm">
                        <span className="text-xl font-bold text-white">
                          {files.length} {files.length === 1 ? "file" : "files"}
                        </span>
                        {totalPages > 0 && (
                          <span className="text-sm font-medium text-white/70">
                            · {totalPages} total pages
                          </span>
                        )}
                      </h3>
                      <p className="text-xs mt-1 text-white/70 font-medium tracking-wide">
                        Drag cards to reorder before merging
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiles([])}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        Clear All
                      </Button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={open}
                        className="w-10 h-10 rounded-full bg-white/10 border border-white/30 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-white/16 hover:border-white/50 outline-none transition-all duration-200"
                        title="Add more files"
                      >
                        <Plus className="w-5 h-5 stroke-[2.4]" />
                      </motion.button>
                    </div>
                  </div>

                  <PdfReorderGrid
                    files={files}
                    onReorder={setFiles}
                    onDelete={removeFile}
                    onSelect={setSelectedId}
                    selectedId={selectedId}
                    onSortStart={() => setIsSorting(true)}
                    onSortEnd={() => setIsSorting(false)}
                  />

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-500 text-sm">{error}</p>
                    </motion.div>
                  )}

                  <div className="flex justify-center mt-8 relative z-10">
                    <motion.button
                      onClick={handleMerge}
                      disabled={isProcessing || files.length < 2}
                      whileHover={!isProcessing && files.length >= 2 ? { scale: 1.05 } : {}}
                      whileTap={!isProcessing && files.length >= 2 ? { scale: 0.98 } : {}}
                      className={cn(
                        "relative flex items-center justify-center gap-2 px-8 py-3 rounded-full backdrop-blur-xl border font-semibold text-sm transition-all duration-300 cursor-pointer overflow-hidden shadow-xl min-w-[180px]",
                        isProcessing || files.length < 2
                          ? "opacity-50 cursor-not-allowed bg-black/40 border-white/20 text-white/70"
                          : "bg-black border-black text-white hover:bg-black/90 hover:shadow-2xl"
                      )}
                    >
                      {!isProcessing && files.length >= 2 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] hover:animate-[shimmer_1.5s_infinite]" />
                      )}
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                          Merging...
                        </>
                      ) : (
                        <span>Merge PDFs</span>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
