import type { BlockKind } from "@/types/game";
import { CELL } from "@/data/station";

/**
 * High-fidelity procedural sprite factory for station building blocks.
 *
 * Each block kind is drawn onto a cached offscreen tile with:
 * - Metal grain noise texture
 * - Multi-layer gradients for realistic depth
 * - Scratches, rivets, wear marks
 * - Consistent top-left lighting
 * - Ambient occlusion at edges
 *
 * Sprites are generated once and blitted each frame for performance.
 */

// ---- Shared station palette -------------------------------------------------
const HULL_HI = "#e8ecf1";
const HULL = "#b8c4d0";
const HULL_SHADE = "#8494a7";
const HULL_DARK = "#4a5c6e";
const OUTLINE = "#1a2535";
const METAL = "#6b7d91";
const STEEL = "#98aab8";
const ACCENT = "#f97316";
const WARM = "#fbbf24";
const CRIT = "#f43f5e";
const GOOD = "#22c55e";

const S = CELL; // 32

const spriteCache = new Map<BlockKind, HTMLCanvasElement>();

/** Returns (generating + caching) the sprite tile for a block kind. */
export function getBlockSprite(kind: BlockKind): HTMLCanvasElement {
  let c = spriteCache.get(kind);
  if (!c) {
    c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    drawBlockSprite(ctx, kind);
    ctx.globalAlpha = 1;
    spriteCache.set(kind, c);
  }
  return c;
}

const BLOCK_EMOJIS: Record<string, string> = {
  floor: "",
  wall: "",
  window: "",
  "solar-panel": "☀️",
  storage: "📦",
  light: "💡",
  plants: "🌿",
  "life-support": "🫁",
  battery: "🔋",
  "tether-point": "🔗",
  "robotic-arm": "🤖",
};

function drawBlockSprite(ctx: CanvasRenderingContext2D, kind: BlockKind): void {
  dropShadow(ctx);

  switch (kind) {
    case "floor": drawFloor(ctx); break;
    case "wall": drawWall(ctx); break;
    case "window": drawWindow(ctx); break;
    case "solar-panel": drawSolarPanel(ctx); break;
    case "storage": drawStorage(ctx); break;
    case "light": drawLight(ctx); break;
    case "plants": drawPlants(ctx); break;
    case "life-support": drawLifeSupport(ctx); break;
    case "battery": drawBattery(ctx); break;
    case "tether-point": drawTetherPoint(ctx); break;
    case "robotic-arm": drawRoboticArm(ctx); break;
    default:
      panel(ctx, 2, 2, S - 4, S - 4, HULL, HULL_HI, HULL_SHADE, OUTLINE);
      break;
  }

  // Overlay emoji indicator (subtle, bottom-right corner)
  const emoji = BLOCK_EMOJIS[kind];
  if (emoji) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = "8px sans-serif";
    ctx.fillText(emoji, S - 11, S - 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Texture & depth helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random for noise (0..1). */
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

/** Apply a subtle metal-grain noise overlay across a rectangle. */
function metalGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity = 0.08
): void {
  for (let py = y; py < y + h; py += 2) {
    for (let px = x; px < x + w; px += 2) {
      const v = noise(px, py, 42);
      const alpha = (v - 0.5) * intensity;
      if (alpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      } else {
        ctx.fillStyle = `rgba(0,0,0,${-alpha})`;
      }
      ctx.fillRect(px, py, 2, 2);
    }
  }
}

/** Draw 1-2 fine scratch lines across a rectangle. */
function scratches(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 0
): void {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 0.5;
  // Scratch 1
  const sx1 = x + noise(x, y, seed) * w;
  const sy1 = y;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx1 + (noise(x + 1, y, seed) - 0.5) * 6, sy1 + h);
  ctx.stroke();
  // Scratch 2
  const sx2 = x + noise(x + 3, y + 3, seed) * w;
  ctx.beginPath();
  ctx.moveTo(sx2, sy1);
  ctx.lineTo(sx2 + (noise(x + 5, y + 2, seed) - 0.5) * 4, sy1 + h * 0.7);
  ctx.stroke();
  ctx.restore();
}

