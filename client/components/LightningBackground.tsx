import React from "react";
import { cn } from "@/lib/utils";

type LightningBackgroundProps = {
  children: React.ReactNode;
  className?: string;
};

export function LightningBackground({ children, className }: LightningBackgroundProps) {
  return (
    <div className={cn("hero-group relative min-h-screen bg-[#020408]", className)}>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
          <svg viewBox="0 0 512 512" className="thunder-bolt-svg hero-bolt w-full h-full">
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

