import React from "react";
import { Zap, Cpu, MousePointer2, Layers, Cloud, Sparkles } from "lucide-react";
import ToolNavbar from "@/components/ToolNavbar";

export default function Features() {
    const features = [
        {
            title: "Hyper-Fast Processing",
            description: "Our proprietary engine processes PDF conversions up to 10x faster than traditional web solutions using native WASM and Python backends.",
            icon: Zap,
            gradient: "from-amber-400 to-orange-500"
        },
        {
            title: "Advanced AI Engine",
            description: "Leverage state-of-the-art AI for OCR and document chat. Understand, summarize, and extract data from your documents with human-like precision.",
            icon: Cpu,
            gradient: "from-cyan-400 to-blue-500"
        },
        {
            title: "Intuitive Drag-and-Drop",
            description: "Reorder pages, merge files, and split documents with a premium drag-and-drop interface that feels as smooth as a desktop application.",
            icon: MousePointer2,
            gradient: "from-emerald-400 to-teal-500"
        },
        {
            title: "Batch Transformation",
            description: "Don't compromise on speed. Convert and optimize hundreds of images or documents simultaneously with our efficient batch processing queue.",
            icon: Layers,
            gradient: "from-purple-400 to-pink-500"
        },
        {
            title: "Cloud Interoperability",
            description: "Seamlessly import files from Google Drive, Dropbox, and OneDrive. Keep your workflow connected across all your cloud storage providers.",
            icon: Cloud,
            gradient: "from-blue-400 to-indigo-500"
        },
        {
            title: "Premium Aesthetics",
            description: "Work in a beautiful environment. Our glassmorphism-inspired UI is designed to reduce strain and make your productivity sessions feel elegant.",
            icon: Sparkles,
            gradient: "from-fuchsia-400 to-rose-500"
        }
    ];

    return (
        <div className="hero-group relative min-h-screen bg-[#020408] text-white">
            {/* Ambient lightning background */}
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

            <ToolNavbar />
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                        Built for Power, Made for Beauty
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Experience the next generation of document management. We've combined raw processing power with an unmatched user experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="relative p-0.5 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent group overflow-hidden transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                            <div className="relative h-full glass-panel p-10 rounded-[2.45rem] bg-[#020617]/40 flex flex-col">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br ${feature.gradient} shadow-lg shadow-white/5`}>
                                    <feature.icon size={28} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                                <p className="text-white/50 leading-relaxed font-medium">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-32 text-center pb-20">
                    <h2 className="text-3xl font-bold mb-8">Ready to transform your workflow?</h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button className="bg-cyan-500 text-black px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 active:scale-95">
                            Explore All Tools
                        </button>
                        <button className="glass-panel px-10 py-4 rounded-2xl border border-white/10 font-bold hover:bg-white/5 transition-all active:scale-95">
                            Watch Demo
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
