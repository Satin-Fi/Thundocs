import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Lock,
  Zap,
  BookOpen,
  Info,
  HelpCircle as HelpIcon,
  LogIn,
  ChevronRight,
  Globe2,
  Check,
  MessageCircle,
  Shield,
  Grid3X3,
  ChevronLeft,
} from "lucide-react";

type RightSideMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  topOffset?: number;
  showAuthEntry?: boolean;
};

const translations: Record<string, Record<string, string>> = {
  Español: {
    Pricing: "Precios",
    Security: "Seguridad",
    Features: "Funciones",
    Blog: "Blog",
    "About Us": "Sobre nosotros",
    Help: "Ayuda",
    Language: "Idioma",
    "Select Language": "Seleccionar idioma",
    Organize: "Organizar",
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
  ["Polski", "Svenska", "ภาษาไทย", "Türkçe", "Українська", "Tiếng Việt"],
];

export const RightSideMenu: React.FC<RightSideMenuProps> = ({
  isOpen,
  onClose,
  topOffset = 100,
  showAuthEntry = false,
}) => {
  const location = useLocation();
  const [activeSubView, setActiveSubView] = useState<"main" | "help" | "language">("main");
  const [selectedLang, setSelectedLang] = useState(() => {
    if (typeof window === "undefined") return "English";
    return window.localStorage.getItem("thundocs:selectedLang") || "English";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("thundocs:selectedLang", selectedLang);
      document.documentElement.lang = selectedLang;
    }
  }, [selectedLang]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setActiveSubView("main"), 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        style={{ paddingTop: topOffset }}
        className="absolute inset-0 flex justify-end items-start px-4 pointer-events-none"
      >
        <div className="max-w-[1600px] mx-auto w-full flex justify-end">
          <motion.div
            layout
            initial={{ width: 260, opacity: 0, x: 20 }}
            animate={{
              width: activeSubView === "main" ? 260 : activeSubView === "language" ? 700 : 500,
              height: 440,
              opacity: 1,
              x: 0,
            }}
            className="glass-panel rounded-3xl border border-white/15 shadow-[0_24px_60px_-25px_rgba(15,23,42,0.9)] flex overflow-hidden pointer-events-auto"
          >
            <div className="w-full min-w-[260px] flex flex-col p-5 h-full">
              <AnimatePresence mode="wait">
                {activeSubView === "main" && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col justify-between w-full h-full"
                  >
                    <div className="space-y-1">
                      {[
                        { title: "Pricing", href: "/pricing", icon: DollarSign },
                        { title: "Security", href: "/security", icon: Lock },
                        { title: "Features", href: "/features", icon: Zap },
                        { title: "Blog", href: "/blog", icon: BookOpen },
                        { title: "About Us", href: "/about", icon: Info },
                      ].map(({ title, href, icon: Icon }) => (
                        <Link
                          key={href}
                          to={href}
                          onClick={onClose}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                        >
                          <Icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300 transition-colors" />
                          <span className="font-medium">{title}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-1">
                      <button
                        onMouseEnter={() => setActiveSubView("help")}
                        onClick={() => setActiveSubView("help")}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <HelpIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300" />
                          <span className="font-medium">{translateLabel("Help", selectedLang)}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                      </button>

                      {showAuthEntry && (
                        <Link
                          to="/signin"
                          onClick={onClose}
                          className="sm:hidden flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <LogIn className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300" />
                            <span className="font-medium">
                              {translateLabel("Sign In / Profile", selectedLang)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                        </Link>
                      )}

                      <button
                        onMouseEnter={() => setActiveSubView("language")}
                        onClick={() => setActiveSubView("language")}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Globe2 className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300 shrink-0" />
                          <span className="font-medium truncate">
                            {translateLabel("Language", selectedLang)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-60 ml-2 shrink-0">
                          <span className="text-[10px] lowercase tracking-wider truncate max-w-[70px]">
                            {selectedLang}
                          </span>
                          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSubView === "help" && (
                  <motion.div
                    key="help"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col sm:flex-row w-full h-full"
                  >
                    <div className="flex-1 pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0">
                      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          {translateLabel("Help & Support", selectedLang)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { title: "FAQ", icon: HelpIcon, href: "/help" },
                          { title: "Tools Guide", icon: Grid3X3, href: "/help" },
                          { title: "Legal & Privacy", icon: Shield, href: "/privacy" },
                          { title: "Contact Us", icon: MessageCircle, href: "/help" },
                        ].map((item) => (
                          <Link
                            key={item.title}
                            to={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                          >
                            <item.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300 transition-colors" />
                            <span className="font-medium">
                              {translateLabel(item.title, selectedLang)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="w-full sm:w-[180px] pl-0 sm:pl-6 pt-4 sm:pt-0 flex flex-col justify-between h-full">
                      <div className="space-y-1">
                        {[
                          { title: "Pricing", icon: DollarSign, href: "/pricing" },
                          { title: "Security", icon: Lock, href: "/security" },
                          { title: "Features", icon: Zap, href: "/features" },
                          { title: "Blog", icon: BookOpen, href: "/blog" },
                          { title: "About Us", icon: Info, href: "/about" },
                        ].map((item) => (
                          <Link
                            key={item.title}
                            to={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                          >
                            <item.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-1">
                        <button
                          onMouseEnter={() => setActiveSubView("help")}
                          onClick={() => setActiveSubView("help")}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <HelpIcon className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{translateLabel("Help", selectedLang)}</span>
                          </div>
                          <ChevronLeft className="w-4 h-4 opacity-50" />
                        </button>
                        <button
                          onMouseEnter={() => setActiveSubView("language")}
                          onClick={() => setActiveSubView("language")}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Globe2 className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300 transition-colors" />
                            <span>{translateLabel("Language", selectedLang)}</span>
                          </div>
                          <ChevronLeft className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubView === "language" && (
                  <motion.div
                    key="language"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col sm:flex-row w-full h-full"
                  >
                    <div className="flex-1 pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0">
                      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                          {translateLabel("Select Language", selectedLang)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-0.5 max-h-[300px] sm:max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                        {languages.flat().map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setSelectedLang(lang);
                              onClose();
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] transition-all ${
                              selectedLang === lang
                                ? "bg-cyan-500/20 text-cyan-300 font-bold"
                                : "text-zinc-100 hover:bg-white/8"
                            }`}
                          >
                            <span>{lang}</span>
                            {selectedLang === lang && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="w-full sm:w-[180px] pl-0 sm:pl-6 pt-4 sm:pt-0 flex flex-col justify-between h-full">
                      <div className="space-y-1">
                        {[
                          { title: "Pricing", icon: DollarSign, href: "/pricing" },
                          { title: "Security", icon: Lock, href: "/security" },
                          { title: "Features", icon: Zap, href: "/features" },
                          { title: "Blog", icon: BookOpen, href: "/blog" },
                          { title: "About Us", icon: Info, href: "/about" },
                        ].map((item) => (
                          <Link
                            key={item.title}
                            to={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs text-zinc-100/70 hover:bg-white/8 transition-all group"
                          >
                            <item.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-1">
                        <button
                          onMouseEnter={() => setActiveSubView("help")}
                          onClick={() => setActiveSubView("help")}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <HelpIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-cyan-300 transition-colors" />
                            <span>{translateLabel("Help", selectedLang)}</span>
                          </div>
                          <ChevronLeft className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button
                          onMouseEnter={() => setActiveSubView("language")}
                          onClick={() => setActiveSubView("language")}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Globe2 className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{translateLabel("Language", selectedLang)}</span>
                          </div>
                          <ChevronLeft className="w-4 h-4 opacity-50" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

