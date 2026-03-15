import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/utils/language";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  FileText,
  Scissors,
  Minimize2,
  Lock,
  Unlock,
  Image as ImageIcon,
  Zap,
  ArrowRight,
  Sparkles,
  ScanText,
  MessageSquareText,
  FileSpreadsheet,
  Presentation,
  UploadCloud,
  Download,
  Wand2,
  Files,
  FileImage,
  FileStack,
  PenTool,
  Search,
  LogIn,
  User,
  Menu
} from "lucide-react";
import { RightSideMenu } from "@/components/RightSideMenu";

// Updated tool definitions with better icons
const tools = [
  {
    title: "Merge PDFs",
    description: "Merge multiple PDFs, slides and images into a single perfectly ordered document.",
    icon: Files, // Better than Merge
    href: "/merge",
    category: "essentials",
  },
  {
    title: "Split PDF",
    description: "Split a PDF by range or extract selected pages into clean new files.",
    icon: Scissors,
    href: "/split",
    category: "essentials",
  },
  {
    title: "Compress PDF",
    description: "Shrink PDF size dramatically while keeping text readable and graphics sharp.",
    icon: Minimize2,
    href: "/compress",
    category: "essentials",
  },
  {
    title: "PDF to Image",
    description: "Render each PDF page into crisp PNG or JPG images ready to share.",
    icon: FileImage, // Specific
    href: "/pdf-to-image",
    category: "convert",
  },
  {
    title: "Protect PDF",
    description: "Lock PDFs with passwords so only the right people can open and view them.",
    icon: Lock, // Clearer than Shield
    href: "/protect",
    category: "essentials",
  },
  {
    title: "PDF to Word",
    description: "Turn PDFs into fully editable Word documents while preserving layout and fonts.",
    icon: FileText,
    href: "/pdf-to-word",
    category: "convert",
  },
  {
    title: "Image to PDF",
    description: "Convert JPG, PNG, WEBP images into a pristine multi-page PDF with custom ordering.",
    icon: FileStack, // Implies stacking images
    href: "/image-to-pdf",
    category: "convert",
  },
  {
    title: "AI OCR Engine",
    description: "Use AI-powered OCR to read and extract text from scans and images with high accuracy.",
    icon: ScanText, // Perfect for OCR
    href: "/ai-ocr",
    category: "ai",
    isAI: true,
  },
  {
    title: "AI PDF Chat",
    description: "Chat with your PDFs, ask questions, and get instant answers from their content.",
    icon: MessageSquareText, // Chat specific
    href: "#",
    category: "ai",
    isAI: true,
    comingSoon: true,
  },
  {
    title: "Excel to PDF",
    description: "Convert spreadsheets into clean, print-ready PDFs that keep tables and numbers intact.",
    icon: FileSpreadsheet,
    href: "/excel-to-pdf",
    category: "convert",
  },
  {
    title: "PowerPoint to PDF",
    description: "Turn slide decks into polished PDF presentations ready to share or print.",
    icon: Presentation,
    href: "/powerpoint-to-pdf",
    category: "convert",
  },
  {
    title: "Unlock PDF",
    description: "Remove known passwords from PDFs you own so you can open and edit them freely.",
    icon: Unlock,
    href: "/unlock-pdf",
    category: "essentials",
  },
  {
    title: "Word to PDF",
    description: "Export Word documents to PDF with preserved typography and professional output.",
    icon: FileText,
    href: "/word-to-pdf",
    category: "convert",
  },
];

