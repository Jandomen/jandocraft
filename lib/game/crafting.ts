import type { BlockKind, Inventory } from "@/types/game";
import { blockCost } from "@/data/blocks";
import { trySpend } from "./inventory";

export interface CraftInfo {
  kind: BlockKind;
  cost: Record<string, number>;
  canAfford: boolean;
}

/** Returns the cost and affordability for a given block kind. */
export function craftInfo(kind: BlockKind, inv: Inventory): CraftInfo {
  const cost = (blockCost(kind) ?? {}) as Record<string, number>;
  let canAfford = true;
  for (const key of Object.keys(cost)) {
    if ((inv[key] ?? 0) < cost[key]) {
      canAfford = false;
      break;
    }
  }
  return { kind, cost, canAfford };
}

/**
 * Spends resources to "craft" a disposable block. Returns the deducted
 * inventory if affordable; otherwise returns the inventory unchanged.
 */
export function craftBlock(
  inv: Inventory,
  kind: BlockKind
): { inv: Inventory; ok: boolean } {
  const res = trySpend(inv, blockCost(kind) as Record<string, number>);
  return { inv: res.inv, ok: res.ok };
}
