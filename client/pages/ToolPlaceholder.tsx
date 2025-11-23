import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ParticleBackground from "@/components/ParticleBackground";

import BlockchainStatus from "@/components/BlockchainStatus";
import {
  FileText,
  ArrowLeft,
  Construction,
  Sparkles,
  Zap,
  Shield,
  Rocket,
  Bot,
  Brain,
  MessageCircle,
  Cpu,
} from "lucide-react";

interface ToolPlaceholderProps {
  toolName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function ToolPlaceholder({
  toolName,
  description,
  icon: Icon,
}: ToolPlaceholderProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-gray-900">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Blockchain Status */}
      <BlockchainStatus />

      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute inset-0 gradient-animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 px-4 py-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <nav className="mx-auto max-w-7xl flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              whileHover={{ scale: 1.1, rotateY: 180 }}
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
          </Link>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", bounce: 0.4 }}
            className="text-center mb-16"
          >
            <motion.div
              className="w-24 h-24 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-8 shadow-2xl"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.2, rotate: 180 }}
            >
              <Icon className="h-12 w-12 text-white" />
            </motion.div>
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-white mb-6 animate-glow"
              animate={{
                textShadow: [
                  "0 0 20px rgba(255,255,255,0.5)",
                  "0 0 40px rgba(255,255,255,0.8)",
                  "0 0 20px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {toolName}
            </motion.h1>
            <motion.p
              className="text-2xl text-white/90 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {description}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: 30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.7, type: "spring" }}
            className="perspective-1000"
          >
            <motion.div
              whileHover={{
                scale: 1.02,
                rotateY: 5,
                z: 50,
              }}
              transition={{ duration: 0.5 }}
              className="transform-gpu"
            >
              <Card className="bg-white/10 backdrop-blur-md border border-white/30 shadow-2xl">
                <CardHeader className="text-center p-12">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-8 shadow-lg"
                    animate={{
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                      },
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                  >
                    <Construction className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-white text-3xl mb-4">
                    Coming Soon!
                  </CardTitle>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-8 w-8 text-yellow-300 mx-auto mb-4" />
                  </motion.div>
                </CardHeader>
                <CardContent className="text-center p-12">
                  <motion.p
                    className="text-white/80 mb-10 text-xl leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                  >
                    This AI-powered tool is being developed with blockchain
                    security and natural language processing. Soon you'll be
                    able to simply tell our AI assistant what you want to do!
                  </motion.p>

                  {/* AI Preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.2 }}
                    className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-2xl p-6 mb-8 border border-gray-600/50"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <Bot className="h-6 w-6 text-cyan-300" />
                      <span className="text-cyan-200 font-semibold">
                        AI Assistant Preview
                      </span>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                      <p className="text-white/90 italic">
                        "Hey AI, please {toolName.toLowerCase()} my document and
                        make it secure with blockchain encryption."
                      </p>
                      <div className="flex items-center space-x-2 mt-3 text-green-300">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm">
                          AI: "I'll handle that right away! Uploading to secure
                          blockchain..."
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link to="/">
                        <Button className="bg-gradient-to-r from-white to-gray-100 text-brand-600 hover:from-gray-100 hover:to-white text-lg px-8 py-4 rounded-xl shadow-lg">
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Explore Other Tools
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        className="border-2 border-cyan-400/60 text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-200 text-lg px-8 py-4 rounded-xl backdrop-blur-sm"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Try AI Chat
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Enhanced Feature Preview */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-20"
          >
            <motion.h2
              className="text-3xl font-bold text-white text-center mb-12"
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              What Awaits You
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Bot,
                  title: "AI-Powered Commands",
                  description:
                    "Just tell our AI what you want - no manual clicking",
                  gradient: "from-blue-500 to-purple-600",
                },
                {
                  icon: Cpu,
                  title: "Blockchain Security",
                  description:
                    "Your files protected by decentralized encryption",
                  gradient: "from-green-500 to-teal-600",
                },
                {
                  icon: Brain,
                  title: "Smart Processing",
                  description:
                    "AI understands your intent and optimizes results",
                  gradient: "from-purple-500 to-pink-600",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50, rotateX: 30 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 1.5 + index * 0.2,
                    type: "spring",
                  }}
                  whileHover={{
                    scale: 1.05,
                    rotateY: 5,
                    z: 30,
                  }}
                  className="group perspective-1000"
                >
                  <Card className="bg-white/5 backdrop-blur-md border border-white/20 h-full transform-gpu shadow-xl group-hover:shadow-2xl transition-all duration-500">
                    <CardContent className="p-8 text-center">
                      <motion.div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.8, type: "spring" }}
                      >
                        <feature.icon className="h-8 w-8 text-white" />
                      </motion.div>
                      <h3 className="text-white font-bold text-xl mb-4 group-hover:text-yellow-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-white/70 text-base leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
