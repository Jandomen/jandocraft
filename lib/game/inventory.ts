import type { Inventory } from "@/types/game";
import { RESOURCE_KINDS } from "@/data/resources";

export function emptyInventory(): Inventory {
  return { metal: 0, glass: 0, silicon: 0, energy: 0, water: 0, "robotic-arm": 0 };
}

/** Initial resources granted to the player at the start. */
export function startingInventory(): Inventory {
  return { metal: 10, glass: 6, silicon: 8, energy: 5, water: 4, "robotic-arm": 1 };
}

/** Returns a new inventory with `amount` added to a resource (never negative). */
export function addResource(
  inv: Inventory,
  kind: string,
  amount: number
): Inventory {
  return { ...inv, [kind]: clamp((inv[kind] ?? 0) + amount, 0, Infinity) };
}

/**
 * Attempts to deduct `cost` from the inventory. If the inventory has every
 * required resource, returns a deducted inventory + true; otherwise returns the
 * original inventory + false.
 */
export function trySpend(inv: Inventory, cost: Record<string, number>): { inv: Inventory; ok: boolean } {
  for (const key of Object.keys(cost)) {
    if ((inv[key] ?? 0) < cost[key]) return { inv, ok: false };
  }
  const next: Inventory = { ...inv };
  for (const key of Object.keys(cost)) {
    next[key] = (next[key] ?? 0) - cost[key];
  }
  return { inv: next, ok: true };
}

export function totalResources(inv: Inventory): number {
  return RESOURCE_KINDS.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

export function serializableInventory(inv: Inventory): Inventory {
  const next: Inventory = {};
  for (const k of RESOURCE_KINDS) {
    if (inv[k]) next[k] = inv[k];
  }
  return next;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
