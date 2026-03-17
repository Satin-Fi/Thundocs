import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import {
    Upload,
    FileText,
    Download,
    AlertCircle,
    X,
    Loader2,
    Sun,
    Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SplitDownloadCard from "@/components/SplitDownloadCard";

const API_BASE = import.meta.env.VITE_BACKEND_ORIGIN || "";

export default function WordToPdfPage() {
    const { themeStyles, isNight, setTheme } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadName, setDownloadName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setThumbnailUrl(null);
            return;
        }

        let active = true;
        const fetchThumbnail = async () => {
            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch(`${API_BASE}/api/word-thumbnail`, { method: "POST", body: formData });
                if (res.ok && active) {
                    const blob = await res.blob();
                    setThumbnailUrl(URL.createObjectURL(blob));
                }
            } catch (e) {
                console.error("Thumbnail error:", e);
            }
        };
        fetchThumbnail();
        return () => { active = false; };
    }, [file]);

    // Cleanup thumbnail URL
    useEffect(() => {
        return () => {
            if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
        };
    }, [thumbnailUrl]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const selectedFile = acceptedFiles[0];
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ];

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(docx?)$/i)) {
            setError("Please upload a Word document (.doc or .docx)");
            return;
        }

        if (downloadUrl) URL.revokeObjectURL(downloadUrl);

        setFile(selectedFile);
        setError(null);
        setDownloadUrl(null);
        setDownloadName("");
        setSuccess(false);
    }, [downloadUrl]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/msword": [".doc"],
        },
        multiple: false,
    });

    const handleConvert = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_BASE}/api/word-to-pdf`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => "");
                throw new Error(text || `Server responded with ${response.status}`);
            }

            const blob = await response.blob();
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setDownloadName(file.name.replace(/\.(docx?)$/i, "") + " - Thundocs.pdf");
            setSuccess(true);
        } catch (err: any) {
            console.error("Word to PDF conversion error:", err);
            setError("Conversion failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`min-h-screen word-to-pdf-bg ${themeStyles.text} font-sans transition-colors duration-300`}>
            <ToolNavbar />

            <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="w-full max-w-3xl space-y-8">
                    {/* Hero */}
                    <div className="text-center space-y-4">
                        <h1 className={cn("text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-purple-500")}>
                            Word to PDF
                        </h1>
                        <p className={cn("text-lg max-w-2xl mx-auto", themeStyles.subtext)}>
                            Convert your Word documents to PDF with formatting preserved. Powered by the local conversion server.
                        </p>
                    </div>

                    {!file && !success && (
                        isUploading ? (
                            <UploadingRing label="Uploading document..." />
                        ) : (
                            <div className="w-full flex justify-center">
                                <div
                                    {...getRootProps()}
                                    className={cn("split-upload-card", isDragActive && "drag-active")}
                                    role="button"
                                    aria-label="Upload Word document"
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
                                        {isDragActive ? "Drop Word file here" : "Upload Word file"}
                                    </h3>
                                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                                        Drag & drop .doc/.docx or click to browse
                                    </p>

                                    <button
                                        type="button"
                                        className="btn-main"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            open();
                                        }}
                                    >
                                        Select Document
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                    {file && !success && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="ready"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full flex justify-center"
                            >
                                <div
                                    {...getRootProps()}
                                    className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-violet-400/50 bg-slate-950/90 ring-2 ring-violet-500/30" : "border-white/10 bg-slate-950/70"}`}
                                >
                                    {isDragActive && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-violet-400/50">
                                            <p className="text-xl font-medium text-violet-300">Drop Word file to replace</p>
                                        </div>
                                    )}

                                    {/* Document thumbnail card (pushed towards center) */}
                                    <div className="flex flex-col items-center justify-center flex-1">
                                        <div className="relative group">
                                            <div className="w-48 h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center transition-colors group-hover:border-violet-500/30">
                                                {thumbnailUrl ? (
                                                    <img src={thumbnailUrl} alt="Document Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText className="w-16 h-16 text-violet-500/40" />
                                                )}
                                            </div>
                                            {/* Remove button */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                                                    setFile(null);
                                                    setDownloadUrl(null);
                                                    setDownloadName("");
                                                    setSuccess(false);
                                                }}
                                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            {/* Label overlay */}
                                            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-white tracking-wider">
                                                DOCX
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 flex flex-col items-center w-full mt-4">
                                        {/* File info */}
                                        <div className="text-center">
                                            <p className="font-semibold text-white truncate w-64" title={file.name}>
                                                {file.name}
                                            </p>
                                            <p className={cn("text-xs uppercase tracking-wide opacity-50 mt-0.5", themeStyles.subtext)}>
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                <span className="text-red-400 text-sm">{error}</span>
                                            </div>
                                        )}

                                        {/* Convert button */}
                                        <div className="w-full flex justify-center">
                                            <button
                                                type="button"
                                                disabled={isProcessing}
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
                                                    cursor: isProcessing ? "not-allowed" : "pointer",
                                                    opacity: isProcessing ? 0.7 : 1,
                                                }}
                                                onMouseOver={(e) => !isProcessing && (e.currentTarget.style.transform = "scale(1.05)")}
                                                onMouseOut={(e) => !isProcessing && (e.currentTarget.style.transform = "scale(1)")}
                                            >
                                                {isProcessing ? "Converting..." : "Convert to PDF"}
                                            </button>
                                        </div>

                                        {isProcessing && (
                                            <p className={cn("text-center text-xs mt-2", themeStyles.subtext)}>
                                                Converting… this may take a moment for large documents.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <AnimatePresence>
                        {success && !isProcessing && downloadUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-center p-4 mt-6"
                            >
                                <SplitDownloadCard
                                    title="Your Word document has been converted to PDF"
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
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
