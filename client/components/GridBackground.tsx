import React from "react";
import { useTheme } from "@/hooks/use-theme";

export default function GridBackground() {
  const { isNight } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: isNight 
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`
            : `linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />

      {/* Subtle Gradient Glow (Top Center) */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 blur-[100px]"
        style={{
          background: isNight
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)'
        }}
      />
      
      {/* Secondary Glow (Bottom Right) */}
      <div 
        className="absolute bottom-0 right-0 w-[800px] h-[600px] opacity-20 blur-[120px]"
        style={{
          background: isNight
            ? 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)'
        }}
      />
    </div>
  );
}
