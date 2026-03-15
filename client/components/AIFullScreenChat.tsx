import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Bot,
  User,
  FileText,
  Plus,
  Paperclip,
  RotateCcw,
  ArrowUp,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { ThundocsLogo } from "@/components/ThundocsLogo";

// Dynamic import for PDF.js to avoid Vite bundling issues
let pdfjsLib: any = null;

// Initialize PDF.js
const initPdfJs = async () => {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist');
      // Configure PDF.js worker - using the exact version we have installed
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.54/build/pdf.worker.min.js`;
    } catch (error) {
      console.error('Failed to load PDF.js:', error);
      throw new Error('PDF processing library failed to load');
    }
  }
  return pdfjsLib;
};

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AIFullScreenChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  extractedText: string;
}

export default function AIFullScreenChat({
  isOpen,
  onClose,
}: AIFullScreenChatProps) {
  const { themeStyles, isNight, theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI assistant powered by Ollama. I can help you with PDF analysis, content extraction, summarization, and answer questions about your documents. Upload a PDF to get started!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ollama API configuration
  const OLLAMA_BASE_URL = "http://localhost:11434";
  const OLLAMA_MODEL = "llama2"; // You can change this to any model you have installed

  // Direct Ollama API call function
  const callOllamaAPI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "I apologize, but I couldn't generate a response.";
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Initialize PDF.js
      const pdfjs = await initPdfJs();
      
      // Validate file type
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File is not a valid PDF');
      }

      // Check file size (limit to 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('PDF file is too large (max 50MB)');
      }

      const arrayBuffer = await file.arrayBuffer();
      
      // Validate that we have data
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file appears to be empty');
      }

      const pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        // Add error handling options
        verbosity: 0, // Reduce console noise
        isEvalSupported: false, // Security
        disableFontFace: true, // Performance
      }).promise;
      
      let fullText = "";
      const numPages = pdf.numPages;
      
      if (numPages === 0) {
        throw new Error('PDF has no pages');
      }

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .join(" ")
            .trim();
          
          if (pageText) {
            fullText += `Page ${i}:\n${pageText}\n\n`;
          }
        } catch (pageError) {
          console.warn(`Error processing page ${i}:`, pageError);
          fullText += `Page ${i}: [Error reading page content]\n\n`;
        }
      }

      if (!fullText.trim()) {
        throw new Error('No text content found in PDF (might be image-based)');
      }

      return fullText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF')) {
          throw new Error('Invalid or corrupted PDF file');
        } else if (error.message.includes('password')) {
          throw new Error('PDF is password protected');
        } else if (error.message.includes('network')) {
          throw new Error('Network error while processing PDF');
        } else {
          throw new Error(`PDF processing failed: ${error.message}`);
        }
      }
      
      throw new Error('Failed to extract text from PDF');
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const file = files[0];

    try {
      const extractedText = await extractTextFromPDF(file);
      const newFile: UploadedFile = {
        file,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        extractedText,
      };

      setUploadedFiles(prev => [...prev, newFile]);

      // Add system message about successful upload
      const uploadMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: `✅ Successfully uploaded and processed "${file.name}". I've extracted ${extractedText.length} characters of text. You can now ask me questions about this document!`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, uploadMessage]);
    } catch (error) {
      console.error('File upload error:', error);
      
      let errorContent = `❌ Failed to process "${file.name}".`;
      
      if (error instanceof Error) {
        errorContent += ` ${error.message}`;
      } else {
        errorContent += ' Please make sure it\'s a valid PDF file.';
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Generate AI response using direct Ollama API
  const generateAIResponse = async (userMessage: string) => {
    setIsTyping(true);

    try {
      // Prepare context from uploaded files
      let context = "";
      if (uploadedFiles.length > 0) {
        context = "\n\nContext from uploaded PDF documents:\n";
        uploadedFiles.forEach((file, index) => {
          context += `\n--- Document ${index + 1}: ${file.name} ---\n`;
          // Limit context to prevent token overflow
          const truncatedText = file.extractedText.substring(0, 2000);
          context += truncatedText;
          if (file.extractedText.length > 2000) {
            context += "\n[Content truncated...]";
          }
          context += "\n";
        });
      }

      // Create system prompt and combine with user message
      const systemPrompt = "You are a helpful AI assistant specialized in PDF document analysis. You can help users understand, summarize, and extract information from PDF documents. Be concise and helpful in your responses.\n\n";
      const fullPrompt = systemPrompt + "User: " + userMessage + context + "\n\nAssistant:";

      // Generate response using direct Ollama API
      const response = await callOllamaAPI(fullPrompt);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "ai",
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      let errorMessage = "I'm having trouble connecting to the AI model. ";
      
      if (error instanceof Error && error.message.includes("fetch")) {
        errorMessage += "Please make sure Ollama is running on http://localhost:11434 and you have a model installed (e.g., 'ollama pull llama2').";
      } else {
        errorMessage += "Please try again or check your connection.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "ai",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    await generateAIResponse(input);
    setInput("");
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Summarize this document",
    "What are the key points in this PDF?",
    "Extract all important dates and numbers",
    "What is this document about?",
    "Find contact information in the document",
    "Translate the main content to English",
  ];

  const conversationHistory = [
    "PDF Merger Project",
    "Document Compression",
    "Word Conversion Task",
    "Security Setup",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 flex ${themeStyles.text}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <div className={`relative w-full h-full flex flex-col md:flex-row bg-transparent pointer-events-none`}>
            {/* Sidebar */}
            <motion.div
              className={`pointer-events-auto h-full ${themeStyles.cardBg} ${themeStyles.cardBorder} border-r flex flex-col transition-all duration-200 ${
                sidebarOpen ? "w-64" : "w-0 overflow-hidden"
              }`}
              initial={{ x: -264 }}
              animate={{ x: sidebarOpen ? 0 : -264 }}
            >
              <div className={`p-4 border-b ${themeStyles.cardBorder}`}>
                <Button
                  onClick={() => setMessages([])}
                  className={`w-full ${themeStyles.inputBg} ${themeStyles.inputBorder} border ${themeStyles.text} hover:opacity-80`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <h3 className={`text-xs font-medium ${themeStyles.secondaryText} uppercase tracking-wide px-2 mb-2`}>
                    Recent Chats
                  </h3>
                  {conversationHistory.map((chat, index) => (
                    <button
                      key={index}
                      className={`w-full text-left px-2 py-2 text-sm ${themeStyles.text} hover:${isNight ? 'bg-gray-700' : 'bg-gray-100'} rounded truncate`}
                    >
                      {chat}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col pointer-events-auto h-full ${themeStyles.bg}`}>
              {/* Header */}
              <div className={`border-b ${themeStyles.headerBorder} ${themeStyles.headerBg} backdrop-blur-xl px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`${themeStyles.secondaryText} hover:${themeStyles.text} hover:${isNight ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <ThundocsLogo className="w-8 h-8 hover:scale-110 transition-transform duration-300" />
                    <div className="flex flex-col">
                      <h1 className={`font-bold ${themeStyles.text} text-lg leading-none tracking-tight`}>Thundocs</h1>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">AI PDF ASSISTANT</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   {/* Theme Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(isNight ? 'day' : 'night')}
                    className={`rounded-full ${themeStyles.buttonGhost} hover:rotate-12 transition-transform duration-300`}
                  >
                    {isNight ? (
                      <Sun className="h-5 w-5 text-amber-300" />
                    ) : (
                      <Moon className="h-5 w-5 text-indigo-500" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className={`${themeStyles.secondaryText} hover:${themeStyles.text} hover:${isNight ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className={`flex-1 ${themeStyles.bg}`}>
                <div className="max-w-3xl mx-auto px-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <div className={`w-16 h-16 ${themeStyles.cardBg} rounded-full flex items-center justify-center mb-4 border ${themeStyles.cardBorder}`}>
                        <Bot className="h-8 w-8 text-blue-400" />
                      </div>
                      <h2 className={`text-2xl font-semibold ${themeStyles.text} mb-2`}>
                        How can I help with your PDFs?
                      </h2>
                      <p className={`${themeStyles.secondaryText} mb-8 text-center max-w-md`}>
                        Upload a PDF and I'll analyze it using AI. I can summarize, extract information, and answer questions about your documents.
                      </p>
                      {uploadedFiles.length > 0 && (
                        <div className="mb-6 w-full max-w-2xl">
                          <h3 className={`text-sm font-medium ${themeStyles.secondaryText} mb-3`}>Uploaded Documents:</h3>
                          <div className="space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className={`flex items-center space-x-3 ${themeStyles.cardBg} rounded-lg p-3 border ${themeStyles.cardBorder}`}>
                                <FileText className="h-5 w-5 text-blue-400" />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${themeStyles.text} truncate`}>{file.name}</p>
                                  <p className={`text-xs ${themeStyles.secondaryText}`}>{file.size}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {quickPrompts.map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => setInput(prompt)}
                            className={`p-4 text-left border ${themeStyles.cardBorder} rounded-lg hover:${isNight ? 'bg-gray-800' : 'bg-gray-100'} transition-colors ${themeStyles.cardBg}`}
                          >
                            <p className={`text-sm ${themeStyles.text}`}>{prompt}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-8">
                      {messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex space-x-4"
                        >
                          {message.type === "ai" && (
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          <div className={`flex-1 min-w-0 flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="mb-1 flex items-center space-x-2">
                              <span className={`text-sm font-medium ${themeStyles.text}`}>
                                {message.type === "ai" ? "Assistant" : "You"}
                              </span>
                              <span className={`text-xs ${themeStyles.secondaryText}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div
                              className={`prose prose-sm max-w-none px-4 py-3 rounded-2xl shadow-sm ${
                                message.type === 'user'
                                  ? 'bg-blue-600 text-white rounded-tr-sm'
                                  : `${themeStyles.cardBg} ${themeStyles.text} border ${themeStyles.cardBorder} rounded-tl-sm`
                              }`}
                            >
                              {message.content.split("\n").map((line, i) => (
                                <p key={i} className="mb-2 last:mb-0">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex space-x-4"
                        >
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-1">
                              <span className={`text-sm font-medium ${themeStyles.text}`}>
                                Assistant
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3].map((dot) => (
                                <motion.div
                                  key={dot}
                                  className={`w-2 h-2 ${isNight ? 'bg-gray-500' : 'bg-gray-400'} rounded-full`}
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5],
                                  }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: dot * 0.2,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className={`border-t ${themeStyles.cardBorder} ${themeStyles.cardBg} p-4`}>
                <div className="max-w-3xl mx-auto">
                  <div className="relative flex items-end space-x-3">
                    <div className="flex-1 relative">
                      <div className={`relative border ${themeStyles.inputBorder} rounded-lg ${themeStyles.inputBg} focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors`}>
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Message PDF Assistant..."
                          className={`border-0 bg-transparent ${themeStyles.text} placeholder:text-gray-400 p-4 pr-12 resize-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={triggerFileUpload}
                            disabled={isProcessing}
                            className={`text-gray-400 hover:${themeStyles.text} hover:${isNight ? 'bg-gray-600' : 'bg-gray-200'} h-8 w-8 p-0`}
                            title="Upload PDF"
                          >
                            {isProcessing ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 p-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className={`text-xs ${themeStyles.secondaryText} mt-2 text-center`}>
                    AI can make mistakes. Check important info.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
