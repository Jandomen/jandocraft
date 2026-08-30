import type { ResourceKind } from "@/types/game";

/**
 * Modular descriptor for a body in the space backdrop.
 *
 * The scene renderer loops over `SPACE_OBJECTS` (plus the dynamic starfield)
 * and draws each via its `render` kind. To add new space objects later (extra
 * planets, meteorites, ships, comets, etc.) add an entry here with a render
 * kind and implement that kind in the renderer — no other wiring is required.
 */

export type SpaceRenderKind = "earth" | "sun" | "moon";

export type SpaceObjectDef =
  | {
      kind: "solid";
      render: "earth" | "moon";
      /** Normalized position in the sky viewport (0..1). */
      u: number;
      v: number;
      /** Maximum radius as a fraction of the viewport's smaller dimension. */
      radiusFrac: number;
      /** Depth for parallax: 0 = infinitely far, 1 = close to the camera. */
      depth: number;
      /** Radians per second the body rotates. */
      spin: number;
    }
  | {
      kind: "light";
      render: "sun";
      /** Base normalized position (the moving path overrides this live). */
      u: number;
      v: number;
      radiusFrac: number;
      depth: number;
    };

/**
 * Earth: spans the full screen width, sitting near the bottom of the sky so it
 * dominates the background and gives the feeling of orbiting above a massive
 * planet. The radius is calculated from the viewport width in the scene.
 */
export const EARTH: SpaceObjectDef = {
  kind: "solid",
  render: "earth",
  u: 0.5,
  v: 0.88,
  radiusFrac: 0.3,
  depth: 0.4,
  spin: 0.02, // slow rotation
};

/** Moon: smaller, farther than Earth (deeper parallax), visible in upper sky. */
export const MOON: SpaceObjectDef = {
  kind: "solid",
  render: "moon",
  u: 0.72,
  v: 0.18,
  radiusFrac: 0.065,
  depth: 0.2,
  spin: 0.004,
};

/** Sun: a light source placed far behind everything else, upper sky. */
export const SUN: SpaceObjectDef = {
  kind: "light",
  render: "sun",
  u: 0.25,
  v: 0.15,
  radiusFrac: 0.09,
  depth: 0.05,
};

/** Neutral bodies placed with static positions (no orbital path). */
export const STATIC_BODIES: SpaceObjectDef[] = [EARTH, MOON];

/** The moving Sun (position overridden each frame from SpaceTime). */
export const MOVING_SUN: SpaceObjectDef = SUN;

/** Optional PNG texture overrides, loaded from `/textures/<name>.png`. */
export interface TextureOverride {
  /** File name under /textures/ (without extension). */
  name: string;
  /** The procedural texture slot it replaces. */
  slot: "earth-day" | "earth-night" | "sun" | "moon" | "starfield";
}

/**
 * To drop in custom artwork, create `/public/textures/manifest.json` containing
 * an array of `TextureOverride` entries, e.g.:
 *
 *   [
 *     { "name": "earth-day", "slot": "earth-day" },
 *     { "name": "moon", "slot": "moon" }
 *   ]
 *
 * Only PNGs listed in the manifest are requested (so an empty folder causes no
 * 404s); unlisted slots keep their procedural textures. The manifest array is
 * only loaded at runtime by `components/game/space/textures.ts`.
 */

/** Reserved for future resource-based survival interactions, if any. */
export type SpaceResource = ResourceKind;
