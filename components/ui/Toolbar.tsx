import type { BlockKind, Inventory } from "@/types/game";
import { BUILDABLE, BLOCKS } from "@/data/blocks";
import { craftInfo } from "@/lib/game/crafting";
import type { Tool } from "@/components/game/GameCanvas";

interface ToolbarProps {
  selected: BlockKind;
  tool: Tool;
  inventory: Inventory;
  onSelect: (kind: BlockKind) => void;
  onTool: (tool: Tool) => void;
}

export default function Toolbar({
  selected,
  tool,
  inventory,
  onSelect,
  onTool,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTool("build")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            tool === "build"
              ? "bg-sky-500 text-white"
              : "bg-black/40 text-white/70 hover:bg-black/60"
          }`}
        >
          Construir
        </button>
        <button
          type="button"
          onClick={() => onTool("remove")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            tool === "remove"
              ? "bg-rose-500 text-white"
              : "bg-black/40 text-white/70 hover:bg-black/60"
          }`}
        >
          Quitar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {BUILDABLE.map((kind) => {
          const def = BLOCKS[kind];
          const info = craftInfo(kind, inventory);
          const active = tool === "build" && selected === kind;
          const affordable = info.canAfford;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
              title={`${def.label}${!affordable ? " (recursos insuficientes)" : ""}`}
              className={`group relative flex w-12 flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                active
                  ? "border-sky-400 bg-sky-500/20"
                  : "border-white/10 bg-black/40 hover:border-white/25"
              } ${!affordable ? "opacity-60" : ""}`}
            >
              <span
                className="h-6 w-6 rounded-sm border border-white/20 shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${def.color} 0%, ${def.frameColor} 100%)`,
                }}
              />
              <span className="text-[10px] font-medium text-white/80">
                {def.label}
              </span>
              {!affordable && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow" title="Recursos insuficientes">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
