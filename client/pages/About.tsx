import React from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, Zap, Globe, Users, Star, ArrowRight, Mail } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";

const stats = [
  { label: "Tools available", value: "13+" },
  { label: "Files processed", value: "50K+" },
  { label: "Countries reached", value: "80+" },
  { label: "Uptime", value: "99.9%" },
];

const values = [
  {
    icon: Shield,
    title: "Privacy first",
    desc: "Your files are processed in isolated sessions and automatically deleted after download. We never read, store, or share your documents. Security is built into every layer of our stack.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Zap,
    title: "Speed & simplicity",
    desc: "Every tool is designed to get out of your way. No bloated UIs, no forced signups, no paywalls on core features. Upload, process, download — done in seconds.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Globe,
    title: "Accessible to all",
    desc: "Thundocs is free for everyone. We believe professional document tools shouldn't require expensive subscriptions. All core features are available without creating an account.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Heart,
    title: "Built with care",
    desc: "Every feature is crafted and tested to ensure it actually works reliably. We obsess over edge cases so you don't have to worry when it matters most.",
    color: "from-pink-500 to-rose-600",
  },
];

const tools = [
  { name: "Merge PDF", href: "/merge", desc: "Combine multiple PDFs into one" },
  { name: "Split PDF", href: "/split", desc: "Extract pages or split by range" },
  { name: "Compress PDF", href: "/compress", desc: "Reduce file size without losing quality" },
  { name: "PDF to Image", href: "/pdf-to-image", desc: "Convert PDF pages to JPEG/PNG" },
  { name: "Image to PDF", href: "/image-to-pdf", desc: "Pack images into a PDF" },
  { name: "Word to PDF", href: "/word-to-pdf", desc: "Convert DOCX to PDF" },
  { name: "Excel to PDF", href: "/excel-to-pdf", desc: "Convert spreadsheets to PDF" },
  { name: "Protect PDF", href: "/protect", desc: "Password-protect your documents" },
  { name: "Unlock PDF", href: "/unlock-pdf", desc: "Remove password from PDF files" },
  { name: "PDF to Word", href: "/pdf-to-word", desc: "Extract text as an editable document" },
  { name: "AI OCR Engine", href: "/ai-ocr", desc: "Extract text from scanned PDFs" },
  { name: "AI PDF Chat", href: "/ai-pdf-chat", desc: "Ask questions about any PDF" },
];

export default function About() {
  return (
    <div className="hero-group relative min-h-screen bg-[#020408] text-white pt-16">
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

      <HomeHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.12),_transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-violet-300 text-xs font-medium mb-6">
            <Star className="w-3.5 h-3.5" />
            About Thundocs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent leading-tight">
            Document tools that respect you
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Thundocs is a free, privacy-focused suite of PDF and document tools. We're obsessed with making file management fast, secure, and effortless — for everyone, forever.
          </p>
          <Link
            to="/merge"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] active:scale-95"
          >
            Try a tool
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-zinc-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white">Our mission</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Professional document tools have always been locked behind expensive subscriptions or bloated desktop software. We set out to change that. Thundocs delivers the same power — entirely in your browser, entirely for free.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-4">
              We built Thundocs because we were frustrated with our own options: tools that upload your sensitive documents to servers unknown, charge per-file, or drown you in ads. We wanted something different — something trustworthy.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Today, Thundocs offers 13+ tools for PDF and document management. All free. All fast. No hidden catches.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 transition-all group"
                >
                  <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${v.color} mb-3`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{v.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need</h2>
            <p className="text-zinc-400">A complete toolkit for PDF and document management, all in one place.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-violet-500/40 hover:bg-zinc-900 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{tool.name}</p>
                  <p className="text-xs text-zinc-600">{tool.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 ml-auto group-hover:text-violet-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Security commitment */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500/20 p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4 text-white">Our security commitment</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Security is not an afterthought at Thundocs — it's foundational. All file transfers use TLS 1.2+ encryption. Files are processed in isolated environments and automatically purged within 2 hours of processing. We do not log file contents or link them to your identity.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                We follow responsible data minimisation principles: we only collect what's absolutely necessary for the service to function.
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-3">
              <Link
                to="/privacy"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-cyan-500/50 text-zinc-300 hover:text-white text-sm font-medium transition-all"
              >
                <Shield className="w-4 h-4" />
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-cyan-500/50 text-zinc-300 hover:text-white text-sm font-medium transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Terms of Service
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-cyan-500/50 text-zinc-300 hover:text-white text-sm font-medium transition-all"
              >
                <Users className="w-4 h-4" />
                Help Centre
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Get in touch</h2>
          <p className="text-zinc-400 text-sm mb-6">Questions, feedback, partnership enquiries — we'd love to hear from you.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:support@Thundocs.app"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              support@Thundocs.app
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
