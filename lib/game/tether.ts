import type { PlacedBlock, PlayerState } from "@/types/game";
import { PLAYER_H } from "./physics";

/**
 * Tether / lasso mechanics.
 *
 * The astronaut can clip a tether to a "tether-point" (Soporte) placed on the
 * station. While clipped, a virtual rope constrains them: they can float and
 * use their thrusters, but the rope holds them from drifting further than
 * `MAX_LEN` away from the anchor. When the rope is at full tension, the
 * player's outward velocity is cancelled while the tangential component is
 * preserved, so they swing around the anchor instead of being yanked.
 */

/** How close (px) the astronaut must be to a support to clip in. */
export const TETHER_TOGGLE_RANGE = 70;
/** Rope length limit (px) from the anchor while clipped. */
export const TETHER_MAX_LEN = 240;

export interface TetherState {
  anchorId: string;
  anchorX: number;
  anchorY: number;
  maxLen: number;
}

export interface TetherStep {
  player: PlayerState;
  /** True when the rope is actually holding (under tension) this frame. */
  taut: boolean;
}

/** Finds the nearest reachable tether anchor block within the toggle range. */
export function findTetherAnchor(
  blocks: PlacedBlock[],
  player: PlayerState
): { id: string; x: number; y: number } | null {
  let best: { id: string; x: number; y: number } | null = null;
  let bestD = TETHER_TOGGLE_RANGE;
  const px = player.pos.x;
  const py = player.pos.y + PLAYER_H / 2;
  for (const b of blocks) {
    if (b.kind !== "tether-point") continue;
    const ax = b.x + 16; // cell centre
    const ay = b.y + 10; // the mount/hook point
    const d = Math.hypot(ax - px, ay - py);
    if (d <= bestD) {
      bestD = d;
      best = { id: b.id, x: ax, y: ay };
    }
  }
  return best;
}

/**
 * Applies the tether constraint to the player after their physics step.
 *
 * Works in world coordinates: the player box centre is compared to the anchor.
 * Returns the possibly-corrected player plus whether the rope is under tension.
 */
export function stepTether(
  prev: PlayerState,
  tether: TetherState | null
): TetherStep {
  const player = { ...prev, vel: { ...prev.vel } };
  if (!tether) return { player, taut: false };

  const cx = player.pos.x;
  const cy = player.pos.y + PLAYER_H / 2;
  const dx = cx - tether.anchorX;
  const dy = cy - tether.anchorY;
  const d = Math.hypot(dx, dy);
  if (d < 1e-4) return { player, taut: false };

  // Soft pull: keep the player snug against the anchor rather than floating
  // around at maximum slack.
  const tensionLen = tether.maxLen;
  if (d > tensionLen) {
    const nx = dx / d;
    const ny = dy / d;
    // Reject the outward (radial) part of the velocity, keep the tangential.
    const radial = player.vel.x * nx + player.vel.y * ny;
    const tx = player.vel.x - radial * nx;
    const ty = player.vel.y - radial * ny;
    // Position back at rope length from the anchor (centred on the player box).
    const newCX = tether.anchorX + nx * tensionLen;
    const newCY = tether.anchorY + ny * tensionLen;
    player.pos.x = newCX;
    player.pos.y = newCY - PLAYER_H / 2;
    // A little inward damping so swinging feels weighty but controllable.
    player.vel.x = tx + nx * (d > tensionLen * 1.3 ? 40 : 0);
    player.vel.y = ty + ny * (d > tensionLen * 1.3 ? 40 : 0);
    return { player, taut: true };
  }

  return { player, taut: false };
}

/** Moves the player back by `amount` if they are clipped (no-op otherwise). */
export function isTaut(tether: TetherState | null, player: PlayerState): boolean {
  if (!tether) return false;
  const cx = player.pos.x;
  const cy = player.pos.y + PLAYER_H / 2;
  return Math.hypot(cx - tether.anchorX, cy - tether.anchorY) >= tether.maxLen - 0.5;
}
