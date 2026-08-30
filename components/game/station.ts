import type { BlockKind, ModuleDef, PlacedBlock } from "@/types/game";
import { BLOCKS } from "@/data/blocks";
import { CELL } from "@/data/station";
import { getBlockSprite } from "./sprites";

export function drawBlock(ctx: CanvasRenderingContext2D, block: PlacedBlock): void {
  // Blit the pre-generated pixel-art tile (fast, consistent art direction).
  ctx.drawImage(getBlockSprite(block.kind), block.x, block.y);
}

export function drawStation(ctx: CanvasRenderingContext2D, blocks: PlacedBlock[]): void {
  for (const block of blocks) {
    drawBlock(ctx, block);
  }
}

/** Draws the exterior door threshold (airlock replaces old yellow squares). */
export function drawDoorsExterior(
  ctx: CanvasRenderingContext2D,
  modules: ModuleDef[]
): void {
  // The airlock hatches are drawn by drawAirlock() in GameCanvas.
  // Here we just draw a subtle floor marker at the threshold.
  for (const m of modules) {
    for (const d of m.doors) {
      ctx.save();
      const x = d.x;
      const y = d.y;
      // Subtle floor stripe at the threshold.
      ctx.fillStyle = "rgba(249,115,22,0.25)";
      ctx.fillRect(x - 2, y - CELL / 2, 4, CELL);
      // Small arrow indicator.
      ctx.strokeStyle = "rgba(249,115,22,0.4)";
      ctx.lineWidth = 1.5;
      const dir = d.side === "right" ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + dir * 8, y);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: BlockKind,
  valid: boolean
): void {
  const def = BLOCKS[kind];
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = valid ? def.color : "#ef4444";
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = valid ? "#22c55e" : "#ef4444";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.restore();
}
