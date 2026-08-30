import type { SpaceObjectDef } from "@/data/spaceConfig";
import type { SkyPos } from "@/lib/game/spaceTime";
import { getTexture } from "./textures";

/**
 * Renderers for the space backdrop. Each function draws a single layer/body at
 * a given pixel position with its own parallax offset, rotation and lighting.
 *
 * All textures are pre-generated (cached) offscreen canvases; we only blit and
 * shade them each frame, keeping the render fast.
 */

/** Small lazy offscreen for compositing the Earth night layer. */
let nightLayer: HTMLCanvasElement | null = null;

function nightBuffer(w: number, h: number): CanvasRenderingContext2D {
  if (!nightLayer || nightLayer.width !== w || nightLayer.height !== h) {
    nightLayer = document.createElement("canvas");
    nightLayer.width = Math.max(1, Math.ceil(w));
    nightLayer.height = Math.max(1, Math.ceil(h));
  }
  const ctx = nightLayer.getContext("2d")!;
  ctx.clearRect(0, 0, nightLayer.width, nightLayer.height);
  return ctx;
}

// ---------------------------------------------------------------------------
// Starfield (multi-depth parallax)
// ---------------------------------------------------------------------------

export interface StarLayer {
  /** 0..1 depth offset from the camera (drift amount). */
  depth: number;
  count: number;
  minR: number;
  maxR: number;
  alpha: number;
  twinkle: number;
  seedA: number;
  seedB: number;
  color: string;
}

/**
 * Draws a multi-layer parallax starfield. Several `StarLayer`s at different
 * depths are drawn so they drift at different speeds, giving a sense of depth.
 */
