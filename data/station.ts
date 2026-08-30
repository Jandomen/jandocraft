import type { Door, ModuleDef, PlacedBlock, Vec2 } from "@/types/game";
import { BLOCKS } from "./blocks";

/** World-space size of a single building cell (pixels). */
export const CELL = 32;

/** Left edge (world x) of the station module's enclosing wall. */
export const STATION_X0 = 160;

/** Module width in cells. */
export const STATION_WIDTH_CELLS = 20;

/** Right edge (world x) of the module wall (exclusive). */
export const STATION_X1 = STATION_X0 + STATION_WIDTH_CELLS * CELL;

/** World y of the walkable floor surface inside the module. */
export const STATION_TOP_Y = 420;

/** Interior wall/floor thickness in cells. */
export const HULL_CELLS = 2;

/** Interior room height in cells above the floor surface. */
export const INTERIOR_HEIGHT_CELLS = 6;

const HULL_PX = HULL_CELLS * CELL;

/** World y of the ceiling surface inside the module. */
export const CEILING_Y = STATION_TOP_Y - INTERIOR_HEIGHT_CELLS * CELL;

/** The station id used by the initial module. */
export const STATION_MODULE_ID = "station-core";

let seq = 0;
function nextId(prefix = "b"): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

/** Interior walkable rectangle of the station module (world coords). */
function moduleBounds(): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: STATION_X0,
    y0: CEILING_Y + HULL_PX, // top of the walkable interior area
    x1: STATION_X1,
    y1: STATION_TOP_Y, // floor surface
  };
}

/** Spawn point for the player when a fresh save starts (inside the module). */
export function playerSpawn(): Vec2 {
  return { x: STATION_X0 + 6 * CELL, y: STATION_TOP_Y - 40 };
}

/**
 * Builds the enclosing structure of the station module: floor mass, left/right
 * walls and a ceiling. The door is left open on the right wall (represented by
 * a separate doorway structure in ModuleDef), so interior decor is added too.
 */
export function createInitialStation(): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const x0 = STATION_X0;
  const x1 = STATION_X1;
  const ceilY = CEILING_Y;

  // Floor mass: 20 cells wide, HULL_CELLS deep below the interior floor.
  for (let cx = 0; cx < STATION_WIDTH_CELLS; cx++) {
    for (let cy = 0; cy < HULL_CELLS; cy++) {
      blocks.push({
        id: nextId(),
        kind: "floor",
        x: x0 + cx * CELL,
        y: STATION_TOP_Y + cy * CELL,
      });
    }
  }

  // Left wall column: from ceiling to floor.
  for (let ly = ceilY; ly < STATION_TOP_Y; ly += CELL) {
    blocks.push({ id: nextId(), kind: "wall", x: x0, y: ly });
  }

  // Right wall column (fully solid; the doorway is a teleport threshold drawn
  // as a marked panel, so the only way through it is the E interaction).
  for (let ly = ceilY; ly < STATION_TOP_Y; ly += CELL) {
    blocks.push({ id: nextId(), kind: "wall", x: x1 - CELL, y: ly });
  }

  // Ceiling row: from left wall inner edge to right wall inner edge.
  for (let cx = 0; cx < STATION_WIDTH_CELLS - 2; cx++) {
    blocks.push({ id: nextId(), kind: "wall", x: x0 + CELL + cx * CELL, y: ceilY });
  }

  // Small exterior "airlock deck" just outside the right-wall door, so the
  // player steps out onto a stable foothold before floating into space.
  blocks.push({ id: nextId(), kind: "floor", x: x1, y: STATION_TOP_Y });
  blocks.push({ id: nextId(), kind: "floor", x: x1 + CELL, y: STATION_TOP_Y });

  // Exterior solar panels along the ceiling give the station its power supply.
  for (let cx = 1; cx < STATION_WIDTH_CELLS - 2; cx += 4) {
    blocks.push({
      id: nextId(),
      kind: "solar-panel",
      x: x0 + cx * CELL,
      y: ceilY - CELL,
    });
  }

  // Interior decor: lights along the ceiling, a storage unit and plants.
  for (let cx = 2; cx < STATION_WIDTH_CELLS - 3; cx += 3) {
    blocks.push({
      id: nextId(),
      kind: "light",
      x: x0 + cx * CELL,
      y: ceilY + CELL,
    });
  }
  blocks.push({
    id: nextId(),
    kind: "storage",
    x: x0 + 3 * CELL,
    y: STATION_TOP_Y - CELL,
  });
  blocks.push({
    id: nextId(),
    kind: "plants",
    x: x0 + 8 * CELL,
    y: STATION_TOP_Y - CELL,
  });
  // Life-support unit: scrubs CO2 and keeps oxygen & pressure up (needs power).
  blocks.push({
    id: nextId(),
    kind: "life-support",
    x: x0 + 12 * CELL,
    y: STATION_TOP_Y - CELL,
  });
  // Battery stores surplus energy for when panels are in shadow.
  blocks.push({
    id: nextId(),
    kind: "battery",
    x: x0 + 15 * CELL,
    y: STATION_TOP_Y - CELL,
  });
  blocks.push({
    id: nextId(),
    kind: "storage",
    x: x0 + 17 * CELL,
    y: STATION_TOP_Y - CELL,
  });

  return blocks;
}

/** The station module with its functional door on the right wall. */
export function createStationModules(): ModuleDef[] {
  const bounds = moduleBounds();
  const doorX = STATION_X1; // right wall plane
  const doorY = STATION_TOP_Y - CELL / 2; // floor-level doorway

  const door: Door = {
    id: "station-door-right",
    moduleId: STATION_MODULE_ID,
    side: "right",
    x: doorX,
    y: doorY,
    interiorSpot: { x: doorX - CELL * 2, y: STATION_TOP_Y - 40 },
    exteriorSpot: { x: doorX + CELL * 1.5, y: STATION_TOP_Y - 24 },
    range: CELL * 1.75,
  };

  return [
    {
      id: STATION_MODULE_ID,
      name: "station-core",
      label: "Core de la estación",
      bounds: {
        x: bounds.x0,
        y: bounds.y0,
        w: bounds.x1 - bounds.x0,
        h: bounds.y1 - bounds.y0,
      },
      floorY: STATION_TOP_Y,
      wall: HULL_PX,
      doors: [door],
    },
  ];
}

export function getFirstDoor(modules: ModuleDef[]): Door | null {
  for (const m of modules) {
    if (m.doors.length) return m.doors[0];
  }
  return null;
}

/** True if `blocks` contains the enclosing structure of the current module. */
export function hasEnclosure(blocks: PlacedBlock[]): boolean {
  const x0 = STATION_X0;
  const x1 = STATION_X1 - CELL;
  const ceilY = CEILING_Y;
  const hasLeft = blocks.some((b) => b.x === x0 && b.y === ceilY && BLOCKS[b.kind].solid);
  const hasRight = blocks.some((b) => b.x === x1 && b.y === ceilY && BLOCKS[b.kind].solid);
  return hasLeft && hasRight;
}

export function isBlockDataValid(blocks: unknown): blocks is PlacedBlock[] {
  return Array.isArray(blocks) && blocks.every(isPlacedBlock);
}

function isPlacedBlock(b: unknown): b is PlacedBlock {
  if (typeof b !== "object" || b === null) return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.x === "number" &&
    typeof o.y === "number" &&
    typeof o.kind === "string" &&
    Object.prototype.hasOwnProperty.call(BLOCKS, o.kind)
  );
}
