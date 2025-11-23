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
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Brain,
  FileText,
  MessageSquare,
  Search,
  Lightbulb,
  BarChart3,
  Download,
  Copy,
  Sparkles,
  Zap,
  CheckCircle,
  Loader2,
  Send,
  User,
  Bot,
  Clock,
  TrendingUp,
  Key,
  Globe,
  Target,
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface AnalysisResult {
  id: string;
  type: 'summary' | 'keyPoints' | 'questions' | 'sentiment' | 'entities' | 'topics';
  title: string;
  content: string;
  confidence: number;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  url: string;
  status: 'processing' | 'completed' | 'error';
  analysis?: AnalysisResult[];
  chatHistory?: ChatMessage[];
}

const analysisTypes = [
  { id: 'summary', name: 'Smart Summary', icon: FileText, color: 'blue' },
  { id: 'keyPoints', name: 'Key Points', icon: Key, color: 'green' },
  { id: 'questions', name: 'Q&A Generation', icon: MessageSquare, color: 'purple' },
  { id: 'sentiment', name: 'Sentiment Analysis', icon: TrendingUp, color: 'orange' },
  { id: 'entities', name: 'Entity Extraction', icon: Target, color: 'red' },
  { id: 'topics', name: 'Topic Modeling', icon: Globe, color: 'cyan' },
];

