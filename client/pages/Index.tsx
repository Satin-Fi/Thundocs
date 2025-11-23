import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ParticleBackground from "@/components/ParticleBackground";
import AIFullScreenChat from "@/components/AIFullScreenChat";
import BlockchainStatus from "@/components/BlockchainStatus";
import {
  FileText,
  Scissors,
  Merge,
  Minimize2,
  Shield,
  Image as ImageIcon,
  Download,
  Upload,
  Zap,
  Star,
  Users,
  Globe,
  ArrowRight,
  Sparkles,
  Rocket,
  Bot,
  Brain,
  Cpu,
  Lock,
  MessageCircle,
} from "lucide-react";

const tools = [
  {
    title: "Merge PDFs",
    description: "Combine multiple PDF files into one document",
    icon: Merge,
    href: "/merge",
    gradient: "from-blue-500 via-blue-600 to-purple-600",
    delay: 0.1,
  },
  {
    title: "Split PDF",
    description: "Split a PDF into separate pages or sections",
    icon: Scissors,
    href: "/split",
    gradient: "from-purple-500 via-pink-500 to-red-500",
    delay: 0.2,
  },
  {
    title: "Compress PDF",
    description: "Reduce file size while maintaining quality",
    icon: Minimize2,
    href: "/compress",
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    delay: 0.3,
  },
  {
    title: "PDF to Image",
    description: "Convert PDF pages to JPG or PNG images",
    icon: ImageIcon,
    href: "/pdf-to-image",
    gradient: "from-orange-500 via-red-500 to-pink-600",
    delay: 0.4,
  },
  {
    title: "Protect PDF",
    description: "Add password protection to your documents",
    icon: Shield,
    href: "/protect",
    gradient: "from-red-500 via-pink-500 to-purple-600",
    delay: 0.5,
  },
  {
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    icon: FileText,
    href: "/pdf-to-word",
    gradient: "from-teal-500 via-blue-500 to-indigo-600",
    delay: 0.6,
  },
  {
    title: "Image to PDF",
    description: "Convert multiple images into a single PDF document",
    icon: ImageIcon,
    href: "/image-to-pdf",
    gradient: "from-amber-500 via-orange-500 to-red-600",
    delay: 0.7,
  },
  {
    title: "AI OCR Engine",
    description: "Extract text from PDFs and images with AI precision",
    icon: Brain,
    href: "/ai-ocr",
    gradient: "from-green-400 via-blue-500 to-purple-600",
    delay: 0.8,
    isAI: true,
  },
  {
    title: "AI PDF Analyzer",
    description: "Intelligent document analysis and insights",
    icon: Bot,
    href: "/ai-pdf-analyzer",
    gradient: "from-purple-500 via-pink-500 to-red-400",
    delay: 0.9,
    isAI: true,
  },
  {
    title: "AI Form Filler",
    description: "Intelligent PDF form completion with AI assistance",
    icon: Cpu,
    href: "/ai-form-filler",
    gradient: "from-blue-500 via-purple-500 to-pink-600",
    delay: 1.0,
    isAI: true,
  },
];

const stats = [
  { label: "AI Requests", value: "10M+", icon: Bot },
  { label: "Blockchain Secured", value: "100%", icon: Lock },
  { label: "Processing Speed", value: "<2s", icon: Zap },
  { label: "Security Rating", value: "5/5", icon: Shield },
];

