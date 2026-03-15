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
    Presentation,
    Download,
    AlertCircle,
    X,
    Loader2,
    Sun,
    Moon,
    Layers,
    LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import DownloadSuccessPanel from "@/components/DownloadSuccessPanel";

interface SlideContent {
    index: number;
    title: string;
    bodyLines: string[];
    notes: string;
}

/** Extract plain text from an XML string by stripping all tags and decoding entities */
function xmlToText(xml: string): string {
    return xml
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\s{2,}/g, " ")
        .trim();
}

/** Pull the text from a specific XML element type */
function extractTextFromTag(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
    const results: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
        const text = xmlToText(match[1]);
        if (text) results.push(text);
    }
    return results;
}

async function parsePptx(file: File): Promise<SlideContent[]> {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const slides: SlideContent[] = [];

    // Find all slide XMLs in order
    const slideEntries = Object.keys(zip.files)
        .filter((p) => p.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
            const aNum = parseInt(a.match(/\d+/)?.[0] ?? "0");
            const bNum = parseInt(b.match(/\d+/)?.[0] ?? "0");
            return aNum - bNum;
        });

    for (let i = 0; i < slideEntries.length; i++) {
        const slideEntry = slideEntries[i];
        const slideXml = await zip.files[slideEntry].async("text");

        // Extract title — typically in a shape with <p:ph type="title"> or <p:ph type="ctrTitle">
        const titleMatch = slideXml.match(
            /<p:sp>[\s\S]*?<p:ph type="(?:title|ctrTitle)"[\s\S]*?<\/p:sp>/
        );
        const titleText = titleMatch ? xmlToText(titleMatch[0]) : "";

        // Extract body paragraphs — all <a:p> (para) elements with text
        const bodyParas: string[] = [];
        const paraRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
        let pMatch: RegExpExecArray | null;
        while ((pMatch = paraRegex.exec(slideXml)) !== null) {
            const runs = extractTextFromTag(pMatch[1], "a:t");
            const line = runs.join(" ").trim();
            if (line && line !== titleText) bodyParas.push(line);
        }

        // De-duplicate adjacent identical lines
        const dedupedBody = bodyParas.filter((line, idx) => line !== bodyParas[idx - 1]);

        // Speaker notes from the corresponding notesSlide
        const notesPath = slideEntry.replace("slides/slide", "slideLayouts/_NOT_EXISTS/slide")
            .replace("ppt/slides/slide", "ppt/notesSlides/notesSlide").replace(".xml", ".xml");

        const notesFile =
            zip.files[notesPath] ??
            zip.files[`ppt/notesSlides/notesSlide${i + 1}.xml`];
        let notesText = "";
        if (notesFile) {
            const notesXml = await notesFile.async("text");
            const noteParas = extractTextFromTag(notesXml, "a:t");
            notesText = noteParas.join(" ").trim();
        }

        slides.push({
            index: i + 1,
            title: titleText || `Slide ${i + 1}`,
            bodyLines: dedupedBody,
            notes: notesText,
        });
    }

    return slides;
}