const ToolCard = ({ tool }: { tool: any }) => (
  <Link to={tool.href} onClick={(e) => tool.comingSoon && e.preventDefault()}>
    <div className="relative h-full rounded-3xl group transition-transform duration-300 hover:-translate-y-2">
      <GlowingEffect
        spread={40}
        glow
        disabled={false}
        proximity={72}
        inactiveZone={0.05}
        borderWidth={2}
        variant="white"
        className="pointer-events-none"
      />
      <div
        className={`relative h-full rounded-3xl bg-white/5/0 backdrop-blur-2xl border border-white/10 p-6 md:p-8 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.9)] text-left transition-colors duration-300 ${
          tool.comingSoon ? "opacity-60 cursor-default" : ""
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex items-center justify-center mb-2"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(0,240,255,0.2)",
                color: tool.comingSoon ? "rgba(148,163,184,0.7)" : "#00f0ff",
              }}
            >
              <tool.icon className="w-7 h-7" strokeWidth={1.5} />
            </div>

            {tool.comingSoon ? (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            ) : tool.isAI ? (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full">
                AI
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            <h3
              className={`text-base font-semibold tracking-tight ${
                tool.comingSoon ? "text-zinc-300" : "text-white"
              }`}
            >
              {tool.title}
            </h3>
            <p className="text-sm text-zinc-300/80 leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Link>
);

const StepCard = ({ number, title, description, icon: Icon }: { number: string, title: string, description: string, icon: any }) => (
  <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-sm group hover:bg-zinc-900/60 transition-colors">
    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-black/20 group-hover:scale-110 transition-transform">
      {number}
    </div>
    <div className="mt-4 mb-4 text-zinc-200">
      <Icon className="w-8 h-8" strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-zinc-400">{description}</p>
  </div>
);

export default function Index() {
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="hero-group relative min-h-screen bg-[#020408] font-sans selection:bg-white/20 overflow-hidden">
      {/* Header - floating glass bar */}
      <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="pointer-events-auto h-14 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-xl shadow-[0_18px_45px_-24px_rgba(0,0,0,0.9)] flex items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-heading text-lg font-bold text-white tracking-tight">
              Thundocs
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#tools" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              {t("Tools")}
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              {t("How it works")}
            </a>
            <Link to="/blog" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              {t("Blog")}
            </Link>
            <Link to="/about" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              {t("About")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link to="/profile">
                <Button
                  variant="outline"
                  className="hidden md:flex border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all text-zinc-300 gap-2"
                >
                  <img src={user.picture} alt={user.name} className="w-5 h-5 rounded-full" />
                  {user.name.split(' ')[0]}
                </Button>
              </Link>
            ) : (
              <Link to="/signin">
                <Button
                  variant="outline"
                  className="hidden md:flex border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all text-zinc-300"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("Sign In")}
                </Button>
              </Link>
            )}
          </div>
          </div>
        </div>
        <button
          type="button"
          className="pointer-events-auto absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white hover:text-white/80"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>
      <RightSideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        topOffset={100}
        showAuthEntry={false}
      />

      {/* Ambient grid + liquid orb behind header + hero */}
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
      </div>

      {/* Hero Section - Thundocs liquid design */}
      <section className="relative z-10 pt-32 md:pt-40 pb-24 px-6 min-h-[720px] flex items-center overflow-hidden">
        {/* Hero lightning bolt */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
            <svg
              viewBox="0 0 512 512"
              className="thunder-bolt-svg hero-bolt home-bolt w-full h-full"
            >
              <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
            </svg>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Heading */}
            <h1 className="text-4xl md:text-[64px] lg:text-[96px] font-heading font-bold tracking-[-0.05em] text-white mb-6 leading-[0.95]">
              Process assets with
              <br />
              <span className="mt-3 inline-block relative px-6">
                {/* Liquid surface (matches .liquid-text-wrap::before) */}
                <span
                  className="absolute inset-0 -z-20 rounded-3xl border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.4)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)",
                    transform: "skewX(-5deg)",
                  }}
                />
                {/* Highlight overlay (matches .liquid-text-wrap::after) */}
                <span
                  className="absolute inset-0 -z-10 rounded-3xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%)",
                    transform: "skewX(-5deg)",
                  }}
                />
                {/* Text */}
                <span className="relative inline-block">
                  liquid precision.
                </span>
              </span>
            </h1>

            {/* Sub text */}
            <p className="text-base md:text-lg text-zinc-300/80 mb-10 max-w-3xl mx-auto leading-relaxed">
              A high-fidelity document matrix engineered for the next generation. Experience
              zero-latency transformations with autonomous encryption layers.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-white text-black font-semibold text-sm shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_45px_rgba(0,240,255,0.45)] hover:scale-[1.03] transition-all"
                onClick={() =>
                  document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Get Started
              </Button>
              <Link to="/about">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 rounded-full border border-white/30 bg-white/5 text-white text-sm backdrop-blur-md hover:bg-white/10 hover:border-white/60 transition-all"
                >
                  View Documentation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
            { label: "Files Processed", value: "1M+" },
            { label: "Active Users", value: "50k+" },
            { label: "Tools Available", value: "15+" },
            { label: "Uptime", value: "99.9%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 font-heading">{stat.value}</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider font-medium">
                {t(stat.label)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[1100px] h-[1100px] -rotate-[7deg]">
            <svg viewBox="0 0 512 512" className="thunder-bolt-svg tools-bolt w-full h-full">
              <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-6">
              {t("Empower Your Workflow")}
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              {t("Everything you need to manage your documents in one place.")}
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-full backdrop-blur-sm h-auto">
                <TabsTrigger value="all" className="rounded-full px-6 py-2.5 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950 text-zinc-400 transition-all">
                  {t("All Tools")}
                </TabsTrigger>
                <TabsTrigger value="ai" className="rounded-full px-6 py-2.5 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950 text-zinc-400 transition-all">
                  {t("AI Power")}
                </TabsTrigger>
                <TabsTrigger value="essentials" className="rounded-full px-6 py-2.5 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950 text-zinc-400 transition-all">
                  {t("PDF Essentials")}
                </TabsTrigger>
                <TabsTrigger value="convert" className="rounded-full px-6 py-2.5 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950 text-zinc-400 transition-all">
                  {t("Converters")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.map((tool) => <ToolCard key={tool.title} tool={tool} />)}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.filter(t => t.category === 'ai').map((tool) => <ToolCard key={tool.title} tool={tool} />)}
              </div>
            </TabsContent>

            <TabsContent value="essentials" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.filter(t => t.category === 'essentials').map((tool) => <ToolCard key={tool.title} tool={tool} />)}
              </div>
            </TabsContent>

            <TabsContent value="convert" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.filter(t => t.category === 'convert').map((tool) => <ToolCard key={tool.title} tool={tool} />)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-6">
              {t("How It Works")}
            </h2>
            <p className="text-zinc-400 text-lg">
              {t("Simple, secure, and streamlined process.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <StepCard
              number="01"
              title={t("Upload Files")}
              description={t("Drag and drop your files directly into our secure tool interface. We support all major formats.")}
              icon={UploadCloud}
            />
              <StepCard
              number="02"
              title={t("Process")}
              description={t("Our servers instantly process your documents. For AI tools, advanced models analyze your content.")}
              icon={Wand2}
            />
              <StepCard
              number="03"
              title={t("Download")}
              description={t("Get your converted files immediately. All files are automatically deleted from our servers after 1 hour.")}
              icon={Download}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <div className="p-1 rounded bg-white/10">
                  <Zap className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <span className="font-heading text-xl font-bold text-white">
                  Thundocs
                </span>
              </Link>
              <p className="text-zinc-400 leading-relaxed max-w-xs mb-8">
                {t("The ultimate document utility belt. Built for speed, designed for privacy, and free for everyone.")}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">{t("Tools")}</h4>
              <ul className="space-y-4">
                <li><Link to="/merge" className="text-zinc-400 hover:text-white transition-colors">{t("Merge PDF")}</Link></li>
                <li><Link to="/compress" className="text-zinc-400 hover:text-white transition-colors">{t("Compress PDF")}</Link></li>
                <li><Link to="/pdf-to-word" className="text-zinc-400 hover:text-white transition-colors">{t("PDF to Word")}</Link></li>
                <li><Link to="#" onClick={(e) => e.preventDefault()} className="text-zinc-500 cursor-not-allowed flex items-center gap-2">AI Chat <span className="text-[10px] bg-zinc-800 text-white px-1.5 rounded">SOON</span></Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">{t("Company")}</h4>
              <ul className="space-y-4">
                <li><Link to="/blog" className="text-zinc-400 hover:text-white transition-colors">{t("Blog")}</Link></li>
                <li><Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">{t("Privacy Policy")}</Link></li>
                <li><Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">{t("Terms of Service")}</Link></li>
                <li><Link to="/about" className="text-zinc-400 hover:text-white transition-colors">{t("About Us")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-sm">
              © {new Date().getFullYear()} Thundocs. All rights reserved.
            </p>
            <p className="text-zinc-600 text-sm flex items-center gap-1">
              {t("Made with ♥ for productivity")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
