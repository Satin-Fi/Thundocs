import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  FileText,
  Zap,
  Shield,
  Sparkles,
  Brain,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Upload,
  Download,
  Settings,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  action?: string;
}

interface AIChatProps {
  onTaskComplete?: (task: string, files?: File[]) => void;
}

export default function AIChat({ onTaskComplete }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "👋 Welcome! I'm your AI PDF Assistant powered by blockchain technology. Just tell me what you'd like to do with your PDFs in plain English!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateAIResponse = (userMessage: string) => {
    setIsTyping(true);

    setTimeout(() => {
      let response = "";
      const lowerMsg = userMessage.toLowerCase();

      if (lowerMsg.includes("merge") || lowerMsg.includes("combine")) {
        response =
          "🔄 Perfect! I'll help you merge PDFs. Upload the files you want to combine, and I'll process them securely using our blockchain infrastructure. The merged document will maintain the highest quality and be encrypted throughout the process.";
      } else if (lowerMsg.includes("compress") || lowerMsg.includes("reduce")) {
        response =
          "🗜️ Great choice! I can optimize your PDF size while preserving quality. Upload your file and I'll use advanced AI algorithms to compress it efficiently. All processing happens on our secure blockchain network.";
      } else if (
        lowerMsg.includes("convert") ||
        lowerMsg.includes("word") ||
        lowerMsg.includes("image")
      ) {
        response =
          "🔄 I can convert your PDF to various formats! Whether you need Word documents, images (JPG/PNG), Excel, or PowerPoint, just upload your PDF and specify your desired format. Conversion is handled securely with blockchain verification.";
      } else if (
        lowerMsg.includes("protect") ||
        lowerMsg.includes("password") ||
        lowerMsg.includes("secure")
      ) {
        response =
          "🔐 Excellent! I'll add military-grade protection to your PDF. Upload your file and I'll encrypt it with blockchain-level security. You can set passwords, restrict editing, or add digital signatures.";
      } else if (lowerMsg.includes("split") || lowerMsg.includes("separate")) {
        response =
          "✂️ I can split your PDF exactly how you need it! Upload your file and tell me how to divide it - by page numbers, page ranges, or split into individual pages. Each resulting file will be blockchain-secured.";
      } else if (lowerMsg.includes("edit") || lowerMsg.includes("annotate")) {
        response =
          "✏️ I can help you edit and annotate PDFs! Upload your document and tell me what changes you need - add text, images, highlights, comments, or signatures. All edits are processed securely.";
      } else {
        response =
          "🤖 I'm here to help with any PDF task! I can merge, compress, convert, protect, split, or edit PDFs. Just describe what you need in natural language, and I'll guide you through the process using our secure AI-powered platform.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "ai",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    simulateAIResponse(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: "Merge PDFs", icon: FileText, command: "merge my PDF files" },
    { label: "Compress", icon: Minimize2, command: "compress this PDF" },
    {
      label: "Add Security",
      icon: Shield,
      command: "protect my PDF with password",
    },
    {
      label: "Convert to Word",
      icon: FileText,
      command: "convert PDF to Word",
    },
    { label: "Split Pages", icon: FileText, command: "split this PDF" },
    {
      label: "Extract Images",
      icon: FileText,
      command: "extract images from PDF",
    },
  ];

  return (
    <>
      {/* Trigger Button */}
      <motion.div
        className="fixed top-1/2 right-4 z-50 -translate-y-1/2"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring" }}
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-4 rounded-l-2xl shadow-2xl"
          whileHover={{ x: -10, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="h-6 w-6" />
            </motion.div>
            <div className="text-left">
              <div className="font-semibold text-sm">AI Assistant</div>
              <div className="text-xs opacity-80">Chat to get started</div>
            </div>
          </div>

          {/* Pulsing dot */}
          <motion.div
            className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-l-2xl blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity" />
        </motion.button>
      </motion.div>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Side Panel */}
            <motion.div
              className="fixed right-0 top-0 h-full z-50 w-96 md:w-[28rem]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div
                className={`h-full bg-white/95 backdrop-blur-xl border-l border-white/30 shadow-2xl flex flex-col ${
                  isMinimized ? "opacity-50" : ""
                }`}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <motion.div
                        className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 12,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Brain className="h-7 w-7" />
                      </motion.div>
                      <div>
                        <h2 className="text-xl font-bold">AI PDF Assistant</h2>
                        <div className="flex items-center space-x-2 text-sm text-blue-100">
                          <motion.div
                            className="w-2 h-2 bg-green-400 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <span>Blockchain Secured</span>
                          <Sparkles className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-white hover:bg-white/20"
                      >
                        {isMinimized ? (
                          <Maximize2 className="h-4 w-4" />
                        ) : (
                          <Minimize2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <motion.div
                    className="mt-4 grid grid-cols-3 gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {[
                      { label: "Files Processed", value: "2.1M+" },
                      { label: "AI Accuracy", value: "99.8%" },
                      { label: "Avg Speed", value: "<2s" },
                    ].map((stat, index) => (
                      <div key={stat.label} className="text-center">
                        <div className="text-lg font-bold text-white">
                          {stat.value}
                        </div>
                        <div className="text-xs text-blue-100">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {!isMinimized && (
                  <>
                    {/* Quick Actions */}
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Quick Commands
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {quickActions.map((action, index) => (
                          <motion.button
                            key={action.label}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setInput(action.command)}
                            className="flex items-center space-x-2 p-3 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-cyan-50 rounded-xl text-sm text-gray-700 hover:text-blue-800 transition-all"
                          >
                            <action.icon className="h-4 w-4" />
                            <span className="font-medium">{action.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${
                              message.type === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] p-4 rounded-2xl ${
                                message.type === "user"
                                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                                  : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                {message.type === "ai" && (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 10,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                  >
                                    <Bot className="h-5 w-5 text-blue-600 mt-1" />
                                  </motion.div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm leading-relaxed">
                                    {message.content}
                                  </p>
                                  <p
                                    className={`text-xs mt-2 ${
                                      message.type === "user"
                                        ? "text-blue-100"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {message.timestamp.toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 rounded-2xl border border-gray-200">
                              <div className="flex items-center space-x-3">
                                <Bot className="h-5 w-5 text-blue-600" />
                                <div className="flex space-x-1">
                                  {[1, 2, 3].map((dot) => (
                                    <motion.div
                                      key={dot}
                                      className="w-2 h-2 bg-blue-400 rounded-full"
                                      animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 1, 0.5],
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: dot * 0.2,
                                      }}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">
                                  AI is thinking...
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                      <div className="flex space-x-3">
                        <div className="flex-1 relative">
                          <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about your PDFs..."
                            className="pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 bg-white"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-3 rounded-xl"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </div>

                      <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
                        <Shield className="h-3 w-3 mr-1" />
                        <span>Secured by blockchain technology</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
