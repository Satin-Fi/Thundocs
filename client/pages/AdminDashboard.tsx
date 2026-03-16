import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { revokeAdmin } from "@/components/AdminGate";
import {
  Activity, Server, Cpu, RefreshCw, LogOut, CheckCircle2,
  XCircle, Clock, Database, MemoryStick, Zap, ScanText,
  FileText, BarChart3, Sparkles, ChevronRight, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ServiceInfo {
  ok: boolean;
  label: string;
  detail: string;
}

interface HealthData {
  ok: boolean;
  timestamp: string;
  uptime: number;
  memory: { heapMb: number; heapTotalMb: number; rssMb: number };
  services: {
    expressApi: ServiceInfo;
    documentConverter: ServiceInfo;
    pdfProcessor: ServiceInfo;
    pdfEncryption: ServiceInfo;
  };
}

interface OcrStats {
  total: number;
  gemini: number;
  tesseract: number;
  successRate: number;
  avgDurationMs: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatUptime(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ServiceCard({ service, index }: { service: ServiceInfo & { icon: React.ElementType; id: string }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "relative rounded-2xl border p-5 flex flex-col gap-3 transition-all",
        service.ok
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          service.ok ? "bg-emerald-500/15" : "bg-red-500/15"
        )}>
          <service.icon className={cn("w-5 h-5", service.ok ? "text-emerald-400" : "text-red-400")} />
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
          service.ok
            ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
            : "border-red-500/30 text-red-300 bg-red-500/10"
        )}>
          {service.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {service.ok ? "Online" : "Unavailable"}
        </div>
      </div>
      <div>
        <p className="font-semibold text-white text-sm">{service.label}</p>
        <p className="text-white/40 text-xs mt-0.5 truncate" title={service.detail}>{service.detail}</p>
      </div>
    </motion.div>
  );
}

function StatPill({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-white/50 text-xs font-medium">{label}</p>
      {sub && <p className="text-white/30 text-[11px]">{sub}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [ocrStats, setOcrStats] = useState<OcrStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);

  const fetchAll = useCallback(async () => {
    try {
      const [hRes, oRes] = await Promise.all([
        fetch("/api/admin/health"),
        fetch("/api/v1/ocr-stats"),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (oRes.ok) setOcrStats(await oRes.json());
      setLastRefresh(new Date());
      setCountdown(30);
    } catch { /* keep stale */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const handleLogout = () => {
    revokeAdmin();
    navigate("/admin");
  };

  const services = health ? [
    { id: "api", ...health.services.expressApi, icon: Server },
    { id: "convert", ...health.services.documentConverter, icon: FileText },
    { id: "pdf", ...health.services.pdfProcessor, icon: Cpu },
    { id: "enc", ...health.services.pdfEncryption, icon: Shield },
  ] : [];

  const allOk = services.length > 0 && services.every(s => s.ok);
  const offlineCount = services.filter(s => !s.ok).length;

  return (
    <div className="hero-group relative min-h-screen bg-[#020408] font-sans text-white antialiased">
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
          <svg
            viewBox="0 0 512 512"
            className="thunder-bolt-svg hero-bolt w-full h-full"
          >
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-white/40 text-xs">Last refreshed: {lastRefresh.toLocaleTimeString()} · next in {countdown}s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-white/60 hover:text-red-300 transition-all text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-white/30 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            {/* Overall status banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border p-4 flex items-center gap-3",
                allOk
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
              )}
            >
              {allOk ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <p className={cn("text-sm font-semibold", allOk ? "text-emerald-300" : "text-amber-300")}>
                {allOk
                  ? "All systems operational"
                  : `${offlineCount} service${offlineCount > 1 ? "s" : ""} unavailable`}
              </p>
              {health && (
                <p className="text-white/30 text-xs ml-auto">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              )}
            </motion.div>

            {/* Service grid */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Services</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {services.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
              </div>
            </div>

            {/* Server metrics + OCR stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Server metrics */}
              {health && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Server Metrics</p>
                  <div className="grid grid-cols-2 gap-3">
                    <StatPill label="Uptime" value={formatUptime(health.uptime)} color="text-sky-300" />
                    <StatPill label="Heap Used" value={`${health.memory.heapMb} MB`} sub={`of ${health.memory.heapTotalMb} MB`} color="text-violet-300" />
                    <StatPill label="RSS Memory" value={`${health.memory.rssMb} MB`} color="text-amber-300" />
                    <StatPill label="Platform" value={navigator.platform.split(" ")[0]} color="text-slate-300" />
                  </div>
                </div>
              )}

              {/* OCR stats */}
              {ocrStats && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">OCR Telemetry</p>
                    <button
                      onClick={() => navigate("/admin/ocr")}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Full monitor <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatPill label="Total Extractions" value={ocrStats.total} color="text-blue-300" />
                    <StatPill label="Success Rate" value={`${ocrStats.successRate}%`} color="text-emerald-300" />
                    <StatPill label="Avg Duration" value={formatDuration(ocrStats.avgDurationMs)} color="text-orange-300" />
                    <StatPill
                      label="AI Vision Runs"
                      value={ocrStats.gemini}
                      sub={`${ocrStats.tesseract} standard`}
                      color="text-cyan-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick links */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Quick Access</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/admin/ocr")}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center group-hover:bg-indigo-500/25 transition-colors">
                    <ScanText className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">OCR Monitor</p>
                    <p className="text-xs text-white/40">Live extraction telemetry</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 ml-auto group-hover:text-white/60 transition-colors" />
                </button>
                <button
                  onClick={() => navigate("/server-status")}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center group-hover:bg-sky-500/25 transition-colors">
                    <Server className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Server Status</p>
                    <p className="text-xs text-white/40">API & OCR engine settings</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 ml-auto group-hover:text-white/60 transition-colors" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
