import type { SpaceTime } from "@/lib/game/spaceTime";
import {
  drawStarField,
  drawSun,
  drawEarth,
  drawMoon,
  skyToPixels,
  radiusFor,
  type StarLayer,
} from "./renderers";

/**
 * Orchestrates the full space backdrop: deep gradient, multi-layer parallax
 * starfield, nebula clouds, and the Sun / Earth / Moon rendered at parallax
 * depths. Returns a global scene-lit factor the caller uses to tint the whole
 * world, so the Sun visibly influences the lighting of the scene.
 */

export interface SpaceSceneOutput {
  /** 0..1 global scene brightness (0 = full night, 1 = full day). */
  sunLight: number;
}

/** Parallax star layers, ordered back-to-front (far to near). */
export const STAR_LAYERS: StarLayer[] = [
  { depth: 0.02, count: 120, minR: 0.3, maxR: 0.7, alpha: 0.5, twinkle: 0.2, seedA: 5, seedB: 13, color: "#b8c0d4" },
  { depth: 0.06, count: 260, minR: 0.5, maxR: 1.0, alpha: 0.75, twinkle: 0.4, seedA: 11, seedB: 97, color: "#cdd6f4" },
  { depth: 0.14, count: 160, minR: 0.8, maxR: 1.4, alpha: 0.85, twinkle: 0.7, seedA: 29, seedB: 71, color: "#ffffff" },
  { depth: 0.25, count: 70, minR: 1.2, maxR: 2.2, alpha: 0.95, twinkle: 1.0, seedA: 47, seedB: 43, color: "#fef9ef" },
];

/** Nebula cloud definitions: soft colour patches in the deep background. */
interface Nebula {
  u: number;
  v: number;
  radiusFrac: number;
  color: string;
  alpha: number;
  depth: number;
}

const NEBULAE: Nebula[] = [
  { u: 0.15, v: 0.25, radiusFrac: 0.25, color: "#3b82f6", alpha: 0.045, depth: 0.08 },
  { u: 0.8, v: 0.15, radiusFrac: 0.2, color: "#a855f7", alpha: 0.04, depth: 0.1 },
  { u: 0.55, v: 0.6, radiusFrac: 0.18, color: "#ec4899", alpha: 0.035, depth: 0.12 },
  { u: 0.9, v: 0.55, radiusFrac: 0.15, color: "#06b6d4", alpha: 0.03, depth: 0.06 },
];

const DAY_TOP = "#0a1428";
const NIGHT_TOP = "#010409";
const DAY_MID = "#0f2238";
const NIGHT_MID = "#020617";
const DAY_BOTTOM = "#14324a";
const NIGHT_BOTTOM = "#050a1a";

// Parallax depth: 0 = infinitely far (moves least with the camera), larger =
// closer (moves more). Bodies are drawn back-to-front.
// Lower depths = more stable background that doesn't shift with the camera.
const SUN_DEPTH = 0.02;
const MOON_DEPTH = 0.08;
const EARTH_DEPTH = 0.12;
const FAR_DEPTH = 0.03;

const SUN_RADIUS = 0.09;
const EARTH_RADIUS = 0.45;
const MOON_RADIUS = 0.065;

export interface SpaceSceneParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  spaceTime: SpaceTime;
  /** Screen-space parallax offset (px) applied per depth from the camera. */
  camDriftX: number;
  camDriftY: number;
}

export function drawSpaceScene(p: SpaceSceneParams): SpaceSceneOutput {
  const { ctx, width: w, height: h, time, spaceTime, camDriftX, camDriftY } = p;
  const daylight = spaceTime.daylight;

  // Deep space gradient (warmer by day, cooler at night).
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, mix(DAY_TOP, NIGHT_TOP, daylight));
  grad.addColorStop(0.5, mix(DAY_MID, NIGHT_MID, daylight));
  grad.addColorStop(1, mix(DAY_BOTTOM, NIGHT_BOTTOM, daylight));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Nebula clouds: soft, large colour patches behind the starfield.
  for (const neb of NEBULAE) {
    const nx = neb.u * w + camDriftX * neb.depth * 0.02;
    const ny = neb.v * h + camDriftY * neb.depth * 0.02;
    const nr = neb.radiusFrac * Math.min(w, h);
    const hex = neb.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dim = 0.5 + daylight * 0.5;
    const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    nebGrad.addColorStop(0, `rgba(${r},${g},${b},${(neb.alpha * dim).toFixed(3)})`);
    nebGrad.addColorStop(0.4, `rgba(${r},${g},${b},${(neb.alpha * 0.4 * dim).toFixed(3)})`);
    nebGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stars behind everything (parallax, dimmer by day).
  drawStarField(ctx, w, h, time, camDriftX, camDriftY, STAR_LAYERS, 0.3 + daylight * 0.7);

  // Distant far objects (faint asteroid silhouettes, deepest detectable layer).
  drawFarBand(ctx, w, h, camDriftX, camDriftY, daylight);

  // Sun: deepest moving light that lights the scene.
  const sunPos = skyToPixels(spaceTime.sun, w, h, SUN_DEPTH, camDriftX, camDriftY);
  const sunR = radiusFor(SUN_RADIUS, w, h);
  drawSun(ctx, sunPos.x, sunPos.y, sunR, time, daylight);

  // Moon: high, smaller, deeper than Earth.
  const moonPos = skyToPixels(spaceTime.moon, w, h, MOON_DEPTH, camDriftX, camDriftY);
  const moonR = radiusFor(MOON_RADIUS, w, h);
  drawMoon(ctx, moonPos.x, moonPos.y, moonR, time, daylight);

  // Earth: spans the full screen width, sitting near the bottom.
  const earthPos = skyToPixels(
    { u: 0.5, v: 0.88, elevation: 0.5 },
    w,
    h,
    EARTH_DEPTH,
    camDriftX,
    camDriftY
  );
  const earthR = Math.max(20, w / 2);
  drawEarth(ctx, earthPos.x, earthPos.y, earthR, time, daylight, spaceTime.sunLightDir);

  return { sunLight: daylight };
}

/**
 * Faint band of distant broken asteroids / debris silhouettes drifting at the
 * deepest detectable parallax layer. Read as "far background" without
 * interfering with gameplay or the big Earth.
 */
function drawFarBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  camDriftX: number,
  camDriftY: number,
  daylight: number
): void {
  const alpha = 0.5 + daylight * 0.3;
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const sx = hash(i) * w + camDriftX * FAR_DEPTH * 0.03;
    const sy = hash(i * 3 + 11) * h * 0.55 + camDriftY * FAR_DEPTH * 0.03;
    const r = 2 + hash(i * 7 + 5) * 6;
    // Wrap horizontally so bodies loop as the camera pans.
    const px = mod(sx - r, w + r * 2) - r;
    ctx.globalAlpha = alpha * (0.25 + hash(i * 13 + 3) * 0.3);
    ctx.fillStyle = "#93a0b8";
    ctx.beginPath();
    ctx.arc(px, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2940";
    ctx.beginPath();
    ctx.arc(px, sy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** True modulo operator that always returns a non-negative result. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Mix two 6-digit hex colors; t=0 -> a, t=1 -> b. */
function mix(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
