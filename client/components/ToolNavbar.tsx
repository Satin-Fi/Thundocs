import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { ThundocsLogo } from "@/components/ThundocsLogo";
import {
  Menu,
  Grid3X3,
  ChevronDown,
  X,
  Info,
  BookOpen,
  Shield,
  HelpCircle,
  LogIn,
  ChevronRight,
  FileText,
  Globe2,
  ChevronLeft,
  DollarSign,
  Lock,
  Zap,
  Check,
  MessageCircle,
  HelpCircle as HelpIcon,
  Eye,
  Settings,
} from "lucide-react";
import { RightSideMenu } from "@/components/RightSideMenu";
import { motion, AnimatePresence } from "framer-motion";

const mobileTools = [
  { title: "Merge PDFs", href: "/merge" },
  { title: "Split PDF", href: "/split" },
  { title: "Compress PDF", href: "/compress" },
  { title: "PDF to Image", href: "/pdf-to-image" },
  { title: "Protect PDF", href: "/protect" },
  { title: "PDF to Word", href: "/pdf-to-word" },
  { title: "Image to PDF", href: "/image-to-pdf" },
  { title: "AI OCR Engine", href: "/ai-ocr" },
  { title: "Excel to PDF", href: "/excel-to-pdf" },
  { title: "PowerPoint to PDF", href: "/powerpoint-to-pdf" },
  { title: "Unlock PDF", href: "/unlock-pdf" },
  { title: "Word to PDF", href: "/word-to-pdf" },
];

const translations: Record<string, Record<string, string>> = {
  "Español": {
    "Merge PDFs": "Combinar PDF",
    "Split PDF": "Dividir PDF",
    "Compress PDF": "Comprimir PDF",
    "PDF to Image": "PDF a Imagen",
    "Protect PDF": "Proteger PDF",
    "PDF to Word": "PDF a Word",
    "Image to PDF": "Imagen a PDF",
    "AI OCR Engine": "Motor OCR con IA",
    "Excel to PDF": "Excel a PDF",
    "PowerPoint to PDF": "PowerPoint a PDF",
    "Unlock PDF": "Desbloquear PDF",
    "Word to PDF": "Word a PDF",
    "Pricing": "Precios",
    "Security": "Seguridad",
    "Features": "Funciones",
    "Blog": "Blog",
    "About Us": "Sobre nosotros",
    "Help": "Ayuda",
    "Language": "Idioma",
    "Select Language": "Seleccionar idioma",
    "Organize": "Organizar",
    "AI Tools": "Herramientas de IA",
    "To PDF": "A PDF",
    "From PDF": "Desde PDF",
    "Help & Support": "Ayuda y soporte",
    "Tools Guide": "Guía de herramientas",
    "Legal & Privacy": "Legal y Privacidad",
    "Contact Us": "Contáctanos",
    "Sign In / Profile": "Iniciar sesión / Perfil",
  },
};

const translateLabel = (text: string, lang: string) => {
  const table = translations[lang];
  if (!table) return text;
  return table[text] || text;
};

const languages = [
  ["English", "Español", "Français", "Deutsch", "Italiano", "Português", "日本語", "Русский", "한국어", "中文 (简体)"],
  ["中文 (繁體)", "العربية", "Български", "Català", "Nederlands", "Ελληνικά", "हिन्दी", "Bahasa Indonesia", "Bahasa Melayu"],
  ["Polski", "Svenska", "ภาษาไทย", "Türkçe", "Українська", "Tiếng Việt"]
];