/** Beveled hull panel with ambient occlusion and metal grain. */
function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base = HULL,
  hi = HULL_HI,
  sh = HULL_SHADE,
  outline = OUTLINE
): void {
  // Outline / edge dark
  ctx.fillStyle = outline;
  ctx.fillRect(x, y, w, h);

  // Base fill
  ctx.fillStyle = base;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  // Top highlight (2px)
  const topGrad = ctx.createLinearGradient(x, y, x, y + 4);
  topGrad.addColorStop(0, hi);
  topGrad.addColorStop(1, base);
  ctx.fillStyle = topGrad;
  ctx.fillRect(x + 1, y + 1, w - 2, 4);

  // Left highlight (2px)
  const leftGrad = ctx.createLinearGradient(x, y, x + 4, y);
  leftGrad.addColorStop(0, hi);
  leftGrad.addColorStop(1, base);
  ctx.fillStyle = leftGrad;
  ctx.fillRect(x + 1, y + 1, 4, h - 2);

  // Bottom shade
  const botGrad = ctx.createLinearGradient(x, y + h - 4, x, y + h - 1);
  botGrad.addColorStop(0, base);
  botGrad.addColorStop(1, sh);
  ctx.fillStyle = botGrad;
  ctx.fillRect(x + 1, y + h - 4, w - 2, 3);

  // Right shade
  const rightGrad = ctx.createLinearGradient(x + w - 4, y, x + w - 1, y);
  rightGrad.addColorStop(0, base);
  rightGrad.addColorStop(1, sh);
  ctx.fillStyle = rightGrad;
  ctx.fillRect(x + w - 4, y + 1, 3, h - 2);

  // Ambient occlusion at corners
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(x + 1, y + 1, 3, 3);
  ctx.fillRect(x + w - 4, y + 1, 3, 3);
  ctx.fillRect(x + 1, y + h - 4, 3, 3);
  ctx.fillRect(x + w - 4, y + h - 4, 3, 3);

  // Metal grain
  metalGrain(ctx, x + 2, y + 2, w - 4, h - 4, 0.06);
}

/** Hard ambient shadow along the bottom edge. */
function dropShadow(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(2,8,23,0.35)";
  ctx.fillRect(2, S - 3, S - 4, 2);
  ctx.fillRect(S - 3, 3, 2, S - 6);
  // Bottom-right corner extra depth
  ctx.fillStyle = "rgba(2,8,23,0.2)";
  ctx.fillRect(S - 5, S - 5, 3, 3);
}

/** Detailed rivet with highlight and shadow. */
function rivet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#3a4a5a";
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillStyle = "#5a6a7a";
  ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, 1, 1);
}

/** Rivet for dark surfaces. */
function rivetDark(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#1a2535";
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillStyle = "#2a3545";
  ctx.fillRect(x, y, 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, 1, 1);
}

/** Draw a small LED with glow. */
function led(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  // Glow
  const glow = ctx.createRadialGradient(x + 1, y + 1, 0, x + 1, y + 1, 4);
  glow.addColorStop(0, color + "80");
  glow.addColorStop(1, color + "00");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 3, y - 3, 8, 8);
  // LED body
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 2, 2);
  // Specular
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(x, y, 1, 1);
}

function RGB(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}

// ---------------------------------------------------------------------------
// Individual block kinds — upgraded textures
// ---------------------------------------------------------------------------

function drawFloor(ctx: CanvasRenderingContext2D): void {
  // Base panel — dark brushed steel
  panel(ctx, 1, 1, S - 2, S - 2, "#3e4f62", "#5a6d80", "#2a3845", "#151e2a");

  // Anti-slip tread pattern — cross-hatch diamonds
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = 5 + col * 5;
      const cy = 5 + row * 5;
      ctx.fillRect(cx, cy, 3, 1);
      ctx.fillRect(cx + 1, cy - 1, 1, 3);
    }
  }

  // Wear marks (slightly lighter areas where footsteps would be)
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(8, 12, 16, 4);
  ctx.fillRect(10, 18, 12, 3);

  // Edge grooves
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(2, 3, 1, S - 6);
  ctx.fillRect(S - 3, 3, 1, S - 6);

  scratches(ctx, 3, 4, S - 6, S - 8, 1);
  metalGrain(ctx, 2, 2, S - 4, S - 4, 0.04);
}

