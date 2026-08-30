"use client";

import type { BlockKind, GameSnapshot } from "@/types/game";
import Inventory from "./Inventory";
import Toolbar from "./Toolbar";
import PauseMenu from "./PauseMenu";
import type { Tool } from "@/components/game/GameCanvas";

interface HUDProps {
  snapshot: GameSnapshot | null;
  selected: BlockKind;
  tool: Tool;
  onSelect: (kind: BlockKind) => void;
  onTool: (tool: Tool) => void;
  onSave: () => void;
  onQuit: () => void;
}

const SAVE_LABEL: Record<GameSnapshot["saveStatus"], string> = {
  idle: "Guardar",
  saving: "Guardando…",
  saved: "Guardado",
  local: "Guardado",
};

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 text-right text-[10px] font-medium text-white/70">{label}</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-7 text-[10px] text-white/50">{Math.round(pct)}</span>
    </div>
  );
}

export default function HUD({
  snapshot,
  selected,
  tool,
  onSelect,
  onTool,
  onSave,
  onQuit,
}: HUDProps) {

  const handleResume = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
  };
  const saveStatus =
    snapshot?.saveStatus === "saved" || snapshot?.saveStatus === "local"
      ? "local"
      : (snapshot?.saveStatus ?? "idle");

  const zoneLabel = snapshot?.zone === "exterior" ? "Espacio exterior" : "Interior de la estación";

  return (
    <>
      {/* Top bar: inventory + save */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-none">
          <Inventory inventory={snapshot?.inventory ?? {}} />
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                snapshot?.zone === "exterior" ? "bg-sky-300" : "bg-amber-300"
              }`}
            />
            <span className="text-xs font-medium text-white/80">{zoneLabel}</span>
          </div>

          {/* Survival / station status panel */}
          {snapshot && (
            <div className="mt-2 flex flex-col gap-0.5 rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 backdrop-blur-sm">
              <Meter label="Salud" value={snapshot.survival.health} color="#ef4444" />
              <Meter
                label="O₂ traje"
                value={snapshot.survival.suit.oxygen}
                color={snapshot.survival.suit.equipped ? "#38bdf8" : "#64748b"}
              />
              <div className="my-0.5 h-px bg-white/10" />
              <Meter label="Oxígeno" value={snapshot.survival.station.oxygen} color="#38bdf8" />
              <Meter label="Energía" value={snapshot.survival.station.power} color="#facc15" />
              <Meter label="Presión" value={snapshot.survival.station.pressure} color="#a78bfa" />
              <Meter
                label="Casco"
                value={snapshot.survival.integrity["station-core"] ?? 100}
                color="#f97316"
              />
              <div className="mt-1 text-[10px] text-white/70">
                Traje: {snapshot.survival.suit.equipped ? "puesto" : "quitado"}
                <span className="ml-1 opacity-50">(F para cambiar)</span>
              </div>
              {snapshot.tethered && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                  <span className="text-orange-400">🔗</span>
                  <span className="font-medium text-orange-300">Lazo conectado</span>
                  <span className="opacity-50">(E para soltar)</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-600"
          >
            {SAVE_LABEL[saveStatus]}
          </button>
          {snapshot && (
            <span className="rounded bg-black/40 px-2 py-1 text-[10px] text-white/60 backdrop-blur-sm">
              Bloques: {snapshot.blockCount}
            </span>
          )}
          {snapshot?.shuttleTimer != null && snapshot.shuttleTimer > 0 && (
            <span className="flex items-center gap-1.5 rounded bg-black/40 px-2 py-1 text-[10px] text-sky-300/80 backdrop-blur-sm">
              <span>🚀</span>
              <span>Columbus en {snapshot.shuttleTimer}s</span>
            </span>
          )}
        </div>
      </div>

      {/* Door interaction prompt */}
      {snapshot?.doorPrompt && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-3 rounded-xl bg-black/70 px-4 py-2.5 shadow-2xl backdrop-blur-sm">
            <kbd className="rounded-md border border-white/25 bg-white/10 px-2 py-1 text-xs font-bold text-amber-300">
              E
            </kbd>
            <span className="text-sm font-semibold text-white">
              {snapshot.zone === "exterior"
                ? "Entrar a la estación"
                : snapshot.survival.suit.equipped
                  ? "Salir al espacio"
                  : "Sin traje"}
            </span>
          </div>
        </div>
      )}

      {/* Transient gameplay notice toast */}
      {snapshot?.notice && (
        <div className="pointer-events-none absolute bottom-1/3 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-lg bg-black/75 px-4 py-2 text-sm font-semibold text-amber-200 shadow-2xl backdrop-blur-sm">
            {snapshot.notice}
          </div>
        </div>
      )}

      {/* Death overlay text */}
      {snapshot?.dead && (
        <div className="pointer-events-none absolute top-1/3 left-1/2 z-20 -translate-x-1/2 text-center">
          <p className="text-3xl font-bold text-red-400/90 drop-shadow">Has muerto</p>
          <p className="mt-1 text-sm text-white/70">Reapareciendo en la estación…</p>
        </div>
      )}

      {/* Pause menu overlay */}
      {snapshot?.paused && (
        <PauseMenu onResume={handleResume} onQuit={onQuit} />
      )}

      {/* Bottom bar: toolbar */}
      <div className="pointer-events-auto absolute right-4 bottom-4 z-10">
        <Toolbar
          selected={selected}
          tool={tool}
          inventory={snapshot?.inventory ?? {}}
          onSelect={onSelect}
          onTool={onTool}
        />
      </div>

      {/* Help hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-white/70 backdrop-blur-sm">
        <p>
          <b className="text-white/90">WASD / Flechas</b> mover ·{" "}
          <b className="text-white/90">Espacio</b> saltar
        </p>
        <p>
          <b className="text-white/90">E</b> puertas · <b className="text-white/90">F</b> traje ·{" "}
          <b className="text-white/90">R</b> reparar casco
        </p>
        <p>
          <b className="text-white/90">Clic izq</b> construir · <b className="text-white/90">Clic der</b> quitar
        </p>
      </div>
    </>
  );
}
