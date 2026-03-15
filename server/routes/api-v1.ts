import { Router, Request, Response, NextFunction } from "express";
import { Database } from "../db";
import { compressPdf, protectPdf } from "../utils/pdf";
import express from "express";

const router = Router();

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

export default router;

