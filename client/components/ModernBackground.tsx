import React from "react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export default function ModernBackground({ className, gradientColor }: { className?: string; gradientColor?: string }) {
  const { isNight } = useTheme();

  if (!isNight) {
    return (
      <div className={cn("absolute inset-0 pointer-events-none overflow-hidden -z-10 bg-gray-50", className)}>
        <div
          className="absolute inset-0 z-0"
          style={{
            background: gradientColor || "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0) 70%)"
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#09090b]", className)}>
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#09090b"
        }}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div 
        className="absolute inset-0 z-0"
        style={{
          background: gradientColor || "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(9, 9, 11, 0) 70%)"
        }}
      />
    </div>
  );
}
