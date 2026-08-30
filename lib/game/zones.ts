import type { Door, ModuleDef, PlacedBlock, PlayerState, Rect, Zone } from "@/types/game";
import { BLOCKS } from "@/data/blocks";
import { CELL } from "@/data/station";
import { PLAYER_H } from "./physics";

/**
 * Solid rectangles (AABB) used for player collision in a given zone.
 *
 * In the interior, the module's enclosing structure (floor, walls, ceiling)
 * plus any solid player-built blocks confine the player inside the room.
 * In the exterior, every solid block of the station acts as hull.
 */
export function solidsForZone(
  zone: Zone,
  blocks: PlacedBlock[],
  modules: ModuleDef[]
): Rect[] {
  if (zone === "exterior") {
    const rects: Rect[] = [];
    for (const b of blocks) {
      if (BLOCKS[b.kind].solid) rects.push({ x: b.x, y: b.y, w: CELL, h: CELL });
    }
    return rects;
  }

  // Interior: module enclosure + solid blocks placed inside.
  const rects: Rect[] = [];
  for (const m of modules) {
    appendModuleSolids(rects, m);
  }
  for (const b of blocks) {
    if (!BLOCKS[b.kind].solid) continue;
    if (isInsideAnyModule(modules, b.x + CELL / 2, b.y + CELL / 2)) {
      rects.push({ x: b.x, y: b.y, w: CELL, h: CELL });
    }
  }
  return rects;
}

function appendModuleSolids(out: Rect[], m: ModuleDef): void {
  const { bounds } = m;
  const wall = m.wall;

  // Interior walkable top of the module (below the ceiling).
  const ceilingBottom = bounds.y;
  const wallTop = ceilingBottom - wall;
  const wallBottom = m.floorY;

  // Floor: from floorY down `wall` px.
  out.push({ x: bounds.x, y: m.floorY, w: bounds.w, h: wall });
  // Ceiling: `wall` px above the interior top.
  out.push({ x: bounds.x, y: wallTop, w: bounds.w, h: wall });
  // Left wall.
  out.push({ x: bounds.x - wall, y: wallTop, w: wall, h: wallBottom - wallTop });
  // Right wall (fully solid; the doorway is a teleport threshold, not a gap).
  const rightX = bounds.x + bounds.w;
  out.push({ x: rightX, y: wallTop, w: wall, h: wallBottom - wallTop });
}

export function isInsideAnyModule(modules: ModuleDef[], x: number, y: number): boolean {
  for (const m of modules) {
    const { bounds } = m;
    if (x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= m.floorY) {
      return true;
    }
  }
  return false;
}

export interface DoorState {
  door: Door;
  /** The zone the player must press the key in to use this door. */
  fromZone: Zone;
}

/**
 * Returns the door the player can currently use, or null. In the interior the
 * player uses the door from the inside; in the exterior from the outside.
 */
export function findUsableDoor(
  player: PlayerState,
  zone: Zone,
  modules: ModuleDef[]
): Door | null {
  const px = player.pos.x;
  const py = player.pos.y + PLAYER_H / 2;
  for (const m of modules) {
    for (const d of m.doors) {
      // Interior: near the interiorSpot; exterior: near the exteriorSpot.
      const spot = zone === "interior" ? d.interiorSpot : d.exteriorSpot;
      const dx = px - spot.x;
      const dy = py - spot.y;
      if (Math.hypot(dx, dy) <= d.range) return d;
      // Also trigger directly when overlapping the doorway threshold.
      const nearDoor = Math.abs(px - d.x) <= d.range && Math.abs(py - d.y) <= d.range;
      if (nearDoor) return d;
    }
  }
  return null;
}

/** Returns the spot to place the player when stepping to `toZone` via `door`. */
export function doorSpot(door: Door, toZone: Zone) {
  return toZone === "interior" ? door.interiorSpot : door.exteriorSpot;
}

/**
 * The destination zone when using a door from the given zone.
 */
export function oppositeZone(zone: Zone): Zone {
  return zone === "interior" ? "exterior" : "interior";
}
