/**
 * Pause state - a tiny pure model describing whether the game is paused.
 *
 * Kept separate from the game loop so that pause gating (which halts physics,
 * survival/resource consumption and game time) stays decoupled and testable.
 */

export interface PauseState {
  paused: boolean;
}

export function initialPause(): PauseState {
  return { paused: false };
}

export function togglePause(state: PauseState): PauseState {
  return { paused: !state.paused };
}

export function setPaused(state: PauseState, paused: boolean): PauseState {
  return { paused };
}

export function isPaused(state: PauseState): boolean {
  return state.paused;
}
