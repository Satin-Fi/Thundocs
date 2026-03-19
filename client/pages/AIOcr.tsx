import React, { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import ToolNavbar from "@/components/ToolNavbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UploadingRing } from "@/components/UploadingRing";
import {
  Upload,
  Download,
  Copy,
  ScanText,
  AlertCircle,
  X,
  Loader2,
  ImageIcon,
  FileText,
  File,
  CheckCircle2,
  Undo,
  Redo,
  ChevronDown,
  Settings,
  MoreHorizontal,
} from "lucide-react";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ── Types ──────────────────────────────────────────────────────────────────
type OcrEngine = "tesseract" | "native" | "gemini";

interface ExtractedResult {
  content: string;
  wordCount: number;
  confidence: number;
  engine: OcrEngine;
  pagesProcessed?: number;
  pages?: string[]; // one entry per source PDF page
  isMarkdown?: boolean; // true when content uses markdown formatting
}

// ── Constants ──────────────────────────────────────────────────────────────
const ENGINE_STORAGE_KEY = "Thundocs_ocr_engine";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read a File as a base64 string (without the data-url prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Render a single PDF page to a canvas at the given scale */
async function renderPdfPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 2
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport } as any).promise;
  return canvas;
}

/** Generate a formatted .docx from markdown text preserving headings, bold, italic, bullets, alignment */
async function generateDocx(text: string): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // ── Helpers ────────────────────────────────────────────────────────────
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Parse inline **bold** and *italic* into word runs */
  const inlineRuns = (raw: string, extraRpr = "", fontSize = "22"): string => {
    // strip HTML tags first
    const line = raw.replace(/<[^>]+>/g, "");
    const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    return tokens
      .filter(Boolean)
      .map((tok) => {
        const boldMatch = tok.match(/^\*\*(.+)\*\*$/);
        const italicMatch = tok.match(/^\*(.+)\*$/);
        if (boldMatch) {
          return `<w:r><w:rPr>${extraRpr}<w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${esc(boldMatch[1])}</w:t></w:r>`;
        } else if (italicMatch) {
          return `<w:r><w:rPr>${extraRpr}<w:i/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${esc(italicMatch[1])}</w:t></w:r>`;
        } else {
          return `<w:r><w:rPr>${extraRpr}<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${esc(tok)}</w:t></w:r>`;
        }
      })
      .join("");
  };

  // ── Build paragraphs ───────────────────────────────────────────────────
  let body = "";

  // Pre-group lines: consecutive | rows form table blocks
  const tableRegex = /^\s*\|/; // allow leading whitespace
  const sepRegex = /^\|[\s\-:|]+\|/;
  // Debug: log first 200 chars of text to verify table content
  console.log('[generateDocx] first 200 chars:', JSON.stringify(text.slice(0, 200)));
  const inputLines = text.split("\n");
  console.log('[generateDocx] total lines:', inputLines.length, '| table lines:', inputLines.filter(l => /^\s*\|/.test(l)).length);
  let i2 = 0;
  while (i2 < inputLines.length) {
    const rawLine = inputLines[i2];
    const line = rawLine.replace(/<[^>]+>/g, "");

    // ── Table block: collect all consecutive | lines ──────────────────────
    if (tableRegex.test(line.trim())) {
      const tableLines: string[] = [];
      while (i2 < inputLines.length && tableRegex.test(inputLines[i2].replace(/<[^>]+>/g, "").trim())) {
        tableLines.push(inputLines[i2].replace(/<[^>]+>/g, ""));
        i2++;
      }
      // Parse: filter out separator rows (---), treat first row as header
      const dataRows = tableLines.filter(r => !sepRegex.test(r.trim()));
      if (dataRows.length === 0) continue;

      // Determine column count from first data row
      const colCount = dataRows[0]
        ? dataRows[0].split('|').filter((_, ci, arr) => ci > 0 && ci < arr.length - 1).length
        : 0;
      if (colCount === 0) { i2++; continue; }

      // Build minimal valid OOXML table
      const bdr = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';
      const cellBdr = `<w:tcBorders><w:top ${bdr}/><w:left ${bdr}/><w:bottom ${bdr}/><w:right ${bdr}/></w:tcBorders>`;
      const gridCols = Array(colCount).fill('<w:gridCol w:w="1500"/>').join('');

      let tblXml = ''
        + '<w:tbl>'
        + '<w:tblPr>'
        + '<w:tblW w:w="0" w:type="auto"/>'
        + '<w:tblBorders>'
        + `<w:top ${bdr}/><w:left ${bdr}/><w:bottom ${bdr}/><w:right ${bdr}/><w:insideH ${bdr}/><w:insideV ${bdr}/>`
        + '</w:tblBorders>'
        + '</w:tblPr>'
        + `<w:tblGrid>${gridCols}</w:tblGrid>`;

      dataRows.forEach((row, rowIdx) => {
        const cells = row.split('|')
          .map(c => c.trim())
          .filter((_, ci, arr) => ci > 0 && ci < arr.length - 1);
        const isHeader = rowIdx === 0;

        const rowXml = cells.map(cell => {
          const cellText = cell.replace(/[<>&"]/g, c =>
            c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;'
          );
          const boldOpen = isHeader ? '<w:b/>' : '';
          return ''
            + '<w:tc>'
            + '<w:tcPr>'
            + '<w:tcW w:w="0" w:type="auto"/>'
            + cellBdr
            + '</w:tcPr>'
            + '<w:p>'
            + (isHeader ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '')
            + '<w:r>'
            + '<w:rPr>'
            + '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>'
            + boldOpen
            + '<w:sz w:val="20"/>'
            + '</w:rPr>'
            + `<w:t xml:space="preserve">${cellText}</w:t>`
            + '</w:r>'
            + '</w:p>'
            + '</w:tc>';
        }).join('');

        tblXml += `<w:tr>${rowXml}</w:tr>`;
      });

      tblXml += '</w:tbl>';
      console.log('[generateDocx] table XML (first 300):', tblXml.slice(0, 300));
      body += tblXml;
      // Add spacing after table
      body += '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>';
      continue;
    }

    i2++;

    // Empty line → paragraph spacer
    if (!line.trim()) {
      body += `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`;
      continue;
    }

    // H1  (#)
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      const runs = inlineRuns(h1[1], "<w:b/>", "28");
      body += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr>${runs}</w:p>`;
      continue;
    }

    // H2  (##)
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const runs = inlineRuns(h2[1], "<w:b/>", "26");
      body += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="80"/></w:pPr>${runs}</w:p>`;
      continue;
    }

    // H3  (###)
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const runs = inlineRuns(h3[1], "<w:b/>", "24");
      body += `<w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr>${runs}</w:p>`;
      continue;
    }

    // H4-H6
    const h456 = line.match(/^#{4,6}\s+(.+)$/);
    if (h456) {
      const runs = inlineRuns(h456[1], "<w:b/>", "22");
      body += `<w:p><w:pPr><w:spacing w:before="80" w:after="40"/></w:pPr>${runs}</w:p>`;
      continue;
    }

    // Bullet list
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const runs = inlineRuns(bullet[1]);
      body += `<w:p>
        <w:pPr><w:ind w:left="440" w:hanging="220"/><w:spacing w:after="60"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>
        ${runs}
      </w:p>`;
      continue;
    }

    // Numbered list
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      const runs = inlineRuns(numbered[2]);
      body += `<w:p>
        <w:pPr><w:ind w:left="440" w:hanging="220"/><w:spacing w:after="60"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(numbered[1])}. </w:t></w:r>
        ${runs}
      </w:p>`;
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s+(.+)$/);
    if (bq) {
      const runs = inlineRuns(bq[1], '<w:i/><w:color w:val="666666"/>');
      body += `<w:p><w:pPr><w:ind w:left="720"/><w:spacing w:after="60"/></w:pPr>${runs}</w:p>`;
      continue;
    }

    // Regular paragraph — justified
    const runs = inlineRuns(line);
    body += `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="100"/></w:pPr>${runs}</w:p>`;
  }

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080"/></w:sectPr></w:body>
</w:document>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  return await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}



