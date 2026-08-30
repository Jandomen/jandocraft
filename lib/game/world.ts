import type { BlockKind, PlacedBlock, PlayerState, Vec2, Zone } from "@/types/game";
import { CELL, STATION_X0, STATION_X1, STATION_TOP_Y } from "@/data/station";
import { BLOCKS } from "@/data/blocks";
import { PLAYER_W, PLAYER_H } from "./physics";

export interface GridPos {
  x: number;
  y: number;
}

/** Axis-aligned region of the playable world (world coordinates). */
export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Padding (px) added around all content when computing the camera's world
 * bounds. Keeps a small breathing margin around the station so the camera does
 * not feel cramped, and provides headroom as the station grows.
 */
export const WORLD_MARGIN = 220;

/**
 * Computes the initial bounds of the playable world from the station's
 * enclosing structure and the placed blocks. The base station footprint is
 * always included (even if the save has no blocks yet), the player's spawn is
 * accounted for, and a margin is added so the camera has room to move.
 */
export function initialWorldBounds(blocks: PlacedBlock[]): WorldBounds {
  let minX = STATION_X0;
  let maxX = STATION_X1;
  let minY = STATION_TOP_Y;
  let maxY = STATION_TOP_Y;

  // Expand around every placed block.
  for (const b of blocks) {
    if (b.x < minX) minX = b.x;
    if (b.x + CELL > maxX) maxX = b.x + CELL;
    if (b.y < minY) minY = b.y;
    if (b.y + CELL > maxY) maxY = b.y + CELL;
  }

  // The base station spans from its ceiling (incl. hull) down to its floor.
  minY = Math.min(minY, STATION_TOP_Y);

  return {
    minX: minX - WORLD_MARGIN,
    maxX: maxX + WORLD_MARGIN,
    minY: minY - WORLD_MARGIN,
    maxY: maxY + WORLD_MARGIN,
  };
}

/** Converts a world point to the nearest grid cell origin. */
export function snapToCell(point: Vec2): GridPos {
  return {
    x: Math.round(point.x / CELL) * CELL,
    y: Math.round(point.y / CELL) * CELL,
  };
}

/** The target cell where a build action at `point` should place a block. */
export function targetCell(point: Vec2): GridPos {
  return snapToCell(point);
}

export function cellContains(blocks: PlacedBlock[], x: number, y: number): boolean {
  return blocks.some((b) => b.x === x && b.y === y);
}

function cellOverlapsPlayer(x: number, y: number, player: PlayerState): boolean {
  const px = player.pos.x - PLAYER_W / 2;
  const top = player.pos.y;
  return (
    x + CELL > px &&
    x < px + PLAYER_W &&
    y + CELL > top &&
    y < top + PLAYER_H
  );
}

let uid = 0;
function nextId(): string {
  uid += 1;
  return `d-${Date.now()}-${uid}`;
}

export interface PlaceResult {
  blocks: PlacedBlock[];
  placedId: string | null;
  reason:
    | "placed"
    | "occupied"
    | "overlaps-player"
    | "non-solid"
    | "tether-zone"
    | "tether-surface";
}

/**
 * True when the cell at (x, y) is supported by at least one solid neighbour.
 * Used to require tether points (lazo supports) to be mounted ON the station
 * hull rather than floating in open space.
 */
export function hasSolidNeighbour(blocks: PlacedBlock[], x: number, y: number): boolean {
  const neighbours: Array<[number, number]> = [
    [x - CELL, y],
    [x + CELL, y],
    [x, y - CELL],
    [x, y + CELL],
  ];
  for (const [nx, ny] of neighbours) {
    const hit = blocks.find((b) => b.x === nx && b.y === ny);
    if (hit && BLOCKS[hit.kind].solid) return true;
  }
  return false;
}

/** Adds a block at a snapped cell if valid. */
export function placeBlock(
  blocks: PlacedBlock[],
  point: Vec2,
  kind: BlockKind,
  player: PlayerState,
  zone: Zone
): PlaceResult {
  const cell = targetCell(point);

  // Decorative and solid blocks may both be placed, as long as they don't
  // overlap the player or an existing block.
  if (cellOverlapsPlayer(cell.x, cell.y, player)) {
    return { blocks, placedId: null, reason: "overlaps-player" };
  }
  if (cellContains(blocks, cell.x, cell.y)) {
    return { blocks, placedId: null, reason: "occupied" };
  }

  // Tether points can only be mounted in the exterior, attached to a solid
  // piece of the station (the hull surface).
  if (kind === "tether-point") {
    if (zone !== "exterior") {
      return { blocks, placedId: null, reason: "tether-zone" };
    }
    if (!hasSolidNeighbour(blocks, cell.x, cell.y)) {
      return { blocks, placedId: null, reason: "tether-surface" };
    }
  }

  const block: PlacedBlock = {
    id: nextId(),
    kind,
    x: cell.x,
    y: cell.y,
  };
  return { blocks: [...blocks, block], placedId: block.id, reason: "placed" };
}

export interface RemoveResult {
  blocks: PlacedBlock[];
  removed: boolean;
}

/** Removes a block at the cell under `point`, returning resources from it. */
export function removeBlock(blocks: PlacedBlock[], point: Vec2): RemoveResult & { removedKind: BlockKind | null } {
  const cell = targetCell(point);
  const index = blocks.findIndex((b) => b.x === cell.x && b.y === cell.y);
  if (index === -1) return { blocks, removed: false, removedKind: null };
  const b = blocks[index];
  return {
    blocks: blocks.filter((_, i) => i !== index),
    removed: true,
    removedKind: b.kind,
  };
}
