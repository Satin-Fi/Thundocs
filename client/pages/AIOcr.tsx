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
  Eye,
  Download,
  Copy,
  FileText,
  Image,
  Zap,
  Brain,
  Languages,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import Tesseract from 'tesseract.js';

interface ExtractedText {
  id: string;
  content: string;
  confidence: number;
  language: string;
  wordCount: number;
  extractedAt: Date;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: 'processing' | 'completed' | 'error';
  extractedText?: ExtractedText;
}

const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export default function AIOcr() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          const newFile: UploadedFile = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
            status: 'processing',
          };
          
          setUploadedFiles(prev => [...prev, newFile]);
          processFile(newFile);
        }
      });
    }
  };

  const processFile = async (file: UploadedFile) => {
    setIsProcessing(true);
    
    try {
      // Convert language code for Tesseract
      const tesseractLang = selectedLanguage === 'auto' ? 'eng' : 
        selectedLanguage === 'en' ? 'eng' :
        selectedLanguage === 'es' ? 'spa' :
        selectedLanguage === 'fr' ? 'fra' :
        selectedLanguage === 'de' ? 'deu' :
        selectedLanguage === 'it' ? 'ita' :
        selectedLanguage === 'pt' ? 'por' :
        selectedLanguage === 'ru' ? 'rus' :
        selectedLanguage === 'zh' ? 'chi_sim' :
        selectedLanguage === 'ja' ? 'jpn' :
        selectedLanguage === 'ko' ? 'kor' :
        selectedLanguage === 'ar' ? 'ara' :
        selectedLanguage === 'hi' ? 'hin' : 'eng';

      const result = await Tesseract.recognize(
        file.url,
        tesseractLang,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      const extractedText: ExtractedText = {
        id: Date.now().toString(),
        content: result.data.text,
        confidence: Math.round(result.data.confidence),
        language: selectedLanguage === 'auto' ? 'en' : selectedLanguage,
        wordCount: result.data.text.split(' ').filter(word => word.trim().length > 0).length,
        extractedAt: new Date(),
      };

      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'completed', extractedText }
            : f
        )
      );
    } catch (error) {
      console.error('OCR Error:', error);
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'error' }
            : f
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const filteredFiles = uploadedFiles.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.extractedText?.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 180 }}
              >
                <Eye className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  AI OCR Engine
                </h1>
                <p className="text-gray-400">Extract text from PDFs and images with AI precision</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Brain className="mr-1 h-3 w-3" />
                AI Powered
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                <Languages className="mr-1 h-3 w-3" />
                Multi-language
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="bg-gray-800/50 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Upload Documents
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload PDFs or images to extract text using AI OCR technology
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload Area */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Click to upload files</p>
                <p className="text-gray-400 text-sm">Supports PDF, JPG, PNG, TIFF, BMP</p>
                <p className="text-gray-500 text-xs mt-2">Max file size: 50MB</p>
              </motion.div>

              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Language Detection
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="auto">Auto-detect</option>
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search Extracted Text
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search in extracted text..."
                      className="pl-10 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Processing Status */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  <span className="text-blue-400 font-medium">AI is processing your documents...</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredFiles.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* File Info */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {file.type.startsWith('image/') ? (
                        <Image className="h-5 w-5 text-blue-400" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <CardTitle className="text-white text-sm">{file.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {formatFileSize(file.size)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      )}
                      {file.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {file.extractedText && (
                  <CardContent>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getConfidenceColor(file.extractedText.confidence)}`}>
                          {file.extractedText.confidence}%
                        </div>
                        <div className="text-xs text-gray-400">Confidence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">
                          {file.extractedText.wordCount}
                        </div>
                        <div className="text-xs text-gray-400">Words</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-400">
                          {supportedLanguages.find(l => l.code === file.extractedText?.language)?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">Language</div>
                      </div>
                    </div>

                    {/* Extracted Text */}
                    <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                      <Textarea
                        value={file.extractedText.content}
                        readOnly
                        className="w-full h-32 bg-transparent border-none text-gray-100 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(file.extractedText!.content)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadText(file.extractedText!.content, file.name)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {uploadedFiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Eye className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              No documents uploaded yet
            </h3>
            <p className="text-gray-500">
              Upload PDFs or images to start extracting text with AI OCR
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}