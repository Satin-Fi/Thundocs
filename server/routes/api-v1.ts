import { Router, Request, Response, NextFunction } from "express";
import { Database } from "../db";
import { compressPdf, protectPdf } from "../utils/pdf";
import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// Middleware to authenticates the v1 Commercial API Key
async function authenticateV1(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
        return res.status(401).json({
            error: "API Key required",
            message: "Please provide an API key in the 'x-api-key' header."
        });
    }

    const result = Database.getAccountByKey(apiKey);
    if (!result) {
        return res.status(403).json({
            error: "Invalid API Key",
            message: "The provided API key is invalid or has been revoked."
        });
    }

    // Check Quota
    const quotaAvailable = Database.trackUsage(result.account.id);
    if (!quotaAvailable) {
        return res.status(429).json({
            error: "Quota Exceeded",
            message: "Your monthly API request limit has been reached. Please upgrade your plan."
        });
    }

    // Attach account info for downstream use
    (req as any).account = result.account;
    next();
}

// v1 Document Compression
router.post(
    "/compress",
    authenticateV1,
    express.raw({ type: "application/pdf", limit: "150mb" }),
    async (req, res) => {
        try {
            const pdfBytes = req.body as Buffer;
            if (!pdfBytes || pdfBytes.length === 0) {
                return res.status(400).json({ error: "No PDF file provided" });
            }

            const quality = (req.query.quality as string) || "medium";
            const rawTargetSizeKb = req.query.targetSizeKb ?? req.query.targetSize;
            const targetSizeKb = rawTargetSizeKb !== undefined ? Number(rawTargetSizeKb) : undefined;
            const dpi = req.query.dpi ? Number(req.query.dpi) : undefined;
            const colorMode = req.query.colorMode === "grayscale" ? "grayscale" : "color";
            const force = req.query.force === "true";
            const jpegQ = req.query.jpegQ ? Number(req.query.jpegQ) : undefined;

            const result = await compressPdf(pdfBytes, quality, targetSizeKb, dpi, colorMode, force, jpegQ);

            res.setHeader("X-Original-Size", result.originalSize.toString());
            res.setHeader("X-Compressed-Size", result.compressedSize.toString());
            res.setHeader("X-Compression-Ratio", `${result.ratio}%`);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
            res.send(result.bytes);
        } catch (err: any) {
            console.error("API v1 Compress Error:", err);
            res.status(500).json({ error: "Internal processing error", details: err.message });
        }
    }
);

// v1 Document Protection
router.post(
    "/protect",
    authenticateV1,
    express.raw({ type: "application/pdf", limit: "150mb" }),
    async (req, res) => {
        try {
            const pdfBytes = req.body as Buffer;
            if (!pdfBytes || pdfBytes.length === 0) {
                return res.status(400).json({ error: "No PDF file provided" });
            }

            const userPass = req.query.userPassword as string;
            const ownerPass = (req.query.ownerPassword as string) || userPass;

            const rawPerms = Number(req.query.permissions) || 0;
            const permissions = {
                printing: (rawPerms & 4) ? 'highResolution' : false,
                modifying: !!(rawPerms & 8),
                copying: !!(rawPerms & 16),
                annotating: !!(rawPerms & 32),
                fillingForms: !!(rawPerms & 256),
                documentAssembly: !!(rawPerms & 1024),
            } as any;

            const protectedBytes = await protectPdf(pdfBytes, userPass, ownerPass, permissions);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=protected.pdf");
            res.send(protectedBytes);
        } catch (err: any) {
            console.error("API v1 Protect Error:", err);
            res.status(500).json({ error: "Internal processing error", details: err.message });
        }
    }
);

// OCR Telemetry — log a single extraction event (public, no auth needed)
router.post("/ocr-log", express.json({ limit: "10kb" }), (req, res) => {
    try {
        const { engine, fileType, pagesProcessed, durationMs, success, errorMessage } = req.body;
        if (!engine || !fileType) {
            return res.status(400).json({ error: "engine and fileType are required" });
        }
        const event = Database.logOcrEvent({
            engine,
            fileType,
            pagesProcessed: pagesProcessed || 1,
            durationMs: durationMs || 0,
            success: !!success,
            errorMessage,
        });
        res.json({ ok: true, id: event.id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// OCR Stats — aggregated telemetry for the monitoring dashboard
router.get("/ocr-stats", (_req, res) => {
    try {
        const stats = Database.getOcrStats();
        res.json(stats);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Server-side AI OCR using Gemini Vision and GEMINI_API_KEY
router.post("/ai-ocr", upload.single("file"), async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is not configured on the server",
            });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
        }

        const mimeType = file.mimetype;
        if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
            return res.status(400).json({
                error: "Unsupported file type",
                message: "Only images and PDFs are supported for AI OCR.",
            });
        }

        const base64 = file.buffer.toString("base64");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt =
            `Extract ALL text from this document exactly as written. Preserve the original layout and semantics using Markdown:\n` +
            `- Use # ## ### for headings based on their visual size/weight (headings will display centered automatically)\n` +
            `- Use **bold** and *italic* for styled text\n` +
            `- Use - or * for bullet lists, and 1. 2. 3. for numbered lists\n` +
            `- Use > for quoted/indented blocks\n` +
            `- Preserve paragraph breaks with a blank line between paragraphs\n` +
            `- Keep tables using markdown table syntax if present\n` +
            `Return ONLY the formatted markdown — no explanations, no commentary, no HTML tags.`;

        const start = Date.now();
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: base64 } },
        ]);

        const text = result.response.text();
        const words = text.trim().length > 0
            ? text.trim().split(/\s+/).filter(Boolean)
            : [];

        const durationMs = Date.now() - start;
        const fileType: "pdf" | "image" =
            mimeType === "application/pdf" ? "pdf" : "image";

        // Log telemetry on the server
        Database.logOcrEvent({
            engine: "gemini",
            fileType,
            pagesProcessed: 1,
            durationMs,
            success: true,
        });

        res.json({
            content: text,
            wordCount: words.length,
            confidence: 97,
            engine: "gemini",
            pagesProcessed: 1,
            isMarkdown: true,
        });
    } catch (err: any) {
        console.error("AI OCR (Gemini) Error:", err);
        res.status(500).json({
            error: "Gemini OCR failed",
            message: err?.message || "Unknown error",
        });
    }
});

export default router;