function drawWall(ctx: CanvasRenderingContext2D): void {
  // Hull panel base
  panel(ctx, 1, 1, S - 2, S - 2, HULL, HULL_HI, HULL_SHADE, OUTLINE);

  // Vertical seam line (panel joint)
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(4, 3, 1, S - 6);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(5, 3, 1, S - 6);

  // Horizontal seam
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(3, S / 2, S - 6, 1);

  // Rivets — 2 rows of 3
  rivet(ctx, 25, 5);
  rivet(ctx, 25, S / 2);
  rivet(ctx, 25, S - 5);

  // Hazard stripe (bottom-left, faded)
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? ACCENT : OUTLINE;
    ctx.fillRect(5 + i * 3, S - 8, 3, 5);
  }
  ctx.restore();

  scratches(ctx, 3, 3, S - 6, S - 6, 7);
}

function drawWindow(ctx: CanvasRenderingContext2D): void {
  // Heavy steel frame
  panel(ctx, 1, 1, S - 2, S - 2, STEEL, HULL_HI, METAL, OUTLINE);

  // Inner frame recess
  ctx.fillStyle = "#4a5c6e";
  ctx.fillRect(3, 3, S - 6, S - 6);

  // Glass aperture
  const gx = 5;
  const gy = 5;
  const gw = S - 10;
  const gh = S - 10;

  // Deep space gradient
  const grad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
  grad.addColorStop(0, "#061020");
  grad.addColorStop(0.3, "#0d1f3c");
  grad.addColorStop(0.7, "#1a3a6a");
  grad.addColorStop(1, "#0a1a30");
  ctx.fillStyle = grad;
  ctx.fillRect(gx, gy, gw, gh);

  // Nebula hint in glass
  ctx.fillStyle = "rgba(100,120,200,0.12)";
  ctx.beginPath();
  ctx.arc(gx + 8, gy + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Stars peeking through
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(gx + 3, gy + 3, 1, 1);
  ctx.fillRect(gx + 12, gy + 8, 1, 1);
  ctx.fillRect(gx + 7, gy + 14, 1, 1);
  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.fillRect(gx + 16, gy + 4, 1, 1);

  // Cross frame
  ctx.fillStyle = STEEL;
  ctx.fillRect(gx + gw / 2 - 1, gy, 2, gh);
  ctx.fillRect(gx, gy + gh / 2 - 1, gw, 2);

  // Glass glare (diagonal highlight)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(gx, gy + 10);
  ctx.lineTo(gx + 6, gy);
  ctx.lineTo(gx + 10, gy);
  ctx.lineTo(gx, gy + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Secondary glare
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(gx + gw - 4, gy + gh);
  ctx.lineTo(gx + gw, gy + gh - 4);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Corner bolts
  rivet(ctx, 3, 3);
  rivet(ctx, S - 3, 3);
  rivet(ctx, 3, S - 3);
  rivet(ctx, S - 3, S - 3);
}

function drawSolarPanel(ctx: CanvasRenderingContext2D): void {
  // Mounting frame — brushed aluminum
  panel(ctx, 1, 1, S - 2, S - 2, METAL, HULL_HI, HULL_DARK, OUTLINE);

  // Solar cells — 3x3 grid with individual gradients
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 4 + c * 9;
      const y = 4 + r * 9;

      // Cell base
      const g = ctx.createLinearGradient(x, y, x + 8, y + 8);
      g.addColorStop(0, "#2563eb");
      g.addColorStop(0.5, "#1e40af");
      g.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 8, 8);

      // Cell sheen (angled highlight)
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(x, y, 8, 2);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x, y + 2, 1, 6);

      // Cell border
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, 8, 8);
    }
  }

  // Grout lines
  ctx.fillStyle = OUTLINE;
  for (let i = 0; i <= 3; i++) {
    ctx.fillRect(4 + i * 9 - 1, 3, 1, S - 6);
    ctx.fillRect(3, 4 + i * 9 - 1, S - 6, 1);
  }

  // Conductor traces (thin silver lines across cells)
  ctx.fillStyle = "rgba(200,210,220,0.3)";
  ctx.fillRect(4, 12, S - 8, 0.5);
  ctx.fillRect(4, 21, S - 8, 0.5);
  ctx.fillRect(12, 4, 0.5, S - 8);
  ctx.fillRect(21, 4, 0.5, S - 8);

  scratches(ctx, 2, 2, S - 4, S - 4, 3);
}

