import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BrandLogo({ className = "", size = "md", showText = true }: BrandLogoProps) {
  const iconSizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Heraldic Gold Crest / Balance scales badge */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-0.5 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30 flex-shrink-0`}
      >
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-amber-400/20" />
          <svg
            className="w-5 h-5 text-amber-400 z-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Elegant legal scales */}
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-['Cinzel',serif] tracking-wider text-amber-200 font-bold text-base sm:text-lg">
              J&A
            </span>
            <span className="text-white font-semibold text-sm sm:text-base tracking-tight">
              LEGAL
            </span>
            <span className="hidden sm:inline-block text-[10px] tracking-widest uppercase font-semibold text-amber-500/90 border border-amber-500/30 rounded px-1 py-0.2 ml-1">
              Firma
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium tracking-normal hidden xs:inline-block">
            Jiménez & Ariza Asociados
          </span>
        </div>
      )}
    </div>
  );
}
