import type { PlayerState, Rect } from "@/types/game";

export const PLAYER_W = 24;
export const PLAYER_H = 44;
export const MOVE_SPEED = 220;
export const ACCEL = 2600;
export const FRICTION = 2600;
export const JUMP_VELOCITY = 480;
export const MAX_FALL = 900;

/** Normal gravity inside a module (the player stands and walks). */
export const GRAVITY = 1500;

/** Near-zero gravity in open space: the player gently floats. */
export const SPACE_GRAVITY = 90;

/** Thrust (upwards) applied while holding jump/move in zero-g. */
export const THRUST = 700;

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  down: boolean;
}

export interface PhysicsResult {
  player: PlayerState;
  onGround: boolean;
  bonkedHead: boolean;
}

function collides(r: Rect, c: Rect): boolean {
  return (
    r.x < c.x + c.w &&
    r.x + r.w > c.x &&
    r.y < c.y + c.h &&
    r.y + r.h > c.y
  );
}

/**
 * Maximum speed in open space (much lower than walk speed to prevent
 * uncontrollable drift).
 */
const SPACE_MAX_SPEED = 160;

/**
 * Thrust applied per second when firing thrusters in space.
 */
const SPACE_THRUST = 520;

/** Drag applied per second in space when no thrust is active (gentle slow-down).
 */
const SPACE_DRAG = 180;

/**
 * Advances the player one physics step.
 *
 * @param gravity positive value pulls downward (interior), low value makes the
 *        player float (exterior). When `floaty` is set, all directional inputs
 *        fire thrusters (WASD/arrows) consuming suit oxygen as fuel.
 */
export function stepPhysics(
  prev: PlayerState,
  input: InputState,
  solids: Rect[],
  gravity: number,
  floaty: boolean,
  dt: number
): { player: PlayerState; onGround: boolean; bonkedHead: boolean; thrusterActive: boolean } {
  const player = { ...prev, vel: { ...prev.vel } };
  let onGround = prev.onGround;
  let bonkedHead = false;
  let thrusterActive = false;

  if (floaty) {
    // === SPACE MODE: full directional thruster control ===
    let ax = 0;
    let ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.jump) ay -= 1; // up thruster
    if (input.down) ay += 1; // down thruster

    player.facing = ax < 0 ? "left" : ax > 0 ? "right" : player.facing;

    const firing = ax !== 0 || ay !== 0;
    thrusterActive = firing;

    if (firing) {
      // Normalize diagonal so diagonal thrust isn't faster.
      const len = Math.hypot(ax, ay);
      if (len > 0) {
        ax /= len;
        ay /= len;
      }
      player.vel.x += ax * SPACE_THRUST * dt;
      player.vel.y += ay * SPACE_THRUST * dt;
    }

    // Apply drag when not thrusting.
    if (!firing) {
      const speed = Math.hypot(player.vel.x, player.vel.y);
      if (speed > 0.5) {
        const drag = Math.min(SPACE_DRAG * dt, speed);
        const nx = player.vel.x / speed;
        const ny = player.vel.y / speed;
        player.vel.x -= nx * drag;
        player.vel.y -= ny * drag;
      } else {
        player.vel.x = 0;
        player.vel.y = 0;
      }
    }

    // Clamp speed in space.
    const spd = Math.hypot(player.vel.x, player.vel.y);
    if (spd > SPACE_MAX_SPEED) {
      player.vel.x = (player.vel.x / spd) * SPACE_MAX_SPEED;
      player.vel.y = (player.vel.y / spd) * SPACE_MAX_SPEED;
    }

    // Tiny residual gravity to keep things feeling physical.
    player.vel.y += gravity * dt;
  } else {
    // === INTERIOR MODE: normal ground-based movement ===
    let target = 0;
    if (input.left) target -= 1;
    if (input.right) target += 1;
    player.facing = target < 0 ? "left" : target > 0 ? "right" : player.facing;

    if (target !== 0) {
      player.vel.x += target * ACCEL * dt;
      player.vel.x = clamp(player.vel.x, -MOVE_SPEED, MOVE_SPEED);
    } else {
      const dir = player.vel.x > 0 ? -1 : player.vel.x < 0 ? 1 : 0;
      const mag = Math.abs(player.vel.x);
      const next = Math.max(0, mag - FRICTION * dt);
      player.vel.x = dir * next;
    }

    if (input.jump && prev.onGround) {
      player.vel.y = -JUMP_VELOCITY;
      onGround = false;
    }

    // Gravity.
    player.vel.y = clamp(player.vel.y + gravity * dt, -JUMP_VELOCITY, MAX_FALL);
  }

  const box: Rect = {
    x: player.pos.x - PLAYER_W / 2,
    y: player.pos.y,
    w: PLAYER_W,
    h: PLAYER_H,
  };

  // Horizontal axis.
  box.x += player.vel.x * dt;
  for (const s of solids) {
    if (collides(box, s)) {
      if (player.vel.x > 0) box.x = s.x - box.w;
      else if (player.vel.x < 0) box.x = s.x + s.w;
      player.vel.x = 0;
    }
  }

  // Vertical axis.
  box.y += player.vel.y * dt;
  let grounded = false;
  for (const s of solids) {
    if (collides(box, s)) {
      if (player.vel.y > 0) {
        box.y = s.y - box.h;
        grounded = true;
      } else if (player.vel.y < 0) {
        box.y = s.y + s.h;
        bonkedHead = true;
      }
      player.vel.y = 0;
    }
  }
  onGround = grounded;

  player.pos = { x: box.x + box.w / 2, y: box.y };
  player.onGround = onGround;

  return { player, onGround, bonkedHead, thrusterActive };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
