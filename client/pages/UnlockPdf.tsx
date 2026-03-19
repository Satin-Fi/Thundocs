import React, { useState, useCallback, useEffect } from "react";
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
    Unlock,
    AlertCircle,
    CheckCircle2,
    Info,
    X,
    Eye,
    EyeOff,
    Loader2,
    Sun,
    Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SplitDownloadCard from "@/components/SplitDownloadCard";

// Configure PDF.js worker
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function UnlockPdfPage() {
    const { themeStyles, isNight, setTheme } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadName, setDownloadName] = useState("");
    const [pageCount, setPageCount] = useState<number>(0);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

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

        setFile(selectedFile);
        setError(null);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
        setDownloadName("");
        setSuccess(false);
        setPassword("");
        setShowPassword(false);
        setIsUploading(true);

        try {
            const buf = await selectedFile.arrayBuffer();
            try {
                const pdfjsDoc = await pdfjsLib.getDocument({ data: buf }).promise;
                setPageCount(pdfjsDoc.numPages);
                const thumb = await generateThumbnail(pdfjsDoc);
                setThumbnailUrl(thumb);
            } catch (err: any) {
                // If there's an open password, pdfjsLib will fail to generate a thumbnail.
                // We just continue silently, as we'll submit the file and password to the backend anyway.
                if (err.name !== "PasswordException") {
                    console.error("PDF load error:", err);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        multiple: false,
    });

    const handleUnlock = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            if (password) {
                formData.append("password", password);
            }
            formData.append("file", file);

            const blob = await new Promise<Blob>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/unlock-pdf");
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
                    reject(new Error("Failed to unlock PDF due to a network error."));
                };

                xhr.send(formData);
            });
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setDownloadName(`unlocked_${file.name.replace(/\.[^/.]+$/, "")} - Thundocs.pdf`);
            setSuccess(true);
        } catch (err: any) {
            console.error("Unlock error:", err);
            setError(err.message || "Failed to unlock PDF. The file may be corrupted.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`min-h-screen unlock-pdf-bg ${themeStyles.text} font-sans transition-colors duration-300`}>
            <ToolNavbar />

            <div className="container mx-auto px-4 py-2 md:py-4 flex flex-col items-center justify-center min-h-[80vh]">
                <div className={cn("w-full transition-all duration-500 space-y-3", file ? "max-w-4xl" : "max-w-2xl")}>
                    <div className="text-center space-y-1">
                        <h1 className={cn("text-2xl md:text-3xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400")}>
                            Unlock PDF
                        </h1>
                        <p className={cn("text-sm max-w-2xl mx-auto font-body", themeStyles.subtext)}>
                            Remove editing, copying, and printing restrictions from PDFs — processed securely to preserve page fidelity.
                        </p>
                    </div>

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
                                            ? "border-emerald-400/50 bg-slate-950/90 ring-2 ring-emerald-500/30"
                                            : "border-white/10 bg-slate-950/70"
                                    )}
                                    role="button"
                                    aria-label="Upload PDF to unlock"
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
                                className="w-full flex justify-center"
                            >
                                <div
                                    {...getRootProps()}
                                    className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-cyan-400/50 bg-slate-950/90 ring-2 ring-cyan-500/30" : "border-white/10 bg-slate-950/70"}`}
                                >
                                    {isDragActive && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-cyan-400/50">
                                            <p className="text-xl font-medium text-cyan-300">Drop PDF to replace</p>
                                        </div>
                                    )}

                                    {/* Document thumbnail card (pushed towards center) */}
                                    <div className="flex flex-col items-center justify-center flex-1">
                                        <div className="relative group">
                                            {/* File Card UI */}
                                            <div className="w-48 h-64 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover:border-cyan-500/30 transition-colors">
                                                {thumbnailUrl ? (
                                                    <img src={thumbnailUrl} alt="PDF Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText className="w-16 h-16 text-cyan-400/40" />
                                                )}

                                                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white z-10">
                                                    {pageCount > 0 ? `${pageCount} PAGES` : 'PDF'}
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                                                    setDownloadUrl(null);
                                                    setDownloadName("");
                                                    setFile(null);
                                                    setSuccess(false);
                                                    setThumbnailUrl(null);
                                                }}
                                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
                                                disabled={isProcessing}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6 flex flex-col items-center w-full mt-4">
                                        {/* File info */}
                                        <div className="text-center">
                                            <p className="font-semibold text-white truncate w-64" title={file.name}>
                                                {file.name}
                                            </p>
                                            <p className={cn("text-xs uppercase tracking-wide opacity-50 mt-0.5", themeStyles.subtext)}>
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                                            </p>
                                        </div>

                                        {/* Password Input */}
                                        <div className="w-full space-y-1">
                                            <Label className={cn("text-[10px] font-heading font-bold uppercase tracking-wider text-white/60 pl-1")}>
                                                PDF Password
                                            </Label>
                                            <div className="relative group">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter password..."
                                                    className="bg-white/5 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all h-10 text-sm pr-10 text-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowPassword(!showPassword);
                                                    }}
                                                    className={cn("absolute right-3 top-1/2 -translate-y-1/2 z-10", themeStyles.subtext)}
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info Box */}
                                        <div className="w-full p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex gap-2 items-start">
                                            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-white/70 leading-snug">
                                                We will use this password to unlock your PDF.
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                <span className="text-red-400 text-sm">{error}</span>
                                            </div>
                                        )}

                                        {/* Unlock button */}
                                        <div className="w-full flex justify-center mt-2">
                                            <button
                                                type="button"
                                                disabled={isProcessing || !password}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnlock();
                                                }}
                                                style={{
                                                    background: "#111111",
                                                    color: "white",
                                                    padding: "0.75rem 2.5rem",
                                                    borderRadius: "9999px",
                                                    fontWeight: 600,
                                                    fontSize: "1.125rem",
                                                    transition: "all 0.2s ease-in-out",
                                                    border: "none",
                                                    cursor: (isProcessing || !password) ? "not-allowed" : "pointer",
                                                    opacity: (isProcessing || !password) ? 0.5 : 1,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                }}
                                                onMouseOver={(e) => !(isProcessing || !password) && (e.currentTarget.style.transform = "scale(1.05)")}
                                                onMouseOut={(e) => !(isProcessing || !password) && (e.currentTarget.style.transform = "scale(1)")}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        <span>Unlocking...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="w-5 h-5" />
                                                        <span>Unlock Document</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success card */}
                    {success && !isProcessing && downloadUrl && (
                        <div className="mt-6">
                            <SplitDownloadCard
                                title="Your PDF restrictions have been removed"
                                primaryLabel="Download PDF"
                                downloadUrl={downloadUrl}
                                onDownload={() => {
                                    const a = document.createElement("a");
                                    a.href = downloadUrl;
                                    a.download = downloadName || "unlocked - Thundocs.pdf";
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                contextLabel="Unlocked"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
