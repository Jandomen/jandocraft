"use client";

import { useEffect, useState } from "react";
import { audioManager, type AudioPreferences } from "@/lib/audio/audioManager";

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ onResume, onQuit }: PauseMenuProps) {
  const [prefs, setPrefs] = useState<AudioPreferences>(audioManager.getPrefs());

  useEffect(() => {
    const unsub = audioManager.subscribe(() => {
      setPrefs(audioManager.getPrefs());
    });
    return unsub;
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex w-80 flex-col gap-5 rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-bold text-white">Pausa</h2>
          <div className="h-px w-12 bg-white/20" />
        </div>

        {/* Audio section */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wider text-white/50 uppercase">
            Audio
          </h3>

          {/* Music volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                Música de fondo
              </label>
              <span className="text-xs text-white/40">{prefs.musicVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={prefs.musicVolume}
              onChange={(e) => audioManager.setMusicVolume(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          {/* SFX volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </svg>
                Efectos de sonido
              </label>
              <span className="text-xs text-white/40">{prefs.sfxVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={prefs.sfxVolume}
              onChange={(e) => audioManager.setSfxVolume(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Mute toggles */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => audioManager.toggleMusicMuted()}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                prefs.musicMuted
                  ? "border-red-500/40 bg-red-500/15 text-red-300"
                  : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {prefs.musicMuted ? "🔇 Música muted" : "🔊 Música on"}
            </button>
            <button
              type="button"
              onClick={() => audioManager.toggleSfxMuted()}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                prefs.sfxMuted
                  ? "border-red-500/40 bg-red-500/15 text-red-300"
                  : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {prefs.sfxMuted ? "🔇 SFX muted" : "🔊 SFX on"}
            </button>
          </div>

          {/* Music in pause */}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={prefs.musicInPause}
              onChange={(e) => audioManager.setMusicInPause(e.target.checked)}
              className="accent-sky-400"
            />
            Mantener música al pausar
          </label>
        </div>

        {/* Separator */}
        <div className="h-px bg-white/10" />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            Salir al menú
          </button>
        </div>

        {/* ESC hint */}
        <p className="text-center text-[10px] text-white/30">
          Presiona <kbd className="rounded border border-white/20 bg-white/5 px-1 py-0.5 text-white/50">ESC</kbd> para continuar
        </p>
      </div>
    </div>
  );
}
