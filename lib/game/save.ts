import type { Inventory, PlayerState, SaveData, SurvivalState, Zone } from "@/types/game";
import {
  createInitialStation,
  playerSpawn,
  isBlockDataValid,
  hasEnclosure,
  STATION_MODULE_ID,
} from "@/data/station";
import { serializableInventory, startingInventory } from "./inventory";
import { freshSurvival } from "./survival";

export const SAVE_VERSION = 3;

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    player: {
      pos: playerSpawn(),
      vel: { x: 0, y: 0 },
      facing: "right",
      onGround: false,
    },
    zone: "interior",
    blocks: createInitialStation(),
    inventory: serializableInventory(startingInventory()),
    survival: freshSurvival([STATION_MODULE_ID]),
    savedAt: new Date().toISOString(),
  };
}

/** Hydrates a save object from an untrusted source, filling in defaults. */
export function hydrateSave(raw: unknown): SaveData {
  const fallback = newSave();
  if (typeof raw !== "object" || raw === null) return fallback;

  const o = raw as Record<string, unknown>;
  const inventory = sanitizeInventory(o.inventory);
  const zone = sanitizeZone(o.zone);

  // Old saves (v1 platform, or non-enclosed layouts) are incompatible with the
  // modular interior; rebuild the structure so the player can walk inside.
  const rawBlocks = isBlockDataValid(o.blocks) ? o.blocks : fallback.blocks;
  const blocks = hasEnclosure(rawBlocks) ? rawBlocks : fallback.blocks;

  const survival = sanitizeSurvival(o.survival);

  return {
    version: SAVE_VERSION,
    player: sanitizePlayer(o.player) ?? fallback.player,
    zone,
    blocks,
    inventory,
    survival,
    savedAt: typeof o.savedAt === "string" ? o.savedAt : fallback.savedAt,
  };
}

/** Fills in survival defaults, tolerating partial / old-save data. */
function sanitizeSurvival(raw: unknown): SurvivalState {
  const base = freshSurvival([STATION_MODULE_ID]);
  if (typeof raw !== "object" || raw === null) return base;

  const o = raw as Record<string, unknown>;
  const station = (o.station as Record<string, unknown>) ?? {};
  const suit = (o.suit as Record<string, unknown>) ?? {};
  const integrityRaw =
    typeof o.integrity === "object" && o.integrity !== null
      ? (o.integrity as Record<string, unknown>)
      : {};

  // Build integrity for all known modules; reuse stored integrity when valid.
  const moduleIds = new Set<string>([STATION_MODULE_ID]);
  const integrity: Record<string, number> = {};
  for (const id of moduleIds) {
    const v = integrityRaw[id];
    integrity[id] = typeof v === "number" ? clamp(v, 0, 100) : 100;
  }

  return {
    health: typeof o.health === "number" ? clamp(o.health, 0, 100) : base.health,
    alive: o.alive !== false,
    suit: {
      equipped: suit.equipped === true,
      oxygen: typeof suit.oxygen === "number" ? clamp(suit.oxygen, 0, 100) : base.suit.oxygen,
    },
    station: {
      oxygen: typeof station.oxygen === "number" ? clamp(station.oxygen, 0, 100) : base.station.oxygen,
      power: typeof station.power === "number" ? clamp(station.power, 0, 100) : base.station.power,
      pressure: typeof station.pressure === "number" ? clamp(station.pressure, 0, 100) : base.station.pressure,
    },
    integrity,
    accumulator: typeof o.accumulator === "number" ? o.accumulator : 0,
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function sanitizePlayer(raw: unknown): PlayerState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const pos = o.pos as { x?: unknown; y?: unknown } | undefined;
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return null;
  const vel = (o.vel as { x?: unknown; y?: unknown }) ?? { x: 0, y: 0 };
  return {
    pos: { x: pos.x, y: pos.y },
    vel: {
      x: typeof vel.x === "number" ? vel.x : 0,
      y: typeof vel.y === "number" ? vel.y : 0,
    },
    facing: o.facing === "left" ? "left" : "right",
    onGround: o.onGround === true,
  };
}

function sanitizeZone(raw: unknown): Zone {
  return raw === "exterior" ? "exterior" : "interior";
}

function sanitizeInventory(raw: unknown): Inventory {
  const base: Inventory = {};
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number" && v >= 0) base[k] = Math.floor(v);
    }
  }
  return serializableInventory(Object.keys(base).length ? base : startingInventory());
}