function drawStorage(ctx: CanvasRenderingContext2D): void {
  // Wooden crate body
  panel(ctx, 3, 3, S - 8, S - 8, "#92400e", "#d97706", "#78350f", "#3c1a02");

  // Wood grain lines
  ctx.fillStyle = "rgba(120,53,15,0.4)";
  for (let i = 0; i < 4; i++) {
    const gy = 6 + i * 5;
    ctx.fillRect(5, gy, S - 12, 1);
    ctx.fillRect(5, gy + 1, S - 12, 0.5);
  }

  // Metal reinforcement bands
  ctx.fillStyle = "#71717a";
  ctx.fillRect(4, 7, S - 10, 2);
  ctx.fillRect(4, S - 9, S - 10, 2);
  // Band rivets
  ctx.fillStyle = "#a1a1aa";
  ctx.fillRect(6, 7, 2, 2);
  ctx.fillRect(S - 8, 7, 2, 2);
  ctx.fillRect(6, S - 9, 2, 2);
  ctx.fillRect(S - 8, S - 9, 2, 2);

  // Handle
  ctx.fillStyle = "#52525b";
  ctx.fillRect(S / 2 - 4, 11, 8, 2);
  ctx.fillStyle = "#71717a";
  ctx.fillRect(S / 2 - 3, 10, 6, 1);

  // Barcode label
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(10, 18, 12, 6);
  ctx.fillStyle = "#374151";
  ctx.fillRect(11, 19, 1, 4);
  ctx.fillRect(13, 19, 2, 4);
  ctx.fillRect(16, 19, 1, 4);
  ctx.fillRect(18, 19, 2, 4);
  ctx.fillRect(21, 19, 1, 4);

  scratches(ctx, 4, 4, S - 8, S - 8, 5);
}

