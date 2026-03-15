import React, { useState } from "react";
import { HelpCircle, MessageCircle, Send, ChevronDown, ChevronUp, Mail, Search } from "lucide-react";
import ToolNavbar from "@/components/ToolNavbar";

export default function HelpCenter() {
    const [searchQuery, setSearchQuery] = useState("");
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const faqs = [
        {
            question: "How long are my files stored?",
            answer: "We take privacy seriously. All files processed on Thundocs are automatically and permanently deleted from our servers after 2 hours. We do not keep backups or logs of your content."
        },
        {
            question: "Is there a limit on file size?",
            answer: "Free users can upload files up to 50MB. Pro users enjoy a significantly higher limit of 500MB per file. We're optimized for handle even complex, multi-page documents."
        },
        {
            question: "Does your AI OCR support multiple languages?",
            answer: "Yes! Our AI OCR engine supports over 30 languages including English, Spanish, French, Chinese, Arabic, and Hindi. It accurately extracts text even from low-resolution scans."
        },
        {
            question: "Can I use Thundocs on mobile?",
            answer: "Absolutely. Our platform is fully responsive and optimized for mobile browsers, allowing you to convert and manage documents on the go."
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
                        How can we help?
                    </h1>
                    <div className="max-w-xl mx-auto relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search help articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* FAQ Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-8">
                            <HelpCircle className="text-cyan-400" />
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    className="glass-panel border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20"
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                    >
                                        <span className="font-bold text-lg pr-8">{faq.question}</span>
                                        {openFaq === index ? <ChevronUp className="text-cyan-400" /> : <ChevronDown className="text-white/30" />}
                                    </button>
                                    {openFaq === index && (
                                        <div className="px-6 pb-6 text-white/60 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-8">
                            <MessageCircle className="text-cyan-400" />
                            Support hub
                        </h2>
                        <div className="glass-panel border border-white/10 rounded-[2.5rem] p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                                    <Mail className="text-cyan-400" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold">Email Us</h4>
                                    <p className="text-xs text-white/40">support@Thundocs.ai</p>
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-2 mb-1 block">Your Name</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-cyan-500/50" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-2 mb-1 block">Email</label>
                                    <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-cyan-500/50" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-2 mb-1 block">Message</label>
                                    <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-cyan-500/50 resize-none" />
                                </div>
                                <button className="w-full bg-cyan-500 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-500/10">
                                    <Send size={18} />
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
