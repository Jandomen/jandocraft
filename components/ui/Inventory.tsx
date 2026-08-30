import type { Inventory } from "@/types/game";
import { RESOURCE_KINDS, getResource } from "@/data/resources";

export default function Inventory({ inventory }: { inventory: Inventory }) {
  return (
    <div className="pointer-events-none flex flex-wrap items-center gap-2">
      {RESOURCE_KINDS.map((kind) => {
        const def = getResource(kind);
        const count = inventory[kind] ?? 0;
        return (
          <div
            key={kind}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-sm"
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-xs font-medium text-white/90">{def.label}</span>
            <span className="text-xs font-bold tabular-nums text-white">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
