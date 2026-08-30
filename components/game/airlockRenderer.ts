/**
 * Renders the airlock hatches with sliding animation and pressure gauge.
 *
 * Each hatch is a metallic sliding panel that moves horizontally. The
 * decompression sequence shows air particles being sucked out and a pressure
 * gauge dropping.
 */

import type { AirlockState, HatchState } from "@/lib/game/airlock";
import { CELL } from "@/data/station";

/** Colors for the hatch metal. */
const HULL = "#94a3b8";
const HULL_HI = "#cbd5e1";
const HULL_DARK = "#475569";
const FRAME = "#334155";
const SEAL = "#f97316";

/** Draws the full airlock at its world position. */
export function drawAirlock(
  ctx: CanvasRenderingContext2D,
  airlock: AirlockState,
  time: number
): void {
  // Draw outer hatch first (behind).
  drawHatch(ctx, airlock.outer, time, "outer");

  // Draw inner hatch.
  drawHatch(ctx, airlock.inner, time, "inner");

  // Draw pressure gauge between the hatches.
  drawPressureGauge(ctx, airlock, time);

  // Draw decompression particles when active.
  if (airlock.phase === "decompressing") {
    drawDecompParticles(ctx, airlock, time);
  }

  // Draw repressurization particles.
  if (airlock.phase === "repressurizing") {
    drawRepressParticles(ctx, airlock, time);
  }
}

/** Draws a single sliding hatch panel. */
function drawHatch(
  ctx: CanvasRenderingContext2D,
  hatch: HatchState,
  time: number,
  side: "inner" | "outer"
): void {
  const { x, y, openAmount } = hatch;
  const slideMax = CELL - 4; // max slide distance
  const slideX = openAmount * slideMax * (side === "inner" ? -1 : 1);

  ctx.save();
  ctx.translate(x + slideX, y);

  // Frame (fixed).
  ctx.fillStyle = FRAME;
  ctx.fillRect(-2, -2, CELL + 4, CELL + 4);

  // Hatch panel (slides).
  ctx.fillStyle = HULL;
  ctx.fillRect(2, 2, CELL - 4, CELL - 4);

  // Top highlight.
  ctx.fillStyle = HULL_HI;
  ctx.fillRect(2, 2, CELL - 4, 3);

  // Bottom shade.
  ctx.fillStyle = HULL_DARK;
  ctx.fillRect(2, CELL - 5, CELL - 4, 3);

  // Horizontal seam lines.
  ctx.fillStyle = FRAME;
  ctx.fillRect(4, CELL / 2 - 1, CELL - 8, 2);

  // Seal strip (orange accent on the edge).
  ctx.fillStyle = SEAL;
  if (side === "inner") {
    ctx.fillRect(CELL - 6, 4, 2, CELL - 8);
  } else {
    ctx.fillRect(4, 4, 2, CELL - 8);
  }

  // Rivets.
  ctx.fillStyle = HULL_DARK;
  ctx.fillRect(5, 5, 3, 3);
  ctx.fillRect(CELL - 8, 5, 3, 3);
  ctx.fillRect(5, CELL - 8, 3, 3);
  ctx.fillRect(CELL - 8, CELL - 8, 3, 3);

  // Rivet highlights.
  ctx.fillStyle = HULL_HI;
  ctx.fillRect(5, 5, 1, 1);
  ctx.fillRect(CELL - 8, 5, 1, 1);

  // Warning stripes when closing/opening.
  if (hatch.animating) {
    const stripePhase = (time * 6) % 2;
    ctx.fillStyle = `rgba(249,115,22,${0.3 + 0.2 * Math.sin(time * 8)})`;
    for (let i = 0; i < 3; i++) {
      const sy = 6 + i * 10 + stripePhase * 5;
      ctx.fillRect(2, sy, CELL - 4, 2);
    }
  }

  ctx.restore();
}

/** Draws a pressure gauge between the two hatches. */
function drawPressureGauge(
  ctx: CanvasRenderingContext2D,
  airlock: AirlockState,
  time: number
): void {
  const cx = (airlock.inner.x + CELL + airlock.outer.x) / 2;
  const cy = airlock.inner.y + CELL + 8;
  const gaugeW = 40;
  const gaugeH = 6;

  ctx.save();
  ctx.translate(cx - gaugeW / 2, cy);

  // Gauge background.
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, gaugeW, gaugeH);

  // Pressure fill.
  const fillW = gaugeW * airlock.pressure;
  const pressureColor =
    airlock.pressure > 0.6 ? "#22c55e" :
    airlock.pressure > 0.3 ? "#eab308" : "#ef4444";
  ctx.fillStyle = pressureColor;
  ctx.fillRect(0, 0, fillW, gaugeH);

  // Gauge border.
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, gaugeW, gaugeH);

  // Label.
  ctx.fillStyle = "#94a3b8";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(airlock.pressure * 100)}%`, gaugeW / 2, gaugeH + 8);

  ctx.restore();
}

/** Draws particles being sucked out during decompression. */
function drawDecompParticles(
  ctx: CanvasRenderingContext2D,
  airlock: AirlockState,
  time: number
): void {
  const cx = (airlock.inner.x + airlock.outer.x + CELL) / 2;
  const cy = airlock.inner.y + CELL / 2;

  ctx.save();
  for (let i = 0; i < 8; i++) {
    const t = (time * 3 + i * 0.4) % 2;
    const px = cx + Math.cos(i * 1.2) * 10 * t;
    const py = cy + Math.sin(i * 0.8) * 8 - t * 15;
    const alpha = Math.max(0, 0.6 - t * 0.3);
    ctx.fillStyle = `rgba(147,197,253,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws particles filling the airlock during repressurization. */
function drawRepressParticles(
  ctx: CanvasRenderingContext2D,
  airlock: AirlockState,
  time: number
): void {
  const cx = (airlock.inner.x + airlock.outer.x + CELL) / 2;
  const cy = airlock.inner.y + CELL / 2;

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const t = (time * 2 + i * 0.5) % 2;
    const px = cx + Math.cos(i * 2.1) * 12 * (1 - t);
    const py = cy + Math.sin(i * 1.7) * 10 - (2 - t) * 10;
    const alpha = Math.min(0.5, t * 0.3);
    ctx.fillStyle = `rgba(147,197,253,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, 1 + t * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
