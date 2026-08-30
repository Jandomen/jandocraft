import type { ModuleDef, PlacedBlock } from "@/types/game";
import { CELL } from "@/data/station";
import { getBlockSprite } from "./sprites";

const BACK_WALL = "#1e293b";
const FLOOR = "#334155";
const FLOOR_LINE = "#1e293b";
const WALL_INNER = "#475569";
const CEILING_LINE = "#475569";
const DOOR_FRAME = "#f59e0b";
const DOOR_GLOW = "rgba(251,191,36,0.25)";

/**
 * Draws the interior of a module as seen from inside: an enclosed cabin with a
 * back wall, floor with grid, side walls and a ceiling, plus interior decor
 * blocks and a glowing door on the exit wall.
 */
export function drawInterior(
  ctx: CanvasRenderingContext2D,
  modules: ModuleDef[],
  blocks: PlacedBlock[]
): void {
  for (const m of modules) {
    drawModuleInterior(ctx, m, blocks);
  }
}

function drawModuleInterior(ctx: CanvasRenderingContext2D, m: ModuleDef, blocks: PlacedBlock[]): void {
  const { bounds, floorY } = m;
  const x0 = bounds.x;
  const x1 = bounds.x + bounds.w;
  const y0 = bounds.y; // interior top (below ceiling)
  const wall = m.wall;

  // Back wall (the whole interior rectangle).
  ctx.fillStyle = BACK_WALL;
  ctx.fillRect(x0 - wall, y0 - wall, bounds.w + wall * 2, floorY - (y0 - wall));
  // Subtle wall panel texture for depth.
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let gx = x0; gx < x1; gx += CELL) {
    ctx.fillRect(gx, y0 - wall, 1, floorY - (y0 - wall));
  }
  for (let gy = y0; gy < floorY; gy += CELL) {
    ctx.fillRect(x0 - wall, gy, bounds.w + wall * 2, 1);
  }
  // Soft top-light gradient across the back wall.
  const wallGrad = ctx.createLinearGradient(0, y0 - wall, 0, floorY);
  wallGrad.addColorStop(0, "rgba(226,232,240,0.10)");
  wallGrad.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(x0 - wall, y0 - wall, bounds.w + wall * 2, floorY - (y0 - wall));
  // Floor.
  ctx.fillStyle = FLOOR;
  ctx.fillRect(x0 - wall, floorY, bounds.w + wall * 2, 2);
  ctx.fillRect(x0 - wall, floorY, wall, 3);
  ctx.fillRect(x1, floorY, wall, 3);

  // Floor grid.
  ctx.strokeStyle = FLOOR_LINE;
  ctx.lineWidth = 1;
  for (let gx = x0; gx <= x1; gx += CELL) {
    ctx.beginPath();
    ctx.moveTo(gx, floorY);
    ctx.lineTo(gx, floorY + 2);
    ctx.stroke();
  }

  // Ceiling line.
  ctx.strokeStyle = CEILING_LINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 - wall, y0 - wall);
  ctx.lineTo(x1 + wall, y0 - wall);
  ctx.stroke();

  // Side wall inner shading.
  ctx.fillStyle = WALL_INNER;
  ctx.fillRect(x0 - wall, y0 - wall, wall, floorY - (y0 - wall));
  ctx.fillRect(x1, y0 - wall, wall, floorY - (y0 - wall));

  // Draw interior blocks (decor).
  for (const b of blocks) {
    if (b.x < x0 - wall || b.y < y0 - wall || b.x > x1) continue;
    drawInteriorBlock(ctx, b);
  }

  // Door on the right wall, glowing threshold.
  for (const d of m.doors) {
    drawInteriorDoor(ctx, d.x, d.y);
  }
}

function drawInteriorBlock(ctx: CanvasRenderingContext2D, b: PlacedBlock): void {
  // Interior decor uses the same detailed pixel-art tiles as the exterior so
  // machines read identically from inside and outside.
  ctx.drawImage(getBlockSprite(b.kind), b.x, b.y);
}

function drawInteriorDoor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  // Glowing threshold on the floor to the door.
  ctx.fillStyle = DOOR_GLOW;
  ctx.fillRect(x - CELL * 0.5, y - CELL / 2, CELL, CELL);
  // Door frame.
  ctx.strokeStyle = DOOR_FRAME;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - CELL / 2, y - CELL / 2, CELL, CELL);
  ctx.strokeStyle = DOOR_FRAME;
  ctx.beginPath();
  ctx.moveTo(x, y - CELL / 2);
  ctx.lineTo(x, y + CELL / 2);
  ctx.stroke();
  ctx.restore();
}
