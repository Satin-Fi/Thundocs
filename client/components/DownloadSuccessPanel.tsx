import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link as LinkIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DownloadSuccessPanelProps = {
  title: string;
  primaryLabel: string;
  downloadUrl: string;
  downloadName?: string;
  onDownload: () => void;
  onDriveClick?: () => void;
  onDropboxClick?: () => void;
  contextLabel?: string;
};

export default function DownloadSuccessPanel({
  title,
  primaryLabel,
  downloadUrl,
  downloadName,
  onDownload,
  onDriveClick,
  onDropboxClick,
  contextLabel,
}: DownloadSuccessPanelProps) {
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);

  const [googleDriveReady, setGoogleDriveReady] = useState(false);
  const [dropboxReady, setDropboxReady] = useState(false);

  useEffect(() => {
    // Google API 
    if (!(window as any).google?.accounts) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleDriveReady(true);
      document.body.appendChild(script);
    } else {
      setGoogleDriveReady(true);
    }
  }, []);

  useEffect(() => {
    // Dropbox API
    if (!(window as any).Dropbox) {
      const script = document.createElement("script");
      script.src = "https://www.dropbox.com/static/api/2/dropins.js";
      script.id = "dropboxjs";
      script.setAttribute("data-app-key", import.meta.env.VITE_DROPBOX_APP_KEY || "lb9ck52mtstuklu");
      script.onload = () => setDropboxReady(true);
      document.body.appendChild(script);
    } else {
      setDropboxReady(true);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

  const handleDrive = () => {
    if (onDriveClick) {
      onDriveClick();
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleDriveReady) {
      toast({
        title: "Integration Required",
        description: "Google Drive saving requires a valid Client ID and page reload.",
        variant: "destructive"
      });
      return;
    }

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          toast({ title: "Saving...", description: "Uploading document to Google Drive." });
          try {
            const fileBlob = await fetch(downloadUrl).then(r => r.blob());
            const metadata = {
              name: downloadName || "Converted_Document",
            };

            const form = new FormData();
            form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
            form.append("file", fileBlob);

            const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
              method: "POST",
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              body: form
            });

            if (!res.ok) throw new Error("Upload failed");
            toast({ title: "Success", description: "Document saved to Google Drive!" });
          } catch (err) {
            toast({ title: "Save Failed", description: "Could not upload to Google Drive.", variant: "destructive" });
          }
        } else if (tokenResponse?.error) {
          toast({ title: "Google Drive Error", description: tokenResponse.error_description || "Authentication failed", variant: "destructive" });
        }
      }
    });
    tokenClient.requestAccessToken();
  };

  const handleDropbox = async () => {
    if (onDropboxClick) {
      onDropboxClick();
      return;
    }

    if (!dropboxReady || !(window as any).Dropbox) {
      toast({
        title: "Integration Required",
        description: "Dropbox saving requires a valid App Key and page reload.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({ title: "Preparing...", description: "Preparing document for Dropbox." });

      const blob = await fetch(downloadUrl).then(r => r.blob());
      const reader = new FileReader();

      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) {
          (window as any).Dropbox.save(dataUrl, downloadName || "Converted_Document");
        }
      };
      reader.readAsDataURL(blob);

    } catch (err) {
      toast({ title: "Error", description: "Could not prepare document data.", variant: "destructive" });
    }
  };

  return (
    <div className="compress-hero success-panel">
      <div className="success-panel-blobs">
        <div className="ribbon r-3"></div>
        <div className="ribbon r-2"></div>
        <div className="ribbon r-1"></div>
      </div>
      <div className="success-panel-card">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
            {contextLabel ?? "Compression complete"}
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-slate-900">
            {title}
          </h2>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] items-center">
          <div className="flex flex-col items-center md:items-start gap-4">
            <button
              onClick={onDownload}
              className="h-12 px-10 rounded-full bg-black text-white text-sm font-semibold shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:bg-black/90 w-full md:w-auto"
            >
              {primaryLabel}
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <div className="bg-white/90 border border-white/80 rounded-2xl p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)]">
              <QRCodeSVG value={downloadUrl} size={150} level="H" includeMargin={false} />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={handleDrive}
                className="group relative w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 flex items-center justify-center text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105"
              >
              <svg width="22" height="22" viewBox="0 0 256 256" fill="none">
                <path d="M88 32h80l56 96-40 70H96L40 128 88 32Z" fill="#34A853" />
                <path d="M88 32 40 128l40 70h80L88 32Z" fill="#FBBC05" />
                <path d="m168 128-40 70h88l40-70h-88Z" fill="#4285F4" />
              </svg>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 text-slate-800 text-[11px] px-2.5 py-1 border border-white/80 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.25)] opacity-0 translate-y-1 scale-95 transition group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 backdrop-blur-xl">
                Save to Google Drive
              </span>
            </button>
            <button
              onClick={handleDropbox}
              className="group relative w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 flex items-center justify-center text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105"
            >
              <svg width="22" height="22" viewBox="0 0 256 256" fill="none">
                <path d="m76 40 52 36-52 36-52-36 52-36Z" fill="#0061FF" />
                <path d="m180 40 52 36-52 36-52-36 52-36Z" fill="#0061FF" />
                <path d="m24 140 52-36 52 36-52 36-52-36Z" fill="#0061FF" />
                <path d="m232 140-52-36-52 36 52 36 52-36Z" fill="#0061FF" />
                <path d="m128 196-52-36 52-36 52 36-52 36Z" fill="#0061FF" />
              </svg>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 text-slate-800 text-[11px] px-2.5 py-1 border border-white/80 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.25)] opacity-0 translate-y-1 scale-95 transition group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 backdrop-blur-xl">
                Save to Dropbox
              </span>
            </button>
            <button
              onClick={() => {
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(downloadUrl)}`,
                  "_blank"
                );
              }}
              className="group relative w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 flex items-center justify-center text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105"
            >
              <svg width="22" height="22" viewBox="0 0 256 256" fill="none">
                <path d="M128 32c-53 0-96 41-96 92 0 18 5 35 14 50l-14 50 52-14c14 8 30 12 46 12 53 0 96-41 96-92s-43-92-96-92Z" fill="#25D366" />
                <path d="M176 152c-4-2-24-12-27-13-3-2-6-2-8 2-2 3-10 13-12 15-2 2-4 2-8 0-4-2-16-6-30-20-11-10-18-22-20-26-2-4 0-6 2-8 2-2 4-4 6-6 2-2 2-4 3-6 1-2 0-5-1-7-2-2-8-20-11-28-3-8-6-7-8-7h-7c-2 0-7 1-11 5s-14 13-14 32 14 38 16 41c2 2 28 45 69 63 10 4 18 7 24 9 10 3 20 3 28 2 9-1 24-9 27-18 3-9 3-17 2-18-1-1-3-2-6-3Z" fill="#fff" />
              </svg>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 text-slate-800 text-[11px] px-2.5 py-1 border border-white/80 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.25)] opacity-0 translate-y-1 scale-95 transition group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 backdrop-blur-xl">
                Share on WhatsApp
              </span>
            </button>
            <button
              onClick={handleCopy}
              className="group relative w-11 h-11 rounded-full bg-white/80 hover:bg-white border border-white/80 flex items-center justify-center text-slate-700 shadow-[0_10px_22px_-12px_rgba(15,23,42,0.25)] transition-all hover:scale-105"
            >
              {linkCopied ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <LinkIcon className="w-5 h-5" />
              )}
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 text-slate-800 text-[11px] px-2.5 py-1 border border-white/80 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.25)] opacity-0 translate-y-1 scale-95 transition group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 backdrop-blur-xl">
                {linkCopied ? "Link copied" : "Copy link"}
              </span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
