import "./global.css";
import React from "react";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { GlobalFilters } from "@/components/GlobalFilters";
import AdminGate from "./components/AdminGate";

const MergePage = React.lazy(() => import("./pages/Merge"));
const SplitPage = React.lazy(() => import("./pages/Split"));
const CompressPage = React.lazy(() => import("./pages/Compress"));
const PdfToImagePage = React.lazy(() => import("./pages/PdfToImage"));
const ProtectPage = React.lazy(() => import("./pages/Protect"));
const PdfToWordPage = React.lazy(() => import("./pages/PdfToWord"));
const ImageToPdfPage = React.lazy(() => import("./pages/ImageToPdf_clean"));
const WordToPdfPage = React.lazy(() => import("./pages/WordToPdf"));
const ExcelToPdfPage = React.lazy(() => import("./pages/ExcelToPdf"));
const PowerPointToPdfPage = React.lazy(
  () => import("./pages/PowerPointToPdf")
);
const UnlockPdfPage = React.lazy(() => import("./pages/UnlockPdf"));
const AIPdfChat = React.lazy(() => import("./pages/AIPdfChat"));
const AIOcr = React.lazy(() => import("./pages/AIOcr"));
const About = React.lazy(() => import("./pages/About"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const SignIn = React.lazy(() => import("./pages/SignIn"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BlogPost = React.lazy(() => import("./pages/BlogPost"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Security = React.lazy(() => import("./pages/Security"));
const Features = React.lazy(() => import("./pages/Features"));
const HelpCenter = React.lazy(() => import("./pages/HelpCenter"));
const OcrMonitor = React.lazy(() => import("./pages/OcrMonitor"));
const ServerStatusPage = React.lazy(() => import("./pages/ServerStatus"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));


// TODO: Replace with your actual Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";

const queryClient = new QueryClient();

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Loading Thundocs...</span>
                </div>
              </div>
            }
          >
            <GlobalFilters />
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
                <Route path="/word-to-pdf" element={<WordToPdfPage />} />
                <Route path="/excel-to-pdf" element={<ExcelToPdfPage />} />
                <Route path="/powerpoint-to-pdf" element={<PowerPointToPdfPage />} />
                <Route path="/unlock-pdf" element={<UnlockPdfPage />} />
                <Route path="/ai-pdf-chat" element={<AIPdfChat />} />
                <Route path="/ai-ocr" element={<AIOcr />} />

                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                <Route path="/signin" element={<SignIn />} />
                <Route path="/profile" element={<Profile />} />

                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/security" element={<Security />} />
                <Route path="/features" element={<Features />} />
                <Route path="/help" element={<HelpCenter />} />

                {/* Admin-only routes */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminGate><AdminDashboard /></AdminGate>} />
                <Route path="/admin/ocr" element={<AdminGate><OcrMonitor /></AdminGate>} />
                <Route path="/server-status" element={<AdminGate><ServerStatusPage /></AdminGate>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </React.Suspense>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
