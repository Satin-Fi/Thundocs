import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { compressPdf, protectPdf, unlockPdf } from "./utils/pdf";
import apiV1 from "./routes/api-v1";
import { handleDemo } from "./routes/demo";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile, spawnSync } from "child_process";

// ── LibreOffice helpers ────────────────────────────────────────────────────────
const pdfUpload = multer({ dest: os.tmpdir() });

function getLibreOfficePath(): string | null {
  const envPath =
    process.env.SOFFICE_PATH ||
    process.env.LIBREOFFICE_PATH ||
    process.env.LIBREOFFICE_HOME;
  if (envPath && fs.existsSync(envPath)) {
    if (envPath.toLowerCase().endsWith("soffice.exe")) {
      const comPath = envPath.replace(/soffice\.exe$/i, "soffice.com");
      if (fs.existsSync(comPath)) return comPath;
    }
    return envPath;
  }

  const winProgramFiles = process.env.ProgramFiles;
  const winProgramFilesX86 = process.env["ProgramFiles(x86)"];
  const winLocalAppData = process.env.LOCALAPPDATA;

  const candidates = [
    ...(winProgramFiles ? [
      path.join(winProgramFiles, "LibreOffice", "program", "soffice.com"),
      path.join(winProgramFiles, "LibreOffice", "program", "soffice.exe"),
      path.join(winProgramFiles, "LibreOffice", "program", "soffice.bin"),
    ] : []),
    ...(winProgramFilesX86 ? [
      path.join(winProgramFilesX86, "LibreOffice", "program", "soffice.com"),
      path.join(winProgramFilesX86, "LibreOffice", "program", "soffice.exe"),
      path.join(winProgramFilesX86, "LibreOffice", "program", "soffice.bin"),
    ] : []),
    ...(winLocalAppData ? [
      path.join(winLocalAppData, "Programs", "LibreOffice", "program", "soffice.com"),
      path.join(winLocalAppData, "Programs", "LibreOffice", "program", "soffice.exe"),
      path.join(winLocalAppData, "Programs", "LibreOffice", "program", "soffice.bin"),
    ] : []),
    "/usr/bin/soffice",
    "/usr/lib/libreoffice/program/soffice",
    "/opt/libreoffice/program/soffice",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getLibreOfficePythonPath(): string | null {
  const sofficePath = getLibreOfficePath();
  if (!sofficePath) return null;

  // On Windows, LibreOffice bundles its own python.
  // We need to use it because unoserver relies on `uno` lib included there.
  if (process.platform === "win32") {
    const p = path.join(path.dirname(sofficePath), "python.exe");
    if (fs.existsSync(p)) return p;
  }

  // On Linux/Mac, system python usually suffices if unoconv/unoserver is installed broadly.
  return "python";
}

function getLibreOfficeEnv() {
  const env = { ...process.env };
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;
  return env;
}

function waitForOutputFile(dir: string, ext: string, timeoutMs = 15000, minBytes = 1): Promise<string | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      try {
        const files = fs.readdirSync(dir);
        const match = files.find((f) => f.toLowerCase().endsWith(ext));
        if (match) {
          const fullPath = path.join(dir, match);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size >= minBytes) return resolve(fullPath);
          } catch { }
        }
      } catch { }
      if (Date.now() - start >= timeoutMs) return resolve(null);
      setTimeout(check, 250);
    };
    check();
  });
}