// ── Component ──────────────────────────────────────────────────────────────

export default function AIOcr() {
  const { themeStyles, isNight } = useTheme();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState("3");

  // Engine
  const [engine, setEngine] = useState<OcrEngine>(() => {
    const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
    if (saved === "native" || saved === "tesseract") {
      return saved;
    }
    return "tesseract";
  });

  useEffect(() => {
    localStorage.setItem(ENGINE_STORAGE_KEY, engine);
  }, [engine]);

  // Abort
  const abortRef = useRef(false);

  // ── Dropzone ──────────────────────────────────────────────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const selectedFile = acceptedFiles[0];
      const fileType = selectedFile.type;

      if (!fileType.startsWith("image/") && fileType !== "application/pdf") {
        setError("Please upload an image or PDF file");
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
      setProgress(0);
      setProgressText("");

      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);

      if (fileType === "application/pdf") {
        try {
          const buf = await selectedFile.arrayBuffer();
          const pdfStr = await pdfjsLib.getDocument({ data: buf }).promise;
          const canvas = await renderPdfPageToCanvas(pdfStr, 1, 0.5);
          setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.75));
        } catch (e) {
          console.error("Failed to generate PDF thumbnail", e);
        }
      } else {
        setThumbnailUrl(url);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  // ── Native PDF Extraction ───────────────────────────────────────────────
  const extractNativePdfText = async (targetFile: File): Promise<ExtractedResult> => {
    setProgressText("Extracting embedded text...");
    setProgress(10);
    const arrayBuffer = await targetFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const pagesList: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (abortRef.current) throw new Error("Cancelled");
      setProgress(Math.round((i / totalPages) * 100));
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Very basic positional reconstruction, could be improved but fine for native reading
      const text = textContent.items
        .filter((item: any) => typeof item.str === 'string')
        .map((item: any) => item.str + (item.hasEOL ? '\n' : ' '))
        .join("");

      pagesList.push(text.trim());
    }

    const fullText = pagesList.join("\n\n");
    const words = fullText.trim().split(/\s+/).filter(Boolean);

    return {
      content: fullText,
      wordCount: words.length,
      confidence: 100, // Native text always 100%
      engine: "native",
      pagesProcessed: totalPages,
      pages: pagesList,
    };
  };

  // ── Tesseract.js OCR ──────────────────────────────────────────────────
  const ocrWithTesseract = async (targetFile: File): Promise<ExtractedResult> => {
    setProgressText("Loading OCR engine...");
    setProgress(5);

    const worker = await createWorker("eng");

    try {
      if (targetFile.type === "application/pdf") {
        const arrayBuffer = await targetFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const allText: string[] = [];
        let totalConfidence = 0;

        for (let i = 1; i <= totalPages; i++) {
          if (abortRef.current) throw new Error("Cancelled");
          setProgressText(`Scanning — page ${i} of ${totalPages}`);
          setProgress(Math.round(((i - 1) / totalPages) * 100));

          const canvas = await renderPdfPageToCanvas(pdf, i);
          const { data } = await worker.recognize(canvas);
          allText.push(data.text);
          totalConfidence += data.confidence;
        }

        setProgress(100);
        const fullText = allText.join("\n\n");
        const words = fullText.trim().split(/\s+/).filter(Boolean);
        return {
          content: fullText,
          wordCount: words.length,
          confidence: Math.round(totalConfidence / totalPages),
          engine: "tesseract",
          pagesProcessed: totalPages,
          pages: allText,
        };
      } else {
        setProgressText("Scanning...");
        setProgress(20);

        const { data } = await worker.recognize(targetFile);

        setProgress(100);
        const words = data.text.trim().split(/\s+/).filter(Boolean);
        return {
          content: data.text,
          wordCount: words.length,
          confidence: Math.round(data.confidence),
          engine: "tesseract",
        };
      }
    } finally {
      await worker.terminate();
    }
  };

  // ── Main handler ──────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;

    if (engine === "native" && file.type !== "application/pdf") {
      setError("Native text extraction only works on PDF files, not images.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressText("");
    abortRef.current = false;
    const startTime = Date.now();

    let ocrResult: typeof result = null;
    let usedEngine: OcrEngine = engine;

    try {
      let res: ExtractedResult | null = null;

      // First, try server-side Gemini if available; fall back silently on error
      try {
        setProgressText("Analyzing with AI Vision (server)...");
        const formData = new FormData();
        formData.append("file", file);
        const resp = await fetch("/api/v1/ai-ocr", {
          method: "POST",
          body: formData,
        });
        if (resp.ok) {
          const data = await resp.json();
          res = {
            content: data.content,
            wordCount:
              typeof data.wordCount === "number"
                ? data.wordCount
                : (data.content || "").trim().split(/\s+/).filter(Boolean).length,
            confidence: typeof data.confidence === "number" ? data.confidence : 97,
            engine: "gemini",
            pagesProcessed: data.pagesProcessed ?? 1,
            pages: Array.isArray(data.pages) ? data.pages : undefined,
            isMarkdown: data.isMarkdown ?? true,
          };
          usedEngine = "gemini";
        } else {
          // Reset progress text on failure; we'll fall back below
          setProgressText("");
        }
      } catch {
        // Ignore server errors and fall back to local OCR
        setProgressText("");
      }

      // Fallback to local engines if Gemini was not used
      if (!res) {
        if (engine === "native") {
          res = await extractNativePdfText(file);
          usedEngine = "native";
        } else {
          res = await ocrWithTesseract(file);
          usedEngine = "tesseract";
        }
      }

      setResult(res);
      ocrResult = res;
    } catch (err: any) {
      if (err.message !== "Cancelled") {
        const msg = String(err?.message ?? "");
        setError(msg || "OCR failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      // Fire-and-forget telemetry — never blocks or breaks the UX
      // Persist the actually-used engine so the monitor can read it
      localStorage.setItem("Thundocs_last_engine", usedEngine);
      fetch("/api/v1/ocr-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: usedEngine,
          fileType: file.type === "application/pdf" ? "pdf" : "image",
          pagesProcessed: ocrResult?.pagesProcessed ?? 1,
          durationMs: Date.now() - startTime,
          success: !!ocrResult,
          errorMessage: ocrResult ? undefined : "extraction failed",
        }),
      }).catch(() => {/* silently ignore telemetry failures */ });
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────
  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadText = () => {
    if (result && file) {
      const blob = new Blob([result.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_text - Thundocs.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadWord = async () => {
    if (!result || !file) return;
    try {
      setProgressText("Generating Word document...");
      const blob = await generateDocx(result.content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")} - Thundocs.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate Word document.");
    } finally {
      setProgressText("");
    }
  };

  const resetFile = () => {
    setFile(null);
    setFileUrl(null);
    setThumbnailUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressText("");
    abortRef.current = true;
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen ai-ocr-bg ${themeStyles.text} font-sans transition-colors duration-300`}
    >
      <ToolNavbar />

      <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh] max-w-[95vw]">
        <div className="w-full space-y-8">
          {/* ── Hero ─────────────────────────────────────────────────── */}
          <div className="text-center space-y-4">
            <h1
              className={cn(
                "text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500"
              )}
            >
              AI OCR Scanner
            </h1>
            <p className={cn("text-lg max-w-2xl mx-auto", themeStyles.subtext)}>
              Extract text from images &amp; PDFs — precise, fast, and 100% free.
            </p>
          </div>

          {/* ── Dropzone / Two-Page View ──────────────────────────────── */}
          {isProcessing ? (
            <div className="w-full max-w-3xl mx-auto">
              <UploadingRing
                label={progressText || "Processing file..."}
                value={progress}
              />
            </div>
          ) : !file ? (
            <div className="w-full flex justify-center">
              <div
                {...getRootProps()}
                className={cn(
                  "glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] transition-all duration-300 w-[360px] min-h-[520px] flex flex-col items-center justify-center text-center gap-4",
                  isDragActive
                    ? "border-amber-400/50 bg-slate-950/90 ring-2 ring-amber-500/30"
                    : "border-white/10 bg-slate-950/70"
                )}
                role="button"
                aria-label="Upload image or PDF for AI OCR"
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
                  {isDragActive ? "Drop file here" : "Upload image or PDF"}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginBottom: 0 }}>
                  PNG, JPG, BMP, WebP, GIF, or PDF • drag & drop or click
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
                  Select File
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              {...(getRootProps() as any)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`space-y-6 relative rounded-2xl transition-all duration-300 ${isDragActive ? "ring-2 ring-amber-500/50 bg-slate-950/40" : ""}`}
            >
              {isDragActive && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-amber-400/50">
                  <p className="text-xl font-medium text-amber-300">Drop image or PDF to replace</p>
                </div>
              )}
              {result ? (
                <div className="grid gap-8 xl:grid-cols-2">
                  {/* Left page: PDF / Image */}
                  <div className="flex justify-center flex-1 h-full min-h-[600px] w-full">
                    <div
                      className={cn(
                        "relative rounded-t-xl rounded-b-2xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 bg-white/10 backdrop-blur-2xl flex flex-col w-full max-w-[800px]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-full h-full aspect-[210/297] rounded-xl border border-white/20 bg-zinc-400/20 overflow-hidden flex items-center justify-center relative p-4"
                        )}
                      >
                        {fileUrl ? (
                          file?.type === "application/pdf" ? (
                            <object
                              data={fileUrl}
                              type="application/pdf"
                              className="w-full h-full"
                            />
                          ) : (
                            <img
                              src={fileUrl}
                              alt="Uploaded file"
                              className="max-w-full max-h-[85vh] object-contain"
                            />
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="p-6 rounded-full bg-amber-500/10 mb-4">
                              <ScanText className="w-16 h-16 text-amber-500" />
                            </div>
                            <p
                              className={cn(
                                "text-lg font-medium",
                                themeStyles.text
                              )}
                            >
                              PDF Document
                            </p>
                            <p className={cn("text-sm", themeStyles.subtext)}>
                              {file.name}
                            </p>
                          </div>
                        )}
                      </div>


                    </div>
                  </div>

                  {/* Right page: Extracted text container */}
                  {result && (
                    <div className="flex justify-center flex-1 h-full min-h-[600px] w-full">
                      <div className="w-full max-w-[2000px] relative rounded-t-xl rounded-b-2xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 bg-white/10 backdrop-blur-2xl flex flex-col">
                        {/* Ribbon Header area (Glassy) */}
                        <div className="flex flex-col border-b border-white/20 bg-white/40 backdrop-blur-md px-3 py-2 z-10 w-full">
                          {/* Top window controls and title */}
                          <div className="flex items-center justify-between mb-2 px-1 w-full">
                            <div className="flex items-center gap-2">
                              {/* Mock app icon */}
                              <div className="w-5 h-5 rounded bg-[#2b579a] flex items-center justify-center text-white font-bold font-serif shadow-sm text-[10px]">
                                W
                              </div>
                              <span className="text-zinc-700 font-semibold text-[13px]">Document - Saved</span>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-500">
                              <Settings className="w-4 h-4 cursor-pointer hover:text-zinc-800 transition-colors" />
                              <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-zinc-800 transition-colors" />
                              <div className="w-6 h-6 rounded-full bg-blue-600 border border-white/50 shadow-sm" />
                            </div>
                          </div>

                          {/* Ribbon Toolbar */}
                          <div className="flex items-center gap-1 md:gap-2 bg-white/70 rounded-lg px-2 py-1.5 shadow-sm border border-white/50 overflow-x-auto no-scrollbar w-full">
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('undo'); }} className="p-1 hover:bg-white/60 rounded text-zinc-600 transition-colors"><Undo className="w-4 h-4" /></button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('redo'); }} className="p-1 hover:bg-white/60 rounded text-zinc-600 transition-colors"><Redo className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-zinc-300 mx-1" />
                            <Select
                              value={fontFamily}
                              onValueChange={(val) => {
                                setFontFamily(val);
                                document.execCommand('fontName', false, val);
                              }}
                            >
                              <SelectTrigger className="h-7 w-[120px] focus:ring-0 focus:ring-offset-0 border-transparent bg-transparent hover:bg-white/60 text-zinc-700 text-xs font-medium px-2 py-0 outline-none shadow-none">
                                <SelectValue placeholder="Font" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-lg text-zinc-700 min-w-[120px]">
                                <SelectItem value="Arial" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">Arial</SelectItem>
                                <SelectItem value="Times New Roman" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">Times New Roman</SelectItem>
                                <SelectItem value="Courier New" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">Courier</SelectItem>
                                <SelectItem value="Georgia" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">Georgia</SelectItem>
                                <SelectItem value="Verdana" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">Verdana</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={fontSize}
                              onValueChange={(val) => {
                                setFontSize(val);
                                document.execCommand('fontSize', false, val);
                              }}
                            >
                              <SelectTrigger className="h-7 w-[60px] focus:ring-0 focus:ring-offset-0 border-transparent bg-transparent hover:bg-white/60 text-zinc-700 text-xs font-medium px-2 py-0 outline-none shadow-none">
                                <SelectValue placeholder="Size" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-lg text-zinc-700 min-w-[60px]">
                                <SelectItem value="1" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">10</SelectItem>
                                <SelectItem value="2" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">13</SelectItem>
                                <SelectItem value="3" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">16</SelectItem>
                                <SelectItem value="4" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">18</SelectItem>
                                <SelectItem value="5" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">24</SelectItem>
                                <SelectItem value="6" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">32</SelectItem>
                                <SelectItem value="7" className="text-xs hover:bg-zinc-100/80 cursor-pointer focus:bg-zinc-100 rounded-md">48</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="w-px h-4 bg-zinc-300 mx-1" />
                            <div className="flex items-center gap-0.5">
                              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} className="p-1 hover:bg-white/60 rounded text-zinc-800 font-bold font-serif w-6 flex justify-center transition-colors">B</button>
                              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} className="p-1 hover:bg-white/60 rounded text-zinc-800 italic font-serif w-6 flex justify-center transition-colors">I</button>
                              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }} className="p-1 hover:bg-white/60 rounded text-zinc-800 underline font-serif w-6 flex justify-center transition-colors">U</button>
                            </div>
                            <div className="w-px h-4 bg-zinc-300 mx-1" />
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('hiliteColor', false, 'yellow'); }} className="p-1 hover:bg-white/60 rounded flex flex-col items-center justify-center gap-[2px] transition-colors w-7">
                              <span className="text-[10px] leading-none text-zinc-700 font-bold font-serif">ab</span>
                              <div className="w-3 h-[3px] bg-yellow-400 mb-0.5" />
                            </button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('foreColor', false, 'red'); }} className="p-1 hover:bg-white/60 rounded flex flex-col items-center justify-center gap-[2px] transition-colors w-7">
                              <span className="text-[10px] leading-none text-red-600 font-bold font-serif">A</span>
                              <div className="w-3 h-[3px] bg-red-600 mb-0.5" />
                            </button>
                            <div className="w-px h-4 bg-zinc-300 mx-1" />
                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium px-2 whitespace-nowrap">
                              <span>{result.confidence}% conf</span>
                              <span>{result.wordCount} words</span>
                            </div>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="relative pl-6 pr-3 py-6 md:pl-10 md:pr-6 md:py-10 flex-1 flex flex-col items-center gap-8 bg-zinc-400/20 overflow-y-auto max-h-[800px] premium-scrollbar group w-full">
                          {/* Map over text to create A4 Pages */}
                          <div
                            className="w-full flex flex-col items-center gap-8 outline-none"


                          >
                            {(() => {
                              // Use per-page text from OCR if available (matches PDF page count exactly),
                              // otherwise show everything on a single page (e.g. single image).
                              const displayPages: string[][] = result.pages
                                ? result.pages.map(pageText => pageText.split('\n'))
                                : [result.content.split('\n')];

                              return displayPages.map((pageParagraphs, pageIdx) => (
                                <div key={pageIdx} className="w-full max-w-[794px] h-[1123px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/40 ring-1 ring-black/5 rounded p-8 md:p-10 text-zinc-800 relative z-0 shrink-0 flex flex-col">
                                  <div
                                    className="leading-snug font-sans text-[11px] outline-none flex-1 overflow-y-auto premium-scrollbar"
                                  >
                                    {result.isMarkdown ? (
                                      <ReactMarkdown
                                        components={{
                                          h1: ({ ...props }) => <h1 className="text-[14px] font-bold text-center mb-2 mt-3" {...props} />,
                                          h2: ({ ...props }) => <h2 className="text-[13px] font-bold text-center mb-2 mt-2" {...props} />,
                                          h3: ({ ...props }) => <h3 className="text-[12px] font-semibold mb-1 mt-2" {...props} />,
                                          p: ({ ...props }) => <p className="mb-1 text-justify" {...props} />,
                                          ul: ({ ...props }) => <ul className="list-disc pl-5 mb-1 space-y-0.5" {...props} />,
                                          ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-1 space-y-0.5" {...props} />,
                                          li: ({ ...props }) => <li className="text-[11px]" {...props} />,
                                          strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                                          em: ({ ...props }) => <em className="italic" {...props} />,
                                          blockquote: ({ ...props }) => <blockquote className="border-l-2 border-zinc-300 pl-3 italic text-zinc-500 my-1" {...props} />,
                                          table: ({ ...props }) => <table className="w-full border-collapse text-[10px] mb-2" {...props} />,
                                          th: ({ ...props }) => <th className="border border-zinc-300 px-2 py-1 bg-zinc-100 font-semibold text-left" {...props} />,
                                          td: ({ ...props }) => <td className="border border-zinc-300 px-2 py-1" {...props} />,
                                          code: ({ ...props }) => <code className="bg-zinc-100 px-1 rounded text-[10px] font-mono" {...props} />,
                                        }}
                                      >
                                        {pageParagraphs.join('\n')}
                                      </ReactMarkdown>
                                    ) : (
                                      pageParagraphs.map((paragraph, idx) => (
                                        <p key={idx} className="mb-1 text-justify">
                                          {paragraph.trim() ? (
                                            <span>{paragraph}</span>
                                          ) : <br />}
                                        </p>
                                      ))
                                    )}
                                  </div>
                                  {/* Page Number Footer */}
                                  {displayPages.length > 1 && (
                                    <div
                                      className="text-center text-xs text-zinc-400 font-medium py-1 select-none mt-auto"
                                      contentEditable={false}
                                    >
                                      Page {pageIdx + 1} of {displayPages.length}
                                    </div>
                                  )}
                                </div>
                              ));
                            })()}
                          </div>

                          {/* Bottom Floating Toolbar / Action Bar */}
                          <div className="sticky bottom-6 mt-auto self-center flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/10 px-3 py-2 rounded-xl z-20">
                            <Button size="sm" variant="ghost" onClick={downloadWord} className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 h-8 text-xs font-medium rounded-lg">
                              <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Word
                            </Button>
                            <div className="w-px h-4 bg-zinc-200 mx-1" />
                            <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 h-8 text-xs font-medium rounded-lg">
                              {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />} Copy
                            </Button>
                            <div className="w-px h-4 bg-zinc-200 mx-1" />
                            <Button size="sm" variant="ghost" onClick={downloadText} className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 h-8 text-xs font-medium rounded-lg" title="Download Raw .txt">
                              <File className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /> Txt
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center w-full">
                  <div className={`glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl transition-all duration-300 relative w-[360px] min-h-[520px] flex flex-col justify-between ${isDragActive ? "border-amber-400/50 bg-slate-950/90 ring-2 ring-amber-500/30" : "border-white/10 bg-slate-950/70"}`}>
                    {/* Document thumbnail card (pushed towards center) */}
                    <div className="flex flex-col items-center justify-center flex-1">
                      <div className="relative group">
                        {/* File Card UI */}
                        <div className="w-48 h-64 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover:border-amber-500/30 transition-colors">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="Document Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ScanText className="w-16 h-16 text-amber-500/40" />
                          )}

                          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white z-10 uppercase tracking-widest">
                            {file?.type === "application/pdf" ? "PDF" : "IMG"}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetFile();
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
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      {error && (
                        <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span className="text-red-400 text-sm">{error}</span>
                        </div>
                      )}

                      {/* Extract button */}
                      <div className="w-full flex justify-center mt-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExtract();
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
                            cursor: isProcessing ? "not-allowed" : "pointer",
                            opacity: isProcessing ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                          onMouseOver={(e) => !isProcessing && (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseOut={(e) => !isProcessing && (e.currentTarget.style.transform = "scale(1)")}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Extracting...</span>
                            </>
                          ) : (
                            <>
                              <ScanText className="w-5 h-5" />
                              <span>Extract Text</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div >
  );
}
