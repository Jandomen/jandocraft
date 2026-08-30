import type { TextureOverride } from "@/data/spaceConfig";

/**
 * Texture factory.
 *
 * High-quality procedural planetary textures are generated once into offscreen
 * canvases and cached, so the render loop never regenerates them. Each slot can
 * optionally be replaced by a real PNG placed in `/public/textures/<name>.png`.
 *
 * To avoid noisy 404s on startup, overrides are gated behind a manifest at
 * `/textures/manifest.json`. If the manifest is absent (default), no PNG is
 * requested and the procedural textures are used silently. When you want custom
 * art, drop your PNGs into `/public/textures/` and add a `manifest.json` listing
 * `{ "name", "slot" }` entries (see `data/spaceConfig.ts` for slot names).
 */

export type TextureSlot = "earth-day" | "earth-night" | "sun" | "moon" | "starfield";

type SlotKind = "equirect" | "circle";

interface GeneratedImage {
  canvas: HTMLCanvasElement;
  kind: SlotKind;
  /** Natural square size in px (equirect textures use size x size/2). */
  size: number;
}

const cache = new Map<string, GeneratedImage>();
const overrideImages = new Map<
  string,
  { img: HTMLImageElement; loaded: boolean; tried: boolean }
>();
let loadStarted = false;

/** Optional manifest declaring which PNG overrides to load. */
const MANIFEST_URL = "/textures/manifest.json";

/**
 * Begins loading the PNG overrides declared in `/textures/manifest.json`.
 *
 * Fetching a missing manifest resolves with a 404 response that is handled
 * silently (no console noise and no request for images that would 404). When a
 * manifest *is* present, only the PNGs it lists are loaded; those are then
 * preferred over the procedural fallback.
 */
export function ensureTextures(): void {
  if (loadStarted) return;
  loadStarted = true;
  fetch(MANIFEST_URL)
    .then((res) => (res.ok ? res.json() : null))
    .then((manifest: unknown) => {
      const overrides = (Array.isArray(manifest) ? manifest : []) as TextureOverride[];
      for (const o of overrides) {
        if (!o || typeof o.name !== "string" || typeof o.slot !== "string") continue;
        const img = new Image();
        img.onload = () => {
          overrideImages.set(o.slot, { img, loaded: true, tried: true });
          cache.delete(o.slot);
        };
        img.onerror = () => {
          overrideImages.set(o.slot, { img, loaded: false, tried: true });
        };
        img.src = `/textures/${o.name}.png`;
      }
    })
    .catch(() => {
      // Network hiccup — keep the procedural fallback.
    });
}

function getLoadedOverride(slot: TextureSlot): HTMLImageElement | null {
  const entry = overrideImages.get(slot);
  return entry && entry.loaded && entry.img.complete ? entry.img : null;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = Math.floor(size / 2);
  return c;
}

/** Gets (generating + caching if needed) the texture for a slot. */
export function getTexture(slot: TextureSlot, size = 512): GeneratedImage {
  const existing = cache.get(slot);
  if (existing) return existing;

  const override = getLoadedOverride(slot);
  if (override) {
    const c = document.createElement("canvas");
    c.width = override.naturalWidth || size;
    c.height = override.naturalHeight || Math.floor(size / 2);
    const g = c.getContext("2d")!;
    g.drawImage(override, 0, 0);
    const gi = { canvas: c, kind: ("circle" as SlotKind), size: c.width };
    cache.set(slot, gi);
    return gi;
  }

  const gi = generate(slot, size);
  cache.set(slot, gi);
  return gi;
}

function generate(slot: TextureSlot, size: number): GeneratedImage {
  switch (slot) {
    case "earth-day":
      return { canvas: makeEarthDay(size), kind: "equirect", size };
    case "earth-night":
      return { canvas: makeEarthNight(size), kind: "equirect", size };
    case "sun":
      return { canvas: makeSun(size), kind: "circle", size };
    case "moon":
      return { canvas: makeMoon(size), kind: "circle", size };
    case "starfield":
      return { canvas: makeStarfield(size), kind: "circle", size };
  }
}

// ---------------------------------------------------------------------------
// Deterministic value noise helpers
// ---------------------------------------------------------------------------

function hash2(x: number, y: number, seed: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number): number {
  const octaves = 5;
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq, seed + i * 101);
    sum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / sum;
}

// ---------------------------------------------------------------------------
// Earth
// ---------------------------------------------------------------------------

