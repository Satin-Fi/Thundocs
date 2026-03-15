import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentFiles } from '@/hooks/use-recent-files';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, LogOut, Mail, User, Calendar, Key,
    Clock, Trash2, FileText, ExternalLink, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModernBackground from '@/components/ModernBackground';

function formatRelativeTime(epochMs: number): string {
    const diff = Date.now() - epochMs;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(epochMs).toLocaleDateString();
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}

// Tool-specific accent colours
const toolColors: Record<string, string> = {
    'Merge PDF':          'from-violet-500 to-purple-500',
    'Split PDF':          'from-cyan-500 to-blue-500',
    'Compress PDF':       'from-emerald-500 to-teal-500',
    'Protect PDF':        'from-slate-400 to-slate-300',
    'Unlock PDF':         'from-amber-400 to-yellow-400',
    'Word to PDF':        'from-violet-400 to-indigo-400',
    'Excel to PDF':       'from-emerald-400 to-green-400',
    'PowerPoint to PDF':  'from-orange-400 to-red-400',
    'PDF to Word':        'from-blue-400 to-cyan-400',
    'PDF to Image':       'from-pink-400 to-rose-400',
    'Image to PDF':       'from-fuchsia-400 to-purple-400',
};

function ToolBadge({ tool }: { tool: string }) {
    const gradient = toolColors[tool] ?? 'from-zinc-400 to-zinc-500';
    return (
        <span className={`inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} bg-clip-text text-transparent border border-white/10`}>
            {tool}
        </span>
    );
}

export default function Profile() {
    const { user, isAuthenticated, signOut } = useAuth();
    const { recentFiles, clearHistory } = useRecentFiles(user?.id ?? null);

    if (!isAuthenticated || !user) {
        return <Navigate to="/signin" replace />;
    }

    const filesProcessed = recentFiles.length;
    const toolsUsed = useMemo(() =>
        new Set(recentFiles.map(f => f.tool)).size,
    [recentFiles]);

    return (
        <div className="min-h-screen bg-zinc-950 font-sans selection:bg-white/20">
            <ModernBackground className="bg-zinc-950" gradientColor="radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(9, 9, 11, 0) 70%)" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Back to Home */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    {/* Profile Header */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 md:p-12 backdrop-blur-sm mb-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-24 h-24 rounded-full border-4 border-zinc-800"
                            />
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-heading font-bold text-white mb-2">
                                    {user.name}
                                </h1>
                                <p className="text-zinc-400 mb-4">{user.email}</p>

                                <Button
                                    onClick={signOut}
                                    variant="outline"
                                    className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-zinc-300"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Files Processed', value: filesProcessed },
                            { label: 'Tools Used',      value: toolsUsed },
                            { label: 'Current Plan',    value: 'Free' },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center backdrop-blur-sm"
                            >
                                <div className="text-3xl font-bold text-white mb-1">{value}</div>
                                <div className="text-sm text-zinc-500">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-zinc-400" />
                                <h2 className="text-xl font-heading font-bold text-white">
                                    Recent Activity
                                </h2>
                                {filesProcessed > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-zinc-800 text-zinc-400">
                                        {filesProcessed}
                                    </span>
                                )}
                            </div>
                            {filesProcessed > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear history
                                </button>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {recentFiles.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-12 gap-4"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
                                        <Zap className="w-7 h-7 text-zinc-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-zinc-400 font-medium mb-1">No files processed yet</p>
                                        <p className="text-zinc-600 text-sm">
                                            Use any tool — your activity will appear here.
                                        </p>
                                    </div>
                                    <Link
                                        to="/"
                                        className="mt-2 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white border border-zinc-700 hover:border-zinc-600 px-4 py-2 rounded-xl transition-all"
                                    >
                                        Browse tools
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.ul
                                    key="list"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-2"
                                >
                                    {recentFiles.map((f, i) => (
                                        <motion.li
                                            key={f.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04, duration: 0.25 }}
                                            className="group flex items-center gap-4 p-3 rounded-xl border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/30 transition-all"
                                        >
                                            {/* File icon */}
                                            <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                                <FileText className="w-5 h-5" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-sm font-medium text-zinc-200 truncate leading-snug"
                                                    title={f.name}
                                                >
                                                    {f.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <ToolBadge tool={f.tool} />
                                                    <span className="text-[11px] text-zinc-600">
                                                        {formatBytes(f.inputSize)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Time + link */}
                                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                                <span className="text-xs text-zinc-500">
                                                    {formatRelativeTime(f.processedAt)}
                                                </span>
                                                <Link
                                                    to={f.toolPath}
                                                    className="text-[10px] text-zinc-600 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                                                >
                                                    Use again
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </Link>
                                            </div>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Account Details */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm mb-6">
                        <h2 className="text-xl font-heading font-bold text-white mb-6">
                            Account Details
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-zinc-300">
                                <Mail className="w-5 h-5 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Email</p>
                                    <p className="font-medium">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-300">
                                <User className="w-5 h-5 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Full Name</p>
                                    <p className="font-medium">{user.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-300">
                                <Calendar className="w-5 h-5 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Member Since</p>
                                    <p className="font-medium">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Access */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
                        <div className="flex items-start gap-3 mb-4">
                            <Key className="w-5 h-5 text-zinc-500 mt-1" />
                            <div className="flex-1">
                                <h2 className="text-xl font-heading font-bold text-white mb-2">
                                    API Access
                                </h2>
                                <p className="text-zinc-400 mb-4">
                                    Integrate Thundocs's powerful document tools into your applications.
                                </p>
                            </div>
                        </div>
                        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6 text-center">
                            <p className="text-zinc-500 mb-2">🚀 API access is coming soon!</p>
                            <p className="text-sm text-zinc-600">
                                You'll be able to generate API keys and integrate our tools into your apps.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
