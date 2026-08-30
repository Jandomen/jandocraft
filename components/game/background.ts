import type { SpaceTime } from "@/lib/game/spaceTime";
import { ensureTextures } from "./space/textures";
import { drawSpaceScene } from "./space";

/**
 * Space backdrop entry point.
 *
 * Draws the full parallax sky (stars, Sun, Earth, Moon) behind the exterior
 * scene and returns a 0..1 `sunLight` factor so the caller can tint the whole
 * world — the Sun visibly lights the scene. Local textures are loaded once.
 */

export interface BackgroundResult {
  /** 0..1 scene brightness driven by the Sun. */
  sunLight: number;
}

/** Ensures the optional PNG texture overrides are loaded. Call once. */
export function loadBackgroundAssets(): void {
  ensureTextures();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  spaceTime: SpaceTime,
  camDriftX: number,
  camDriftY: number
): BackgroundResult {
  const out = drawSpaceScene({
    ctx,
    width: w,
    height: h,
    time,
    spaceTime,
    camDriftX,
    camDriftY,
  });
  return { sunLight: out.sunLight };
}