export default function ToolNavbar() {
  const location = useLocation();
  const isCompress = location.pathname === "/compress";
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'main' | 'help' | 'language'>('main');
  const [selectedLang, setSelectedLang] = useState(() => {
    if (typeof window === 'undefined') return "English";
    return window.localStorage.getItem("thundocs:selectedLang") || "English";
  });

  const convertBtnRef = useRef<HTMLButtonElement>(null);
  const allToolsBtnRef = useRef<HTMLButtonElement>(null);
  const navbarRef = useRef<HTMLDivElement>(null);
  const [convertPos, setConvertPos] = useState({ top: 0, left: 0 });
  const [allToolsPos, setAllToolsPos] = useState({ top: 0, left: 0 });

  const convertTimeoutRef = useRef<any>(null);
  const allToolsTimeoutRef = useRef<any>(null);

  const handleConvertEnter = () => {
    if (isLeftMenuOpen || isRightMenuOpen) return;
    if (convertTimeoutRef.current) clearTimeout(convertTimeoutRef.current);
    updatePositions();
    setIsConvertOpen(true);
    setIsAllToolsOpen(false);
  };

  const handleConvertLeave = () => {
    convertTimeoutRef.current = setTimeout(() => {
      setIsConvertOpen(false);
    }, 150);
  };

  const handleAllToolsEnter = () => {
    if (isLeftMenuOpen || isRightMenuOpen) return;
    if (allToolsTimeoutRef.current) clearTimeout(allToolsTimeoutRef.current);
    updatePositions();
    setIsAllToolsOpen(true);
    setIsConvertOpen(false);
  };

  const handleAllToolsLeave = () => {
    allToolsTimeoutRef.current = setTimeout(() => {
      setIsAllToolsOpen(false);
    }, 150);
  };

  const updatePositions = () => {
    let topPos = 0;
    if (navbarRef.current) {
      const navRect = navbarRef.current.getBoundingClientRect();
      topPos = navRect.bottom + 10;
    }

    if (convertBtnRef.current) {
      const rect = convertBtnRef.current.getBoundingClientRect();
      setConvertPos({
        top: topPos,
        left: rect.left + rect.width / 2
      });
    }
    if (allToolsBtnRef.current) {
      const rect = allToolsBtnRef.current.getBoundingClientRect();
      setAllToolsPos({
        top: topPos,
        left: rect.left + rect.width / 2
      });
    }
  };

  useEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePositions);
    }

    return () => {
      window.removeEventListener('resize', updatePositions);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePositions);
      }
    };
  }, [isConvertOpen, isAllToolsOpen, isLeftMenuOpen, isRightMenuOpen]);

  // Persist selected language across pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem("thundocs:selectedLang", selectedLang);
      document.documentElement.lang = selectedLang;
    }
  }, [selectedLang]);

  // Reset subview when right menu closes
  useEffect(() => {
    if (!isRightMenuOpen) {
      setTimeout(() => setActiveSubView('main'), 300);
    }
  }, [isRightMenuOpen]);

  const convertDropdown = isConvertOpen ? createPortal(
    <div
      onMouseEnter={handleConvertEnter}
      onMouseLeave={handleConvertLeave}
    >
      <div
        style={{ top: convertPos.top, left: convertPos.left - 104 }}
        className="fixed z-[1001] w-52 bg-white/10 backdrop-blur-xl border border-white/20 text-blue-50 rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] py-2 px-1.5 animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-500 ease-[0.16,1,0.3,1] origin-top"
      >
        <div className="px-3 pb-1 pt-1">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">
            {translateLabel("To PDF", selectedLang)}
          </p>
        </div>
        {[
          { title: "Image to PDF", href: "/image-to-pdf" },
          { title: "Word to PDF", href: "/word-to-pdf" },
          { title: "Excel to PDF", href: "/excel-to-pdf" },
          { title: "PowerPoint to PDF", href: "/powerpoint-to-pdf" },
        ].map((t) => (
          <Link
            key={t.href}
            to={t.href}
            onClick={() => setIsConvertOpen(false)}
            className={`block px-3 py-2 mx-0.5 rounded-xl text-xs transition-all duration-200 ${location.pathname === t.href
              ? "text-cyan-300 bg-cyan-500/15 font-medium"
              : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
              }`}
          >
            {translateLabel(t.title, selectedLang)}
          </Link>
        ))}
        <div className="px-3 pb-1 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">
            {translateLabel("From PDF", selectedLang)}
          </p>
        </div>
        {[
          { title: "PDF to Image", href: "/pdf-to-image" },
          { title: "PDF to Word", href: "/pdf-to-word" },
        ].map((t) => (
          <Link
            key={t.href}
            to={t.href}
            onClick={() => setIsConvertOpen(false)}
            className={`block px-3 py-2 mx-0.5 rounded-xl text-xs transition-all duration-200 ${location.pathname === t.href
              ? "text-cyan-300 bg-cyan-500/15 font-medium"
              : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
              }`}
          >
            {translateLabel(t.title, selectedLang)}
          </Link>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  const allToolsDropdown = isAllToolsOpen ? createPortal(
    <div
      onMouseEnter={handleAllToolsEnter}
      onMouseLeave={handleAllToolsLeave}
    >
      <div
        style={{ top: allToolsPos.top, left: allToolsPos.left - 112 }}
        className="fixed z-[1001] w-56 bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] py-2 px-1.5 rounded-2xl animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-500 ease-[0.16,1,0.3,1] origin-top overflow-hidden"
      >
        <div className="px-3 pb-1 pt-1">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">
            {translateLabel("Organize", selectedLang)}
          </p>
        </div>
        {[
          { title: "Merge PDFs", href: "/merge" },
          { title: "Split PDF", href: "/split" },
          { title: "Compress PDF", href: "/compress" },
        ].map((t) => (
          <Link
            key={t.href}
            to={t.href}
            onClick={() => setIsAllToolsOpen(false)}
            className={`block px-3 py-2 mx-0.5 rounded-xl text-xs transition-all duration-200 ${location.pathname === t.href
              ? "text-cyan-300 bg-cyan-500/15 font-medium"
              : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
              }`}
          >
            {translateLabel(t.title, selectedLang)}
          </Link>
        ))}
        <div className="px-3 pb-1 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">
            {translateLabel("Security", selectedLang)}
          </p>
        </div>
        {[
          { title: "Protect PDF", href: "/protect" },
          { title: "Unlock PDF", href: "/unlock-pdf" },
        ].map((t) => (
          <Link
            key={t.href}
            to={t.href}
            onClick={() => setIsAllToolsOpen(false)}
            className={`block px-3 py-2 mx-0.5 rounded-xl text-xs transition-all duration-200 ${location.pathname === t.href
              ? "text-cyan-300 bg-cyan-500/15 font-medium"
              : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
              }`}
          >
            {translateLabel(t.title, selectedLang)}
          </Link>
        ))}
        <div className="px-3 pb-1 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">
            {translateLabel("AI Tools", selectedLang)}
          </p>
        </div>
        <Link
          to="/ai-ocr"
          onClick={() => setIsAllToolsOpen(false)}
          className={`block px-3 py-2 mx-0.5 rounded-xl text-xs transition-all duration-200 ${location.pathname === "/ai-ocr"
            ? "text-cyan-300 bg-cyan-500/15 font-medium"
            : "text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
            }`}
        >
          {translateLabel("AI OCR Engine", selectedLang)}
        </Link>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className={`relative z-50 flex justify-center pt-6 px-4 ${isCompress ? "compress-navbar" : ""}`}>
        <div className="max-w-[1600px] w-full">
          {/* Mobile View Header */}
          <div className={`sm:hidden glass-panel rounded-full border border-white/15 px-5 py-3 ${isCompress ? "compress-nav-shell" : ""}`}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-white/80 hover:text-white focus:outline-none"
                aria-label="Open menu"
                onClick={() => {
                  setIsLeftMenuOpen(v => !v);
                  setIsRightMenuOpen(false);
                }}
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2 compress-logo">
                <ThundocsLogo className="w-7 h-7" />
                <span className="text-sm font-semibold tracking-tight">Thundocs</span>
              </Link>
              <button
                type="button"
                className="text-white/80 hover:text-white focus:outline-none"
                aria-label="All tools"
                onClick={() => {
                  setIsRightMenuOpen(v => !v);
                  setIsLeftMenuOpen(false);
                }}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop View Header - Dual Premium Capsules */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full h-[52px]">
            {/* Left Balance Spacer */}
            <div />

            {/* Primary Capsule: Logo + Main Tools */}
            <div
              ref={navbarRef}
              className={`glass-panel rounded-full border border-white/10 px-6 h-full flex items-center gap-10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-500 hover:border-white/15 ${isCompress ? "compress-nav-shell" : ""}`}
            >
              <Link to="/" className="flex items-center gap-2.5 group pr-2 compress-logo">
                <ThundocsLogo className="w-7 h-7 transition-transform duration-500 group-hover:scale-110" />
                <span className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">Thundocs</span>
              </Link>

              <nav className="compress-nav-links flex items-center gap-8 text-[11px] font-bold tracking-[0.15em] uppercase text-white/60">
                <Link
                  to="/merge"
                  className={`hover:text-white transition-all duration-300 ${location.pathname === "/merge" ? "text-cyan-300" : ""}`}
                >
                  Merge
                </Link>
                <Link
                  to="/split"
                  className={`hover:text-white transition-all duration-300 ${location.pathname === "/split" ? "text-cyan-300" : ""}`}
                >
                  Split
                </Link>
                <Link
                  to="/compress"
                  className={`hover:text-white transition-all duration-300 ${location.pathname === "/compress" ? "text-cyan-300" : ""}`}
                >
                  Compress
                </Link>
                <div className="relative">
                  <button
                    ref={convertBtnRef}
                    type="button"
                    onMouseEnter={handleConvertEnter}
                    onMouseLeave={handleConvertLeave}
                    onClick={() => {
                      setIsConvertOpen((v) => !v);
                      setIsAllToolsOpen(false);
                    }}
                    className="flex items-center gap-1 hover:text-white transition-all duration-300 focus:outline-none"
                  >
                    <span>Convert</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${isConvertOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {convertDropdown}
                </div>

                <div className="relative">
                  <button
                    ref={allToolsBtnRef}
                    type="button"
                    onMouseEnter={handleAllToolsEnter}
                    onMouseLeave={handleAllToolsLeave}
                    onClick={() => {
                      setIsAllToolsOpen((v) => !v);
                      setIsConvertOpen(false);
                    }}
                    className="flex items-center gap-1 hover:text-white transition-all duration-300 focus:outline-none"
                  >
                    <span>All Tools</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${isAllToolsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {allToolsDropdown}
                </div>
              </nav>
            </div>

            {/* Actions Capsule: Auth + Menu Toggle */}
            <div className="flex justify-end h-full">
              <div className="glass-panel rounded-full border border-white/10 px-5 h-full flex items-center gap-6 bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-500 hover:border-white/15">
                <Link
                  to="/signin"
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 hover:text-white transition-all duration-300"
                >
                  Log In
                </Link>
                <Link
                  to="/signin"
                  className="text-[11px] font-bold uppercase tracking-[0.12em] bg-white/5 border border-white/10 text-white px-5 py-2 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 shadow-lg"
                >
                  Sign Up
                </Link>
                <div className="w-[1px] h-4 bg-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setIsRightMenuOpen(v => !v);
                    setIsLeftMenuOpen(false);
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 focus:outline-none ${isRightMenuOpen ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLeftMenuOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLeftMenuOpen(false)}
          />
          <div
            style={{ paddingTop: convertPos.top || allToolsPos.top || 100 }}
            className="absolute inset-0 flex justify-start items-start px-4 pointer-events-none"
          >
            <div className="max-w-[1600px] mx-auto w-full flex justify-start">
              <div className="glass-panel rounded-3xl border border-white/15 shadow-[0_24px_60px_-25px_rgba(15,23,42,0.9)] w-full max-w-[260px] px-5 py-6 flex flex-col pointer-events-auto animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <Link
                    to="/"
                    className="flex items-center gap-2"
                    onClick={() => setIsLeftMenuOpen(false)}
                  >
                    <ThundocsLogo className="w-7 h-7" />
                    <span className="text-sm font-bold tracking-tight text-white">Thundocs</span>
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {mobileTools.map((tool) => (
                    <Link
                      key={tool.href}
                      to={tool.href}
                      onClick={() => setIsLeftMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === tool.href
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "text-zinc-100 hover:bg-white/5"
                        }`}
                    >
                      {tool.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <RightSideMenu
        isOpen={isRightMenuOpen}
        onClose={() => setIsRightMenuOpen(false)}
        topOffset={convertPos.top || allToolsPos.top || 100}
        showAuthEntry
      />
    </>
  );
}
