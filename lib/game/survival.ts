import type {
  Inventory,
  ModuleDef,
  PlacedBlock,
  PlayerState,
  StationVitals,
  SurvivalState,
  Zone,
} from "@/types/game";
import { isInsideAnyModule } from "./zones";
import { playerSpawn } from "@/data/station";
import { trySpend } from "./inventory";
import { PLAYER_H } from "./physics";

/**
 * Survival & station-maintenance system.
 *
 * Everything here is a pure function over the survival bag (`SurvivalState`)
 * plus its inputs, so it is easy to unit test and to extend with future
 * systems (food, temperature, radiation, crops, automation): add a field to
 * `SurvivalState` and a companion pure function that mutates it each tick.
 */

// --- Player health -------------------------------------------------------
export const MAX_HEALTH = 100;
export const HEALTH_REGEN_INSIDE = 2; // per second while station is habitable

// --- Spacesuit -----------------------------------------------------------
export const SUIT_OXYGEN_MAX = 100;
export const SUIT_OXYGEN_RECHARGE = 12; // per second while inside a module
export const SUIT_OXYGEN_CONSUME = 2.0; // per second while in open space (reduced for longer EVA)

// --- Station vitals ------------------------------------------------------
export const VITALS_MAX = 100;
export const POWER_PANEL = 1.4; // generated per second by each solar panel
export const POWER_CORE = 1.0; // baseline generation of the station core
export const LIFE_SUPPORT_COST = 1.6; // power consumed per second by life support
export const OXYGEN_REGEN = 6; // per second toward 100 when life support is on
export const OXYGEN_DECAY = 5; // per second down when life support is off
export const POWER_DRAIN = 5; // per second when the net power balance is negative

// --- Module integrity ----------------------------------------------------
export const INTEGRITY_MAX = 100;
export const INTEGRITY_WEAR = 0.05; // per second of natural hull wear
export const REPAIR_COST: Record<string, number> = { metal: 1, silicon: 1 };
export const REPAIR_GAIN = 15; // integrity restored per repair action

// --- Damage --------------------------------------------------------------
export const SUFFOCATE_DMG = 14; // per second exposed to vacuum without air
export const STATION_HYPOXIA_DMG = 8; // per second inside a depressurised / no-O2 station

/**
 * Survival is stepped for a fixed small timestep so rendering fps and logic
 * stay decoupled and remain deterministic.
 */
export const SURVIVAL_STEP = 0.25;

/** The station module the player is currently inside, if any. */
export function currentModule(modules: ModuleDef[], zone: Zone, player: PlayerState): ModuleDef | null {
  if (zone !== "interior") return null;
  const py = player.pos.y + PLAYER_H / 2;
  for (const m of modules) {
    if (isInsideAnyModule([m], player.pos.x, py)) return m;
  }
  return null;
}

/** Creates a fresh, fully-working survival state for a new game. */
export function freshSurvival(moduleIds: string[]): SurvivalState {
  const integrity: Record<string, number> = {};
  for (const id of moduleIds) integrity[id] = INTEGRITY_MAX;
  return {
    health: MAX_HEALTH,
    alive: true,
    suit: { equipped: false, oxygen: SUIT_OXYGEN_MAX },
    station: { oxygen: 90, power: 100, pressure: 100 },
    integrity,
    accumulator: 0,
  };
}

/**
 * Advances the whole survival system by `dt` seconds. Returns a new survival
 * state (and may tweak the player when suffocation/damage is relevant).
 */
export function stepSurvival(
  survival: SurvivalState,
  zone: Zone,
  blocks: PlacedBlock[],
  module: ModuleDef | null,
  dt: number
): { survival: SurvivalState } {
  if (!survival.alive) return { survival };

  // Accumulate real seconds, then advance in fixed steps for determinism.
  let acc = survival.accumulator + dt;
  let s = survival;
  while (acc >= SURVIVAL_STEP) {
    s = stepSurvivalFixed(s, zone, blocks, module, SURVIVAL_STEP);
    acc -= SURVIVAL_STEP;
  }
  return { survival: { ...s, accumulator: acc } };
}

/** One fixed survival step (independent of frame rate). */
function stepSurvivalFixed(
  survival: SurvivalState,
  zone: Zone,
  blocks: PlacedBlock[],
  module: ModuleDef | null,
  dt: number
): SurvivalState {
  const integrity = { ...survival.integrity };
  for (const id of Object.keys(integrity)) {
    integrity[id] = clamp(integrity[id] - INTEGRITY_WEAR * dt, 0, INTEGRITY_MAX);
  }

  const station = advanceStationVitals(
    survival.station,
    blocks,
    module ? integrity[module.id] ?? INTEGRITY_MAX : 0,
    dt
  );
  const suit = advanceSuit(survival.suit, zone, station, dt);
  const health = advanceHealth(
    survival.health,
    zone,
    survival.suit,
    suit,
    station,
    dt
  );

  const alive = health > 0;
  return {
    ...survival,
    health: clamp(health, 0, MAX_HEALTH),
    alive,
    suit,
    station,
    integrity,
    accumulator: 0,
  };
}

