import React, { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import { Upload, FileText, X, AlertCircle, ExternalLink, Link as LinkIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import SplitDownloadCard from "@/components/SplitDownloadCard";
import { LightningBackground } from "@/components/LightningBackground";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_BASE = import.meta.env.VITE_BACKEND_ORIGIN || "";

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "idle" | "loading" | "ready" | "converting" | "done";

export default function PdfToWordPage() {
  const { themeStyles } = useTheme();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("idle");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSizeMB, setFileSizeMB] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [docxDataUrl, setDocxDataUrl] = useState<string | null>(null);
  const [docxName, setDocxName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loNotFound, setLoNotFound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dropboxReady, setDropboxReady] = useState(false);
  const [googleDriveReady, setGoogleDriveReady] = useState(false);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // --- Initialize Dropbox Script for Saving ---
    const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
    if (appKey) {
      if (!(window as any).Dropbox) {
        const script = document.createElement("script");
        script.src = "https://www.dropbox.com/static/api/2/dropins.js";
        script.id = "dropboxjs";
        script.setAttribute("data-app-key", appKey);
        script.onload = () => setDropboxReady(true);
        document.body.appendChild(script);
      } else {
        setDropboxReady(true);
      }
    }

    // --- Initialize Google Drive Script for Saving ---
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId) {
      if (!(window as any).google?.accounts) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = () => setGoogleDriveReady(true);
        document.body.appendChild(script);
      } else {
        setGoogleDriveReady(true);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const animateProgress = (from: number, to: number, durationMs: number) =>
    new Promise<void>((resolve) => {
      const steps = 30;
      const stepMs = durationMs / steps;
      const increment = (to - from) / steps;
      let current = from;
      timerRef.current = setInterval(() => {
        current += increment;
        setRingProgress(Math.min(Math.round(current), to));
        if (current >= to) { stopTimer(); resolve(); }
      }, stepMs);
    });

  const generateThumbnail = async (file: File): Promise<string | null> => {
    try {
      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp } as any).promise;
      const url = canvas.toDataURL("image/jpeg", 0.75);
      canvas.width = 0; canvas.height = 0;
      return url;
    } catch { return null; }
  };

  // ── File drop ────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    const f = accepted[0];
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file"); return;
    }
    fileRef.current = f;
    setFileName(f.name);
    setFileSizeMB(f.size / 1024 / 1024);
    setError(null);
    setLoNotFound(false);
    setDocxUrl(null);
    setRingProgress(0);
    setStage("loading");

    // Animate ring 0 → 90% while thumbnail loads
    animateProgress(0, 90, 1800);
    const thumb = await generateThumbnail(f);
    stopTimer();
    setRingProgress(100);
    await new Promise((r) => setTimeout(r, 300)); // brief 100% flash

    setThumbnailUrl(thumb);
    setStage("ready");
    setRingProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  // ── Conversion ────────────────────────────────────────────────────────────────
  const logClientError = async (tool: string, payload: any, extra?: Record<string, any>) => {
    try {
      await fetch(`${API_BASE}/api/client-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          message: payload?.message || String(payload),
          stack: payload?.stack,
          detail: extra,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleConvert = () => {
    if (!fileRef.current) return;
    setStage("converting");
    setError(null);
    setLoNotFound(false);
    setRingProgress(0);
    animateProgress(0, 92, 4000);

    const formData = new FormData();
    formData.append("pdf", fileRef.current);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/pdf-to-word`);
    xhr.responseType = "arraybuffer";

    xhr.onload = () => {
      stopTimer();
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = new Blob([xhr.response], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const name = (fileRef.current!.name || "document").replace(/\.pdf$/i, "") + ".docx";
        const url = URL.createObjectURL(blob);

        const reader = new FileReader();
        reader.onloadend = () => {
          setDocxDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);

        setDocxUrl(url);
        setDocxName(name);
        setRingProgress(100);
        setStage("done");
      } else {
        try {
          const decoder = new TextDecoder();
          const json = JSON.parse(decoder.decode(xhr.response));
          if (json.libreofficeNotFound) setLoNotFound(true);
          setError(json.error || `Server error (${xhr.status})`);
          logClientError("pdf-to-word", new Error(json.error || `Server error (${xhr.status})`), { status: xhr.status });
        } catch {
          setError(`Server error (${xhr.status})`);
          logClientError("pdf-to-word", new Error("Server error"), { status: xhr.status });
        }
        setStage("ready"); // back to ready so user can retry
      }
    };

    xhr.onerror = () => {
      setError("Network error — make sure the server is running.");
      logClientError("pdf-to-word", new Error("Network error"), { status: "network-error" });
      stopTimer();
      setRingProgress(0);
      setStage("ready");
    };

    xhr.send(formData);
  };

  const handleDownload = () => {
    if (!docxUrl) return;
    const a = document.createElement("a");
    a.href = docxUrl;
    a.download = docxName.replace(/\.docx$/i, "") + " - Thundocs.docx";
    a.click();
  };

  const handleReset = () => {
    stopTimer();
    if (docxUrl) URL.revokeObjectURL(docxUrl);
    fileRef.current = null;
    setStage("idle");
    setThumbnailUrl(null);
    setDocxUrl(null);
    setDocxDataUrl(null);
    setError(null);
    setLoNotFound(false);
    setRingProgress(0);
  };

  const handleGoogleDriveSave = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleDriveReady) {
      toast({
        title: "Integration Required",
        description: "Google Drive saving requires a valid Client ID and page reload.",
        variant: "destructive"
      });
      return;
    }

    if (!docxUrl) return;

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          toast({ title: "Saving...", description: "Uploading document to Google Drive." });
          try {
            const fileBlob = await fetch(docxUrl).then(r => r.blob());
            const metadata = {
              name: docxName || "Converted_Document.docx",
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            };

            const form = new FormData();
            form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
            form.append("file", fileBlob);

            const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
              method: "POST",
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              body: form
            });

            if (!res.ok) throw new Error("Upload failed");
            toast({ title: "Success", description: "Document saved to Google Drive!" });
          } catch (err) {
            toast({ title: "Save Failed", description: "Could not upload to Google Drive.", variant: "destructive" });
          }
        } else if (tokenResponse?.error) {
          toast({ title: "Google Drive Error", description: tokenResponse.error_description || "Authentication failed", variant: "destructive" });
        }
      }
    });
    tokenClient.requestAccessToken();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <LightningBackground className={cn(themeStyles.text, "font-sans")}>
      <ToolNavbar />
      <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
        <div className="w-full max-w-3xl space-y-8">

          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">
              PDF to Word
            </h1>
            <p className={cn("text-lg max-w-2xl mx-auto", themeStyles.subtext)}>
              Convert any PDF to a fully formatted, editable .docx file —<br />
              fonts, tables, columns and images preserved.
            </p>
          </div>

          {/* ── STAGE: IDLE ─────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex justify-center"
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] transition-all duration-300 w-[360px] min-h-[520px] flex flex-col items-center justify-center text-center gap-4",
                    isDragActive
                      ? "border-blue-500/50 bg-slate-950/90 ring-2 ring-blue-500/30"
                      : "border-white/10 bg-slate-950/70"
                  )}
                >
                  <input {...getInputProps()} />
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 15,
                      background: "#000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
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
                    className="text-sm md:text-base font-semibold tracking-[0.18em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-300 mb-1"
                  >
                    {isDragActive ? "Drop your PDF here" : "Upload PDF"}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginBottom: 0 }}>
                    Drag & drop PDF or click to browse
                  </p>

                  <button
                    type="button"
                    className="btn-main"
                    style={{
                      background: "#111111",
                      color: "white",
                      padding: "0.75rem 2.5rem",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      fontSize: "1rem",
                      marginTop: "0.25rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                  >
                    Select PDF
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STAGE: LOADING (thumbnail generation) ─────────────────────── */}
            {stage === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex justify-center"
              >
                <div className="glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl w-[360px] min-h-[520px] text-center space-y-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
                      Preparing PDF
                    </p>
                    <p className="text-lg font-semibold text-white truncate">
                      {fileName || "Loading document…"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="text-4xl md:text-5xl font-extrabold text-white">
                      {ringProgress}%
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
                        style={{ width: `${Math.min(Math.max(ringProgress, 5), 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className={cn("text-xs text-slate-300", themeStyles.subtext)}>
                    Reading file and generating a smart preview…
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── STAGE: READY (thumbnail + convert button) ──────────────────── */}
            {stage === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex justify-center"
              >
                <div
                  {...(getRootProps() as any)}
                  className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-blue-500/50 bg-slate-950/90 ring-2 ring-blue-500/30" : "border-white/10 bg-slate-950/70"}`}
                >
                  {isDragActive && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-blue-500/50">
                      <p className="text-xl font-medium text-blue-400">Drop PDF to replace</p>
                    </div>
                  )}

                  {/* PDF thumbnail card (pushed towards center) */}
                  <div className="flex flex-col items-center justify-center flex-1">
                    <div className="relative group">
                      <div className="w-48 h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                        {thumbnailUrl
                          ? <img src={thumbnailUrl} alt="PDF preview" className="w-full h-full object-cover" />
                          : <FileText className="w-16 h-16 text-blue-500/40" />
                        }
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {/* PDF label overlay */}
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-white tracking-wider">
                        PDF
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 flex flex-col items-center w-full mt-4">
                    {/* File info */}
                    <div className="text-center">
                      <p className="font-semibold text-white truncate w-64" title={fileName}>{fileName}</p>
                      <p className={cn("text-xs uppercase tracking-wide opacity-50 mt-0.5", themeStyles.subtext)}>
                        {fileSizeMB.toFixed(2)} MB
                      </p>
                    </div>

                    {/* Errors */}
                    {(error || loNotFound) && import.meta.env.DEV && (
                      <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          {loNotFound
                            ? <>LibreOffice not installed. <a href="https://www.libreoffice.org/download/download-libreoffice/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Download <ExternalLink className="w-3 h-3" /></a></>
                            : error}
                        </span>
                      </div>
                    )}

                    {/* Convert button */}
                    <div className="w-full flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvert();
                        }}
                        style={{
                          background: "#111111",
                          color: "white",
                          padding: "0.75rem 2.5rem",
                          borderRadius: "9999px",
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          marginTop: "0.5rem",
                          transition: "all 0.2s ease-in-out",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        Convert to Word
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STAGE: CONVERTING (glass-panel progress) ───────────────────── */}
            {stage === "converting" && (
              <motion.div
                key="converting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex justify-center"
              >
                <div className="glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl w-[360px] min-h-[520px] text-center space-y-8 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
                      Processing Stream
                    </p>
                    <p className="text-lg font-semibold text-white truncate">
                      {fileName || "Your document"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="text-5xl md:text-6xl font-extrabold text-white">
                      {ringProgress}%
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
                        style={{ width: `${Math.min(Math.max(ringProgress, 5), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    {[
                      "Uploading to processing buffer",
                      "Analyzing document structure",
                      "Merging visual layers",
                      "Optimizing for output"
                    ].map((label, idx) => {
                      const thresholds = [5, 30, 60, 85];
                      const active = ringProgress >= thresholds[idx] && ringProgress < (thresholds[idx + 1] ?? 101);
                      const completed = ringProgress >= (thresholds[idx + 1] ?? 101);
                      const dotClass = completed
                        ? "bg-orange-400"
                        : active
                          ? "bg-pink-500"
                          : "bg-slate-500/40";
                      const textClass = completed
                        ? "text-orange-300"
                        : active
                          ? "text-white"
                          : "text-slate-400";

                      const sizeClass = active ? "w-3 h-3" : "w-2.5 h-2.5";
                      const pulseClass = active ? "animate-step-pulse" : "";

                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`${sizeClass} rounded-full ${dotClass} ${pulseClass}`} />
                          <span className={`text-sm ${textClass}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {stage === "done" && docxUrl && (
            <div className="text-center p-4 mt-6">
              <SplitDownloadCard
                title="Your PDF has been converted to Word"
                primaryLabel="Download WORD"
                downloadUrl={docxUrl}
                onDownload={handleDownload}
                contextLabel="Converted"
              />
            </div>
          )}

        </div>
      </div>
    </LightningBackground>
  );
}
