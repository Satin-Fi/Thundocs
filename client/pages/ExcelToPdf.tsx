import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ToolNavbar from "@/components/ToolNavbar";
import { UploadingRing } from "@/components/UploadingRing";
import {
    Upload,
    FileSpreadsheet,
    Download,
    AlertCircle,
    X,
    Loader2,
    Sun,
    Moon,
    Table,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DownloadSuccessPanel from "@/components/DownloadSuccessPanel";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { LightningBackground } from "@/components/LightningBackground";

interface SheetData {
    name: string;
    data: (string | number | boolean | null)[][];
    colWidths: number[];
}

export default function ExcelToPdfPage() {
    const { themeStyles } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadName, setDownloadName] = useState("");
    const [sheetInfo, setSheetInfo] = useState<{ name: string; rows: number; cols: number }[]>([]);

    const [isUploading, setIsUploading] = useState(false);

    const parseExcel = useCallback(async (f: File): Promise<SheetData[]> => {
        const buffer = await f.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheets: SheetData[] = [];

        for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const rawData: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(ws, {
                header: 1,
                defval: null,
                raw: false,
            });

            if (rawData.length === 0) continue;

            // Calculate column widths based on content
            const numCols = Math.max(...rawData.map((r) => r.length), 0);
            const colWidths = Array(numCols).fill(0);
            for (const row of rawData) {
                for (let c = 0; c < numCols; c++) {
                    const cellStr = String(row[c] ?? "");
                    if (cellStr.length > colWidths[c]) colWidths[c] = cellStr.length;
                }
            }
            // Clamp between 8 and 40 chars equivalent
            const clampedWidths = colWidths.map((w) => Math.min(40, Math.max(8, w)));

            sheets.push({ name: sheetName, data: rawData, colWidths: clampedWidths });
        }
        return sheets;
    }, []);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            const selectedFile = acceptedFiles[0];
            const validTypes = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ];

            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx?|xls)$/i)) {
                setError("Please upload an Excel file (.xls or .xlsx)");
                return;
            }

            setFile(selectedFile);
            setError(null);
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            setDownloadUrl(null);
            setDownloadName("");
            setSuccess(false);
            setSheetInfo([]);
            setIsUploading(true);

            try {
                const sheets = await parseExcel(selectedFile);
                setSheetInfo(sheets.map((s) => ({ name: s.name, rows: s.data.length, cols: s.colWidths.length })));
            } catch {
                setError("Could not read the Excel file. It may be corrupted.");
                setFile(null);
            } finally {
                setIsUploading(false);
            }
        },
        [parseExcel]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
        },
        multiple: false,
    });

    const handleConvert = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const sheets = await parseExcel(file);

            if (sheets.length === 0) {
                setError("The Excel file has no data to convert.");
                return;
            }

            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const marginX = 10;
            const marginY = 14;
            const headerH = 8;
            const rowH = 6.5;
            const fontSize = 8;
            const headerFontSize = 9;
            const sheetTitleSize = 11;

            let isFirstSheet = true;
            let globalPage = 1;

            for (const sheet of sheets) {
                if (!isFirstSheet) {
                    doc.addPage();
                    globalPage++;
                }
                isFirstSheet = false;

                const { data, name, colWidths } = sheet;
                if (data.length === 0) continue;

                // Compute proportional column widths to fit page
                const availableWidth = pageWidth - marginX * 2;
                const totalUnits = colWidths.reduce((a, b) => a + b, 0);
                const computedColW = colWidths.map((w) => (w / totalUnits) * availableWidth);

                // Sheet title
                doc.setFontSize(sheetTitleSize);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 30, 30);
                doc.text(name, marginX, marginY);

                let cursorY = marginY + 6;
                let isHeaderRow = true;

                for (const row of data) {
                    // Check if we need a new page
                    if (cursorY + rowH > pageHeight - 10) {
                        doc.addPage();
                        globalPage++;
                        cursorY = marginY;
                        // Re-draw column headers at top of new page
                        isHeaderRow = true;
                    }

                    if (isHeaderRow) {
                        // Header row background
                        doc.setFillColor(31, 97, 141);
                        doc.rect(marginX, cursorY, availableWidth, headerH, "F");

                        let cursorX = marginX;
                        doc.setFontSize(headerFontSize);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(255, 255, 255);

                        for (let c = 0; c < computedColW.length; c++) {
                            const cellText = String(data[0]?.[c] ?? "");
                            const clipped = doc.splitTextToSize(cellText, computedColW[c] - 2)[0] || "";
                            doc.text(clipped, cursorX + 1, cursorY + headerH - 2);
                            cursorX += computedColW[c];
                        }
                        cursorY += headerH;
                        isHeaderRow = false;
                        continue;
                    }

                    // Alternate row shading
                    const rowIndex = data.indexOf(row);
                    if (rowIndex % 2 === 0) {
                        doc.setFillColor(241, 245, 249);
                        doc.rect(marginX, cursorY, availableWidth, rowH, "F");
                    }

                    // Cell borders
                    doc.setDrawColor(210, 210, 210);
                    let cursorX = marginX;
                    doc.setFontSize(fontSize);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(40, 40, 40);

                    for (let c = 0; c < computedColW.length; c++) {
                        const raw = row[c];
                        const cellText = raw === null || raw === undefined ? "" : String(raw);
                        const clipped = doc.splitTextToSize(cellText, computedColW[c] - 2)[0] || "";
                        doc.rect(cursorX, cursorY, computedColW[c], rowH);
                        doc.text(clipped, cursorX + 1, cursorY + rowH - 1.8);
                        cursorX += computedColW[c];
                    }

                    cursorY += rowH;
                }

                // Footer with page number
                doc.setFontSize(7);
                doc.setFont("helvetica", "italic");
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Generated by Thundocs  •  ${file.name}  •  Page ${globalPage}`,
                    marginX,
                    pageHeight - 5
                );
            }

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const blob = doc.output("blob");
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setDownloadName(file.name.replace(/\.(xlsx?|xls)$/i, "") + " - Thundocs.pdf");
            setSuccess(true);
        } catch (err: any) {
            console.error("Excel to PDF error:", err);
            setError("Failed to convert spreadsheet. Please try a different file.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <LightningBackground className={cn(themeStyles.text, "font-sans transition-colors duration-300")}>
            <ToolNavbar />

            <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="w-full max-w-3xl space-y-8">
                    {/* Hero */}
                    <div className="text-center space-y-4">
                        <h1 className={cn("text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500")}>
                            Excel to PDF
                        </h1>
                        <p className={cn("text-lg max-w-2xl mx-auto", themeStyles.subtext)}>
                            Convert your Excel spreadsheets to a professionally formatted PDF with all data, headers, and formatting preserved.
                        </p>
                    </div>

                    {!file ? (
                        isUploading ? (
                            <UploadingRing label="Uploading spreadsheet..." />
                        ) : (
                            <div className="w-full flex justify-center">
                                <div
                                    {...getRootProps()}
                                    className={cn("split-upload-card", isDragActive && "drag-active")}
                                    role="button"
                                    aria-label="Upload Excel spreadsheet"
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
                                        {isDragActive ? "Drop Excel file here" : "Upload Excel file"}
                                    </h3>
                                    <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: 0 }}>
                                        Drag & drop .xls/.xlsx or click to browse
                                    </p>

                                    <button
                                        type="button"
                                        className="btn-main"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            open();
                                        }}
                                    >
                                        Select Spreadsheet
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
                                        className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-emerald-400/50 bg-slate-950/90 ring-2 ring-emerald-500/30" : "border-white/10 bg-slate-950/70"}`}
                                    >
                                        {isDragActive && (
                                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-emerald-400/50">
                                                <p className="text-xl font-medium text-emerald-300">Drop Excel file to replace</p>
                                            </div>
                                        )}

                                        {/* Document thumbnail card (pushed towards center) */}
                                        <div className="flex flex-col items-center justify-center flex-1">
                                            <div className="relative group">
                                                {/* Index Badge */}
                                                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg z-10 border-2 border-slate-900">
                                                    <span className="text-xs font-bold text-white">1</span>
                                                </div>

                                                {/* File Card UI */}
                                                <div className="w-48 h-64 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover:border-emerald-500/30 transition-colors">
                                                    <FileSpreadsheet className="w-16 h-16 text-emerald-500/40" />

                                                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white">
                                                        XLSX
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
                                                        setSheetInfo([]);
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

                                            {/* Sheet preview info */}
                                            {sheetInfo.length > 0 && (
                                                <div className="w-full flex items-center justify-center gap-2 border border-white/10 rounded-xl bg-emerald-500/10 p-2.5">
                                                    <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <span className={cn("text-xs font-semibold text-emerald-300", themeStyles.text)}>
                                                        {sheetInfo.length} sheet{sheetInfo.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            )}

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
                                            title="Your spreadsheet has been converted to PDF"
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
        </div>
    );
}
