"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlockKind, GameSnapshot, SaveData } from "@/types/game";
import { BUILDABLE } from "@/data/blocks";
import { loadSave } from "@/lib/supabase";
import GameCanvas, { type Tool } from "@/components/game/GameCanvas";
import HUD from "@/components/ui/HUD";
import MainMenu from "@/components/ui/MainMenu";
import { audioManager } from "@/lib/audio/audioManager";

type GameScreen = "menu" | "loading" | "playing";

export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [save, setSave] = useState<SaveData | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [selected, setSelected] = useState<BlockKind>(BUILDABLE[0]);
  const [tool, setTool] = useState<Tool>("build");
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = useCallback((_mode: "single" | "multi") => {
    // Initialize audio on first user interaction.
    audioManager.init();
    audioManager.startMusic();
    setScreen("loading");
  }, []);

  useEffect(() => {
    if (screen !== "loading") return;
    let active = true;
    void loadSave().then((res) => {
      if (!active) return;
      setSave(res.save);
      setScreen("playing");
    });
    return () => {
      active = false;
    };
  }, [screen, gameKey]);

  const handleSnapshot = useCallback((snap: GameSnapshot) => {
    setSnapshot(snap);
  }, []);

  const handleSave = useCallback(() => {
    window.dispatchEvent(new Event("jandocraft:save"));
  }, []);

  const handleQuit = useCallback(() => {
    audioManager.pauseMusic();
    setScreen("menu");
    setSnapshot(null);
    setSave(null);
    setGameKey((k) => k + 1);
  }, []);

  // Main menu
  if (screen === "menu") {
    return <MainMenu onStart={handleStartGame} />;
  }

  // Loading
  if (screen === "loading" || !save) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
          <p className="text-sm text-white/70">Cargando estación…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-950">
      <GameCanvas
        key={gameKey}
        initialSave={save}
        selectedKind={selected}
        tool={tool}
        onSnapshot={handleSnapshot}
      />
      <HUD
        snapshot={snapshot}
        selected={selected}
        tool={tool}
        onSelect={setSelected}
        onTool={setTool}
        onSave={handleSave}
        onQuit={handleQuit}
      />
    </div>
  );
}
