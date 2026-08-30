/**
 * Procedural renderer for the Columbus supply shuttle and its resource crates.
 *
 * The shuttle is a compact cartoon spacecraft with a main hull, cockpit window,
 * engine pods and a blinking nav light. Resource crates are colour-coded boxes
 * that bob gently while waiting to be collected.
 */

import type { ShuttleState, ResourceCrate } from "@/lib/game/shuttle";
import { RESOURCES } from "@/data/resources";

/** Draws the full shuttle + crates into the given world-space context. */
export function drawShuttle(
  ctx: CanvasRenderingContext2D,
  shuttle: ShuttleState,
  time: number
): void {
  // Only draw crates if shuttle has been visible at some point.
  // Draw crates first (below the shuttle).
  for (const crate of shuttle.crates) {
    if (!crate.collected) {
      drawCrate(ctx, crate, time);
    }
  }

  // Draw the shuttle itself (only when not "gone").
  if (shuttle.phase === "gone") return;

  const { x, y } = shuttle;

  ctx.save();
  ctx.translate(x, y);

  // === Engine pods (two small cylinders behind the hull). ===
  ctx.fillStyle = "#475569";
  ctx.fillRect(-28, -6, 10, 12);
  ctx.fillRect(-28, 8, 10, 12);
  // Engine glow.
  const glowAlpha = 0.5 + 0.3 * Math.sin(time * 8);
  ctx.fillStyle = `rgba(251,146,60,${glowAlpha.toFixed(2)})`;
  ctx.fillRect(-32, -4, 6, 8);
  ctx.fillRect(-32, 10, 6, 8);

  // === Main hull (elongated capsule). ===
  const hullGrad = ctx.createLinearGradient(-20, -14, -20, 14);
  hullGrad.addColorStop(0, "#e2e8f0");
  hullGrad.addColorStop(0.5, "#cbd5e1");
  hullGrad.addColorStop(1, "#94a3b8");
  ctx.fillStyle = hullGrad;
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.stroke();

  // === Hull detail lines. ===
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-18, -4);
  ctx.lineTo(12, -4);
  ctx.moveTo(-18, 8);
  ctx.lineTo(12, 8);
  ctx.stroke();

  // === Cargo bay doors (bottom). ===
  ctx.fillStyle = "#64748b";
  ctx.fillRect(-10, 10, 20, 4);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-10, 10, 20, 4);

  // === Cockpit window (right side). ===
  const winGrad = ctx.createRadialGradient(14, 0, 1, 14, 0, 7);
  winGrad.addColorStop(0, "#bae6fd");
  winGrad.addColorStop(0.6, "#38bdf8");
  winGrad.addColorStop(1, "#0284c7");
  ctx.fillStyle = winGrad;
  ctx.beginPath();
  ctx.ellipse(14, 0, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glare.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(12, -2, 2, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // === "COLUMBUS" label on hull. ===
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 4px monospace";
  ctx.textAlign = "center";
  ctx.fillText("COLUMBUS", 0, 3);

  // === Nav light (blinking red on top). ===
  const blink = Math.sin(time * 3) > 0.3;
  if (blink) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -13, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Glow.
    ctx.fillStyle = "rgba(239,68,68,0.3)";
    ctx.beginPath();
    ctx.arc(0, -13, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // === Solar wings (thin panels on top). ===
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(-8, -18, 16, 3);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(-8, -18, 16, 1);
  // Struts.
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, -15);
  ctx.lineTo(-4, -12);
  ctx.moveTo(4, -15);
  ctx.lineTo(4, -12);
  ctx.stroke();

  ctx.restore();
}

/** Draws a single resource crate bobbing gently. */
function drawCrate(
  ctx: CanvasRenderingContext2D,
  crate: ResourceCrate,
  time: number
): void {
  const bob = Math.sin(time * 2 + crate.x * 0.1) * 3;
  const cx = crate.x;
  const cy = crate.y + bob;
  const size = 18;
  const half = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Shadow on ground (subtle).
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, half + 4, half * 0.8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crate body.
  const res = RESOURCES[crate.kind as keyof typeof RESOURCES];
  const baseColor = res?.color ?? "#9ca3af";

  // 3D crate face.
  ctx.fillStyle = baseColor;
  ctx.fillRect(-half, -half, size, size);

  // Top face (lighter).
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-half, -half, size, 3);

  // Right face (darker).
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(half - 3, -half, 3, size);

  // Bottom face (darker).
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(-half, half - 3, size, 3);

  // Outline.
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.strokeRect(-half, -half, size, size);

  // Cross tape on crate.
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.lineTo(half, 0);
  ctx.moveTo(0, -half);
  ctx.lineTo(0, half);
  ctx.stroke();

  // Resource icon letter.
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icon =
    crate.kind === "metal" ? "M" :
    crate.kind === "silicon" ? "Si" :
    crate.kind === "glass" ? "V" :
    crate.kind === "water" ? "Ag" :
    crate.kind === "energy" ? "E" :
    crate.kind === "robotic-arm" ? "🤖" : "?";
  ctx.fillText(icon, 0, 0);

  // Amount badge.
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(half + 2, -half + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 6px sans-serif";
  ctx.fillText(String(crate.amount), half + 2, -half + 2);

  // Collection pulse (grows as it ages).
  if (crate.age > 0.5) {
    const pulse = (crate.age - 0.5) % 1.5;
    if (pulse < 0.8) {
      const r = half + 4 + pulse * 12;
      ctx.strokeStyle = `rgba(249,115,22,${(0.6 - pulse * 0.7).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
