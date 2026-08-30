/**
 * Columbus Shuttle system.
 *
 * A supply shuttle arrives periodically (every ~90 seconds) to deliver random
 * resources to the player. The shuttle flies in from the right side of the
 * screen, hovers near the station, drops resource crates, then departs to the
 * left. The player collects crates by clicking on them.
 */

import type { Inventory } from "@/types/game";
import { addResource } from "./inventory";

/** Time in seconds between shuttle arrivals. */
export const SHUTTLE_INTERVAL = 90;

/** How long the shuttle hovers before departing (seconds). */
export const SHUTTLE_HOVER_TIME = 5;

/** How long the shuttle takes to fly in/out (seconds). */
export const SHUTTLE_FLY_TIME = 3;

/** Max resources the shuttle can drop per visit. */
const MAX_CRATES = 3;

export type ShuttlePhase =
  | "gone"       // shuttle is away, timer counting down
  | "approaching" // flying in from the right
  | "hovering"    // stationary, dropping crates
  | "departing";  // flying out to the left

export interface ResourceCrate {
  id: string;
  x: number;
  y: number;
  kind: string;
  amount: number;
  collected: boolean;
  /** Time since crate appeared (for bob animation). */
  age: number;
}

export interface ShuttleState {
  phase: ShuttlePhase;
  /** Countdown until next arrival (seconds). */
  timer: number;
  /** Phase timer (0 → phase duration). */
  phaseTimer: number;
  /** Shuttle x position in world coords. */
  x: number;
  y: number;
  /** Crates dropped by the shuttle. */
  crates: ResourceCrate[];
  /** The notice message to show. */
  notice: string | null;
  noticeTimer: number;
}

let crateSeq = 0;

/** Creates a fresh shuttle state (first arrival in SHUTTLE_INTERVAL seconds). */
export function freshShuttle(): ShuttleState {
  return {
    phase: "gone",
    timer: SHUTTLE_INTERVAL,
    phaseTimer: 0,
    x: 2000,
    y: 300,
    crates: [],
    notice: null,
    noticeTimer: 0,
  };
}

/** The station door x coordinate (world). */
const STATION_DOOR_X = 640 + 32; // STATION_X1 + CELL

/** Hover position: just above the station door. */
const HOVER_X = STATION_DOOR_X + 60;
const HOVER_Y = 250;

/**
 * Advances the shuttle simulation by dt seconds. Returns the new state.
 */
export function stepShuttle(
  prev: ShuttleState,
  dt: number
): ShuttleState {
  const s = { ...prev, crates: [...prev.crates] };

  // Tick down notice timer.
  if (s.noticeTimer > 0) {
    s.noticeTimer -= dt;
    if (s.noticeTimer <= 0) s.notice = null;
  }

  switch (s.phase) {
    case "gone": {
      s.timer -= dt;
      if (s.timer <= 10 && s.timer + dt > 10) {
        s.notice = "🚀 ¡El Columbus se acerca! Prepárate para recibir suministros.";
        s.noticeTimer = 4;
      }
      if (s.timer <= 0) {
        s.phase = "approaching";
        s.phaseTimer = 0;
        s.x = 2000; // start off-screen right
        s.y = HOVER_Y;
        s.notice = "🚀 ¡El Columbus ha llegado!";
        s.noticeTimer = 3;
      }
      break;
    }
    case "approaching": {
      s.phaseTimer += dt;
      // Fly from right to hover position.
      const t = Math.min(s.phaseTimer / SHUTTLE_FLY_TIME, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
      s.x = 2000 + (HOVER_X - 2000) * ease;
      s.y = HOVER_Y + Math.sin(t * Math.PI * 2) * 8; // gentle wobble
      if (t >= 1) {
        s.phase = "hovering";
        s.phaseTimer = 0;
        s.x = HOVER_X;
        s.y = HOVER_Y;
        // Drop resource crates.
        dropCrates(s);
      }
      break;
    }
    case "hovering": {
      s.phaseTimer += dt;
      // Gentle hover bob.
      s.y = HOVER_Y + Math.sin(s.phaseTimer * 1.5) * 4;
      if (s.phaseTimer >= SHUTTLE_HOVER_TIME) {
        s.phase = "departing";
        s.phaseTimer = 0;
        s.notice = "🚀 El Columbus se despide. ¡Hasta la próxima!";
        s.noticeTimer = 3;
      }
      break;
    }
    case "departing": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / SHUTTLE_FLY_TIME, 1);
      const ease = t * t; // ease in
      s.x = HOVER_X + (-400 - HOVER_X) * ease;
      s.y = HOVER_Y - t * 60; // climb as it leaves
      if (t >= 1) {
        s.phase = "gone";
        s.timer = SHUTTLE_INTERVAL;
        s.phaseTimer = 0;
      }
      break;
    }
  }

  // Age the crates.
  for (const c of s.crates) {
    if (!c.collected) c.age += dt;
  }

  return s;
}

/** Drops 1-3 random resource crates near the shuttle. */
function dropCrates(s: ShuttleState): void {
  const count = 1 + Math.floor(Math.random() * MAX_CRATES);
  const resourcePool = ["metal", "metal", "silicon", "glass", "water", "energy", "robotic-arm"];
  for (let i = 0; i < count; i++) {
    const kind = resourcePool[Math.floor(Math.random() * resourcePool.length)];
    const amount = kind === "energy" ? 2 : 3 + Math.floor(Math.random() * 4);
    s.crates.push({
      id: `crate-${++crateSeq}`,
      x: s.x - 20 + i * 30,
      y: s.y + 40 + i * 8, // drop below shuttle
      kind,
      amount,
      collected: false,
      age: 0,
    });
  }
}

/**
 * Attempts to collect a crate at world position (wx, wy).
 * Returns the resource gained, or null if no crate was hit.
 */
export function collectCrate(
  state: ShuttleState,
  wx: number,
  wy: number
): { state: ShuttleState; gained: { kind: string; amount: number } | null } {
  const s = { ...state, crates: [...state.crates] };
  const COLLECT_RADIUS = 28;
  for (const c of s.crates) {
    if (c.collected) continue;
    const dx = wx - c.x;
    const dy = wy - c.y;
    if (Math.hypot(dx, dy) <= COLLECT_RADIUS) {
      c.collected = true;
      return { state: s, gained: { kind: c.kind, amount: c.amount } };
    }
  }
  return { state: s, gained: null };
}

/** True when the shuttle is visible on screen (not in "gone" phase). */
export function shuttleVisible(state: ShuttleState): boolean {
  return state.phase !== "gone";
}

/** True when there are uncollected crates on screen. */
export function hasCrates(state: ShuttleState): boolean {
  return state.crates.some((c) => !c.collected);
}
