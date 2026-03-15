import React from "react";

interface UploadingRingProps {
  label: string;
  value?: number;
}

export function UploadingRing({ label, value = 65 }: UploadingRingProps) {
  const numeric = Number.isNaN(value as number) ? 0 : (value as number);
  const clamped = numeric < 0 ? 0 : numeric > 100 ? 100 : Math.round(numeric);
  const width = Math.min(Math.max(clamped, 5), 100);

  return (
    <div
      className="w-full flex justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="glass-panel rounded-3xl p-8 md:p-10 border backdrop-blur-xl w-[360px] min-h-[520px] text-center space-y-6 flex flex-col justify-between">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
            {label}
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-5xl md:text-6xl font-extrabold text-white">
            {clamped}%
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
              style={{ width: `${width}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-300">
          Please wait while we prepare your file…
        </p>
      </div>
    </div>
  );
}