export function drawStarField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  camDriftX: number,
  camDriftY: number,
  layers: StarLayer[],
  dim: number
): void {
  for (const layer of layers) {
    // Parallax offset: much smaller multiplier so stars stay nearly static.
    const offX = camDriftX * layer.depth * 0.05;
    const offY = camDriftY * layer.depth * 0.05;

    ctx.save();
    ctx.fillStyle = layer.color;
    for (let i = 0; i < layer.count; i++) {
      // Use different seeds for X and Y with better distribution.
      const px = mod(starHash(i * 2, layer.seedA) * w + offX, w);
      const py = mod(starHash(i * 2 + 1, layer.seedB) * h + offY, h);
      const tw = layer.twinkle > 0 ? 0.55 + 0.45 * Math.sin(time * (1 + (i % 7) * 0.3) + i) : 1;
      ctx.globalAlpha = layer.alpha * dim * tw;
      const r = layer.minR + starHash(i, layer.seedA + 3) * (layer.maxR - layer.minR);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

export function drawSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  daylight: number
): void {
  const tex = getTexture("sun", 192).canvas;
  const alpha = clamp01(0.2 + daylight * 0.8);

  // Outermost diffuse corona.
  const corona2R = radius * (5.5 + 0.3 * Math.sin(time * 0.4));
  const corona2 = ctx.createRadialGradient(x, y, radius * 0.5, x, y, corona2R);
  corona2.addColorStop(0, `rgba(255,200,100,${(0.12 * alpha).toFixed(3)})`);
  corona2.addColorStop(0.5, `rgba(255,160,60,${(0.04 * alpha).toFixed(3)})`);
  corona2.addColorStop(1, "rgba(255,100,20,0)");
  ctx.fillStyle = corona2;
  ctx.beginPath();
  ctx.arc(x, y, corona2R, 0, Math.PI * 2);
  ctx.fill();

  // Inner corona glow (pulsing).
  const glowR = radius * (3.0 + 0.2 * Math.sin(time * 0.7));
  const glow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowR);
  glow.addColorStop(0, `rgba(255,236,160,${(0.9 * alpha).toFixed(3)})`);
  glow.addColorStop(0.3, `rgba(255,200,100,${(0.6 * alpha).toFixed(3)})`);
  glow.addColorStop(0.6, `rgba(253,186,116,${(0.25 * alpha).toFixed(3)})`);
  glow.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Slow-surface churn rotation.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(time * 0.05);
  ctx.drawImage(tex, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();

  // Bright hot core.
  const core = ctx.createRadialGradient(x, y, 0, x, y, radius);
  core.addColorStop(0, `rgba(255,255,240,${(0.98 * alpha).toFixed(3)})`);
  core.addColorStop(0.5, `rgba(255,240,180,${(0.8 * alpha).toFixed(3)})`);
  core.addColorStop(1, `rgba(251,146,60,${(0.3 * alpha).toFixed(3)})`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Lens flare streaks (subtle, 6-pointed).
  ctx.save();
  ctx.globalAlpha = alpha * 0.15;
  ctx.translate(x, y);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + time * 0.02;
    const len = radius * (3.5 + 0.8 * Math.sin(time * 0.5 + i));
    ctx.strokeStyle = `rgba(255,240,200,${(0.3 + 0.15 * Math.sin(time + i)).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Earth
// ---------------------------------------------------------------------------

/**
 * Draws the rotating Earth with a day/night terminator aligned to the Sun,
 * progressive city lights, cloud layer, atmosphere glow, and Fresnel rim light.
 */
export function drawEarth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  daylight: number,
  sunDirX: number
): void {
  const texSize = 512;
  const day = getTexture("earth-day", texSize).canvas;
  const night = getTexture("earth-night", texSize).canvas;

  const rotation = time * 0.05; // slow west->east spin

  // Outer atmosphere haze (drawn behind the globe).
  const atmoOuterR = radius * 1.12;
  const atmo = ctx.createRadialGradient(x, y, radius * 0.95, x, y, atmoOuterR);
  atmo.addColorStop(0, `rgba(96,165,250,${(0.35 * daylight + 0.1).toFixed(3)})`);
  atmo.addColorStop(0.5, `rgba(56,189,248,${(0.15 * daylight + 0.04).toFixed(3)})`);
  atmo.addColorStop(1, "rgba(14,165,233,0)");
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(x, y, atmoOuterR, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  // Day surface: equirect map wrapped into the sphere, rotated by `rotation`.
  drawGlobeWithRotation(ctx, day, x, y, radius, rotation, 1);

  // Cloud layer: semi-transparent white streaks that rotate slightly faster.
  const cloudAlpha = 0.12 + daylight * 0.08;
  ctx.save();
  ctx.globalAlpha = cloudAlpha;
  for (let i = 0; i < 18; i++) {
    const ca = hash2(i, 200, 42) * Math.PI * 2;
    const cr = hash2(i, 201, 42) * radius * 0.7;
    const cx = x + Math.cos(ca + rotation * 1.3) * cr;
    const cy = y + Math.sin(ca + rotation * 1.3) * cr * 0.5;
    const cw = 15 + hash2(i, 202, 42) * 30;
    const ch = 4 + hash2(i, 203, 42) * 8;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, hash2(i, 204, 42) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Night city lights: reveal only on the night side of the terminator.
  const nightAlpha = (1 - daylight) * 0.75 + 0.12;
  if (nightAlpha > 0.02) {
    const size = Math.ceil(radius * 2 + 4);
    const nc = nightBuffer(size, size);
    const cx = size / 2;
    nc.save();
    nc.beginPath();
    nc.arc(cx, cx, radius, 0, Math.PI * 2);
    nc.clip();
    drawGlobeWithRotation(nc, night, cx, cx, radius, rotation, nightAlpha);

    nc.globalCompositeOperation = "destination-in";
    const grad = nc.createLinearGradient(cx + sunDirX * radius, 0, cx - sunDirX * radius, 0);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.55, "rgba(0,0,0,0)");
    nc.fillStyle = grad;
    nc.fillRect(cx - radius * 1.5, cx - radius * 1.5, radius * 3, radius * 3);
    nc.restore();

    ctx.drawImage(nightLayer!, x - radius - 2, y - radius - 2);
  }

  ctx.restore();

  // Soft day/night shading terminator.
  ctx.save();
  const shade = ctx.createLinearGradient(sunDirX * radius, y, -sunDirX * radius, y);
  const nightStrength = (1 - daylight) * 0.55;
  shade.addColorStop(0, `rgba(4,8,30,${nightStrength.toFixed(3)})`);
  shade.addColorStop(0.45, "rgba(4,8,30,0)");
  shade.addColorStop(1, "rgba(4,8,30,0)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Fresnel rim light (bright edge opposite the sun).
  ctx.save();
  const rim = ctx.createRadialGradient(
    x - sunDirX * radius * 0.3,
    y,
    radius * 0.7,
    x,
    y,
    radius
  );
  rim.addColorStop(0, "rgba(96,165,250,0)");
  rim.addColorStop(0.7, `rgba(120,180,255,${(0.08 + daylight * 0.12).toFixed(3)})`);
  rim.addColorStop(1, `rgba(96,165,250,${(0.35 + daylight * 0.2).toFixed(3)})`);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Atmosphere glow ring.
  ctx.save();
  ctx.strokeStyle = `rgba(96,165,250,${(0.55 * daylight + 0.2).toFixed(3)})`;
  ctx.lineWidth = Math.max(2, radius * 0.04);
  ctx.beginPath();
  ctx.arc(x, y, radius + ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Draws an equirect texture into a sphere, offset by `rotation` (wraps). */
function drawGlobeWithRotation(
  ctx: CanvasRenderingContext2D,
  tex: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  alpha: number
): void {
  const texW = tex.width;
  const texH = tex.height;
  const stripW = Math.max(1, Math.round(Math.PI * radius * 2));
  const stripH = Math.max(1, Math.round(radius * 2));
  // Texture pixels consumed per strip pixel.
  const texPerPx = texW / stripW;

  // Texture x where the seam begins for the current rotation (0..texW).
  const startTex = ((rotation / (2 * Math.PI)) % 1) * texW;
  const w2 = Math.max(0, (texW - startTex) / texPerPx); // first segment width in px

  ctx.save();
  ctx.globalAlpha = alpha;
  if (w2 > 0.5) {
    ctx.drawImage(tex, startTex, 0, texW - startTex, texH, x - radius, y - radius, w2, stripH);
  }
  if (startTex > 0.5) {
    ctx.drawImage(tex, 0, 0, startTex, texH, x - radius + w2, y - radius, startTex / texPerPx, stripH);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------

export function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  daylight: number
): void {
  const tex = getTexture("moon", 192).canvas;
  const alpha = 0.5 + daylight * 0.5;

  // Outer atmospheric haze.
  const hazeR = radius * 1.8;
  const haze = ctx.createRadialGradient(x, y, radius * 0.8, x, y, hazeR);
  haze.addColorStop(0, `rgba(180,190,220,${(0.12 * alpha).toFixed(3)})`);
  haze.addColorStop(0.5, `rgba(150,160,200,${(0.05 * alpha).toFixed(3)})`);
  haze.addColorStop(1, "rgba(120,130,180,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(x, y, hazeR, 0, Math.PI * 2);
  ctx.fill();

  // Main moon body with subtle rotation.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(time * 0.015);
  ctx.drawImage(tex, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();

  // Bright limb highlight (sun-lit edge).
  const limbAngle = -0.6; // direction of the sun relative to moon
  const lx = x + Math.cos(limbAngle) * radius * 0.4;
  const ly = y + Math.sin(limbAngle) * radius * 0.4;
  const limb = ctx.createRadialGradient(lx, ly, 0, x, y, radius);
  limb.addColorStop(0, `rgba(255,255,255,${(0.18 * alpha).toFixed(3)})`);
  limb.addColorStop(0.5, `rgba(220,225,240,${(0.06 * alpha).toFixed(3)})`);
  limb.addColorStop(1, "rgba(180,190,210,0)");
  ctx.fillStyle = limb;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Faint blue atmospheric halo.
  ctx.save();
  ctx.strokeStyle = `rgba(160,180,220,${(0.2 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Body placement helpers
// ---------------------------------------------------------------------------

/** Converts a normalized SkyPos to pixel coords at a given depth parallax. */
export function skyToPixels(
  pos: SkyPos,
  w: number,
  h: number,
  depth: number,
  camDriftX: number,
  camDriftY: number
): { x: number; y: number } {
  // Depth controls parallax: 0 = infinite distance (completely static).
  // Multiply by a small factor so celestial bodies stay nearly fixed.
  const parallax = depth * 0.03;
  const parX = camDriftX * parallax;
  const parY = camDriftY * parallax;
  return {
    x: pos.u * w + parX,
    y: pos.v * h + parY,
  };
}

/** Compute the pixel size of a body radius from a fraction of min(w,h). */
export function radiusFor(radiusFrac: number, w: number, h: number): number {
  return Math.max(20, radiusFrac * Math.min(w, h));
}

function hash1(i: number, seed: number): number {
  return (((i * 9301 + seed * 49297) % 233280) + 233280) % 233280 / 233280;
}

/** Better hash for star positioning – avoids visible grid/line patterns. */
function starHash(i: number, seed: number): number {
  let h = (i * 1597334677 ^ seed * 3812015801) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hash2(x: number, y: number, seed: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Re-export type for convenience.
export type { SpaceObjectDef };