/** Render all slides into a jsPDF document with a clean professional template */
function renderSlidesPdf(slides: SlideContent[], fileName: string): Blob {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();   // 297mm
    const ph = doc.internal.pageSize.getHeight();  // 210mm

    const SLIDE_ACCENT = [99, 102, 241] as [number, number, number];   // indigo-500
    const DARK_BG = [17, 24, 39] as [number, number, number];          // gray-900
    const BODY_TXT = [229, 231, 235] as [number, number, number];      // gray-200
    const SUB_TXT = [156, 163, 175] as [number, number, number];       // gray-400
    const SLIDE_NUM_TXT = [107, 114, 128] as [number, number, number]; // gray-500

    for (let i = 0; i < slides.length; i++) {
        if (i > 0) doc.addPage();
        const slide = slides[i];

        // ── Background ──────────────────────────────
        doc.setFillColor(...DARK_BG);
        doc.rect(0, 0, pw, ph, "F");

        // ── Left accent bar ─────────────────────────
        doc.setFillColor(...SLIDE_ACCENT);
        doc.rect(0, 0, 4, ph, "F");

        // ── Top rule ────────────────────────────────
        doc.setFillColor(...SLIDE_ACCENT);
        doc.rect(4, 0, pw - 4, 1, "F");

        // ── Slide number badge ───────────────────────
        const badge = `${slide.index} / ${slides.length}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...SLIDE_NUM_TXT);
        doc.text(badge, pw - 8, ph - 5, { align: "right" });

        // ── Filename footer ──────────────────────────
        doc.setFontSize(6);
        doc.setTextColor(...SUB_TXT);
        doc.text(`${fileName}`, 8, ph - 5);

        // ── Title ────────────────────────────────────
        const titleY = 22;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);

        const titleLines = doc.splitTextToSize(slide.title, pw - 32);
        doc.text(titleLines[0] || slide.title, 12, titleY);

        // title underline
        doc.setDrawColor(...SLIDE_ACCENT);
        doc.setLineWidth(0.5);
        const titleLineY = titleY + 4;
        doc.line(12, titleLineY, pw - 12, titleLineY);

        // ── Body content ─────────────────────────────
        let curY = titleLineY + 10;
        const maxBodyY = slide.notes ? ph - 30 : ph - 15;
        const maxLineWidth = pw - 32;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...BODY_TXT);

        for (const line of slide.bodyLines) {
            if (curY > maxBodyY) break;

            // Detect if this looks like a bullet (starts with common bullet chars or is a short item)
            const isBullet = !(line && line.match(/\.{2,}|^[A-Z].*:$/));
            const bulletPrefix = isBullet ? "• " : "";
            const textX = isBullet ? 16 : 12;
            const textWidth = maxLineWidth - (isBullet ? 4 : 0);

            const wrapped = doc.splitTextToSize(bulletPrefix + (line || ""), textWidth);
            for (const wrappedLine of wrapped.slice(0, 2)) {  // max 2 wrapped lines per bullet
                if (curY > maxBodyY) break;
                doc.text(wrappedLine, textX, curY);
                curY += 7;
            }
            curY += 1; // small gap between bullets
        }

        // ── Speaker notes ────────────────────────────
        if (slide.notes) {
            const notesY = ph - 20;
            doc.setFillColor(30, 40, 60);
            doc.roundedRect(8, notesY - 5, pw - 16, 17, 1, 1, "F");

            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(...SUB_TXT);
            doc.text("Notes:", 12, notesY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            const noteLines = doc.splitTextToSize(slide.notes, pw - 32);
            doc.text(noteLines.slice(0, 2), 12, notesY + 4.5);
        }
    }

    return doc.output("blob");
}

export default function PowerPointToPdfPage() {
    const { themeStyles, isNight, setTheme } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadName, setDownloadName] = useState("");
    const [slideCount, setSlideCount] = useState<number | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLegacyPpt, setIsLegacyPpt] = useState(false);

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
                const res = await fetch("/api/ppt-thumbnail", { method: "POST", body: formData });
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

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const selectedFile = acceptedFiles[0];
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
        ];

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pptx?)$/i)) {
            setError("Please upload a PowerPoint file (.ppt or .pptx)");
            return;
        }

        const legacy = selectedFile.name.toLowerCase().endsWith(".ppt") && !selectedFile.name.toLowerCase().endsWith(".pptx");
        setIsLegacyPpt(legacy);
        setFile(selectedFile);
        setError(null);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
        setDownloadName("");
        setSuccess(false);
        setSlideCount(null);
        setIsUploading(true);

        if (!legacy) {
            try {
                const slides = await parsePptx(selectedFile);
                setSlideCount(slides.length);
            } catch {
                setSlideCount(null);
            }
        }
        setIsUploading(false);
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
            "application/vnd.ms-powerpoint": [".ppt"],
        },
        multiple: false,
    });

    const handleConvert = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Legacy .ppt files: send to server (LibreOffice) for conversion
            if (isLegacyPpt) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/ppt-to-pdf", { method: "POST", body: formData });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    if (body.libreofficeNotFound) {
                        setError("Server-side conversion is not available for legacy .ppt files. Please convert your file to .pptx and try again.");
                    } else {
                        setError(body.error || "Server-side conversion failed. Please try again.");
                    }
                    return;
                }
                const blob = await res.blob();
                if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setDownloadName(file.name.replace(/\.ppt$/i, "") + " - Thundocs.pdf");
                setSuccess(true);
                return;
            }

            // Modern .pptx files: parse in browser
            const slides = await parsePptx(file);

            if (slides.length === 0) {
                setError("No slides found in this presentation. The file may be empty or in an unsupported format.");
                return;
            }

            const blob = renderSlidesPdf(slides, file.name);
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setDownloadName(file.name.replace(/\.(pptx?)$/i, "") + " - Thundocs.pdf");
            setSuccess(true);
        } catch (err: any) {
            console.error("PowerPoint to PDF error:", err);
            setError("Failed to convert the presentation. Please ensure the file is a valid PowerPoint file and try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`min-h-screen powerpoint-to-pdf-bg ${themeStyles.text} font-sans transition-colors duration-300`}>
            <ToolNavbar />

            <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="w-full max-w-3xl space-y-8">
                    {/* Hero */}
                    <div className="text-center space-y-4">
                        <h1 className={cn("text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500")}>
                            PowerPoint to PDF
                        </h1>
                        <p className={cn("text-lg max-w-2xl mx-auto", themeStyles.subtext)}>
                            Convert your .pptx presentations to a clean PDF — slides, titles, content and speaker notes all preserved.
                        </p>
                        <p className={cn("text-sm", themeStyles.subtext)}>
                            Note: Pixel-perfect layout rendering is not available in browser. Text and structure are fully preserved.
                        </p>
                    </div>

                    {!file ? (
                        isUploading ? (
                            <UploadingRing label="Uploading presentation..." />
                        ) : (
                            <div className="w-full flex justify-center">
                                <div
                                    {...getRootProps()}
                                    className={cn("split-upload-card", isDragActive && "drag-active")}
                                    role="button"
                                    aria-label="Upload PowerPoint presentation"
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
                                        {isDragActive ? "Drop PowerPoint here" : "Upload PowerPoint"}
                                    </h3>
                                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                                        Drag & drop .pptx or click to browse
                                    </p>

                                    <button
                                        type="button"
                                        className="btn-main"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            open();
                                        }}
                                    >
                                        Select Presentation
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <>
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
                                        className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-orange-400/50 bg-slate-950/90 ring-2 ring-orange-500/30" : "border-white/10 bg-slate-950/70"}`}
                                    >
                                        {isDragActive && (
                                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-orange-400/50">
                                                <p className="text-xl font-medium text-orange-300">Drop PowerPoint to replace</p>
                                            </div>
                                        )}

                                        {/* Document thumbnail card (pushed towards center) */}
                                        <div className="flex flex-col items-center justify-center flex-1">
                                            <div className="relative group">
                                                {/* Index Badge */}
                                                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shadow-lg z-10 border-2 border-slate-900">
                                                    <span className="text-xs font-bold text-white">1</span>
                                                </div>

                                                {/* File Card UI */}
                                                <div className="w-48 h-64 rounded-2xl bg-gradient-to-br from-orange-500/15 to-red-500/15 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover:border-orange-500/30 transition-colors">
                                                    {thumbnailUrl ? (
                                                        <img src={thumbnailUrl} alt="Presentation Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Presentation className="w-16 h-16 text-orange-500/40" />
                                                    )}

                                                    {slideCount !== null && slideCount > 0 && (
                                                        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white z-10">
                                                            {slideCount}S
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Remove Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                                                        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
                                                        setThumbnailUrl(null);
                                                        setDownloadUrl(null);
                                                        setDownloadName("");
                                                        setFile(null);
                                                        setSuccess(false);
                                                        setSlideCount(null);
                                                        setIsLegacyPpt(false);
                                                    }}
                                                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
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
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>

                                            {/* Slide preview info */}
                                            {isLegacyPpt ? (
                                                <div className="w-full flex items-center justify-center gap-2 border border-amber-500/20 rounded-xl bg-amber-500/10 p-2.5">
                                                    <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <span className="text-xs font-semibold text-amber-300">
                                                        Legacy .ppt format
                                                    </span>
                                                </div>
                                            ) : slideCount !== null && slideCount > 0 ? (
                                                <div className="w-full flex items-center justify-center gap-2 border border-white/10 rounded-xl bg-orange-500/10 p-2.5">
                                                    <LayoutTemplate className="w-4 h-4 text-orange-500 shrink-0" />
                                                    <span className={cn("text-xs font-semibold text-orange-300", themeStyles.text)}>
                                                        {slideCount} slide{slideCount !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            ) : null}

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
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            <AnimatePresence>
                                {success && !isProcessing && downloadUrl && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center p-4 mt-6"
                                    >
                                        <DownloadSuccessPanel
                                            title="Your presentation has been converted to PDF"
                                            primaryLabel="Download PDF"
                                            downloadUrl={downloadUrl}
                                            onDownload={() => {
                                                const a = document.createElement("a");
                                                a.href = downloadUrl;
                                                a.download = downloadName || "converted - Thundocs.pdf";
                                                a.click();
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}
