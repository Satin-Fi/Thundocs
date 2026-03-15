import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  MessageSquare,
  FileText,
  Brain,
  Sparkles,
  Loader2,
  Trash2,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Library,
  Play,
  ArrowRight,
  Bot,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  PanelRight,
  PanelRightClose,
  Headphones,
  Video,
  Network,
  CreditCard,
  HelpCircle,
  BarChart3,
  Presentation,
  Table2,
  ArrowUpRight,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadingRing } from "@/components/UploadingRing";
import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { RetrievalQAChain } from "langchain/chains";
import { Document } from "@langchain/core/documents";

// PDF Worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  sources?: string[];
  timestamp: Date;
  isError?: boolean;
}

interface SourceFile {
  id: string;
  name: string;
  text: string;
  pageCount: number;
  color: string;
  selected: boolean;
}

interface KeyTopic {
  title: string;
  description: string;
}

// --- Constants ---
const SOURCE_COLORS = [
  "bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-100 border-green-300 dark:border-green-800",
  "bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-800",
  "bg-purple-200 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-800",
  "bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-800",
];

const DEFAULT_CHAT_MODEL = "llama3.1";
const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_URL = "http://localhost:11434";

export default function AIPdfChat() {
  // State
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'guide' | 'chat'>('guide');

  // Settings / Connection
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_URL);
  const [modelName, setModelName] = useState(DEFAULT_CHAT_MODEL);
  const [embeddingModel, setEmbeddingModel] = useState(DEFAULT_EMBEDDING_MODEL);

  // Connection Doctor State
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error_cors' | 'error_refused' | 'error_other'>('checking');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Notebook Guide Data
  const [generatedSummary, setGeneratedSummary] = useState<string>("");
  const [keyTopics, setKeyTopics] = useState<KeyTopic[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatModelRef = useRef<ChatOllama | null>(null);

  // --- Initialization ---
  useEffect(() => {
    checkConnection();
  }, []);

  // Initialize Chat Model when settings change
  useEffect(() => {
    chatModelRef.current = new ChatOllama({
      baseUrl: ollamaUrl,
      model: modelName,
      temperature: 0.3,
    });
  }, [ollamaUrl, modelName]);

  const retrieveDocuments = async (query: string, store: MemoryVectorStore) => {
    return await store.similaritySearch(query, 4);
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models.map((m: any) => m.name);
        setAvailableModels(models);
        setConnectionStatus('connected');

        // Auto-select chat model if current is invalid
        if (!models.some((m: string) => m.includes(modelName))) {
          if (models.some((m: string) => m.includes("llama3"))) setModelName("llama3.1");
          else if (models.length > 0) setModelName(models[0]); // Fallback to whatever is there
        }

        // Auto-select embedding model
        if (!models.some((m: string) => m.includes(embeddingModel))) {
          // If nomic is missing, warn or fallback (but nomic is best)
          console.warn("Nomic embed missing");
        }
      } else {
        setConnectionStatus('error_other');
      }
    } catch (error: any) {
      console.error("Connection Check Failed:", error);
      if (error.message.includes("Failed to fetch")) {
        setConnectionStatus('error_cors');
      } else {
        setConnectionStatus('error_other');
      }
    }
  };

  // --- Logic ---

  const generateNotebookGuide = async (currentFiles: SourceFile[]) => {
    if (currentFiles.length === 0) return;
    setGuideLoading(true);

    // Optimized: Use less context for faster generation
    const selectedFiles = currentFiles.filter(f => f.selected);
    const contextPreview = selectedFiles.map(f =>
      `[${f.name}]: ${f.text.substring(0, 3000)}`
    ).join('\n\n');

    try {
      const chat = new ChatOllama({
        baseUrl: ollamaUrl,
        model: modelName,
        temperature: 0.3,
        format: "json",
      });

      const prompt = `Analyze these documents and return JSON with:
- "summary": 2-3 paragraph overview of the main content, purpose, and key points
- "topics": array of 3 objects with {title, description} for main themes
- "questions": array of 4 relevant questions about the content

Documents:
${contextPreview}

Return ONLY valid JSON.`;

      const response = await chat.invoke([{ role: "user", content: prompt }]);
      const data = JSON.parse(response.content as string);

      setGeneratedSummary(data.summary || "No summary generated.");
      setKeyTopics(data.topics || []);
      setSuggestedQuestions(data.questions || []);

    } catch (e: any) {
      console.error("Guide Gen Error", e);
      setGeneratedSummary("Error: " + e.message);
    } finally {
      setGuideLoading(false);
    }
  };

  /* --- UI Improvements: Polished card styles & Error Handling --- */

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    // 1. Pre-check connection to avoid hanging
    if (connectionStatus !== 'connected') {
      alert("Please connect to Ollama first (Click Settings Gear).");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Reading PDF...");

    try {
      const newFiles: SourceFile[] = [];
      const docs: Document[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type !== 'application/pdf') continue;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        // Limit max pages to prevent browser crash on huge files
        const maxPages = Math.min(pdf.numPages, 50);

        for (let j = 1; j <= maxPages; j++) {
          const page = await pdf.getPage(j);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';

          docs.push(new Document({
            pageContent: pageText,
            metadata: { source: file.name, page: j }
          }));
        }

        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          text: fullText,
          pageCount: pdf.numPages,
          color: SOURCE_COLORS[files.length % SOURCE_COLORS.length],
          selected: true
        });
      }

      setProcessingStatus("Waking up AI (may take 1-2 mins)...");

      // Timeout wrapper to prevent infinite spinning (Increased to 120s for cold starts)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Embedding timed out. Is Ollama running?")), 120000)
      );

      const processingPromise = (async () => {
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const splitDocs = await splitter.splitDocuments(docs);

        const embeddings = new OllamaEmbeddings({
          model: embeddingModel,
          baseUrl: ollamaUrl,
        });

        let store = vectorStore;
        if (!store) {
          store = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
        } else {
          await store.addDocuments(splitDocs);
        }
        return store;
      })();

      // Race against timeout
      const store = await Promise.race([processingPromise, timeoutPromise]) as MemoryVectorStore;

      setVectorStore(store);
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);

      if (updatedFiles.length > 0) {
        setProcessingStatus("Generating Guide...");
        // Non-blocking guide generation
        generateNotebookGuide(updatedFiles).catch(console.error);
      }

    } catch (error: any) {
      console.error("Processing error:", error);
      alert(`Error: ${error.message}\nMake sure Ollama is running 'llama3.1'.`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [studioLoading, setStudioLoading] = useState<string | null>(null);
  const [studioResult, setStudioResult] = useState<{ type: string; content: string } | null>(null);

  const handleStudioAction = async (action: string) => {
    if (files.length === 0) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'system',
        content: 'Please upload a PDF first.'
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }
    setStudioLoading(action);
    setRightSidebarOpen(false);
    setActiveView('chat');

    let prompt = "";
    switch (action) {
      case 'Audio Overview':
        prompt = "Generate a 'Podcast Script' for two hosts (Alex and Jamie) discussing the key insights from these documents. Make it conversational, engaging, and highlighting the weirdest/most interesting facts. Format it as a script.";
        break;
      case 'Quiz':
        prompt = "Generate a hard 5-question multiple choice quiz based on the documents. Provide the question, 4 options, and the correct answer explanation.";
        break;
      case 'Flashcards':
        prompt = "Create 5 study flashcards with front (concept) and back (definition/explanation) based on the documents.";
        break;
      case 'Mind Map':
        prompt = "Generate a Mermaid.js mindmap syntax showing the hierarchy of concepts in these documents. Wrap the code in ```mermaid block.";
        break;
      case 'Reports':
        prompt = "Write a comprehensive Executive Report summarizing the findings, methodology, and conclusions. Use Markdown headings.";
        break;
      case 'Infographic':
        prompt = "Describe a visual Infographic that represents the data in these documents. Break it down into sections (Header, Key Stats, Charts, Footer) and describe what visuals/text should be in each.";
        break;
      case 'Slide deck':
        prompt = "Create a content outline for a 10-slide presentation based on these documents. For each slide, provide the Title, Bullet Points, and Speaker Notes.";
        break;
      case 'Data table':
        prompt = "Extract key data points from the documents and present them as a Markdown Table. If no specific data tables are found, create a comparison table of key concepts.";
        break;
      default:
        prompt = `Generate a ${action} based on these documents.`;
    }

    // Add user request
    const userMsg: Message = { id: crypto.randomUUID(), timestamp: new Date(), role: 'user', content: `Create a ${action}` };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const store = vectorStore;
      if (!store) {
        throw new Error("Vector store not ready");
      }

      const relevantDocs = await retrieveDocuments(prompt, store);
      const context = relevantDocs.map(d => d.pageContent).join("\n\n");

      if (!chatModelRef.current) throw new Error("Chat model not initialized");

      const response = await chatModelRef.current.invoke([
        { role: "system", content: "You are a specialized AI assistant that creates structured outputs." },
        { role: "user", content: `Context: ${context}\n\nTask: ${prompt}` }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'ai',
        content: content,
        sources: [...new Set(relevantDocs.map(d => d.metadata.source || 'Unknown'))] as string[]
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      console.error(e);
      const errorMsg: Message = { id: crypto.randomUUID(), timestamp: new Date(), role: 'system', content: "Failed to generate studio content." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStudioLoading(null);
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    if (activeView !== 'chat') setActiveView('chat');

    const newMsg: Message = { id: crypto.randomUUID(), timestamp: new Date(), role: 'user', content: text };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const store = vectorStore;
      if (!store) {
        const waitMsg: Message = { id: crypto.randomUUID(), timestamp: new Date(), role: 'system', content: "Please wait, content is still processing..." };
        setMessages(prev => [...prev, waitMsg]);
        setIsLoading(false);
        return;
      }

      // RAG Retrieval
      const relevantDocs = await retrieveDocuments(text, store);

      const context = relevantDocs.map(d => d.pageContent).join("\n\n");
      const systemPrompt = `You are a helpful AI assistant answering questions about the provided documents.
      Use the following pieces of context to answer the user's question.
      If you don't know the answer, just say that you don't know, don't try to make up an answer.
      
      Context:
      ${context}`;

      if (!chatModelRef.current) throw new Error("Chat model not initialized");

      const response = await chatModelRef.current.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'ai',
        content: content,
        sources: [...new Set(relevantDocs.map(d => d.metadata.source || 'Unknown'))] as string[]
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg: Message = { id: crypto.randomUUID(), timestamp: new Date(), role: 'system', content: `Sorry, I encountered an error: ${error.message}` };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---

  return (
    <div className="flex h-screen overflow-hidden ai-pdf-chat-bg text-[#E3E3E3] font-sans selection:bg-blue-500/30">

      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <Card className="bg-[#1E1F20] border-[#444746] shadow-2xl rounded-[24px] ring-1 ring-white/10">
                <CardHeader className="border-b border-[#444746] pb-4">
                  <CardTitle className="text-[#E3E3E3] flex items-center gap-2 text-xl font-normal">
                    <Server className="w-5 h-5 text-[#A8C7FA]" /> AI Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Status Indicator */}
                  <div className={cn(
                    "p-4 rounded-xl border flex items-start gap-4 transition-colors",
                    connectionStatus === 'connected' ? "bg-[#0F5223]/30 border-[#6DD58C]/30" : "bg-[#8C1D18]/30 border-[#F2B8B5]/30"
                  )}>
                    {connectionStatus === 'connected' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#6DD58C] mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#F2B8B5] mt-1" />
                    )}
                    <div className="flex-1">
                      <h4 className={cn("font-medium mb-1", connectionStatus === 'connected' ? "text-[#6DD58C]" : "text-[#F2B8B5]")}>
                        {connectionStatus === 'connected' ? "System Operational" : "Connection Failed"}
                      </h4>
                      {connectionStatus === 'connected' && (
                        <p className="text-sm text-[#C4C7C5]">Connected to local Localhost:11434</p>
                      )}
                    </div>
                  </div>

                  {/* Settings Form */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#C4C7C5] ml-1">Ollama URL</label>
                      <Input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} className="bg-[#131314] border-[#444746] text-[#E3E3E3] rounded-xl focus-visible:ring-[#A8C7FA]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#C4C7C5] ml-1">Chat Model</label>
                      <Input value={modelName} onChange={(e) => setModelName(e.target.value)} className="bg-[#131314] border-[#444746] text-[#E3E3E3] rounded-xl focus-visible:ring-[#A8C7FA]" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={() => setSettingsOpen(false)} className="text-[#C4C7C5] hover:bg-[#444746] rounded-full px-6">Cancel</Button>
                    <Button onClick={() => setSettingsOpen(false)} className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/40 rounded-full px-6 shadow-lg font-medium transition-all duration-300">Save</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar - Google Dark Style */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? "320px" : "0px", opacity: sidebarOpen ? 1 : 0 }}
        className="flex-shrink-0 bg-[#131314] flex flex-col relative z-20"
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 pl-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-normal text-[#E3E3E3] tracking-tight">Thundocs</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { checkConnection(); setSettingsOpen(true); }} className="text-[#C4C7C5] hover:bg-[#444746] rounded-full transition-all">
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#2D2E2F]">
            <span className="text-xs font-medium text-[#8E918F] uppercase tracking-wider">Sources</span>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFileUpload} />

          <ScrollArea className="flex-1 px-1">
            <div className="space-y-2">
              {files.map(file => (
                <motion.div
                  layout
                  key={file.id}
                  className={cn(
                    "group relative p-4 rounded-[16px] border transition-all duration-200 cursor-pointer",
                    file.selected
                      ? "bg-[#004A77] border-transparent"
                      : "bg-[#1E1F20] border-transparent hover:bg-[#2D2E2F]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("p-1.5 rounded-md bg-white/10")}>
                          <FileText className="w-4 h-4 text-[#A8C7FA]" />
                        </div>
                        <span className="text-[11px] font-medium text-[#C4C7C5]">{file.pageCount} pgs</span>
                      </div>
                      <h4 className={cn("text-sm font-medium line-clamp-2 leading-snug", file.selected ? "text-[#D3E3FD]" : "text-[#E3E3E3]")}>{file.name}</h4>
                    </div>
                    <Checkbox
                      checked={file.selected}
                      onCheckedChange={(c) => setFiles(files.map(f => f.id === file.id ? { ...f, selected: !!c } : f))}
                      className={cn("w-5 h-5 rounded-full border-[#8E918F]", file.selected ? "data-[state=checked]:bg-[#A8C7FA] data-[state=checked]:border-[#A8C7FA] data-[state=checked]:text-[#040E24]" : "")}
                    />
                  </div>
                  {!file.selected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all hover:bg-[#8C1D18]/30 text-[#C4C7C5] hover:text-[#F2B8B5] rounded-full"
                      onClick={(e) => { e.stopPropagation(); setFiles(files.filter(f => f.id !== file.id)); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}

              <motion.div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className="p-4 rounded-[16px] border border-dashed border-[#444746] flex flex-col items-center justify-center gap-2 text-[#C4C7C5] cursor-pointer hover:bg-[#1E1F20] hover:border-[#A8C7FA] transition-all min-h-[6rem]"
              >
                {isProcessing ? (
                  <UploadingRing
                    label={processingStatus || "Processing PDFs..."}
                  />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-medium text-center">
                      {processingStatus || "Add Source"}
                    </span>
                  </>
                )}
              </motion.div>
            </div>
          </ScrollArea>
        </div>
      </motion.div>

      {/* Main Area - Premium Dark Surface */}
      <div className="flex-1 flex flex-col bg-[#1E1F20] rounded-[28px] shadow-xl my-3 mx-3 overflow-hidden border border-[#2D2E2F] relative">

        {/* Navbar - Clean & Minimal */}
        <div className="h-14 flex items-center justify-between px-5 bg-[#1E1F20] border-b border-[#2D2E2F]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#8E918F] hover:text-[#E3E3E3] hover:bg-[#2D2E2F] rounded-lg h-8 w-8">
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>

            {/* Tab Toggle - Pill Style */}
            <div className="flex p-0.5 bg-[#131314] rounded-lg border border-[#2D2E2F]">
              {['guide', 'chat'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                    activeView === view
                      ? "bg-[#2D2E2F] text-[#E3E3E3] shadow-sm"
                      : "text-[#8E918F] hover:text-[#C4C7C5]"
                  )}
                >
                  {view === 'guide' ? 'Notebook Guide' : 'Chat'}
                </button>
              ))}
            </div>
          </div>

          {/* Studio toggle only shows when sidebar is closed */}
          {!rightSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(true)} className="text-[#8E918F] hover:text-[#E3E3E3] hover:bg-[#2D2E2F] rounded-lg h-8 w-8">
              <PanelRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-[#1E1F20] flex">

          {/* Center Panel (Chat/Guide) */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <AnimatePresence mode="wait">
              {activeView === 'guide' ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <ScrollArea className="h-full">
                    <div className="max-w-4xl mx-auto p-12 space-y-16 pb-32">
                      {/* Hero Header - No Star */}
                      <div className="space-y-6 pt-8">
                        <div>
                          <h1 className="text-4xl font-normal text-[#E3E3E3] mb-3">Notebook Guide</h1>
                          <p className="text-lg text-[#C4C7C5] font-light">
                            Automatically generated audio summaries, briefing documents, and key themes from your sources.
                          </p>
                        </div>
                      </div>

                      {files.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl bg-[#1E1F20] border border-[#2D2E2F]">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#9B72CB] flex items-center justify-center mx-auto mb-5 shadow-lg">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-lg font-medium text-[#E3E3E3] mb-2">No sources yet</h3>
                          <p className="text-[#8E918F] text-sm">Use the sidebar to add a PDF</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {/* Executive Briefing */}
                          <section className="space-y-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#4285F4]" />
                              <h2 className="text-[15px] font-medium text-[#E3E3E3]">Executive Briefing</h2>
                            </div>
                            <div className="p-6 rounded-xl bg-[#1E1F20] border border-[#2D2E2F]">
                              {generatedSummary ? (
                                <div className="text-[#E3E3E3] leading-7 font-light">
                                  {generatedSummary}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  {!guideLoading ? (
                                    <Button onClick={() => generateNotebookGuide(files)} className="bg-gradient-to-r from-[#2D2E2F]/80 to-[#1E1F20]/80 backdrop-blur-md border border-white/20 text-[#E3E3E3] rounded-lg px-5 py-2 hover:bg-[#444746]/50 hover:border-white/40 transition-all duration-300">
                                      Generate Briefing
                                    </Button>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2 text-[#8E918F]">
                                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing documents...
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </section>

                          {/* Key Themes */}
                          <section className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-[#9B72CB]" />
                              <h2 className="text-[15px] font-medium text-[#E3E3E3]">Key Themes</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {keyTopics.length > 0 ? keyTopics.map((t, i) => (
                                <div key={i} className="p-5 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] hover:border-[#444746] transition-colors">
                                  <h3 className="font-medium text-[#E3E3E3] mb-2">{t.title}</h3>
                                  <p className="text-sm text-[#8E918F] leading-relaxed line-clamp-3">{t.description}</p>
                                </div>
                              )) : (
                                <div className="col-span-2 p-6 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] text-center">
                                  <p className="text-sm text-[#8E918F]">Generate briefing to discover key themes</p>
                                </div>
                              )}
                            </div>
                          </section>

                          {/* Suggested Questions */}
                          <section className="space-y-4">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-[#6DD58C]" />
                              <h2 className="text-[15px] font-medium text-[#E3E3E3]">Suggested Questions</h2>
                            </div>
                            <div className="space-y-2">
                              {suggestedQuestions.length > 0 ? suggestedQuestions.map((q, i) => (
                                <div key={i} onClick={() => handleSend(q)} className="p-4 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] hover:border-[#4285F4]/50 hover:bg-[#2D2E2F] transition-all cursor-pointer flex justify-between items-center group">
                                  <span className="text-[#E3E3E3] text-sm">{q}</span>
                                  <ArrowRight className="w-4 h-4 text-[#444746] group-hover:text-[#4285F4] transition-colors" />
                                </div>
                              )) : (
                                <div className="p-5 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] text-center">
                                  <p className="text-sm text-[#8E918F]">Generate briefing to see suggested questions</p>
                                </div>
                              )}
                            </div>
                          </section>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col max-w-3xl mx-auto w-full relative">
                  <ScrollArea className="flex-1 p-8">
                    <div className="space-y-8 pb-12">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-0 animate-in fade-in duration-700 slide-in-from-bottom-4 fill-mode-forwards mt-20">
                          <div className="w-20 h-20 bg-gradient-to-br from-[#A8C7FA] to-[#D0BCFF] rounded-full blur-[40px] opacity-20 absolute" />
                          <div className="relative p-6 rounded-[32px] bg-[#131314] border border-[#444746] shadow-xl">
                            <Sparkles className="w-10 h-10 text-[#A8C7FA]" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-normal text-[#E3E3E3] mb-2">Notebook Chat</h3>
                            <p className="text-[#C4C7C5] max-w-md mx-auto leading-relaxed">
                              Ask questions, generate scripts, or brainstorm ideas based on your sources.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                            {["Summarize this", "Create a quiz", "Explain key themes", "Write a script"].map((q, i) => (
                              <button key={i} onClick={() => handleSend(q)} className="p-3 rounded-2xl bg-[#131314] border border-[#444746] text-sm text-[#E3E3E3] hover:bg-[#2D2E2F] hover:border-[#A8C7FA] transition-all text-left">
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={cn("flex gap-6 max-w-3xl mx-auto py-6", msg.role === 'user' ? "justify-end" : "justify-start")}
                          >
                            {/* AI Avatar - Thundocs AI Identity */}
                            {msg.role !== 'user' && (
                              <div className="relative flex-shrink-0 mt-1">
                                {msg.role === 'system' ? (
                                  <div className="w-8 h-8 rounded-lg bg-[#8C1D18]/20 border border-[#F2B8B5]/30 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-[#F2B8B5]" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4285F4] to-[#1967D2] flex items-center justify-center shadow-md">
                                    <span className="text-[11px] font-bold text-white tracking-tight">PH</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={cn(
                              "space-y-2 max-w-[85%]",
                              msg.role === 'user' ? "items-end" : "items-start"
                            )}>
                              {/* Message Content */}
                              <div className={cn(
                                "text-[16px] leading-7 font-light tracking-wide",
                                msg.role === 'user'
                                  ? "bg-[#2D2E2F] text-[#E3E3E3] py-3 px-6 rounded-[24px] rounded-tr-sm border border-[#444746]"
                                  : "text-[#E3E3E3] pl-0"
                              )}>
                                {msg.role === 'ai' || msg.role === 'system' ? (
                                  <div className="prose prose-invert max-w-none prose-p:text-[#E3E3E3] prose-headings:text-white prose-strong:text-white prose-a:text-[#A8C7FA] prose-li:text-[#E3E3E3]">
                                    {/* Render content cleanly */}
                                    {msg.role === 'system' ? (
                                      <span className="text-[#F2B8B5] italic">{msg.content}</span>
                                    ) : (
                                      <div dangerouslySetInnerHTML={{
                                        __html: msg.content
                                          .replace(/\n/g, '<br/>')
                                          .replace(/\*\*(.*?)\*\*/g, '<b class="font-medium text-white">$1</b>')
                                          .replace(/### (.*?)\n/g, '<h3 class="text-lg font-medium text-white mt-4 mb-2">$1</h3>')
                                          .replace(/- (.*?)\n/g, '<li class="ml-4 list-disc marker:text-[#A8C7FA]">$1</li>')
                                      }} />
                                    )}
                                  </div>
                                ) : (
                                  <span>{msg.content}</span>
                                )}
                              </div>

                              {/* Sources Footnote - Only for AI */}
                              {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {msg.sources.map((src, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full bg-[#131314] border border-[#444746] text-[11px] text-[#C4C7C5] flex items-center gap-1.5 hover:bg-[#1E1F20] transition-colors cursor-default">
                                      <FileText className="w-3 h-3 text-[#A8C7FA]" /> {src}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                          </motion.div>
                        ))
                      )}

                      {isLoading && (
                        <div className="flex gap-6 max-w-3xl mx-auto py-6">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4285F4] to-[#1967D2] flex items-center justify-center animate-pulse shadow-md">
                            <span className="text-[11px] font-bold text-white tracking-tight">PH</span>
                          </div>
                          <div className="text-[#8E918F] text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="p-6 pt-0 bg-transparent relative z-20"> {/* Removed blur bg to avoid weird overlay */}
                    <div className="relative shadow-2xl rounded-full bg-[#1E1F20] border border-[#444746] hover:border-[#686B6E] transition-colors group">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask questions about your sources..."
                        className="w-full bg-transparent border-none rounded-full pl-6 pr-14 py-8 text-lg shadow-none focus-visible:ring-0 text-[#E3E3E3] placeholder:text-[#5E6061]"
                      />
                      <Button
                        onClick={() => handleSend()}
                        size="icon"
                        className={cn("absolute right-3 top-3 h-10 w-10 rounded-full transition-all duration-300 backdrop-blur-md border shadow-lg", input.trim() ? "bg-white/20 border-white/40 text-white hover:bg-white/30 hover:scale-105" : "bg-white/5 border-white/10 text-[#5E6061]")}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="text-center mt-3">
                      <p className="text-[10px] text-[#444746]">AI can make mistakes. Check important info.</p>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Studio */}
          <motion.div
            initial={false}
            animate={{ width: rightSidebarOpen ? "340px" : "0px", opacity: rightSidebarOpen ? 1 : 0 }}
            className="flex-shrink-0 bg-[#131314] border-l border-[#2D2E2F] flex flex-col relative z-20 overflow-hidden"
          >
            {/* Studio Header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-[#2D2E2F]">
              <span className="text-[15px] font-medium text-[#E3E3E3]">Studio</span>
              <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(false)} className="text-[#8E918F] hover:text-[#E3E3E3] hover:bg-[#2D2E2F] rounded-lg h-8 w-8">
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Featured: Audio Overview */}
                <div
                  onClick={() => handleStudioAction('Audio Overview')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#1E1F20] via-[#1E1F20] to-[#2D2E2F] border border-[#2D2E2F] group cursor-pointer hover:border-[#4285F4]/50 transition-all relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4285F4]/5 to-[#D96570]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="mb-4 w-11 h-11 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#9B72CB] flex items-center justify-center shadow-lg">
                      <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-[#E3E3E3] font-medium mb-1 text-[15px]">Audio Overview</h3>
                    <p className="text-xs text-[#8E918F] leading-relaxed">Generate an engaging podcast-style discussion from your sources.</p>
                  </div>
                  <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-[#444746] group-hover:text-[#4285F4] opacity-0 group-hover:opacity-100 transition-all" />
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: HelpCircle, label: "Quiz", color: "from-[#4285F4] to-[#5E97F6]" },
                    { icon: Network, label: "Mind Map", color: "from-[#9B72CB] to-[#B794F6]" },
                    { icon: CreditCard, label: "Flashcards", color: "from-[#E8A09A] to-[#F2B8B5]" },
                    { icon: FileText, label: "Reports", color: "from-[#6DD58C] to-[#81E9A2]" },
                    { icon: BarChart3, label: "Infographic", color: "from-[#F9AB00] to-[#FBBC04]" },
                    { icon: Table2, label: "Data Table", color: "from-[#80868B] to-[#9AA0A6]" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      onClick={() => handleStudioAction(item.label)}
                      className="p-3 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] hover:border-[#444746] cursor-pointer transition-all group"
                    >
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2 shadow-sm", item.color)}>
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[13px] font-medium text-[#E3E3E3] group-hover:text-white transition-colors">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Slide Deck - Full Width */}
                <div
                  onClick={() => handleStudioAction('Slide deck')}
                  className="p-4 rounded-xl bg-[#1E1F20] border border-[#2D2E2F] hover:border-[#444746] cursor-pointer transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D96570] to-[#E8A09A] flex items-center justify-center shadow-sm">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[13px] font-medium text-[#E3E3E3]">Slide Deck</span>
                    <p className="text-[11px] text-[#8E918F]">Create presentation outline</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#444746] group-hover:text-[#E3E3E3] transition-colors" />
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
