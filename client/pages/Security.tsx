import React from "react";
import { Shield, Lock, EyeOff, Server, HardDrive, RefreshCw } from "lucide-react";
import ToolNavbar from "@/components/ToolNavbar";

export default function Security() {
    const securityFeatures = [
        {
            title: "End-to-End Encryption",
            description: "All files are encrypted during transit using SSL/TLS and at rest using AES-256 encryption.",
            icon: Lock
        },
        {
            title: "Automatic Deletion",
            description: "Processed files are permanently deleted from our servers after 2 hours. Your data is yours alone.",
            icon: RefreshCw
        },
        {
            title: "Zero-Log Policy",
            description: "We don't track what you do with your files. No logs are kept regarding your content or processing history.",
            icon: EyeOff
        },
        {
            title: "GDPR Compliant",
            description: "We strictly adhere to European data protection standards, ensuring the highest level of privacy.",
            icon: Shield
        },
        {
            title: "Secure Infrastructure",
            description: "Our platform runs on enterprise-grade cloud providers with ISO 27001 certification.",
            icon: Server
        },
        {
            title: "No Data Mining",
            description: "We never sell or share your data with advertisers. Our revenue comes from subscriptions, not your data.",
            icon: HardDrive
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
                        Your Security is Our Priority
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        At Thundocs, we understand that your documents are private. We've built our platform with a security-first mindset.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {securityFeatures.map((feature) => (
                        <div
                            key={feature.title}
                            className="glass-panel p-8 rounded-[2.5rem] border border-white/10 hover:border-cyan-500/30 transition-all duration-300 group"
                        >
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/10 transition-colors">
                                <feature.icon className="text-white/60 group-hover:text-cyan-400 transition-colors" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-20 p-10 glass-panel rounded-[3rem] border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-bold mb-4">Have questions about security?</h2>
                            <p className="text-white/60 mb-6 font-medium">
                                Our dedicated security team is available to answer any technical questions you may have about our data handling practices.
                            </p>
                            <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-white/90 active:scale-95 transition-all">
                                Contact Security Team
                            </button>
                        </div>
                        <div className="w-48 h-48 flex items-center justify-center bg-cyan-500/10 rounded-full border border-cyan-500/20">
                            <Shield size={80} className="text-cyan-400" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
