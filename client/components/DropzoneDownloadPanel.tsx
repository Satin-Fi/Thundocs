import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link as LinkIcon, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  downloadUrl: string;
  primaryLabel?: string;
  onDownload: () => void;
  compressionRatio?: number;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  isLoading?: boolean;
  progress?: number;
  compressedSizeLabel?: string;
  showBlobs?: boolean;
  showToggle?: boolean;
};

export default function DropzoneDownloadPanel({
  title,
  downloadUrl,
  primaryLabel = "Download PDF",
  onDownload,
  compressionRatio,
  showDetails,
  onToggleDetails,
  isLoading,
  progress = 0,
  compressedSizeLabel,
  showBlobs = true,
  showToggle = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(downloadUrl)}`;
    window.open(url, "_blank");
  };

  return (
    <div className={cn("w-full h-full", showBlobs && "composition-layer success-composition")}>
      {showBlobs && (
        <>
          <div className="ribbon r-1"></div>
          <div className="ribbon r-3"></div>
          <div className="ribbon r-2"></div>
        </>
      )}

      <div
        className={cn(
          "upload-zone upload-card inline-card p-6 md:p-8 border !h-[600px] text-center flex flex-col items-center gap-4 relative",
          isLoading ? "justify-center" : "justify-between",
        )}
      >
        {showToggle && onToggleDetails && !isLoading && (
          <button
            type="button"
            onClick={onToggleDetails}
            className="flex absolute -bottom-3.5 left-1/2 -translate-x-1/2 md:-left-3.5 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:bottom-auto w-7 h-7 rounded-full bg-white/90 border border-white/80 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] items-center justify-center text-slate-700 hover:bg-white z-20 transition-all duration-300"
          >
            {showDetails ? (
              <ChevronLeft className="w-3.5 h-3.5 rotate-90 md:rotate-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 rotate-90 md:rotate-0" />
            )}
          </button>
        )}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isLoading ? "Processing" : "Ready"}
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
            {isLoading ? "Optimizing your PDF..." : title}
          </h2>
        </div>

        <div
          className={cn(
            "flex flex-col items-center gap-4 w-full",
            isLoading ? "flex-1 justify-center mt-4" : "mt-8",
          )}
        >
          {isLoading ? (
            <div className="flex-1 flex flex-col px-2 py-4 w-full">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs space-y-3 text-center">
                  <div className="text-5xl md:text-6xl font-extrabold text-slate-900">
                    {progress}%
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-300/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400 transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(Math.max(progress ?? 0, 5), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={onDownload}
                className="w-full bg-black text-white h-11 px-8 rounded-full font-semibold text-sm shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:bg-black/90"
              >
                {primaryLabel}
              </button>

              <div className="flex items-center justify-center gap-5">
                <div className="bg-white/90 border border-white/80 rounded-2xl p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]">
                  <QRCodeSVG value={downloadUrl} size={140} level="H" includeMargin={false} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={shareWhatsApp}
                    className="w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105 flex items-center justify-center"
                    title="Share on WhatsApp"
                  >
                    <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
                      <path d="M128 32c-53 0-96 41-96 92 0 18 5 35 14 50l-14 50 52-14c14 8 30 12 46 12 53 0 96-41 96-92s-43-92-96-92Z" fill="#25D366" />
                      <path d="M176 152c-4-2-24-12-27-13-3-2-6-2-8 2-2 3-10 13-12 15-2 2-4 2-8 0-4-2-16-6-30-20-11-10-18-22-20-26-2-4 0-6 2-8 2-2 4-4 6-6 2-2 2-4 3-6 1-2 0-5-1-7-2-2-8-20-11-28-3-8-6-7-8-7h-7c-2 0-7 1-11 5s-14 13-14 32 14 38 16 41c2 2 28 45 69 63 10 4 18 7 24 9 10 3 20 3 28 2 9-1 24-9 27-18 3-9 3-17 2-18-1-1-3-2-6-3Z" fill="#fff" />
                    </svg>
                  </button>
                  <button
                    onClick={copyLink}
                    className="w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105 flex items-center justify-center"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <LinkIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {!isLoading && compressionRatio !== undefined && (
          <div className="mt-auto pt-4 text-center w-full">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Compression</p>
            <h3 className="text-xl font-semibold text-slate-900 mt-0.5">{compressionRatio}% smaller</h3>
            {compressedSizeLabel && (
              <p className="text-[10px] text-slate-600 mt-1 font-semibold">{compressedSizeLabel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
