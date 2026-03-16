import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ToolNavbar from "@/components/ToolNavbar";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Server,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  Sparkles,
  Cpu,
  FileText,
} from "lucide-react";

type StatusState = "checking" | "online" | "offline";
type OcrEngine = "native" | "gemini" | "tesseract";

const ENGINE_STORAGE_KEY = "Thundocs_ocr_engine";
const GEMINI_KEY_STORAGE = "Thundocs_gemini_api_key";

interface ServerInfo {
  id: string;
  name: string;
  description: string;
  url: string;
}

interface ServerStatusState extends ServerInfo {
  status: StatusState;
}

const servers: ServerInfo[] = [

  {
    id: "express-api",
    name: "Express API",
    description: "Main Thundocs backend (serves /api routes).",
    url: "/api/ping",
  },
];

export default function ServerStatusPage() {
  const { setTheme } = useTheme();
  const [statuses, setStatuses] = useState<ServerStatusState[]>(
    servers.map((s) => ({ ...s, status: "checking" }))
  );
  const [engine, setEngine] = useState<OcrEngine>(() => {
    const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
    if (saved === "native" || saved === "gemini" || saved === "tesseract") {
      return saved;
    }
    return localStorage.getItem(GEMINI_KEY_STORAGE) ? "gemini" : "tesseract";
  });

  useEffect(() => {
    setTheme("day");
  }, [setTheme]);

  useEffect(() => {
    let cancelled = false;

    const checkAll = async () => {
      const results = await Promise.all(
        servers.map(async (srv) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(srv.url, { signal: controller.signal });
            clearTimeout(timeout);
            return {
              ...srv,
              status: res.ok ? ("online" as StatusState) : ("offline" as StatusState),
            };
          } catch {
            return { ...srv, status: "offline" as StatusState };
          }
        })
      );

      if (!cancelled) {
        setStatuses(results);
      }
    };

    checkAll();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hero-group relative min-h-screen bg-[#020408] font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
          <svg viewBox="0 0 512 512" className="thunder-bolt-svg hero-bolt w-full h-full">
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 min-h-screen font-sans transition-colors duration-300 text-slate-900"
        )}
      >
        <ToolNavbar />

        <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[90vh]">
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
                Server Status
              </h1>
              <p className="text-sm md:text-base max-w-2xl mx-auto text-slate-600">
                Monitor the health of local services used by Thundocs tools.
              </p>
            </div>

            <Card className="glass-panel overflow-hidden border border-white/30 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">OCR Engine</p>
                    <p className="text-xs text-slate-600">
                      Set the default OCR engine for AI OCR.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="http://localhost:8081/admin/ocr"
                      className="text-xs px-2.5 py-1 rounded-full font-medium border border-white/40 bg-white/50 backdrop-blur-xl text-slate-700 hover:text-slate-900 hover:bg-white/70"
                    >
                      Open Monitor
                    </a>
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium border",
                        engine === "gemini"
                          ? "border-cyan-500/40 text-cyan-500 bg-cyan-500/10"
                          : "border-slate-500/40 text-slate-500 bg-slate-500/10"
                      )}
                    >
                      {engine === "gemini" ? "AI Vision Mode" : "Standard Mode"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      setEngine("gemini");
                      localStorage.setItem(ENGINE_STORAGE_KEY, "gemini");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border backdrop-blur-xl",
                      engine === "gemini"
                        ? "bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30"
                        : "bg-white/55 border-white/50 text-slate-700 hover:bg-white/75"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Vision Mode
                  </button>
                  <button
                    onClick={() => {
                      setEngine("tesseract");
                      localStorage.setItem(ENGINE_STORAGE_KEY, "tesseract");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border backdrop-blur-xl",
                      engine === "tesseract"
                        ? "bg-gradient-to-r from-slate-600 to-slate-700 border-slate-500 text-white shadow-lg shadow-slate-500/30"
                        : "bg-white/55 border-white/50 text-slate-700 hover:bg-white/75"
                    )}
                  >
                    <Cpu className="w-4 h-4" />
                    Standard Mode
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {statuses.map((srv) => {
                const isOnline = srv.status === "online";
                const isChecking = srv.status === "checking";

                return (
                  <motion.div
                    key={srv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="glass-panel overflow-hidden border border-white/30 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-lg",
                                isOnline
                                  ? "bg-emerald-500/10"
                                  : srv.status === "offline"
                                    ? "bg-red-500/10"
                                    : "bg-amber-500/10"
                              )}
                            >
                              <Server
                                className={cn(
                                  "w-5 h-5",
                                  isOnline
                                    ? "text-emerald-500"
                                    : srv.status === "offline"
                                      ? "text-red-500"
                                      : "text-amber-500"
                                )}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{srv.name}</p>
                              <p className="text-xs text-slate-600">{srv.description}</p>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                              isOnline
                                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                : srv.status === "offline"
                                  ? "border-red-500/40 text-red-400 bg-red-500/10"
                                  : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            )}
                          >
                            {isChecking ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isOnline ? (
                              <Wifi className="w-3 h-3" />
                            ) : (
                              <WifiOff className="w-3 h-3" />
                            )}
                            <span>
                              {isChecking
                                ? "Checking..."
                                : isOnline
                                  ? "Online"
                                  : "Offline"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <code
                            className="text-[11px] px-2 py-1 rounded bg-white/60 border border-white/40 truncate text-slate-700"
                            title={srv.url}
                          >
                            {srv.url}
                          </code>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setStatuses((prev) =>
                                prev.map((p) =>
                                  p.id === srv.id ? { ...p, status: "checking" } : p
                                )
                              );
                              try {
                                const controller = new AbortController();
                                const timeout = setTimeout(
                                  () => controller.abort(),
                                  3000
                                );
                                const res = await fetch(srv.url, {
                                  signal: controller.signal,
                                });
                                clearTimeout(timeout);
                                setStatuses((prev) =>
                                  prev.map((p) =>
                                    p.id === srv.id
                                      ? {
                                        ...p,
                                        status: res.ok
                                          ? ("online" as StatusState)
                                          : ("offline" as StatusState),
                                      }
                                      : p
                                  )
                                );
                              } catch {
                                setStatuses((prev) =>
                                  prev.map((p) =>
                                    p.id === srv.id
                                      ? { ...p, status: "offline" as StatusState }
                                      : p
                                  )
                                );
                              }
                            }}
                            className="text-xs h-8 gap-1 bg-white/55 border border-white/50 text-slate-700 hover:bg-white/75 backdrop-blur-xl"
                          >
                            <Activity className="w-3 h-3" />
                            Re-check
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
