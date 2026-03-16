import { PDFUploader } from './components/PDFUploader';
import { FeatureCard } from './components/FeatureCard';
import { Zap, Shield, Cloud, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-cyan-900 via-teal-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: '#5fe5fe' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: '#5fe5fe', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 animate-pulse" style={{ backgroundColor: '#5fe5fe', animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none"></div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-8">
          <nav className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(to bottom right, #5fe5fe, #00d4ff)' }}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">PDF Compress</h1>
              </div>
              
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-cyan-100/80 hover:text-white transition-colors duration-200">Features</a>
                <a href="#how-it-works" className="text-cyan-100/80 hover:text-white transition-colors duration-200">How it works</a>
                <a href="#pricing" className="text-cyan-100/80 hover:text-white transition-colors duration-200">Pricing</a>
              </div>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-block mb-4">
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium" style={{ color: '#5fe5fe' }}>
                  🚀 Fast & Secure PDF Compression
                </div>
              </div>
              
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Compress PDFs
                <br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #5fe5fe, #4dd4ed, #5fe5fe)' }}>
                  Without Quality Loss
                </span>
              </h2>
              
              <p className="text-xl text-cyan-100/70 max-w-2xl mx-auto mb-4">
                Reduce PDF file size while maintaining perfect quality. Fast, secure, and completely free.
              </p>
            </div>

            {/* Upload Section */}
            <div className="flex justify-center mb-20">
              <PDFUploader />
            </div>

            {/* Features Section */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Why Choose Us?
                </h3>
                <p className="text-cyan-100/70 text-lg">
                  Experience the best PDF compression with enterprise-grade features
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FeatureCard
                  icon={Zap}
                  title="Lightning Fast"
                  description="Compress your PDFs in seconds with our optimized compression engine."
                />
                <FeatureCard
                  icon={Shield}
                  title="100% Secure"
                  description="Your files are processed locally and automatically deleted after compression."
                />
                <FeatureCard
                  icon={Cloud}
                  title="No Limits"
                  description="Compress unlimited PDFs without any file size restrictions or watermarks."
                />
                <FeatureCard
                  icon={Sparkles}
                  title="Quality First"
                  description="Advanced algorithms ensure maximum compression with minimal quality loss."
                />
              </div>
            </div>

            {/* Stats Section */}
            <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-12">
              <div className="absolute inset-0 opacity-10" style={{ background: 'linear-gradient(to right, #5fe5fe, #00d4ff)' }}></div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-5xl font-bold text-white mb-2">10M+</div>
                  <div className="text-cyan-200/70">PDFs Compressed</div>
                </div>
                <div>
                  <div className="text-5xl font-bold text-white mb-2">95%</div>
                  <div className="text-cyan-200/70">Average Compression</div>
                </div>
                <div>
                  <div className="text-5xl font-bold text-white mb-2">100%</div>
                  <div className="text-cyan-200/70">Free Forever</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-cyan-200/60 text-sm">
                © 2026 PDF Compress. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="#privacy" className="text-cyan-200/60 hover:text-white text-sm transition-colors duration-200">Privacy Policy</a>
                <a href="#terms" className="text-cyan-200/60 hover:text-white text-sm transition-colors duration-200">Terms of Service</a>
                <a href="#contact" className="text-cyan-200/60 hover:text-white text-sm transition-colors duration-200">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}