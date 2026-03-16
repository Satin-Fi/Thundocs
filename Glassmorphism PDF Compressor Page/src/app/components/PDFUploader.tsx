import { useState, useRef } from 'react';
import { Upload, FileText, Download, Check, Loader2 } from 'lucide-react';

export function PDFUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [compressionRate, setCompressionRate] = useState(0);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setIsComplete(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setOriginalSize(droppedFile.size);
      setIsComplete(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const compressPDF = () => {
    if (!file) return;

    setIsCompressing(true);
    setCompressionRate(0);

    // Simulate compression progress
    const interval = setInterval(() => {
      setCompressionRate((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompressing(false);
          setIsComplete(true);
          // Simulate 40-60% compression
          const reduction = 0.4 + Math.random() * 0.2;
          setCompressedSize(Math.floor(originalSize * (1 - reduction)));
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetUploader = () => {
    setFile(null);
    setIsCompressing(false);
    setIsComplete(false);
    setCompressionRate(0);
    setOriginalSize(0);
    setCompressedSize(0);
  };

  return (
    <div className="w-full max-w-2xl">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-12 cursor-pointer transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl opacity-30 rounded-full" style={{ backgroundColor: '#5fe5fe' }}></div>
              <div className="relative rounded-2xl border border-white/20 p-8" style={{ background: 'linear-gradient(to bottom right, rgba(95, 229, 254, 0.2), rgba(0, 212, 255, 0.2))' }}>
                <Upload className="w-16 h-16" style={{ color: '#5fe5fe' }} />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-semibold text-white">
                Drop your PDF here
              </h3>
              <p className="text-lg" style={{ color: 'rgba(95, 229, 254, 0.8)' }}>
                or click to browse files
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(95, 229, 254, 0.6)' }}>
              <FileText className="w-4 h-4" />
              <span>PDF files only • Max 100MB</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Info Card */}
          <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-xl border border-white/20" style={{ background: 'linear-gradient(to bottom right, rgba(95, 229, 254, 0.2), rgba(0, 212, 255, 0.2))' }}>
                  <FileText className="w-8 h-8" style={{ color: '#5fe5fe' }} />
                </div>
                <div>
                  <h4 className="text-white font-medium text-lg mb-1">{file.name}</h4>
                  <p className="text-sm" style={{ color: 'rgba(95, 229, 254, 0.6)' }}>{formatFileSize(originalSize)}</p>
                </div>
              </div>
              
              {isComplete && (
                <div className="bg-green-400/20 backdrop-blur-sm border border-green-400/30 rounded-full p-2">
                  <Check className="w-5 h-5 text-green-300" />
                </div>
              )}
            </div>

            {/* Compression Progress */}
            {isCompressing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: '#5fe5fe' }}>Compressing...</span>
                  <span className="text-white font-medium">{compressionRate}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 ease-out rounded-full"
                    style={{ 
                      width: `${compressionRate}%`,
                      background: 'linear-gradient(to right, #5fe5fe, #00d4ff)'
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Compression Results */}
            {isComplete && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-sm mb-1" style={{ color: 'rgba(95, 229, 254, 0.6)' }}>Original Size</p>
                  <p className="text-white text-xl font-semibold">{formatFileSize(originalSize)}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-sm mb-1" style={{ color: 'rgba(95, 229, 254, 0.6)' }}>Compressed Size</p>
                  <p className="text-white text-xl font-semibold">{formatFileSize(compressedSize)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!isComplete ? (
              <>
                <button
                  onClick={compressPDF}
                  disabled={isCompressing}
                  className="flex-1 relative overflow-hidden rounded-2xl px-8 py-4 text-white font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ 
                    background: 'linear-gradient(to right, #5fe5fe, #00d4ff)',
                    boxShadow: isCompressing ? 'none' : '0 20px 25px -5px rgba(95, 229, 254, 0.3), 0 8px 10px -6px rgba(95, 229, 254, 0.3)'
                  }}
                >
                  {isCompressing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Compressing...
                    </span>
                  ) : (
                    'Compress PDF'
                  )}
                </button>
                <button
                  onClick={resetUploader}
                  disabled={isCompressing}
                  className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-medium transition-all duration-300 hover:bg-white/15 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex-1 relative overflow-hidden rounded-2xl px-8 py-4 text-white font-medium transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(to right, #10b981, #059669)',
                    boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.3), 0 8px 10px -6px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Download className="w-5 h-5" />
                  Download Compressed PDF
                </button>
                <button
                  onClick={resetUploader}
                  className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-medium transition-all duration-300 hover:bg-white/15 hover:scale-[1.02]"
                >
                  New File
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}