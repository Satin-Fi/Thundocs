import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import ToolNavbar from "@/components/ToolNavbar";
import { cn } from "@/lib/utils";
import {
    ScanText,
    Cpu,
    Sparkles,
    CheckCircle2,
    XCircle,
    Clock,
    BarChart3,
    RefreshCw,
    FileText,
    ImageIcon,
    Activity,
    Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface OcrEvent {
    id: string;
    engine: "gemini" | "tesseract";
    fileType: "pdf" | "image";
    pagesProcessed: number;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
    timestamp: string;
}

interface OcrStats {
    total: number;
    gemini: number;
    tesseract: number;
    successRate: number;
    avgDurationMs: number;
    recentEvents: OcrEvent[];
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-5 flex flex-col gap-3"
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs font-medium text-white/60 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ── Engine Badge ────────────────────────────────────────────────────────────
function EngineBadge({ engine }: { engine: "gemini" | "tesseract" }) {
    return engine === "gemini" ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-100 border border-indigo-400/50 shadow-sm backdrop-blur-md">
            <Sparkles className="w-2.5 h-2.5 text-indigo-300" /> AI Vision
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800/40 text-zinc-100 border border-zinc-500/50 shadow-sm backdrop-blur-md">
            <Cpu className="w-2.5 h-2.5 text-zinc-400" /> Standard
        </span>
    );
}

// ── Donut Ring ─────────────────────────────────────────────────────────────
function DonutRing({ gemini, tesseract, total }: { gemini: number; tesseract: number; total: number }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const geminiPct = total > 0 ? gemini / total : 0;
    const tesseractPct = total > 0 ? tesseract / total : 0;
    const geminiDash = geminiPct * circ;
    const tesseractDash = tesseractPct * circ;

    return (
        <div className="relative flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
                <defs>
                    <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="tesseractGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#52525b" />
                    </linearGradient>
                </defs>
                {/* Background ring */}
                <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
                {/* Tesseract segment */}
                <circle
                    cx="70" cy="70" r={r} fill="none"
                    stroke="url(#tesseractGrad)" strokeWidth="14"
                    strokeDasharray={`${tesseractDash} ${circ - tesseractDash}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                />
                {/* Gemini segment */}
                <circle
                    cx="70" cy="70" r={r} fill="none"
                    stroke="url(#geminiGrad)" strokeWidth="14"
                    strokeDasharray={`${geminiDash} ${circ - geminiDash}`}
                    strokeDashoffset={-(tesseractDash)}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-[10px] text-white/50 font-medium">total runs</p>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
const GEMINI_KEY_STORAGE = "Thundocs_gemini_api_key";

export default function OcrMonitor() {
    const { themeStyles } = useTheme();
    const [stats, setStats] = useState<OcrStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [localEngine, setLocalEngine] = useState<"gemini" | "tesseract">("tesseract");

    useEffect(() => {
        const lastUsed = localStorage.getItem("Thundocs_last_engine") as "gemini" | "tesseract" | null;
        if (lastUsed) {
            setLocalEngine(lastUsed);
        } else {
            const hasKey = !!localStorage.getItem(GEMINI_KEY_STORAGE);
            setLocalEngine(hasKey ? "gemini" : "tesseract");
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/ocr-stats");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setStats(data);
            setLastRefresh(new Date());
        } catch {
            // keep stale data on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10_000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const timeAgo = (iso: string) => {
        const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (secs < 60) return `${secs}s ago`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
        return new Date(iso).toLocaleDateString();
    };

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
                    <svg
                        viewBox="0 0 512 512"
                        className="thunder-bolt-svg hero-bolt w-full h-full"
                    >
                        <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
                    </svg>
                </div>
            </div>
            <div className={`relative z-10 min-h-screen ai-ocr-bg ${themeStyles.text} font-sans`}>
                <ToolNavbar />

            <div className="container mx-auto px-4 py-10 max-w-6xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Activity className="w-8 h-8 text-cyan-400" />
                            OCR Engine Monitor
                        </h1>
                        <p className="text-white/50 text-sm mt-1">
                            Live telemetry for AI OCR extraction runs
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Local engine indicator */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl text-xs font-medium text-white/70">
                            <span className="relative flex h-2 w-2">
                                <span className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    localEngine === "gemini" ? "bg-cyan-400" : "bg-slate-400"
                                )} />
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2 w-2",
                                    localEngine === "gemini" ? "bg-gradient-to-r from-cyan-400 to-indigo-500" : "bg-gradient-to-r from-slate-400 to-zinc-500"
                                )} />
                            </span>
                            Last used: <EngineBadge engine={localEngine} />
                            <span className="text-white/30 text-[10px] ml-1">
                            {localEngine === "gemini" ? "· formatted output" : "· plain text"}
                            </span>
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={fetchStats}
                            className="p-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-colors"
                            title="Refresh now"
                        >
                            <RefreshCw className="w-4 h-4 text-white/70" />
                        </button>
                    </div>
                </div>

                {loading && !stats ? (
                    <div className="flex items-center justify-center h-64 text-white/40 gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading telemetry...
                    </div>
                ) : (
                    <>
                        {/* Stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                label="Total Extractions"
                                value={stats?.total ?? 0}
                                icon={ScanText}
                                color="bg-gradient-to-br from-blue-400 to-indigo-600"
                            />
                            <StatCard
                                label="Success Rate"
                                value={`${stats?.successRate ?? 0}%`}
                                icon={CheckCircle2}
                                color="bg-gradient-to-br from-emerald-400 to-teal-600"
                            />
                            <StatCard
                                label="Avg Duration"
                                value={formatDuration(stats?.avgDurationMs ?? 0)}
                                icon={Clock}
                                color="bg-gradient-to-br from-orange-400 to-rose-500"
                            />
                            <StatCard
                                label="AI Vision Runs"
                                value={stats?.gemini ?? 0}
                                sub={`${stats?.tesseract ?? 0} Standard`}
                                icon={Zap}
                                color="bg-gradient-to-br from-cyan-400 to-indigo-500"
                            />
                        </div>

                        {/* Engine split + recent events */}
                        <div className="grid md:grid-cols-[280px_1fr] gap-6">
                            {/* Donut chart */}
                            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-6 flex flex-col items-center gap-4">
                                <p className="text-sm font-semibold text-white/70 self-start">Engine Split</p>
                                <DonutRing
                                    gemini={stats?.gemini ?? 0}
                                    tesseract={stats?.tesseract ?? 0}
                                    total={stats?.total ?? 0}
                                />
                                <div className="w-full space-y-2 mt-4">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="flex items-center gap-2 text-white drop-shadow-sm font-medium">
                                            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 inline-block shadow-sm shadow-cyan-500/50" />
                                            AI Vision
                                        </span>
                                        <span className="font-bold text-white drop-shadow-sm">{stats?.gemini ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="flex items-center gap-2 text-white drop-shadow-sm font-medium">
                                            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-slate-400 to-zinc-500 inline-block shadow-sm shadow-slate-500/50" />
                                            Standard
                                        </span>
                                        <span className="font-bold text-white drop-shadow-sm">{stats?.tesseract ?? 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent events */}
                            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-white/70">Recent Events</p>
                                    <p className="text-[10px] text-white/30">
                                        Auto-refreshes · last: {lastRefresh.toLocaleTimeString()}
                                    </p>
                                </div>

                                {!stats?.recentEvents?.length ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
                                        <BarChart3 className="w-10 h-10" />
                                        <p className="text-sm">No events yet — run an OCR extraction to see data here</p>
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto max-h-[420px] premium-scrollbar">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-white/10 backdrop-blur-2xl z-10 shadow-sm before:content-[''] before:absolute before:inset-0 before:bg-[#72b4db]/80 before:backdrop-blur-xl before:-z-10 before:rounded-t-xl">
                                                <tr className="text-white text-left text-[13px] relative z-20">
                                                    <th className="py-3 px-4 font-semibold first:rounded-tl-xl border-b border-white/20">Engine</th>
                                                    <th className="py-3 px-4 font-semibold border-b border-white/20">File</th>
                                                    <th className="py-3 px-4 font-semibold border-b border-white/20">Pages</th>
                                                    <th className="py-3 px-4 font-semibold border-b border-white/20">Duration</th>
                                                    <th className="py-3 px-4 font-semibold border-b border-white/20">Status</th>
                                                    <th className="py-3 px-4 font-semibold last:rounded-tr-xl border-b border-white/20">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <AnimatePresence>
                                                    {stats.recentEvents.map((evt) => (
                                                        <motion.tr
                                                            key={evt.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="border-b border-white/10 hover:bg-white/10 transition-colors text-[13px]"
                                                        >
                                                            <td className="py-3 px-4">
                                                                <EngineBadge engine={evt.engine} />
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className="flex items-center gap-2 text-white font-medium drop-shadow-sm">
                                                                    {evt.fileType === "pdf"
                                                                        ? <FileText className="w-4 h-4 text-rose-300 drop-shadow-sm" />
                                                                        : <ImageIcon className="w-4 h-4 text-blue-300 drop-shadow-sm" />
                                                                    }
                                                                    {evt.fileType.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-white font-medium drop-shadow-sm">{evt.pagesProcessed}</td>
                                                            <td className="py-3 px-4 text-white/90 drop-shadow-sm">{formatDuration(evt.durationMs)}</td>
                                                            <td className="py-3 px-4">
                                                                {evt.success
                                                                    ? <span className="flex items-center gap-1.5 text-emerald-300 font-medium drop-shadow-sm"><CheckCircle2 className="w-4 h-4" /> OK</span>
                                                                    : <span className="flex items-center gap-1.5 text-rose-300 font-medium drop-shadow-sm"><XCircle className="w-4 h-4" /> Failed</span>
                                                                }
                                                            </td>
                                                            <td className="py-3 px-4 text-white/80 drop-shadow-sm">{timeAgo(evt.timestamp)}</td>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
