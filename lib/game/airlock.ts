/**
 * Airlock system with animated sliding hatches.
 *
 * Realistic EVA procedure:
 * 1. Player presses E near the inner hatch → hatch slides open
 * 2. Player steps into airlock chamber
 * 3. Inner hatch closes
 * 4. Decompression: air is sucked out (visual/audio feedback)
 * 5. Outer hatch slides open → player can exit to space
 * 6. On return: outer closes → repressurize → inner opens
 *
 * The hatch is a visual sliding door block that replaces the simple
 * teleport trigger with a proper animated sequence.
 */

import { CELL } from "@/data/station";

/** How long each hatch takes to slide open/closed (seconds). */
export const HATCH_SLIDE_TIME = 0.8;

/** How long decompression takes (seconds). */
export const DECOMPRESSION_TIME = 2.0;

/** How long repressurization takes (seconds). */
export const REPRESSURE_TIME = 1.5;

export type AirlockPhase =
  | "idle"           // both hatches closed, ready
  | "inner-opening"  // inner hatch sliding open
  | "inner-open"     // inner hatch fully open, waiting for player
  | "inner-closing"  // inner hatch sliding closed
  | "decompressing"  // air being removed
  | "outer-opening"  // outer hatch sliding open
  | "outer-open"     // outer hatch fully open, player can exit
  | "outer-closing"  // outer hatch sliding closed
  | "repressurizing" // air being restored
  | "sequencing";    // automatic sequence in progress

export interface HatchState {
  /** Position of the hatch in world coords (top-left of the cell). */
  x: number;
  y: number;
  /** 0 = fully closed, 1 = fully open (slides horizontally). */
  openAmount: number;
  /** Whether this hatch is currently animating. */
  animating: boolean;
}

export interface AirlockState {
  phase: AirlockPhase;
  /** Phase timer (0 → phase duration). */
  phaseTimer: number;
  /** Inner hatch (station side). */
  inner: HatchState;
  /** Outer hatch (space side). */
  outer: HatchState;
  /** Whether the player is inside the airlock chamber. */
  playerInside: boolean;
  /** Pressure gauge 0..1 (1 = full atmosphere, 0 = vacuum). */
  pressure: number;
}

/** Creates an airlock state for a door at the given position. */
export function createAirlock(doorX: number, doorY: number): AirlockState {
  return {
    phase: "idle",
    phaseTimer: 0,
    inner: {
      x: doorX - CELL,
      y: doorY - CELL / 2,
      openAmount: 0,
      animating: false,
    },
    outer: {
      x: doorX + 2,
      y: doorY - CELL / 2,
      openAmount: 0,
      animating: false,
    },
    playerInside: false,
    pressure: 1,
  };
}

/** Advances the airlock animation by dt seconds. */
export function stepAirlock(
  prev: AirlockState,
  dt: number
): AirlockState {
  const s = {
    ...prev,
    inner: { ...prev.inner },
    outer: { ...prev.outer },
  };

  switch (s.phase) {
    case "inner-opening": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / HATCH_SLIDE_TIME, 1);
      s.inner.openAmount = easeInOut(t);
      s.inner.animating = true;
      if (t >= 1) {
        s.phase = "inner-open";
        s.phaseTimer = 0;
        s.inner.openAmount = 1;
      }
      break;
    }
    case "inner-open": {
      // Wait for player to step in, then auto-close.
      // In GameCanvas, we detect when player is inside and trigger next phase.
      break;
    }
    case "inner-closing": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / HATCH_SLIDE_TIME, 1);
      s.inner.openAmount = 1 - easeInOut(t);
      if (t >= 1) {
        s.phase = "decompressing";
        s.phaseTimer = 0;
        s.inner.openAmount = 0;
        s.inner.animating = false;
      }
      break;
    }
    case "decompressing": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / DECOMPRESSION_TIME, 1);
      s.pressure = 1 - easeInOut(t);
      if (t >= 1) {
        s.phase = "outer-opening";
        s.phaseTimer = 0;
        s.pressure = 0;
      }
      break;
    }
    case "outer-opening": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / HATCH_SLIDE_TIME, 1);
      s.outer.openAmount = easeInOut(t);
      s.outer.animating = true;
      if (t >= 1) {
        s.phase = "outer-open";
        s.phaseTimer = 0;
        s.outer.openAmount = 1;
      }
      break;
    }
    case "outer-open": {
      // Player can exit to space.
      break;
    }
    case "outer-closing": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / HATCH_SLIDE_TIME, 1);
      s.outer.openAmount = 1 - easeInOut(t);
      if (t >= 1) {
        s.phase = "repressurizing";
        s.phaseTimer = 0;
        s.outer.openAmount = 0;
        s.outer.animating = false;
      }
      break;
    }
    case "repressurizing": {
      s.phaseTimer += dt;
      const t = Math.min(s.phaseTimer / REPRESSURE_TIME, 1);
      s.pressure = easeInOut(t);
      if (t >= 1) {
        s.phase = "inner-opening";
        s.phaseTimer = 0;
        s.pressure = 1;
      }
      break;
    }
    default:
      break;
  }

  return s;
}

/** Starts the departure sequence (inner → decompress → outer). */
export function startDeparture(state: AirlockState): AirlockState {
  if (state.phase !== "idle") return state;
  return { ...state, phase: "inner-opening", phaseTimer: 0 };
}

/** Starts the return sequence (outer → repressurize → inner). */
export function startReturn(state: AirlockState): AirlockState {
  if (state.phase !== "outer-open") return state;
  return { ...state, phase: "outer-closing", phaseTimer: 0, playerInside: true };
}

/** Whether the player can walk through to the exterior. */
export function canExit(state: AirlockState): boolean {
  return state.phase === "outer-open";
}

/** Whether the player can walk back into the station. */
export function canEnter(state: AirlockState): boolean {
  return state.phase === "inner-open" || state.phase === "idle";
}

/** Whether the airlock is busy with a sequence. */
export function isBusy(state: AirlockState): boolean {
  return state.phase !== "idle" && state.phase !== "inner-open" && state.phase !== "outer-open";
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
