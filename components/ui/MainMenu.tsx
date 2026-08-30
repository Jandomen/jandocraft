"use client";

import { useState } from "react";

interface MainMenuProps {
  onStart: (mode: "single" | "multi") => void;
}

/** Deterministic pseudo-random for star positions (same output server & client). */
function starRand(i: number, slot = 0): number {
  let h = (i * 1597334677 + slot * 3812015801) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export default function MainMenu({ onStart }: MainMenuProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated starfield background (deterministic for SSR) */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${1 + starRand(i, 0) * 2}px`,
                height: `${1 + starRand(i, 1) * 2}px`,
                left: `${starRand(i, 2) * 100}%`,
                top: `${starRand(i, 3) * 100}%`,
                opacity: 0.3 + starRand(i, 4) * 0.7,
                animation: `twinkle ${2 + starRand(i, 5) * 4}s ease-in-out infinite`,
                animationDelay: `${starRand(i, 6) * 3}s`,
              }}
            />
          ))}
      </div>

      {/* Glow orb behind title */}
      <div className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-6xl font-bold tracking-tight text-white drop-shadow-[0_0_40px_rgba(56,189,248,0.3)]">
            Jando<span className="text-sky-400">craft</span>
          </h1>
          <p className="text-sm tracking-widest text-white/40 uppercase">
            Estación Espacial 2D
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col items-center gap-3">
          {/* Single Player */}
          <button
            type="button"
            onClick={() => onStart("single")}
            onMouseEnter={() => setHoveredBtn("single")}
            onMouseLeave={() => setHoveredBtn(null)}
            className={`group relative w-64 overflow-hidden rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              hoveredBtn === "single"
                ? "border-sky-400/50 bg-sky-500/20 text-white shadow-lg shadow-sky-500/20"
                : "border-white/15 bg-white/5 text-white/80 hover:border-white/25"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
              </svg>
              Jugar Solo
            </span>
          </button>

          {/* Multiplayer */}
          <button
            type="button"
            onClick={() => onStart("multi")}
            onMouseEnter={() => setHoveredBtn("multi")}
            onMouseLeave={() => setHoveredBtn(null)}
            className={`group relative w-64 overflow-hidden rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              hoveredBtn === "multi"
                ? "border-purple-400/50 bg-purple-500/20 text-white shadow-lg shadow-purple-500/20"
                : "border-white/15 bg-white/5 text-white/80 hover:border-white/25"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="7" r="3" />
                <circle cx="17" cy="7" r="3" />
                <path d="M3 20c0-3.5 3-6 6-6 1 0 2 .3 3 .8" />
                <path d="M14 20c0-3.5 3-6 6-6" />
              </svg>
              Multijugador
            </span>
            <span className="absolute top-1 right-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-[9px] text-purple-300">
              Próximamente
            </span>
          </button>
        </div>

        {/* Footer hints */}
        <div className="flex flex-col items-center gap-1 text-[11px] text-white/30">
          <p>Usa <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/50">ESC</kbd> para pausar durante el juego</p>
          <p>El multijugador está en desarrollo</p>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