export default function AIPdfAnalyzer() {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type === 'application/pdf') {
          const newDoc: UploadedDocument = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            status: 'processing',
            analysis: [],
            chatHistory: [],
          };
          
          setUploadedDocs(prev => [...prev, newDoc]);
          processDocument(newDoc);
        }
      });
    }
  };

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
      return 'Error extracting text from PDF';
    }
  };

  const generateSummary = (text: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const wordCount = text.split(/\s+/).length;
    const pageCount = Math.ceil(wordCount / 250);
    
    const keyWords = text.toLowerCase()
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

    return `Document Analysis Summary:\n\n` +
           `• Document Length: ${wordCount} words, approximately ${pageCount} pages\n` +
           `• Key Topics: ${topWords.join(', ')}\n` +
           `• Main Content: ${sentences.slice(0, 3).join('. ')}\n\n` +
           `This document contains ${sentences.length} sentences with detailed information about ${topWords[0] || 'various topics'}.`;
  };

  const extractKeyPoints = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const numbers = text.match(/\$[\d,]+|\d{4}-\d{2}-\d{2}|\d+%|\d+\.\d+/g) || [];
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones = text.match(/\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g) || [];
    
    return `**Key Information Extracted:**\n\n` +
           `**Numbers & Dates Found:**\n${numbers.slice(0, 10).map(n => `• ${n}`).join('\n')}\n\n` +
           `**Contact Information:**\n${emails.map(e => `• Email: ${e}`).join('\n')}\n${phones.map(p => `• Phone: ${p}`).join('\n')}\n\n` +
           `**Key Lines:**\n${lines.slice(0, 5).map(l => `• ${l.substring(0, 100)}...`).join('\n')}`;
  };

  const processDocument = async (doc: UploadedDocument) => {
    setIsProcessing(true);
    
    try {
      // Extract text from PDF
      const response = await fetch(doc.url);
      const blob = await response.blob();
      const file = new File([blob], doc.name, { type: 'application/pdf' });
      const extractedText = await extractTextFromPDF(file);
      
      // Generate initial analysis
      const sampleAnalysis: AnalysisResult[] = [
        {
          id: '1',
          type: 'summary',
          title: 'Document Summary',
          content: generateSummary(extractedText),
          confidence: 92,
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'keyPoints',
          title: 'Key Points Extracted',
          content: extractKeyPoints(extractedText),
          confidence: 88,
          timestamp: new Date(),
        },
      ];

      setUploadedDocs(prev => 
        prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'completed', analysis: sampleAnalysis }
            : d
        )
      );
      setIsProcessing(false);
      if (!selectedDoc) setSelectedDoc(doc.id);
    } catch (error) {
      console.error('Document processing error:', error);
      setUploadedDocs(prev => 
        prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'error' }
            : d
        )
      );
      setIsProcessing(false);
    }
  };

  const runAnalysis = async (docId: string, analysisType: string) => {
    setActiveAnalysis(prev => [...prev, analysisType]);
    
    // Simulate analysis processing
    setTimeout(() => {
      const analysisContent = {
        questions: 'Q: What are the main benefits of AI in business?\nA: AI provides automation, predictive analytics, improved decision-making, and enhanced customer experiences.\n\nQ: What are the key challenges in AI implementation?\nA: Main challenges include data quality, ethical considerations, technical complexity, and change management.\n\nQ: How can organizations ensure responsible AI development?\nA: Through ethical guidelines, transparency, bias testing, and continuous monitoring of AI systems.',
        topics: 'Primary Topics Identified:\n\n1. Artificial Intelligence (35%)\n   - Machine Learning\n   - Deep Learning\n   - Neural Networks\n\n2. Business Applications (25%)\n   - Process Automation\n   - Decision Support\n   - Customer Service\n\n3. Technology Implementation (20%)\n   - Data Infrastructure\n   - System Integration\n   - Performance Optimization\n\n4. Ethics & Governance (20%)\n   - Responsible AI\n   - Privacy Protection\n   - Regulatory Compliance',
      };

      const newAnalysis: AnalysisResult = {
        id: Date.now().toString(),
        type: analysisType as any,
        title: analysisTypes.find(t => t.id === analysisType)?.name || 'Analysis',
        content: analysisContent[analysisType as keyof typeof analysisContent] || 'Analysis completed successfully.',
        confidence: 85 + Math.random() * 15,
        timestamp: new Date(),
      };

      setUploadedDocs(prev => 
        prev.map(d => 
          d.id === docId 
            ? { ...d, analysis: [...(d.analysis || []), newAnalysis] }
            : d
        )
      );
      
      setActiveAnalysis(prev => prev.filter(a => a !== analysisType));
    }, 2000 + Math.random() * 1000);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !selectedDoc) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    // Add user message
    setUploadedDocs(prev => 
      prev.map(d => 
        d.id === selectedDoc 
          ? { ...d, chatHistory: [...(d.chatHistory || []), userMessage] }
          : d
      )
    );

    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on the document analysis, I can see that this topic is covered in detail. The document emphasizes the importance of strategic implementation and careful consideration of various factors.",
        "According to the content I've analyzed, there are several key aspects to consider. The document provides comprehensive insights into this area with specific recommendations.",
        "From my analysis of the document, this question relates to the core themes discussed. The document offers valuable perspectives and actionable insights on this topic.",
        "The document contains relevant information about this subject. Based on my understanding of the content, I can provide you with detailed insights and explanations.",
      ];

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setUploadedDocs(prev => 
        prev.map(d => 
          d.id === selectedDoc 
            ? { ...d, chatHistory: [...(d.chatHistory || []), aiMessage] }
            : d
        )
      );
    }, 1000 + Math.random() * 2000);
  };

  const selectedDocument = uploadedDocs.find(d => d.id === selectedDoc);
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAnalysisColor = (type: string) => {
    const analysis = analysisTypes.find(a => a.id === type);
    return analysis?.color || 'gray';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <motion.div
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 180 }}
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI PDF Analyzer
                </h1>
                <p className="text-gray-400">Intelligent document analysis and insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Insights
              </Badge>
              <Badge variant="secondary" className="bg-pink-500/20 text-pink-400">
                <Zap className="mr-1 h-3 w-3" />
                Smart Analysis
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Document List & Upload */}
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">Click to upload PDF</p>
                  <p className="text-gray-400 text-xs">Max size: 50MB</p>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Document List */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {uploadedDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedDoc === doc.id 
                        ? 'bg-purple-500/20 border border-purple-500/50' 
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedDoc(doc.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-red-400" />
                        <div>
                          <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-gray-400 text-xs">{formatFileSize(doc.size)}</p>
                        </div>
                      </div>
                      {doc.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      )}
                      {doc.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {uploadedDocs.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No documents uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDocument ? (
              <>
                {/* Analysis Tools */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      AI Analysis Tools
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Run intelligent analysis on your document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {analysisTypes.map((analysis) => {
                        const Icon = analysis.icon;
                        const isActive = activeAnalysis.includes(analysis.id);
                        const hasResult = selectedDocument.analysis?.some(a => a.type === analysis.id);
                        
                        return (
                          <motion.div
                            key={analysis.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActive || selectedDocument.status !== 'completed'}
                              onClick={() => runAnalysis(selectedDocument.id, analysis.id)}
                              className={`w-full h-auto p-3 flex flex-col items-center space-y-2 border-gray-600 hover:bg-gray-700 ${
                                hasResult ? 'bg-green-500/10 border-green-500/30' : ''
                              }`}
                            >
                              {isActive ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Icon className={`h-5 w-5 text-${analysis.color}-400`} />
                              )}
                              <span className="text-xs text-center">{analysis.name}</span>
                              {hasResult && (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              )}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                {selectedDocument.analysis && selectedDocument.analysis.length > 0 && (
                  <div className="space-y-4">
                    {selectedDocument.analysis.map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="bg-gray-800/50 border-gray-700">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-white flex items-center">
                                <Lightbulb className={`mr-2 h-5 w-5 text-${getAnalysisColor(result.type)}-400`} />
                                {result.title}
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className={`bg-${getAnalysisColor(result.type)}-500/20 text-${getAnalysisColor(result.type)}-400`}>
                                  {result.confidence}% confidence
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(result.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-gray-700/50 rounded-lg p-4">
                              <pre className="text-gray-100 text-sm whitespace-pre-wrap font-sans">
                                {result.content}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Chat Interface */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Chat with Document
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Ask questions about your document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Chat History */}
                    <div className="h-64 overflow-y-auto mb-4 space-y-3 bg-gray-700/30 rounded-lg p-4">
                      {selectedDocument.chatHistory && selectedDocument.chatHistory.length > 0 ? (
                        selectedDocument.chatHistory.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-start space-x-3 ${
                              message.type === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.type === 'ai' && (
                              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.type === 'user' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-600 text-gray-100'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {message.type === 'user' && (
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Start a conversation about your document</p>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex space-x-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question about the document..."
                        className="bg-gray-700 border-gray-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        disabled={selectedDocument.status !== 'completed'}
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim() || selectedDocument.status !== 'completed'}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Brain className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-medium text-gray-400 mb-2">
                  No document selected
                </h3>
                <p className="text-gray-500">
                  Upload a PDF document to start AI analysis
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}