const floatingVariants = {
  animate: {
    y: [-10, 10, -10],
    rotate: [-1, 1, -1],
    transition: {
      y: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
      rotate: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
};

export default function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [hoveredTool, setHoveredTool] = useState<number | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-hidden bg-gray-900"
    >
      {/* Particle Background */}
      <ParticleBackground />

      {/* Blockchain Status */}
      <BlockchainStatus />

      {/* AI Full Screen Chat */}
      <AIFullScreenChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800" />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-purple-900/20 to-cyan-900/20" />
      </div>

      {/* Header */}
      <motion.header className="relative z-10 px-4 py-6" style={{ y, opacity }}>
        <nav className="mx-auto max-w-7xl flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="flex items-center space-x-2 group"
          >
            <motion.div
              className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <FileText className="h-6 w-6 text-white" />
            </motion.div>
            <motion.span
              className="text-2xl font-bold text-white"
              whileHover={{ scale: 1.05 }}
            >
              PDFTools
            </motion.span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 text-yellow-300" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex items-center space-x-6"
          >
            <Link
              to="/about"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
            >
              About
            </Link>
            <Link
              to="/pricing"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
            >
              Pricing
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                className="bg-gray-800/80 backdrop-blur-sm border-gray-700 text-gray-200 hover:bg-gray-700/80 hover:text-white"
              >
                Sign In
              </Button>
            </motion.div>
          </motion.div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <section className="relative px-4 pt-12">
        <div className="mx-auto max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: "spring", bounce: 0.4 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight">
              AI-Powered PDF
              <span
                className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent animate-pulse"
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Revolution
              </span>
            </h1>
            <motion.p
              className="text-2xl md:text-3xl text-gray-300 mb-12 max-w-4xl mx-auto font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Just tell our AI what you want to do - merge, compress, convert,
              or protect PDFs.
              <span className="text-cyan-400">
                Powered by blockchain security.
              </span>
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg hover:shadow-cyan-500/25 text-xl px-12 py-6 rounded-2xl transition-all duration-300"
                onClick={() => setIsAIChatOpen(true)}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Bot className="mr-3 h-6 w-6" />
                </motion.div>
                Chat with AI
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-cyan-500/50 text-white bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 text-xl px-12 py-6 rounded-2xl backdrop-blur-sm transition-all duration-300"
                onClick={() => {
                  document.getElementById("tools-section")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                <Zap className="mr-3 h-6 w-6" />
                View All Tools
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Floating Tool Preview Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="relative max-w-6xl mx-auto perspective-1000"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              {tools.slice(0, 3).map((tool, index) => (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, y: 50, rotateX: 45 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 1.2 + index * 0.2,
                    type: "spring",
                  }}
                  variants={floatingVariants}
                  animate="animate"
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                  }}
                  className="group perspective-1000"
                >
                  <Card className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 text-white hover:bg-gray-800/60 transition-all duration-500 transform-gpu shadow-2xl hover:shadow-blue-500/20">
                    <CardHeader className="text-center relative">
                      <motion.div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${tool.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}
                        whileHover={{
                          scale: 1.2,
                          rotate: 180,
                        }}
                        transition={{ duration: 0.6, type: "spring" }}
                      >
                        <tool.icon className="h-8 w-8 text-white" />
                      </motion.div>
                      <CardTitle className="text-white text-xl mb-2">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300 text-base">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Elegant Transition Text */}
      <div className="relative py-4">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-4 mb-2">
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent flex-1 max-w-24" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </motion.div>
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent flex-1 max-w-24" />
            </div>

            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-lg font-medium bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent"
            >
              Trusted by professionals worldwide
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-sm text-gray-400 mt-1"
            >
              AI-powered • Blockchain secured • Lightning fast
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      <section className="relative px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  type: "spring",
                }}
                whileHover={{
                  scale: 1.1,
                  y: -5,
                }}
                className="text-center group"
              >
                <motion.div
                  className="bg-gray-800/50 backdrop-blur-md rounded-3xl p-8 border border-gray-700/50 shadow-xl group-hover:shadow-2xl transition-all duration-500"
                  whileHover={{
                    scale: 1.02,
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 10 + index * 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <stat.icon className="h-10 w-10 text-white mx-auto mb-4" />
                  </motion.div>
                  <motion.div
                    className="text-4xl font-bold text-white mb-2"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5,
                    }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Enhanced All Tools Section */}
      <section id="tools-section" className="relative px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              AI + Blockchain PDF Tools
            </h2>
            <motion.p
              className="text-2xl text-white/80 max-w-3xl mx-auto font-light"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              Simply chat with our AI assistant to handle any PDF task.
              <span className="text-cyan-200">
                Secured by blockchain technology.
              </span>
            </motion.p>

            {/* AI Features Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4 mt-8"
            >
              {[
                { icon: MessageCircle, text: "Natural Language Commands" },
                { icon: Cpu, text: "Blockchain Security" },
                { icon: Zap, text: "Instant Processing" },
                { icon: Brain, text: "Smart AI Assistant" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
                >
                  <feature.icon className="h-4 w-4 text-cyan-300" />
                  <span className="text-white/90 text-sm">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 60, rotateX: 30 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.8,
                  delay: tool.delay,
                  type: "spring",
                }}
                onHoverStart={() => setHoveredTool(index)}
                onHoverEnd={() => setHoveredTool(null)}
                whileHover={{
                  scale: 1.03,
                  y: -5,
                }}
                className="group perspective-1000"
              >
                <Link to={tool.href}>
                  <Card className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-700 h-full transform-gpu shadow-xl hover:shadow-blue-500/20">
                    <CardHeader className="relative overflow-hidden">
                      {tool.isAI && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1 z-10"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI</span>
                        </motion.div>
                      )}
                      <motion.div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${tool.gradient} flex items-center justify-center mb-6 shadow-lg`}
                        animate={{
                          rotate: hoveredTool === index ? 360 : 0,
                          scale: hoveredTool === index ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.8, type: "spring" }}
                      >
                        <tool.icon className="h-8 w-8 text-white" />
                      </motion.div>
                      <CardTitle className="text-white text-xl mb-3 group-hover:text-blue-400 transition-colors duration-300">
                        {tool.title}
                        {tool.isAI && (
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                            className="inline-block ml-2"
                          >
                            <Brain className="h-4 w-4 text-cyan-400" />
                          </motion.span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-gray-300 text-base">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <motion.div
                        whileHover={{ x: 10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Button
                          variant="ghost"
                          className="w-full text-gray-200 hover:bg-gray-700/50 hover:text-white text-lg py-3 rounded-xl"
                        >
                          Launch Tool
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: index * 0.2,
                            }}
                          >
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </motion.div>
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mega CTA Section */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: "spring" }}
            className="relative"
          >
            <motion.div
              className="bg-gradient-to-r from-gray-800/50 via-gray-800/70 to-gray-800/50 backdrop-blur-md rounded-3xl border border-gray-700/50 p-16 shadow-2xl"
              whileHover={{
                scale: 1.02,
              }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Experience the Future of PDF Processing
              </h2>
              <motion.p
                className="text-2xl text-gray-300 mb-10 font-light"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Join the AI revolution. Simply chat with our assistant and watch
                magic happen.
              </motion.p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg hover:shadow-cyan-500/25 text-xl px-16 py-8 rounded-2xl transition-all duration-300"
                    onClick={() => setIsAIChatOpen(true)}
                  >
                    <Bot className="mr-3 h-6 w-6" />
                    Start Chatting with AI
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, rotate: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-cyan-500/50 text-white bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 text-xl px-16 py-8 rounded-2xl backdrop-blur-sm transition-all duration-300"
                  >
                    Learn About Blockchain
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="relative px-4 py-16 border-t border-white/20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row justify-between items-center"
          >
            <motion.div
              className="flex items-center space-x-3 mb-6 md:mb-0"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <FileText className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold text-white">PDFTools</span>
            </motion.div>
            <div className="flex items-center space-x-8 text-gray-400">
              {["Privacy", "Terms", "Contact"].map((item, index) => (
                <motion.div
                  key={item}
                  whileHover={{ scale: 1.1, color: "#ffffff" }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={`/${item.toLowerCase()}`}
                    className="hover:text-white transition-colors"
                  >
                    {item}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="text-center mt-12 text-gray-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <motion.p
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              © 2024 PDFTools. Built for professionals.
            </motion.p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