export function createServer() {
  const app = express();

  // Basic Security & CORS
  app.use(helmet({
    contentSecurityPolicy: false, // Managed by Vite in dev
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors({
    origin: true,
    exposedHeaders: [
      "X-Original-Size",
      "X-Compressed-Size",
      "X-Compression-Ratio",
      "X-Actual-DPI",
      "X-Actual-JpegQ",
      "X-Is-Forced",
    ],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic health check for infrastructure monitoring
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Global Rate Limiting - DDoS Protection (disabled in local dev)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests", message: "Please try again later." },
  });
  if (process.env.NODE_ENV === "production") {
    app.use(limiter);
  }

  // Commercial API Gateway v1
  app.use("/api/v1", apiV1);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Thundocs API Gateway!" });
  });

  app.get("/api/demo", handleDemo);

  // ── Admin Auth Middleware (for /api/admin/*) ───────────────────────────────
  const requireAdminToken = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.ADMIN_TOKEN;

    // In dev or if no token is configured, don't block access
    if (!expected || process.env.NODE_ENV !== "production") {
      return next();
    }

    const header = (req.headers["x-admin-token"] || req.headers["authorization"]) as string | undefined;
    let token = "";

    if (header) {
      if (header.toLowerCase().startsWith("bearer ")) {
        token = header.slice(7);
      } else {
        token = header;
      }
    }

    if (token !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  };

  app.use("/api/admin", requireAdminToken);

  // ── Admin Health Check ─────────────────────────────────────────────────────
  app.get("/api/admin/health", (_req, res) => {
    const loPath = getLibreOfficePath();
    const gsBin = process.platform === "win32" ? "gswin64c" : "gs";

    // Check Ghostscript - recurse into versioned dirs (gs\gs10.06.0\bin\) and try PATH
    const gsFound = (() => {
      if (process.platform === "win32") {
        const pf = process.env.ProgramFiles || "";
        const pf86 = process.env["ProgramFiles(x86)"] || "";
        const candidates: string[] = [];

        for (const root of [pf, pf86]) {
          if (!root) continue;
          // Top-level gs folder (Program Files\gs)
          const gsRoot = path.join(root, "gs");
          try {
            const sub = fs.readdirSync(gsRoot, { withFileTypes: true });
            for (const s of sub) {
              if (s.isDirectory()) {
                // gs\gs10.06.0\bin\gswin64c.exe
                candidates.push(path.join(gsRoot, s.name, "bin", "gswin64c.exe"));
                candidates.push(path.join(gsRoot, s.name, "bin", "gswin32c.exe"));
              }
            }
            // Older flat layout: gs\bin\gswin64c.exe
            candidates.push(path.join(gsRoot, "bin", "gswin64c.exe"));
          } catch {}
        }

        if (candidates.some(c => { try { return fs.existsSync(c); } catch { return false; } })) return true;

        // Fallback: try running it from system PATH
        try {
          const r = spawnSync("gswin64c", ["--version"], { timeout: 3000, encoding: "utf8" });
          if (r.status === 0) return true;
        } catch {}
        return false;
      }
      try { return fs.existsSync("/usr/bin/gs"); } catch { return false; }
    })();


    // Check qpdf
    const qpdfFound = (() => {
      const envPath = process.env.QPDF_PATH;
      if (envPath) { try { return fs.existsSync(envPath); } catch { return false; } }
      if (process.platform !== "win32") return true; // assume available on Linux
      const pf = process.env.ProgramFiles || "";
      const pf86 = process.env["ProgramFiles(x86)"] || "";
      try {
        const dirs = [...fs.readdirSync(pf, { withFileTypes: true }), ...fs.readdirSync(pf86, { withFileTypes: true })];
        return dirs.some(d => d.isDirectory() && /^qpdf/i.test(d.name));
      } catch { return false; }
    })();

    const mem = process.memoryUsage();
    const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const uptimeSec = Math.round(process.uptime());

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: uptimeSec,
      memory: { heapMb, heapTotalMb, rssMb },
      services: {
        expressApi: { ok: true, label: "Express API", detail: "/api/ping responding" },
        documentConverter: { ok: !!loPath, label: "Document Converter", detail: loPath || "Not found" },
        pdfProcessor: { ok: gsFound, label: "PDF Processor", detail: gsFound ? `${gsBin} found` : "Not found" },
        pdfEncryption: { ok: qpdfFound, label: "PDF Encryption", detail: qpdfFound ? "Binary found" : "Not found" },
      },
    });
  });

  app.post(
    "/api/compress-pdf",
    express.raw({ type: "application/pdf", limit: "150mb" }),
    async (req, res) => {
      try {
        const pdfBytes = req.body as Buffer;
        if (!pdfBytes || pdfBytes.length === 0) {
          return res.status(400).json({ error: "No PDF file provided" });
        }

        const quality = (req.query.quality as string) || "medium";
        const targetSizeKb = req.query.targetSizeKb ? Number(req.query.targetSizeKb) : undefined;
        const dpi = req.query.dpi ? Number(req.query.dpi) : undefined;
        const colorMode = req.query.colorMode === "grayscale" ? "grayscale" : "color";
        const force = req.query.force === "true";
        const jpegQ = req.query.jpegQ ? Number(req.query.jpegQ) : undefined;

        const result = await compressPdf(pdfBytes, quality, targetSizeKb, dpi, colorMode, force, jpegQ);

        res.setHeader("X-Original-Size", result.originalSize.toString());
        res.setHeader("X-Compressed-Size", result.compressedSize.toString());
        res.setHeader("X-Compression-Ratio", `${result.ratio}%`);
        res.setHeader("X-Actual-DPI", result.actualDpi.toString());
        res.setHeader("X-Actual-JpegQ", result.actualJpegQ.toString());
        res.setHeader("X-Is-Forced", result.isForced ? "true" : "false");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
        res.send(result.bytes);
      } catch (error: any) {
        console.error("Internal Compress Error:", error);
        res.status(500).json({ error: "Failed to compress PDF", details: error.message });
      }
    }
  );

  // ── Protect PDF via Ghostscript AES-128 encryption ─────────────────────────
  app.post(
    "/api/protect-pdf",
    pdfUpload.single("file"),
    async (req: any, res: any) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No PDF file provided" });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        fs.unlink(req.file.path, () => { }); // Cleanup temp file

        const userPassword = req.body.userPassword as string | undefined;
        const ownerPassword = req.body.ownerPassword as string | undefined;

        const allowPrinting = req.body.allowPrinting === "1" || req.body.allowPrinting === "true";
        const allowModifying = req.body.allowModifying === "1" || req.body.allowModifying === "true";
        const allowCopying = req.body.allowCopying === "1" || req.body.allowCopying === "true";
        const allowAnnotating = req.body.allowAnnotating === "1" || req.body.allowAnnotating === "true";
        const allowForms = req.body.allowForms === "1" || req.body.allowForms === "true";
        const allowAssembly = req.body.allowAssembly === "1" || req.body.allowAssembly === "true";

        const permissions = {
          printing: allowPrinting ? 'highResolution' : false,
          modifying: allowModifying,
          copying: allowCopying,
          annotating: allowAnnotating,
          fillingForms: allowForms,
          documentAssembly: allowAssembly,
        } as any;

        console.log(`Protect endpoint received file of size: ${pdfBytes.length} bytes`);

        const protectedBytes = await protectPdf(pdfBytes, userPassword, ownerPassword, permissions);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=protected.pdf");
        res.send(protectedBytes);
      } catch (err: any) {
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        console.error("Error protecting PDF:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to protect PDF", details: err.message });
        }
      }
    }
  );

  // ── Unlock PDF via Ghostscript ───────────────────────────────────────────────
  app.post(
    "/api/unlock-pdf",
    pdfUpload.single("file"),
    async (req: any, res: any) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No PDF file provided" });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        fs.unlink(req.file.path, () => { }); // Cleanup temp file

        const password = req.body.password as string | undefined;

        console.log(`[unlock-pdf] Received file, size: ${pdfBytes.length} bytes`);
        console.log(`[unlock-pdf] Password provided: ${password ? 'Yes' : 'No'}`);

        const unlockedBytes = await unlockPdf(pdfBytes, password);

        console.log(`[unlock-pdf] Unlocked file size: ${unlockedBytes.length} bytes`);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=unlocked.pdf");
        res.send(unlockedBytes);
      } catch (err: any) {
        if (req.file?.path) fs.unlink(req.file.path, () => { });
        console.error("Error unlocking PDF:", err);
        if (!res.headersSent) {
          const message = String(err?.message || "");
          if (message.toLowerCase().includes("password")) {
            res.status(403).json({
              error: "Incorrect password or file cannot be decrypted with the given password.",
              details: message,
            });
          } else {
            res.status(500).json({ error: "Failed to unlock PDF", details: message });
          }
        }
      }
    }
  );

  // ── PDF to Word via LibreOffice ─────────────────────────
  app.post("/api/pdf-to-word", pdfUpload.single("pdf"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const sofficePath = getLibreOfficePath();
    if (!sofficePath) {
      fs.unlink(req.file.path, () => { });
      return res.status(500).json({ error: "LibreOffice not found.", libreofficeNotFound: true });
    }

    const jobDir = path.join(os.tmpdir(), `lo-pdf-job-${Date.now()}`);
    const pdfInJob = path.join(jobDir, req.file.originalname || "input.pdf");

    try {
      fs.mkdirSync(jobDir, { recursive: true });
      fs.renameSync(path.resolve(req.file.path), pdfInJob);
    } catch (e: any) {
      fs.unlink(req.file.path, () => { });
      fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Could not set up conversion directory: " + e.message });
    }

    console.log(`[pdf-to-word] Starting conversion: ${req.file.originalname}`);

    execFile(
      sofficePath,
      [
        `-env:UserInstallation=file:///${jobDir.replace(/\\/g, '/')}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--infilter=writer_pdf_import",
        "--convert-to", "docx",
        "--outdir", jobDir,
        pdfInJob
      ],
      { timeout: 60_000, env: getLibreOfficeEnv() },
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`[pdf-to-word] stderr: ${stderr}`);
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: `Conversion failed: ${error.message}` });
        }

        const baseName = path.basename(pdfInJob, path.extname(pdfInJob));
        const docxOutJob = path.join(jobDir, `${baseName}.docx`);

        if (!fs.existsSync(docxOutJob)) {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: "LibreOffice did not produce a .docx file." });
        }

        const downloadName = (req.file.originalname || "document").replace(/\.pdf$/i, "") + ".docx";
        console.log(`[pdf-to-word] ✓ Sending: ${downloadName}`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.sendFile(docxOutJob, () => {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
        });
      }
    );
  });

  // ── Word to PDF via LibreOffice ───────────────────────────
  app.post("/api/word-to-pdf", pdfUpload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No Word file provided" });
    }

    const sofficePath = getLibreOfficePath();
    if (!sofficePath) {
      fs.unlink(req.file.path, () => { });
      return res.status(500).json({ error: "LibreOffice not found.", libreofficeNotFound: true });
    }

    const jobDir = path.join(os.tmpdir(), `lo-word-job-${Date.now()}`);
    const wordInJob = path.join(jobDir, req.file.originalname || "input.docx");

    try {
      fs.mkdirSync(jobDir, { recursive: true });
      fs.renameSync(path.resolve(req.file.path), wordInJob);
    } catch (e: any) {
      fs.unlink(req.file.path, () => { });
      fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Could not set up conversion directory: " + e.message });
    }

    console.log(`[word-to-pdf] Starting conversion: ${req.file.originalname}`);

    execFile(
      sofficePath,
      [
        `-env:UserInstallation=file:///${jobDir.replace(/\\/g, '/')}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--convert-to", "pdf",
        "--outdir", jobDir,
        wordInJob
      ],
      { timeout: 60_000, env: getLibreOfficeEnv() },
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`[word-to-pdf] stderr: ${stderr}`);
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: `Conversion failed: ${error.message}` });
        }

        const baseName = path.basename(wordInJob, path.extname(wordInJob));
        const pdfOutJob = path.join(jobDir, `${baseName}.pdf`);

        if (!fs.existsSync(pdfOutJob)) {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: "LibreOffice did not produce a .pdf file." });
        }

        const downloadName = (req.file.originalname || "document").replace(/\.(docx?|rtf)$/i, "") + ".pdf";
        console.log(`[word-to-pdf] ✓ Sending: ${downloadName}`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.sendFile(pdfOutJob, () => {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
        });
      }
    );
  });

  app.post("/api/word-thumbnail", pdfUpload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No Word file provided" });
    }

    const sofficePath = getLibreOfficePath();
    if (!sofficePath) {
      fs.unlink(req.file.path, () => { });
      return res.status(500).json({ error: "LibreOffice not found" });
    }

    const jobDir = path.join(os.tmpdir(), `lo-thumb-${Date.now()}`);
    const wordInJob = path.join(jobDir, req.file.originalname || "input.docx");

    try {
      fs.mkdirSync(jobDir, { recursive: true });
      fs.renameSync(path.resolve(req.file.path), wordInJob);
    } catch (e: any) {
      fs.unlink(req.file.path, () => { });
      if (fs.existsSync(jobDir)) fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Setup failed: " + e.message });
    }

    execFile(
      sofficePath,
      [
        `-env:UserInstallation=file:///${jobDir.replace(/\\/g, '/')}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--convert-to", "png",
        "--outdir", jobDir,
        wordInJob
      ],
      { timeout: 30_000, env: getLibreOfficeEnv() },
      async (error, stdout, stderr) => {
        const baseName = path.basename(wordInJob, path.extname(wordInJob));
        const thumbOutJob = path.join(jobDir, `${baseName}.png`);

        if (error || !fs.existsSync(thumbOutJob)) {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: "Thumbnail generation failed" });
        }

        res.sendFile(thumbOutJob, () => {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
        });
      }
    );
  });

  // ── PPT to PDF via LibreOffice ────────────────────────────
  app.post("/api/ppt-to-pdf", pdfUpload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PowerPoint file provided" });
    }

    const sofficePath = getLibreOfficePath();
    if (!sofficePath) {
      fs.unlink(req.file.path, () => { });
      return res.status(500).json({ error: "LibreOffice not found.", libreofficeNotFound: true });
    }

    const jobDir = path.join(os.tmpdir(), `lo-ppt-pdf-${Date.now()}`);
    const pptInJob = path.join(jobDir, req.file.originalname || "input.pptx");

    try {
      fs.mkdirSync(jobDir, { recursive: true });
      fs.renameSync(path.resolve(req.file.path), pptInJob);
    } catch (e: any) {
      fs.unlink(req.file.path, () => { });
      fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Could not set up conversion directory: " + e.message });
    }

    console.log(`[ppt-to-pdf] Starting conversion: ${req.file.originalname}`);

    execFile(
      sofficePath,
      [
        `-env:UserInstallation=file:///${jobDir.replace(/\\/g, '/')}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--convert-to", "pdf",
        "--outdir", jobDir,
        pptInJob
      ],
      { timeout: 60_000, env: getLibreOfficeEnv() },
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`[ppt-to-pdf] stderr: ${stderr}`);
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: `Conversion failed: ${error.message}` });
        }

        const baseName = path.basename(pptInJob, path.extname(pptInJob));
        const pdfOutJob = path.join(jobDir, `${baseName}.pdf`);

        if (!fs.existsSync(pdfOutJob)) {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: "LibreOffice did not produce a .pdf file." });
        }

        const downloadName = (req.file.originalname || "presentation").replace(/\.(pptx?)$/i, "") + ".pdf";
        console.log(`[ppt-to-pdf] ✓ Sending: ${downloadName}`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.sendFile(pdfOutJob, () => {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
        });
      }
    );
  });

  // ── PPT Thumbnail ─────────────────────────────────────────
  app.post("/api/ppt-thumbnail", pdfUpload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PowerPoint file provided" });
    }

    const sofficePath = getLibreOfficePath();
    if (!sofficePath) {
      fs.unlink(req.file.path, () => { });
      return res.status(500).json({ error: "LibreOffice not found" });
    }

    const jobDir = path.join(os.tmpdir(), `lo-ppt-thumb-${Date.now()}`);
    const pptInJob = path.join(jobDir, req.file.originalname || "input.pptx");

    try {
      fs.mkdirSync(jobDir, { recursive: true });
      fs.renameSync(path.resolve(req.file.path), pptInJob);
    } catch (e: any) {
      fs.unlink(req.file.path, () => { });
      if (fs.existsSync(jobDir)) fs.rm(jobDir, { recursive: true, force: true }, () => { });
      return res.status(500).json({ error: "Setup failed: " + e.message });
    }

    execFile(
      sofficePath,
      [
        `-env:UserInstallation=file:///${jobDir.replace(/\\/g, '/')}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--convert-to", "png",
        "--outdir", jobDir,
        pptInJob
      ],
      { timeout: 30_000, env: getLibreOfficeEnv() },
      async (error, stdout, stderr) => {
        const baseName = path.basename(pptInJob, path.extname(pptInJob));
        const thumbOutJob = path.join(jobDir, `${baseName}.png`);

        if (error || !fs.existsSync(thumbOutJob)) {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
          return res.status(500).json({ error: "Thumbnail generation failed" });
        }

        res.sendFile(thumbOutJob, () => {
          fs.rm(jobDir, { recursive: true, force: true }, () => { });
        });
      }
    );
  });

  app.use((err: any, _req: any, res: any, next: any) => {
    if (!err) return next();
    const message = String(err?.message || "");
    if (message.toLowerCase().includes("unexpected end of form")) {
      return res.status(400).json({ error: "Upload interrupted. Please retry." });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  });



  return app;
}
