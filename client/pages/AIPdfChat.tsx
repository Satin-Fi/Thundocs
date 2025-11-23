import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  MessageCircle,
  Bot,
  FileText,
  Brain,
  Sparkles,
  Send,
  Loader2,
  Download,
  Eye,
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export default function AIPdfChat() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pdfText, setPdfText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your AI PDF assistant. Upload a PDF and I\'ll help you analyze, extract information, or answer questions about its content.',
      timestamp: new Date(),
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      return '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(async (file) => {
        if (file.type === 'application/pdf') {
          try {
            // Extract text from PDF
            const extractedText = await extractTextFromPDF(file);
            setPdfText(extractedText);
            
            const newFile: UploadedFile = {
              id: Date.now().toString() + Math.random(),
              name: file.name,
              size: file.size,
              type: file.type,
              url: URL.createObjectURL(file),
            };
            setUploadedFiles(prev => [...prev, newFile]);
            
            // Add AI message about successful upload with document info
            const wordCount = extractedText.split(/\s+/).filter(word => word.trim().length > 0).length;
            const aiMessage: Message = {
              id: Date.now().toString(),
              type: 'ai',
              content: `Great! I've successfully processed "${file.name}" and extracted ${wordCount} words of text. You can now ask me questions about this document, request summaries, or extract specific information.`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMessage]);
          } catch (error) {
            console.error('Error processing PDF:', error);
            const errorMessage: Message = {
              id: Date.now().toString(),
              type: 'ai',
              content: `Sorry, I encountered an error processing "${file.name}". Please try uploading the file again.`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(currentMessage, uploadedFiles),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (message: string, files: UploadedFile[]): string => {
    const lowerMessage = message.toLowerCase();
    
    if (files.length === 0 || !pdfText) {
      return "Please upload a PDF file first so I can help you analyze it.";
    }

    if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
      const sentences = pdfText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const wordCount = pdfText.split(/\s+/).length;
      const keyWords = pdfText.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .reduce((acc: {[key: string]: number}, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {});
      
      const topWords = Object.entries(keyWords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);

      return `Here's a summary of "${files[0].name}":\n\n**Document Overview:**\n• Length: ${wordCount} words\n• Key topics: ${topWords.join(', ')}\n\n**Main Content:**\n${sentences.slice(0, 3).join('. ')}\n\nThis document contains ${sentences.length} sentences with detailed information about ${topWords[0] || 'various topics'}.`;
    }

    if (lowerMessage.includes('extract') || lowerMessage.includes('find')) {
      const numbers = pdfText.match(/\$[\d,]+|\d{4}-\d{2}-\d{2}|\d+%|\d+\.\d+/g) || [];
      const emails = pdfText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const lines = pdfText.split('\n').filter(line => line.trim().length > 10);
      
      return `Key information extracted from "${files[0].name}":\n\n**Numbers & Dates:**\n${numbers.slice(0, 5).map(n => `• ${n}`).join('\n')}\n\n**Contact Information:**\n${emails.slice(0, 3).map(e => `• ${e}`).join('\n')}\n\n**Important Lines:**\n${lines.slice(0, 3).map(l => `• ${l.substring(0, 100)}...`).join('\n')}`;
    }

    if (lowerMessage.includes('search')) {
      const searchTerm = message.replace(/search|find|for|the|in|document/g, '').trim();
      if (searchTerm) {
        const matches = pdfText.split('\n').filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matches.length > 0) {
          return `Found ${matches.length} references to "${searchTerm}" in "${files[0].name}":\n\n${matches.slice(0, 3).map(match => `• ${match.substring(0, 150)}...`).join('\n')}`;
        } else {
          return `No direct matches found for "${searchTerm}" in "${files[0].name}". Try searching for related terms or ask me a specific question about the document.`;
        }
      }
    }

    if (lowerMessage.includes('translate')) {
      return `I can help translate content from "${files[0].name}". Which language would you like me to translate it to? I support multiple languages including Spanish, French, German, Chinese, and many others. Please specify the text section and target language.`;
    }

    // Try to answer based on document content
    const relevantLines = pdfText.split('\n').filter(line => {
      const words = message.split(' ').filter(word => word.length > 3);
      return words.some(word => line.toLowerCase().includes(word.toLowerCase()));
    });
    
    if (relevantLines.length > 0) {
      return `Based on "${files[0].name}", here's what I found:\n\n${relevantLines.slice(0, 2).map(line => `• ${line.substring(0, 200)}...`).join('\n')}\n\nWould you like me to elaborate on any specific aspect?`;
    }

    return `I understand you want to work with "${files[0].name}". I can help you with:\n\n• Document summarization\n• Text extraction and search\n• Question answering\n• Language translation\n• Data analysis\n• Content organization\n\nWhat would you like me to help you with?`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4"
          >
            <motion.div
              className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 180 }}
            >
              <Brain className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI PDF Chat
              </h1>
              <p className="text-gray-400">Chat with your PDFs using advanced AI</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - File Upload */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Documents
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Upload PDFs to chat with them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PDF
                  </Button>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Uploaded Files */}
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800/50 border-gray-700 h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  AI Assistant
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="ml-2"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && (
                          <Bot className="h-5 w-5 mt-0.5 text-blue-400" />
                        )}
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-700 rounded-lg p-4 flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-gray-300">AI is thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask me anything about your PDF..."
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                    rows={2}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 h-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}