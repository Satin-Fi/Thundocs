import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { PDFDocument } from "pdf-lib-with-encrypt";

function resolveQpdfBinary(): string {
  const envPath = process.env.QPDF_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  if (process.platform !== "win32") return "qpdf";

  const candidates: string[] = ["qpdf.exe"];
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];

  const roots = [programFiles, programFilesX86].filter(Boolean) as string[];
  for (const root of roots) {
    try {
      const direct = path.join(root, "qpdf", "bin", "qpdf.exe");
      candidates.push(direct);
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (!/^qpdf/i.test(e.name)) continue;
        candidates.push(path.join(root, e.name, "bin", "qpdf.exe"));
      }
    } catch { }
  }

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch { }
  }
  return "qpdf.exe";
}

type ColorMode = "color" | "grayscale";

export interface PdfPermissions {
  printing?: boolean | 'lowResolution' | 'highResolution';
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
  fillingForms?: boolean;
  contentAccessibility?: boolean;
  documentAssembly?: boolean;
}



export async function compressPdf(
  pdfBytes: Buffer,
  quality: string = "medium",
  targetSizeKb?: number,
  dpi?: number,
  colorMode: ColorMode = "color",
  force?: boolean,
  jpegQualityOverride?: number
): Promise<{ bytes: Buffer; originalSize: number; compressedSize: number; ratio: string; actualDpi: number; actualJpegQ: number; isForced: boolean }> {
  const originalSize = pdfBytes.length;
  const tmpDir = os.tmpdir();
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPath = path.join(tmpDir, `ph-comp-in-${ts}.pdf`);
  const outputPath = path.join(tmpDir, `ph-comp-out-${ts}.pdf`);

  fs.writeFileSync(inputPath, new Uint8Array(pdfBytes));

  const gsBin = process.platform === "win32" ? "gswin64c" : "gs";

  let pdfSettings = "/screen";
  let jpegQ = 65;
  let resolution = dpi || 150;

  if (force) {
    pdfSettings = "/screen";
    resolution = 36;
    jpegQ = 20;
  } else if (targetSizeKb) {
    const ratio = (targetSizeKb * 1024) / originalSize;
    if (ratio >= 0.75) { pdfSettings = "/printer"; resolution = dpi || 150; jpegQ = 80; }
    else if (ratio >= 0.5) { pdfSettings = "/ebook"; resolution = dpi || 120; jpegQ = 70; }
    else if (ratio >= 0.25) { pdfSettings = "/screen"; resolution = dpi || 96; jpegQ = 55; }
    else { pdfSettings = "/screen"; resolution = dpi || 72; jpegQ = 40; }
  } else {
    if (quality === "low") { pdfSettings = "/screen"; resolution = dpi || 72; jpegQ = 40; }
    else if (quality === "high") { pdfSettings = "/printer"; resolution = dpi || 150; jpegQ = 80; }
    else { pdfSettings = "/ebook"; resolution = dpi || 120; jpegQ = 65; }
  }

  // Optional direct JPEG quality override (1–100)
  if (typeof jpegQualityOverride === "number" && !Number.isNaN(jpegQualityOverride)) {
    const clamped = Math.max(1, Math.min(100, Math.round(jpegQualityOverride)));
    jpegQ = clamped;
  }

  const colorArgs =
    colorMode === "grayscale"
      ? ["-sColorConversionStrategy=Gray", "-dProcessColorModel=/DeviceGray", "-dOverrideICC=true"]
      : [];

  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-dPDFSETTINGS=${pdfSettings}`,
        "-dAutoFilterColorImages=false",
        "-dAutoFilterGrayImages=false",
        "-dColorImageFilter=/DCTEncode",
        "-dGrayImageFilter=/DCTEncode",
        `-dJPEGQ=${jpegQ}`,
        "-dDownsampleColorImages=true",
        "-dDownsampleGrayImages=true",
        "-dDownsampleMonoImages=true",
        "-dColorImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dMonoImageDownsampleType=/Bicubic",
        "-dColorImageDownsampleThreshold=1.0",
        "-dGrayImageDownsampleThreshold=1.0",
        "-dMonoImageDownsampleThreshold=1.0",
        "-dPassThroughJPEGImages=false",
        `-dColorImageResolution=${resolution}`,
        `-dGrayImageResolution=${resolution}`,
        `-dMonoImageResolution=${resolution}`,
        "-dCompressFonts=true",
        ...colorArgs,
        `-sOutputFile=${outputPath}`,
        inputPath,
      ];
      const proc = spawn(gsBin, args);
      proc.on("error", (err) => {
        reject(err);
      });
      proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`GS Error ${code}`))));
    });

    let outputBytes = fs.readFileSync(outputPath);
    let finalBytes = outputBytes.length < originalSize ? outputBytes : pdfBytes;

    const targetBytes = targetSizeKb ? targetSizeKb * 1024 : null;
    let rasterUsedProfile: { dpi: number; jpegQ: number } | null = null;

    if (force) {
      const rasterOutputs: string[] = [];
      try {
        const originalDoc = await PDFDocument.load(new Uint8Array(pdfBytes));
        const pageCount = originalDoc.getPageCount();
        const pageSizes = Array.from({ length: pageCount }, (_, idx) => {
          const p = originalDoc.getPage(idx);
          return { w: p.getWidth(), h: p.getHeight() };
        });

        // Try profiles from most aggressive → least aggressive.
        // We collect ALL results and pick the one closest to (but ≤) target.
        // More granular steps means we land nearer the goal.
        const rasterProfiles = [
          { dpi: 36, jpegQ: 20 },
          { dpi: 42, jpegQ: 25 },
          { dpi: 48, jpegQ: 30 },
          { dpi: 55, jpegQ: 36 },
          { dpi: 60, jpegQ: 40 },
          { dpi: 65, jpegQ: 44 },
          { dpi: 68, jpegQ: 48 },
          { dpi: 72, jpegQ: 52 },
          { dpi: 78, jpegQ: 56 },
          { dpi: 84, jpegQ: 60 },
          { dpi: 96, jpegQ: 65 },
        ];

        let bestCandidate: Buffer | null = null;
        let bestCandidateSize = Infinity;
        let bestUnder: Buffer | null = null;
        let chosenProfile: { dpi: number; jpegQ: number } | null = null;

        for (const profile of rasterProfiles) {
          const prefix = `${outputPath}-r-${profile.dpi}-${profile.jpegQ}`;
          const rasterPattern = `${prefix}-%03d.jpg`;
          const profRasterOutputs: string[] = [];

          try {
            await new Promise<void>((resolve, reject) => {
              const args = [
                "-sDEVICE=jpeg",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                `-dJPEGQ=${profile.jpegQ}`,
                `-r${profile.dpi}`,
                ...colorArgs,
                `-sOutputFile=${rasterPattern}`,
                inputPath,
              ];
              const proc = spawn(gsBin, args);
              proc.on("error", (err) => {
                reject(err);
              });
              proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`GS Raster Error ${code}`))));
            });

            const rasterDoc = await PDFDocument.create();
            let ok = true;
            for (let i = 0; i < pageCount; i++) {
              const imgPath = `${prefix}-${String(i + 1).padStart(3, "0")}.jpg`;
              profRasterOutputs.push(imgPath);
              if (!fs.existsSync(imgPath)) { ok = false; break; }
              const imgBytes = fs.readFileSync(imgPath);
              const img = await rasterDoc.embedJpg(new Uint8Array(imgBytes));
              const newPage = rasterDoc.addPage([pageSizes[i].w, pageSizes[i].h]);
              newPage.drawImage(img, { x: 0, y: 0, width: newPage.getWidth(), height: newPage.getHeight() });
            }

            if (ok) {
              const rasterBytes = Buffer.from(await rasterDoc.save());
              const sz = rasterBytes.length;
              if (sz < bestCandidateSize) { bestCandidateSize = sz; bestCandidate = rasterBytes; }
              // Track the largest result that still fits under target (= best quality under target)
              if (sz < bestCandidateSize) { bestCandidateSize = sz; bestCandidate = rasterBytes; chosenProfile = profile; }
              if (targetBytes && sz <= targetBytes) {
                if (bestUnder === null || sz > bestUnder.length) {
                  bestUnder = rasterBytes;
                  chosenProfile = profile;
                }
              }
              // Once we're comfortably over target, further less-aggressive profiles will just be even larger, stop
              if (targetBytes && sz > targetBytes * 1.5) break;
            }
          } catch { /* try next profile */ }
          finally {
            for (const p of profRasterOutputs) {
              try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { }
            }
          }
        }

        const chosen = bestUnder || bestCandidate;
        if (chosen) {
          finalBytes = chosen;
        }
        rasterUsedProfile = chosenProfile;
      } catch (err) {
        console.error("Forced rasterization failed:", err);
      } finally {
        for (const p of rasterOutputs) {
          try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { }
        }
      }
    }

    const ratioOut = ((1 - finalBytes.length / originalSize) * 100).toFixed(1);

    return {
      bytes: finalBytes,
      originalSize,
      compressedSize: finalBytes.length,
      ratio: ratioOut,
      actualDpi: rasterUsedProfile ? rasterUsedProfile.dpi : (resolution),
      actualJpegQ: rasterUsedProfile ? rasterUsedProfile.jpegQ : (jpegQ),
      isForced: !!rasterUsedProfile,
    };
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch { }
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch { }
  }
}

export async function protectPdf(
  pdfBytes: Buffer,
  userPass: string,
  ownerPass: string,
  perms: PdfPermissions
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPath = path.join(tmpDir, `ph-prot-in-${ts}.pdf`);
  const outputPath = path.join(tmpDir, `ph-prot-out-${ts}.pdf`);
  fs.writeFileSync(inputPath, new Uint8Array(pdfBytes));

  const qpdfBin = resolveQpdfBinary();

  // Map our permissions to qpdf flags
  const printFlag = perms.printing === 'highResolution' ? 'full' : (perms.printing === 'lowResolution' ? 'low' : 'none');
  const modifyFlag = perms.modifying ? 'all' : 'none';
  const extractFlag = perms.copying ? 'y' : 'n';
  const annotateFlag = perms.annotating ? 'y' : 'n';
  const formsFlag = perms.fillingForms ? 'y' : 'n';

  const args = [
    inputPath,
    `--encrypt`,
    userPass || "",
    ownerPass || "owner",
    "256",
    `--print=${printFlag}`,
    `--modify=${modifyFlag}`,
    `--extract=${extractFlag}`,
    "--",
    outputPath
  ];

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(qpdfBin, args);
      let errData = "";
      proc.stderr.on("data", (data) => errData += data.toString());
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`qpdf protect failed (code ${code}): ${errData}`));
      });
      proc.on("error", (err) => reject(err));
    });

    const outputBuffer = fs.readFileSync(outputPath);
    return outputBuffer;
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) { }
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) { }
  }
}

export async function unlockPdf(pdfBytes: Buffer, password?: string): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPath = path.join(tmpDir, `ph-unlock-in-${ts}.pdf`);
  const outputPath = path.join(tmpDir, `ph-unlock-out-${ts}.pdf`);
  fs.writeFileSync(inputPath, new Uint8Array(pdfBytes));

  const qpdfBin = resolveQpdfBinary();
  const args = [
    `--password=${password || ""}`,
    "--decrypt",
    inputPath,
    outputPath
  ];

  try {
    let notEncrypted = false;
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(qpdfBin, args);
      let stderr = "";
      proc.stderr.on("data", (data) => stderr += data.toString());
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else {
          const lowered = stderr.toLowerCase();
          if (lowered.includes("not encrypted")) {
            notEncrypted = true;
            resolve();
          } else if (lowered.includes("incorrect password") || lowered.includes("invalid password")) {
            reject(new Error("Incorrect password"));
          } else if (lowered.includes("file is encrypted") || lowered.includes("password")) {
            reject(new Error("This PDF requires the open password"));
          } else {
            reject(new Error(`qpdf unlock failed (code ${code}): ${stderr.slice(0, 500)}`));
          }
        }
      });
    });
    if (notEncrypted) return pdfBytes;
    return fs.readFileSync(outputPath);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch { }
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { }
  }
}
