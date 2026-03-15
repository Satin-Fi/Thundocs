"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link as LinkIcon, Check, Mail } from "lucide-react";

type SplitDownloadCardProps = {
  title: string;
  primaryLabel?: string;
  downloadUrl: string;
  onDownload: () => void;
  contextLabel?: string;
  sizeLabel?: string;
};

export default function SplitDownloadCard({
  title,
  primaryLabel = "Download PDF",
  downloadUrl,
  onDownload,
  contextLabel,
  sizeLabel,
}: SplitDownloadCardProps) {
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

  const shareEmail = () => {
    const subject = encodeURIComponent("Your file from Thundocs");
    const body = encodeURIComponent(`Here is your file:\n${downloadUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="w-full flex justify-center py-6">
      <div className="split-download-card max-w-sm w-full flex flex-col">
        <div className="space-y-1 mb-4 absolute top-6 left-6 text-left">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {contextLabel || "Split complete"}
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
            {title}
          </h2>
        </div>

        {/* Main content: button + QR + share icons */}
        <div className="pt-20 pb-6 flex-1 flex flex-col items-center justify-center gap-6">
          <button
            onClick={onDownload}
            className="w-full bg-black text-white h-11 px-8 rounded-full font-semibold text-sm shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:bg-black/90"
          >
            {primaryLabel}
          </button>

          <div className="flex items-center justify-center gap-4 w-full">
            <div className="bg-white/90 border border-white/80 rounded-2xl p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]">
              <QRCodeSVG value={downloadUrl} size={140} level="H" includeMargin={false} />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={shareWhatsApp}
                className="w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105 flex items-center justify-center"
                title="Share on WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
                  <path
                    d="M128 32c-53 0-96 41-96 92 0 18 5 35 14 50l-14 50 52-14c14 8 30 12 46 12 53 0 96-41 96-92s-43-92-96-92Z"
                    fill="#25D366"
                  />
                  <path
                    d="M176 152c-4-2-24-12-27-13-3-2-6-2-8 2-2 3-10 13-12 15-2 2-4 2-8 0-4-2-16-6-30-20-11-10-18-22-20-26-2-4 0-6 2-8 2-2 4-4 6-6 2-2 2-4 3-6 1-2 0-5-1-7-2-2-8-20-11-28-3-8-6-7-8-7h-7c-2 0-7 1-11 5s-14 13-14 32 14 38 16 41c2 2 28 45 69 63 10 4 18 7 24 9 10 3 20 3 28 2 9-1 24-9 27-18 3-9 3-17 2-18-1-1-3-2-6-3Z"
                    fill="#fff"
                  />
                </svg>
              </button>
              <button
                onClick={shareEmail}
                className="w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105 flex items-center justify-center"
                title="Share via Email"
              >
                <Mail className="w-5 h-5" />
              </button>
              <button
                onClick={copyLink}
                className="w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105 flex items-center justify-center"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-500" />
                ) : (
                  <LinkIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {sizeLabel && (
          <div className="mt-auto pt-4 -mb-1 text-[11px] tracking-[0.18em] uppercase text-slate-500 text-center">
            {sizeLabel}
          </div>
        )}
      </div>
    </div>
  );
}
