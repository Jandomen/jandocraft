/**
 * Pure space-time model for the day/night cycle and celestial motion.
 *
 * Everything here is a pure function of the elapsed sky time so the rendering
 * loop stays deterministic and easy to unit test. A single scalar advances
 * through a cycle and drives the whole sky: the Sun rises high at noon and
 * sinks below the horizon at night, the Moon peaks when the Sun is down, and a
 * continuous `daylight` (0 = dead of night, 1 = full daylight) fades in/out for
 * smooth, gradual dawn/dusk transitions.
 */

/** Full real-time (seconds) for one complete day/night cycle. */
export const DAY_DURATION = 120;

export interface SkyPos {
  /** Normalized screen position (0..1) * viewport size. */
  u: number;
  v: number;
  /** Normalized elevation, 0 = below horizon .. 1 = high noon/zenith. */
  elevation: number;
}

export interface SpaceTime {
  /** Seconds elapsed in the sky cycle. */
  elapsed: number;
  /** Normalized cycle phase, 0..1 (0 and 1 = start of day). */
  phase: number;
  /** Continuous daylight, 0..1. 1 = midday, 0 = midnight. */
  daylight: number;
  /** True while the Sun is on the rising side of its arc. */
  sunrise: boolean;
  sun: SkyPos;
  moon: SkyPos;
  /** Horizontal direction the Sun lights the scene from (-1 left, +1 right). */
  sunLightDir: number;
}

/** Advances the sky clock by `dt` seconds, returning a new SpaceTime. */
export function advanceSpaceTime(prior: SpaceTime, dt: number): SpaceTime {
  return computeSpaceTime(prior.elapsed + dt);
}

/** Computes the full scene state from raw elapsed seconds. */
export function computeSpaceTime(elapsed: number): SpaceTime {
  const phase = mod(elapsed / DAY_DURATION, 1);

  // Sun elevation envelope over the full cycle: 0 at night ends, 1 at noon.
  const sunElev = hump(phase);
  const daylight = smoothstep(0.14, 0.55, sunElev);

  // Sun position: sweeps left->right rising, right->left setting; drops below
  // the screen at night (v near/past 1).
  const sun = {
    u: sweepU(phase),
    v: 1.02 - sunElev * 0.78,
    elevation: sunElev,
  };

  // Moon runs on the complementary half so it is up when the Sun is down.
  const moonPhase = mod(phase + 0.5, 1);
  const moonElev = hump(moonPhase) * 0.9;
  const moon = {
    u: sweepU(moonPhase),
    v: 0.96 - moonElev * 0.6,
    elevation: moonElev,
  };

  return {
    elapsed,
    phase,
    daylight,
    sunrise: phase < 0.5,
    sun,
    moon,
    sunLightDir: phase < 0.5 ? 1 : -1,
  };
}

/** As the phase goes 0->1 the point sweeps left->right (0..0.5) then back. */
function sweepU(phase: number): number {
  if (phase < 0.5) return lerp(0.1, 0.9, phase * 2);
  return lerp(0.9, 0.1, (phase - 0.5) * 2);
}

/** A smooth 0..1 hump: 0 at the edges, 1 in the middle. */
function hump(p: number): number {
  return 0.5 - 0.5 * Math.cos(clamp(p, 0, 1) * 2 * Math.PI);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Produces an initial SpaceTime (early morning, just after sunrise). */
export function zeroSpaceTime(): SpaceTime {
  return computeSpaceTime(DAY_DURATION * 0.09);
}
