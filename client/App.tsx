import "./global.css";
import React from "react";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MergePage from "./pages/Merge";
import SplitPage from "./pages/Split";
import CompressPage from "./pages/Compress";
import PdfToImagePage from "./pages/PdfToImage";
import ProtectPage from "./pages/Protect";
import PdfToWordPage from "./pages/PdfToWord";
import ImageToPdfPage from "./pages/ImageToPdf_clean";
import AIPdfChat from "./pages/AIPdfChat";
import AIOcr from "./pages/AIOcr";
import AIPdfAnalyzer from "./pages/AIPdfAnalyzer";
import AIFormFiller from "./pages/AIFormFiller";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/compress" element={<CompressPage />} />
          <Route path="/pdf-to-image" element={<PdfToImagePage />} />
          <Route path="/protect" element={<ProtectPage />} />
          <Route path="/pdf-to-word" element={<PdfToWordPage />} />
          <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
          <Route path="/ai-pdf-chat" element={<AIPdfChat />} />
          <Route path="/ai-ocr" element={<AIOcr />} />
          <Route path="/ai-pdf-analyzer" element={<AIPdfAnalyzer />} />
          <Route path="/ai-form-filler" element={<AIFormFiller />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