function drawLight(ctx: CanvasRenderingContext2D): void {
  // Ceiling fixture housing
  panel(ctx, 4, 3, S - 8, 10, HULL, HULL_HI, HULL_SHADE, OUTLINE);

  // Fixture detail lines
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(6, 5, S - 12, 1);
  ctx.fillRect(6, 9, S - 12, 1);

  // Bulb area
  const bx = S / 2;
  const by = 12;

  // Large glow aura
  const glowLarge = ctx.createRadialGradient(bx, by, 1, bx, by, 16);
  glowLarge.addColorStop(0, "rgba(255,251,200,0.7)");
  glowLarge.addColorStop(0.3, "rgba(253,224,71,0.3)");
  glowLarge.addColorStop(0.7, "rgba(253,224,71,0.08)");
  glowLarge.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = glowLarge;
  ctx.fillRect(bx - 16, by - 16, 32, 32);

  // Medium glow
  const glowMed = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
  glowMed.addColorStop(0, "rgba(255,253,230,0.95)");
  glowMed.addColorStop(0.5, "rgba(253,224,71,0.5)");
  glowMed.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = glowMed;
  ctx.fillRect(bx - 8, by - 8, 16, 16);

  // Bulb core
  ctx.fillStyle = "#fffde0";
  ctx.beginPath();
  ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Bulb specular
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(bx - 1, by - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Mounting screws
  rivet(ctx, 6, 4);
  rivet(ctx, S - 6, 4);
}

function drawPlants(ctx: CanvasRenderingContext2D): void {
  // Ceramic pot
  const potGrad = ctx.createLinearGradient(8, 20, 8, 30);
  potGrad.addColorStop(0, "#a16207");
  potGrad.addColorStop(0.5, "#92400e");
  potGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = potGrad;
  // Pot shape — slightly tapered
  ctx.beginPath();
  ctx.moveTo(9, 20);
  ctx.lineTo(23, 20);
  ctx.lineTo(22, 30);
  ctx.lineTo(10, 30);
  ctx.closePath();
  ctx.fill();

  // Pot rim
  ctx.fillStyle = "#d97706";
  ctx.fillRect(8, 18, 16, 3);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(8, 18, 16, 1);

  // Soil
  ctx.fillStyle = "#451a03";
  ctx.fillRect(10, 20, 12, 2);

  // Stems — organic curved shapes
  ctx.strokeStyle = "#15803d";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // Center stem
  ctx.beginPath();
  ctx.moveTo(16, 20);
  ctx.quadraticCurveTo(16, 14, 15, 8);
  ctx.stroke();

  // Left stem
  ctx.beginPath();
  ctx.moveTo(14, 20);
  ctx.quadraticCurveTo(12, 15, 10, 10);
  ctx.stroke();

  // Right stem
  ctx.beginPath();
  ctx.moveTo(18, 20);
  ctx.quadraticCurveTo(20, 14, 22, 9);
  ctx.stroke();

  // Leaves — filled ovals
  function leaf(cx: number, cy: number, angle: number, size: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const leafGrad = ctx.createLinearGradient(-size, 0, size, 0);
    leafGrad.addColorStop(0, "#166534");
    leafGrad.addColorStop(0.5, "#22c55e");
    leafGrad.addColorStop(1, "#166534");
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Leaf vein
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.lineTo(size * 0.6, 0);
    ctx.stroke();
    ctx.restore();
  }

  leaf(10, 10, -0.5, 4);
  leaf(14, 7, 0.3, 5);
  leaf(17, 9, -0.2, 4);
  leaf(21, 9, 0.6, 4);
  leaf(15, 4, 0.1, 4);
  leaf(18, 5, -0.4, 3);

  // Leaf highlights
  ctx.fillStyle = "rgba(74,222,128,0.3)";
  ctx.fillRect(14, 6, 2, 1);
  ctx.fillRect(19, 8, 2, 1);

  // Water droplet
  ctx.fillStyle = "rgba(125,211,252,0.6)";
  ctx.beginPath();
  ctx.arc(12, 13, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawLifeSupport(ctx: CanvasRenderingContext2D): void {
  // Unit body — blue industrial panel
  panel(ctx, 2, 2, S - 4, S - 4, "#0c8fc9", "#38bdf8", "#0369a1", "#082f49");

  // Scrubber columns — 3 transparent tubes with gradient fill
  for (let i = 0; i < 3; i++) {
    const x = 5 + i * 8;

    // Tube housing
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(x - 1, 4, 6, 22);

    // Tube glass
    const g = ctx.createLinearGradient(x, 5, x + 4, 25);
    g.addColorStop(0, "#bae6fd");
    g.addColorStop(0.3, "#7dd3fc");
    g.addColorStop(0.7, "#38bdf8");
    g.addColorStop(1, "#0c4a6e");
    ctx.fillStyle = g;
    ctx.fillRect(x, 5, 4, 20);

    // Glass reflection
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x, 5, 1, 20);

    // Bubbles rising
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x + 1, 8 + i * 3, 1.5, 1.5);
    ctx.fillRect(x + 2, 12 + i * 2, 1, 1);
  }

  // Control panel strip
  ctx.fillStyle = "#0a1628";
  ctx.fillRect(4, 27, S - 8, 3);
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(4, 27, S - 8, 1);

  // Status LEDs
  led(ctx, 8, 28, GOOD);
  led(ctx, 13, 28, WARM);
  led(ctx, 18, 28, "#38bdf8");

  // Pressure gauge mini
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(24, 28, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GOOD;
  ctx.fillRect(23, 27, 2, 1);

  scratches(ctx, 3, 3, S - 6, S - 6, 9);
}

function drawBattery(ctx: CanvasRenderingContext2D): void {
  // Battery housing — industrial yellow
  panel(ctx, 3, 5, S - 6, S - 12, "#a16207", "#d97706", "#78350f", "#3c1a02");

  // Charge level bars
  for (let i = 0; i < 3; i++) {
    const by = 9 + i * 5;
    const chargeW = S - 14;

    // Bar background
    ctx.fillStyle = "#374151";
    ctx.fillRect(6, by, chargeW, 3.5);

    // Charge fill
    const level = i === 0 ? 1 : i === 1 ? 0.75 : 0.5;
    const barGrad = ctx.createLinearGradient(6, by, 6 + chargeW * level, by);
    barGrad.addColorStop(0, i === 2 ? "#fbbf24" : GOOD);
    barGrad.addColorStop(1, i === 2 ? "#f59e0b" : "#16a34a");
    ctx.fillStyle = barGrad;
    ctx.fillRect(6, by, chargeW * level, 3.5);

    // Bar highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(6, by, chargeW * level, 1);
  }

  // Terminal knobs on top
  const termGrad1 = ctx.createLinearGradient(10, 2, 10, 5);
  termGrad1.addColorStop(0, "#d4d4d8");
  termGrad1.addColorStop(1, "#71717a");
  ctx.fillStyle = termGrad1;
  ctx.fillRect(9, 3, 4, 3);
  ctx.fillRect(S - 13, 3, 4, 3);

  // Terminal highlights
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(9, 3, 4, 1);
  ctx.fillRect(S - 13, 3, 4, 1);

  // + / - labels
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(10, 2, 2, 1);
  ctx.fillRect(11, 1, 1, 3);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(S - 12, 2, 2, 1);

  scratches(ctx, 4, 6, S - 8, S - 14, 11);
}

function drawTetherPoint(ctx: CanvasRenderingContext2D): void {
  // Heavy mounting plate — bolted to hull
  panel(ctx, 3, 16, S - 6, 10, "#5a6a7a", STEEL, "#3a4a5a", OUTLINE);

  // Plate bolt pattern
  rivet(ctx, 6, 19);
  rivet(ctx, S - 6, 19);
  rivet(ctx, 6, S - 4);
  rivet(ctx, S - 6, S - 4);

  // Center mounting bolt (larger)
  ctx.fillStyle = "#3a4a5a";
  ctx.fillRect(S / 2 - 2, 18, 4, 4);
  ctx.fillStyle = "#7a8a9a";
  ctx.fillRect(S / 2 - 1, 19, 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(S / 2 - 1, 19, 1, 1);

  // Cable spool housing
  ctx.fillStyle = "#1a2535";
  ctx.fillRect(11, 8, 10, 10);
  ctx.fillStyle = "#2a3545";
  ctx.fillRect(12, 9, 8, 8);

  // Spooled cable
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(S / 2, 13, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#b45309";
  ctx.beginPath();
  ctx.arc(S / 2, 13, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(S / 2, 13, 1, 0, Math.PI * 2);
  ctx.fill();

  // Hook — bright orange, slightly extended
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(S / 2, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S / 2, 8.5);
  ctx.lineTo(S / 2, 10);
  ctx.stroke();

  // Hook highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(S / 2 - 0.5, 5.5, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoboticArm(ctx: CanvasRenderingContext2D): void {
  // Base mounting plate
  panel(ctx, 8, 20, S - 16, 10, METAL, HULL_HI, HULL_DARK, OUTLINE);
  rivet(ctx, 10, 23);
  rivet(ctx, S - 10, 23);

  // Arm segments with gradient
  const armGrad = ctx.createLinearGradient(12, 8, 12, 22);
  armGrad.addColorStop(0, "#fb923c");
  armGrad.addColorStop(0.5, "#f97316");
  armGrad.addColorStop(1, "#c2410c");
  ctx.fillStyle = armGrad;

  // Segment 1 — base to elbow
  ctx.fillRect(12, 14, 5, 8);
  // Segment 2 — elbow to wrist
  ctx.fillRect(14, 8, 5, 8);
  // Segment 3 — wrist to claw
  ctx.fillRect(18, 10, 5, 6);

  // Joint circles — metallic look
  function joint(cx: number, cy: number) {
    const jGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 3);
    jGrad.addColorStop(0, "#c2410c");
    jGrad.addColorStop(0.6, "#9a3412");
    jGrad.addColorStop(1, "#7c2d12");
    ctx.fillStyle = jGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(cx - 0.5, cy - 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Bolt center
    ctx.fillStyle = "#431407";
    ctx.beginPath();
    ctx.arc(cx, cy, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  joint(14, 14);
  joint(18, 10);
  joint(20, 16);

  // Claw — two prongs
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(22, 7, 6, 2.5);
  ctx.fillRect(22, 13.5, 6, 2.5);

  // Claw tips — shiny
  const clawTipGrad = ctx.createLinearGradient(27, 7, 29, 7);
  clawTipGrad.addColorStop(0, "#cbd5e1");
  clawTipGrad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = clawTipGrad;
  ctx.fillRect(27, 7, 3, 2.5);
  ctx.fillRect(27, 13.5, 3, 2.5);

  // Hydraulic cable
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.quadraticCurveTo(10, 12, 12, 8);
  ctx.stroke();

  // Status LED
  led(ctx, 10, 19, GOOD);

  // Warning label
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(9, 25, 5, 3);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(10, 26, 1, 1);
  ctx.fillRect(12, 26, 1, 1);
}

/** Draws the sprite tile onto the target context at world position (x, y). */
export function blitBlockSprite(
  ctx: CanvasRenderingContext2D,
  kind: BlockKind,
  x: number,
  y: number
): void {
  ctx.drawImage(getBlockSprite(kind), x, y);
}