/** Power / oxygen / pressure dynamics over a step. */
function advanceStationVitals(
  station: StationVitals,
  blocks: PlacedBlock[],
  moduleIntegrity: number,
  dt: number
): StationVitals {
  let powerGen = POWER_CORE;
  for (const b of blocks) {
    if (b.kind === "solar-panel") powerGen += POWER_PANEL;
  }
  // Batteries (energised reservoirs) slightly boost effective stored energy.
  for (const b of blocks) {
    if (b.kind === "battery") powerGen += POWER_PANEL * 0.5;
  }

  let power = station.power + (powerGen - LIFE_SUPPORT_COST) * dt;
  power = clamp(power, 0, VITALS_MAX);

  // Life support is active while there is stored power to run it.
  const lifeSupportOn = power > 0 || powerGen >= LIFE_SUPPORT_COST;

  let oxygen = station.oxygen;
  oxygen = lifeSupportOn
    ? approach(oxygen, VITALS_MAX, OXYGEN_REGEN * dt)
    : approach(oxygen, 0, OXYGEN_DECAY * dt);

  // Pressure follows the integrity of the module the player is in: a damaged
  // hull cannot hold a high interior pressure. In space there is no pressure.
  const pressureTarget = lifeSupportOn ? moduleIntegrity : 0;
  const pressure = approach(station.pressure, pressureTarget, 14 * dt);

  return { oxygen, power, pressure };
}

function advanceSuit(
  suit: SurvivalState["suit"],
  zone: Zone,
  station: StationVitals,
  dt: number
): SurvivalState["suit"] {
  let oxygen = suit.oxygen;
  if (zone === "interior") {
    const recharge = Math.min(SUIT_OXYGEN_RECHARGE * dt, SUIT_OXYGEN_MAX - oxygen);
    oxygen += recharge;
    // Recharging draws a bit of station oxygen (life support output).
    oxygen = clamp(oxygen, 0, SUIT_OXYGEN_MAX);
  } else {
    oxygen = clamp(oxygen - SUIT_OXYGEN_CONSUME * dt, 0, SUIT_OXYGEN_MAX);
  }
  return { ...suit, oxygen };
}

function advanceHealth(
  health: number,
  zone: Zone,
  suit: SurvivalState["suit"],
  newSuit: SurvivalState["suit"],
  station: StationVitals,
  dt: number
): number {
  let hp = health;

  if (zone === "exterior") {
    // In open space the suit is mandatory. Without it (or with an empty tank)
    // the player starts suffocating immediately.
    const protectedBySuit = newSuit.equipped && newSuit.oxygen > 0;
    if (!protectedBySuit) hp -= SUFFOCATE_DMG * dt;
    return hp;
  }

  // Interior: safe as long as the station holds atmosphere + pressure.
  const habitable = station.oxygen > 0 && station.pressure > 0;
  if (!habitable) {
    hp -= STATION_HYPOXIA_DMG * dt;
  } else if (suit.equipped && newSuit.oxygen < SUIT_OXYGEN_MAX) {
    // Breathing recharges the suit a little on top of its own regen channel.
    hp = Math.min(MAX_HEALTH, hp + HEALTH_REGEN_INSIDE * 0.25 * dt);
  } else if (health > 0) {
    hp += HEALTH_REGEN_INSIDE * dt;
  }
  return hp;
}

/** Toggles the spacesuit on/off (only makes sense while alive). */
export function toggleSuit(survival: SurvivalState): SurvivalState {
  if (!survival.alive) return survival;
  return { ...survival, suit: { ...survival.suit, equipped: !survival.suit.equipped } };
}

/**
 * Repairs the given module's hull integrity, spending resources from the
 * inventory. Returns the new survival + inventory, or the originals if the
 * module is already intact / resources are insufficient.
 */
export function repairModule(
  survival: SurvivalState,
  inventory: Inventory,
  moduleId: string
): { survival: SurvivalState; inventory: Inventory; repaired: boolean } {
  const current = survival.integrity[moduleId] ?? INTEGRITY_MAX;
  if (current >= INTEGRITY_MAX) return { survival, inventory, repaired: false };
  const spent = trySpend(inventory, REPAIR_COST);
  if (!spent.ok) return { survival, inventory, repaired: false };
  const integrity = {
    ...survival.integrity,
    [moduleId]: clamp(current + REPAIR_GAIN, 0, INTEGRITY_MAX),
  };
  return {
    survival: { ...survival, integrity } as SurvivalState,
    inventory: spent.inv as Inventory,
    repaired: true,
  };
}

export interface RespawnResult {
  survival: SurvivalState;
  player: PlayerState;
}

/** Respawns the player inside the station after death. */
export function respawnSurvival(
  survival: SurvivalState,
  moduleIds: string[]
): RespawnResult {
  return {
    survival: {
      ...freshSurvival(moduleIds),
      health: MAX_HEALTH * 0.5,
      suit: { ...survival.suit, equipped: false, oxygen: SUIT_OXYGEN_MAX },
    },
    player: {
      pos: playerSpawn(),
      vel: { x: 0, y: 0 },
      facing: "right",
      onGround: false,
    },
  };
}

/** True when the player is suffocating / exposed without protection. */
export function isExposed(
  survival: SurvivalState,
  zone: Zone,
  insideModule: boolean
): boolean {
  if (!survival.alive) return false;
  if (zone === "exterior") {
    return !(survival.suit.equipped && survival.suit.oxygen > 0);
  }
  if (!insideModule) return false;
  return survival.station.oxygen <= 0 || survival.station.pressure <= 0;
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return value;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
