import React from "react";
import { Check, Zap, Shield, Crown } from "lucide-react";
import ToolNavbar from "@/components/ToolNavbar";

export default function Pricing() {
    const plans = [
        {
            name: "Free",
            price: "$0",
            description: "Perfect for quick, occasional tasks",
            features: ["5 tasks per day", "Standard processing speed", "Maximum file size 50MB", "Basic AI OCR features"],
            icon: Zap,
            buttonText: "Get Started",
            popular: false
        },
        {
            name: "Pro",
            price: "$9",
            description: "For professionals who need more power",
            features: ["Unlimited tasks", "Priority processing", "Maximum file size 500MB", "Full AI PDF Chat access", "Premium support"],
            icon: Crown,
            buttonText: "Go Pro",
            popular: true
        },
        {
            name: "Team",
            price: "$29",
            description: "Collaborate with your entire team",
            features: ["Up to 10 users", "Shared workspace", "Advanced usage analytics", "Custom file retention", "API access"],
            icon: Shield,
            buttonText: "Contact Sales",
            popular: false
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
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Choose the plan that's right for you. Whether you're a student or a global enterprise, we have you covered.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative glass-panel rounded-[2rem] border overflow-hidden p-8 flex flex-col transition-all duration-500 hover:translate-y-[-8px] ${plan.popular ? "border-cyan-500/40 bg-cyan-500/5 shadow-[0_20px_50px_-20px_rgba(6,182,212,0.3)]" : "border-white/10 hover:border-white/20"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-6 right-6">
                                    <span className="bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${plan.popular ? "bg-cyan-500 text-black" : "bg-white/5 text-white/70"}`}>
                                    <plan.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-black">{plan.price}</span>
                                    <span className="text-white/40 text-sm">/month</span>
                                </div>
                                <p className="text-sm text-white/50">{plan.description}</p>
                            </div>

                            <div className="flex-1 space-y-4 mb-10">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3 text-sm text-white/70">
                                        <Check size={16} className="text-cyan-500" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${plan.popular
                                        ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_10px_30px_-5px_rgba(6,182,212,0.4)]"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                    }`}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