function makeEarthDay(size: number): HTMLCanvasElement {
  const c = makeCanvas(size);
  const ctx = c.getContext("2d")!;
  const w = size;
  const h = size / 2;
  const seed = 1234;

  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const nx = x / w;
      const ny = y / h;
      // Sphere-like latitude to keep continents from distorting near poles.
      const lat = (ny - 0.5) * 2;
      const warp = 1 - Math.abs(lat) * 0.15;

      // Two continents: one large land mass, a second smaller island cluster.
      const continent =
        fbm(nx * 3.2 * warp + 5, ny * 2.2 * warp, seed) * 0.7 +
        fbm(nx * 7.5 * warp, ny * 5.0 * warp, seed + 7) * 0.3;

      // Ocean floor has its own subtle texture.
      const oceanTex = fbm(nx * 6, ny * 6, seed + 20) * 0.4;

      let r: number, g: number, b: number;
      if (continent > 0.55) {
        // Land: mix green (forest) / tan (plains) / brown (mountains).
        const alt = continent;
        const greenAmt = noiseSeed(nx, ny, seed + 30);
        const r0 = 0.22 + oceanTex * 0.1;
        const g0 = 0.42 + greenAmt * 0.22;
        const b0 = 0.16 + oceanTex * 0.05;
        const mount = Math.max(0, alt - 0.68) * 1.4;
        r = clamp01(r0 + mount * 0.25);
        g = clamp01(g0 + mount * 0.1);
        b = clamp01(b0 + mount * 0.02);
        // Polar caps near the very top/bottom.
        if (Math.abs(lat) > 0.78) {
          r = g = b = 0.92;
        }
      } else {
        // Deep ocean: blue gradient with a lighter shallow shelf.
        const depth = 1 - continent / 0.55;
        const r0 = 0.03 + oceanTex * 0.05;
        const g0 = 0.16 + oceanTex * 0.1;
        const b0 = 0.36 + oceanTex * 0.18 + depth * 0.1;
        r = r0;
        g = g0;
        b = b0;
        // Shallow coastal tint near land.
        if (continent > 0.42) {
          r += 0.1;
          g += 0.16;
          b += 0.16;
        }
      }

      data[i] = Math.round(r * 255);
      data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function makeEarthNight(size: number): HTMLCanvasElement {
  const c = makeCanvas(size);
  const ctx = c.getContext("2d")!;
  const w = size;
  const h = size / 2;
  const seed = 5678;

  // Base: faint dark surface (continents barely visible at night).
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const nx = x / w;
      const ny = y / h;
      const continent = fbm(nx * 3.2 + 5, ny * 2.2, seed) * 0.7 +
        fbm(nx * 7.5, ny * 5.0, seed + 7) * 0.3;
      const land = continent > 0.55;
      const base = land ? 0.05 : 0.012;
      data[i] = Math.round(base * 255);
      data[i + 1] = Math.round(base * 255);
      data[i + 2] = Math.round((base + 0.01) * 255);
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);

  // City lights: warm clusters placed on land near coasts via noise.
  for (let n = 0; n < 900; n++) {
    const x = Math.floor(random(n, 1) * w);
    const y = Math.floor(random(n, 2) * h);
    const nx = x / w;
    const ny = y / h;
    const lat = (ny - 0.5) * 2;
    const continent =
      fbm(nx * 3.2 + 5, ny * 2.2, seed + 90) * 0.7 +
      fbm(nx * 7.5, ny * 5.0, seed + 97) * 0.3;
    if (continent <= 0.55) continue; // only on land
    if (Math.abs(lat) > 0.7) continue; // skip poles
    // Cluster density noise.
    const density = fbm(nx * 18, ny * 18, seed + 200);
    if (density < 0.5) continue;
    const bright = 0.5 + density * 0.5;
    const radius = 1 + Math.floor(density * 2.2);
    ctx.fillStyle = `rgba(255, ${190 + Math.floor(density * 50)}, ${120 + Math.floor(density * 60)}, ${(bright * 0.8).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    // Small bloom.
    ctx.fillStyle = `rgba(255,200,140,${(density * 0.25).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function noiseSeed(x: number, y: number, seed: number): number {
  return fbm(x * 4, y * 4, seed);
}

function random(n: number, seed: number): number {
  return ((n * 9301 + seed * 49297) % 233280) / 233280;
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

function makeSun(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, r * 0.1, r, r, r);
  grad.addColorStop(0, "#fff7cc");
  grad.addColorStop(0.4, "#ffe066");
  grad.addColorStop(0.75, "#fb923c");
  grad.addColorStop(1, "#f97316");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // Granular surface texture (slow churn).
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 2400; i++) {
    const a = random(i, 3) * Math.PI * 2;
    const rr = Math.sqrt(random(i, 4)) * r;
    const x = r + Math.cos(a) * rr;
    const y = r + Math.sin(a) * rr;
    const light = 0.5 + random(i, 5) * 0.5;
    ctx.fillStyle = `rgba(255, ${Math.round(240 * light)}, ${Math.round(120 * light)}, ${(0.5 * light).toFixed(3)})`;
    ctx.fillRect(x, y, 1.6 + random(i, 6) * 2, 1.6 + random(i, 7) * 2);
  }
  ctx.globalCompositeOperation = "source-over";
  return c;
}

// ---------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------

function makeMoon(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;

  // Base grey sphere.
  const grad = ctx.createRadialGradient(r * 0.4, r * 0.35, r * 0.15, r, r, r);
  grad.addColorStop(0, "#d6d3d1");
  grad.addColorStop(0.6, "#a8a29e");
  grad.addColorStop(1, "#78716c");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // Craters.
  for (let i = 0; i < 140; i++) {
    const a = random(i, 8) * Math.PI * 2;
    const rr = Math.sqrt(random(i, 9)) * r * 0.9;
    const x = r + Math.cos(a) * rr;
    const y = r + Math.sin(a) * rr;
    const cr = 1 + random(i, 10) * 6;
    ctx.fillStyle = "rgba(87,83,78,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(231,229,228,0.7)";
    ctx.beginPath();
    ctx.arc(x - cr * 0.2, y - cr * 0.2, cr * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,113,108,0.8)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Maria (dark basaltic patches).
  ctx.fillStyle = "rgba(87,83,78,0.55)";
  for (let i = 0; i < 4; i++) {
    const x = r + (random(i, 11) - 0.5) * r * 0.8;
    const y = r + (random(i, 12) - 0.5) * r * 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.2 + random(i, 13) * 0.25), r * (0.12 + random(i, 14) * 0.15), random(i, 15) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

function makeStarfield(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const starCount = Math.floor((size * size) / 900);
  for (let i = 0; i < starCount; i++) {
    const x = random(i, 20) * size;
    const y = random(i, 21) * size;
    const rad = 0.4 + random(i, 22) * 1.4;
    const bright = 0.4 + random(i, 23) * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${bright.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
