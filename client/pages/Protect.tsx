import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import {
  Upload,
  FileText,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Loader2,
  Sun,
  Moon,
  ServerCrash,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SplitDownloadCard from "@/components/SplitDownloadCard";
import { LightningBackground } from "@/components/LightningBackground";

// Configure PDF.js worker
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PermissionState {
  printing: boolean;
  modifying: boolean;
  copying: boolean;
  annotating: boolean;
  fillingForms: boolean;
  documentAssembly: boolean;
}

export default function ProtectPage() {
  const { themeStyles, isNight, setTheme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Server health
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  const [permissions, setPermissions] = useState<PermissionState>({
    printing: true,
    modifying: false,
    copying: true,
    annotating: true,
    fillingForms: true,
    documentAssembly: false,
  });

  // Check if Express server is reachable (same origin)
  useEffect(() => {
    fetch("/api/ping")
      .then((r) => r.ok ? setServerStatus("online") : setServerStatus("offline"))
      .catch(() => setServerStatus("offline"));
  }, []);

  const [isUploading, setIsUploading] = useState(false);

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
      setError("Please upload a PDF file");
      return;
    }
    setFile(selectedFile);
    setError(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setDownloadName("");
    setSuccess(false);

    setIsUploading(true);
    try {
      const buf = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(pdf.numPages);
      const thumb = await generateThumbnail(pdf);
      setThumbnailUrl(thumb);
    } catch (err) {
      console.error("PDF load error:", err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const handleProtect = async () => {
    if (!file) return;
    if (!userPassword && !ownerPassword) {
      setError("Please enter at least one password");
      return;
    }
    if (serverStatus !== "online") {
      setError("The Thundocs server must be running to encrypt PDFs. Start it with `npm run dev`.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      if (userPassword) formData.append("userPassword", userPassword);
      formData.append("ownerPassword", ownerPassword || userPassword);
      formData.append("allowPrinting", ownerPassword && permissions.printing ? "1" : "0");
      formData.append("allowModifying", ownerPassword && permissions.modifying ? "1" : "0");
      formData.append("allowCopying", ownerPassword && permissions.copying ? "1" : "0");
      formData.append("allowAnnotating", ownerPassword && permissions.annotating ? "1" : "0");
      formData.append("allowForms", ownerPassword && permissions.fillingForms ? "1" : "0");
      formData.append("allowAssembly", ownerPassword && permissions.documentAssembly ? "1" : "0");
      formData.append("file", file);

      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/protect-pdf");
        xhr.responseType = "blob";

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            const errorReader = new FileReader();
            errorReader.onload = () => {
              try {
                const data = JSON.parse(errorReader.result as string);
                const message = data?.error && data?.details ? `${data.error}: ${data.details}` : data?.error ? String(data.error) : `Server error: ${xhr.status}`;
                reject(new Error(message));
              } catch {
                reject(new Error(`Server error: ${xhr.status}`));
              }
            };
            errorReader.readAsText(xhr.response);
          }
        };

        xhr.onerror = () => {
          reject(new Error("Failed to protect PDF due to a network error."));
        };

        xhr.send(formData);
      });
      console.log("Protect blob generated:", blob.size, blob.type);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      console.log("Protect blob URL:", url);
      setDownloadUrl(url);
      setDownloadName(`protected_${file.name.replace(/\.[^/.]+$/, "")} - Thundocs.pdf`);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to protect PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const permissionConfig = [
    { key: "printing" as const, label: "Allow Printing", description: "Users can print this document" },
    { key: "copying" as const, label: "Allow Copying Text", description: "Users can copy content" },
    { key: "modifying" as const, label: "Allow Modifying", description: "Users can make changes" },
    { key: "annotating" as const, label: "Allow Annotations", description: "Users can add comments" },
    { key: "fillingForms" as const, label: "Allow Form Filling", description: "Users can fill in forms" },
    { key: "documentAssembly" as const, label: "Allow Document Assembly", description: "Users can insert/delete pages" },
  ];

  return (
    <LightningBackground className={`${themeStyles.text} font-sans transition-colors duration-300`}>
      <ToolNavbar />

      <div className="container mx-auto px-4 py-2 md:py-4 flex flex-col items-center justify-center min-h-[80vh]">
        <div className={cn("w-full transition-all duration-500 space-y-3", file ? "max-w-4xl" : "max-w-2xl")}>
          {/* Hero */}
          <div className="text-center space-y-1">
            <h1 className={cn("text-2xl md:text-3xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400")}>
              Protect PDF
            </h1>
            <p className={cn("text-sm max-w-2xl mx-auto font-body", themeStyles.subtext)}>
              Encrypt your PDF with AES-128 password protection and granular permission controls.
            </p>
          </div>

          {/* Server offline banner */}
          <AnimatePresence>
            {serverStatus === "offline" && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-start gap-2"
              >
                <ServerCrash className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-heading font-bold text-xs text-slate-200">Thundocs server is not running</p>
                  <p className={cn("text-[10px] mt-0.5", themeStyles.subtext)}>
                    PDF encryption requires the built-in Express server. Start it with <code className="font-mono bg-slate-500/20 px-1 rounded">npm run dev</code> and reload.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!file && (
            isUploading ? (
              <UploadingRing label="Uploading PDF..." />
            ) : (
              <div className="w-full flex justify-center">
                <div
                  {...getRootProps()}
                  className={cn(
                    "glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] transition-all duration-300 w-[360px] min-h-[520px] flex flex-col items-center justify-center text-center gap-4",
                    isDragActive
                      ? "border-cyan-400/50 bg-slate-950/90 ring-2 ring-cyan-500/30"
                      : "border-white/10 bg-slate-950/70"
                  )}
                  role="button"
                  aria-label="Upload PDF to protect"
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

                  <h3 className="text-sm md:text-base font-semibold tracking-[0.18em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-300 mb-1">
                    {isDragActive ? "Drop PDF here" : "Upload PDF"}
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
                    Choose PDF File
                  </button>
                </div>
              </div>
            )
          )}

          {/* Options panel */}
          <AnimatePresence>
            {file && !success && (
              <motion.div
                key="options-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-3"
              >
                <div
                  {...getRootProps()}
                  className={`glass-panel rounded-xl p-3 md:p-4 border backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${isDragActive ? "border-cyan-400/50 bg-slate-950/90 ring-2 ring-cyan-500/30" : "border-white/10 bg-slate-950/70"}`}
                >
                  {isDragActive && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-cyan-400/50">
                      <p className="text-xl font-medium text-cyan-300">Drop PDF to replace</p>
                    </div>
                  )}
                  {/* Remove Button */}
                  <button
                    onClick={() => {
                      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                      setDownloadUrl(null);
                      setDownloadName("");
                      setFile(null);
                      setSuccess(false);
                      setThumbnailUrl(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
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
                            {pageCount > 0 ? `${pageCount} PAGES` : 'PDF'}
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
                    <div className="flex-1 space-y-4 pt-2 lg:pt-0">

                      {/* Passwords Section */}
                      <div>
                        <h3 className={cn("text-sm font-heading font-bold mb-2 flex items-center gap-2", themeStyles.text)}>
                          <Lock className="w-4 h-4 text-cyan-400" />
                          Security & Passwords
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>
                              Open Password
                            </Label>
                            <div className="relative group">
                              <Input
                                type={showUserPassword ? "text" : "password"}
                                value={userPassword}
                                onChange={(e) => setUserPassword(e.target.value)}
                                placeholder="Required to view..."
                                className="bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all h-8 text-xs pr-8"
                              />
                              <button
                                type="button"
                                onClick={() => setShowUserPassword(!showUserPassword)}
                                className={cn("absolute right-2 top-1/2 -translate-y-1/2", themeStyles.subtext)}
                              >
                                {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60")}>
                              Owner Password
                            </Label>
                            <div className="relative group">
                              <Input
                                type={showOwnerPassword ? "text" : "password"}
                                value={ownerPassword}
                                onChange={(e) => setOwnerPassword(e.target.value)}
                                placeholder="Required to edit..."
                                className="bg-white/[0.02] border-0 border-transparent outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all h-8 text-xs pr-8"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                                className={cn("absolute right-2 top-1/2 -translate-y-1/2", themeStyles.subtext)}
                              >
                                {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Section */}
                      <div>
                        <h3 className={cn("text-sm font-heading font-bold mb-2 flex items-center gap-2", themeStyles.text)}>
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                          Digital Permissions
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {permissionConfig.map(({ key, label }) => {
                            const isDisabled = !ownerPassword;
                            return (
                              <label
                                key={key}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg border transition-all duration-300",
                                  isDisabled ? "opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02]" : "cursor-pointer hover:border-white/20",
                                  !isDisabled && permissions[key]
                                    ? "border-cyan-500/40 bg-cyan-500/[0.07] shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                    : !isDisabled && "border-white/5 bg-white/[0.03] opacity-60 hover:opacity-100"
                                )}
                              >
                                <Checkbox
                                  id={key}
                                  checked={!isDisabled && permissions[key]}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) =>
                                    setPermissions((prev) => ({ ...prev, [key]: Boolean(checked) }))
                                  }
                                  className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 border-white/20 w-3.5 h-3.5"
                                />
                                <span className={cn("text-[10px] font-heading font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis", themeStyles.text)}>
                                  {label.replace('Allow ', '')}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Status & Action Button Row */}
                      <div className="flex flex-col items-end gap-2 pt-2">
                        <AnimatePresence>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 w-full md:w-auto overflow-hidden"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <p className="text-red-500 text-xs">{error}</p>
                            </motion.div>
                          )}

                        </AnimatePresence>

                        <Button
                          size="sm"
                          onClick={handleProtect}
                          disabled={isProcessing || serverStatus === "offline"}
                          className={cn(
                            "w-full md:w-auto md:min-w-[140px] h-9 text-xs font-heading font-bold transition-all duration-300 rounded-lg shadow-2xl",
                            (isProcessing || serverStatus === "offline") ? "opacity-30 cursor-not-allowed" : "hover:scale-105 hover:bg-white/20 active:scale-95",
                            "bg-white/10 backdrop-blur-md border-none text-white"
                          )}
                        >
                          {isProcessing ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Encrypting...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4" />
                              <span>Protect PDF</span>
                            </div>
                          )}
                        </Button>
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success card */}
          {success && !isProcessing && downloadUrl && (
            <div className="text-center p-4 mt-6">
              <SplitDownloadCard
                title="Your PDF has been protected successfully"
                primaryLabel="Download PDF"
                downloadUrl={downloadUrl}
                onDownload={() => {
                  const a = document.createElement("a");
                  a.href = downloadUrl;
                  a.download = downloadName || "protected - Thundocs.pdf";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                contextLabel="Protected"
              />
            </div>
          )}
        </div>
      </div>
    </LightningBackground>
  );
}
