export type Vec2 = {
  x: number;
  y: number;
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = "left" | "right";

/** A block the player can place / interact with inside the station. */
export type BlockKind =
  | "floor"
  | "wall"
  | "window"
  | "solar-panel"
  | "storage"
  | "light"
  | "plants"
  | "life-support"
  | "battery"
  | "tether-point"
  | "robotic-arm";

export type ResourceKind = "metal" | "glass" | "silicon" | "energy" | "water" | "robotic-arm";

export interface BlockDef {
  kind: BlockKind;
  label: string;
  color: string;
  /** Auto-drawn hull/frame color when rendered. */
  frameColor: string;
  solid: boolean;
  /** Cost in resources to craft one block. */
  cost: Partial<Record<ResourceKind, number>>;
  key: ResourceKind | null;
}

export interface ResourceDef {
  kind: ResourceKind;
  label: string;
  color: string;
}

export interface PlacedBlock {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
}

export interface Inventory {
  [key: string]: number;
}

export interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  facing: Direction;
  onGround: boolean;
}

/** Whether the player is inside a module (interior) or outside in space. */
export type Zone = "interior" | "exterior";

/** Vertical/horizontal boundary a door sits on. */
export type DoorSide = "left" | "right" | "top" | "bottom";

/** A functional doorway connecting a module interior to the exterior space. */
export interface Door {
  id: string;
  moduleId: string;
  side: DoorSide;
  /** World position of the doorway center. */
  x: number;
  y: number;
  /** Where to place the player just inside the door (interior zone). */
  interiorSpot: Vec2;
  /** Where to place the player just outside the door (exterior zone). */
  exteriorSpot: Vec2;
  /** Distance (px) from the door threshold within which the door is usable. */
  range: number;
}

/** Describes a single expandable room/module of the station. */
export interface ModuleDef {
  id: string;
  name: string;
  label: string;
  /** Interior walkable region bounds (world coordinates). */
  bounds: Rect;
  /** World y of the walkable floor surface inside the module. */
  floorY: number;
  /** Interior wall thickness (px), used to build collision. */
  wall: number;
  doors: Door[];
}

export interface SaveData {
  version: number;
  player: PlayerState;
  zone: Zone;
  blocks: PlacedBlock[];
  inventory: Inventory;
  survival: SurvivalState;
  savedAt: string;
}

/** Status of the player's spacesuit. */
export interface SuitState {
  equipped: boolean;
  /** On-board oxygen, 0..100. */
  oxygen: number;
}

/** Station-wide vital supplies, all 0..100. */
export interface StationVitals {
  oxygen: number;
  power: number;
  pressure: number;
}

/**
 * Aggregated survival state. Kept as a flat bag so future systems (food,
 * temperature, radiation, crops, automation) can add their own fields without
 * restructuring the interface.
 */
export interface SurvivalState {
  /** Player current health, 0..100. */
  health: number;
  alive: boolean;
  suit: SuitState;
  station: StationVitals;
  /** Module hull integrity keyed by module id, 0..100. */
  integrity: Record<string, number>;
  /** Accumulated seconds since the last survival tick (decoupled from fps). */
  accumulator: number;
}

export interface PersistedIsh {
  game: SaveData;
  updated_at: string;
}

/** Immutable snapshot pushed from the game loop for the UI layer (HUD). */
export interface GameSnapshot {
  player: PlayerState;
  zone: Zone;
  inventory: Inventory;
  blockCount: number;
  onGround: boolean;
  canPlace: boolean;
  /** Label of the door the player can currently use, if any. */
  doorPrompt: string | null;
  saveStatus: "idle" | "saving" | "saved" | "local";
  survival: SurvivalState;
  /** True when the player is suffocating / exposed in space without protection. */
  exposed: boolean;
  /** Set to true for a few frames after the player dies (respawn in progress). */
  dead: boolean;
  /** Transient gameplay message shown as a toast, if any. */
  notice: string | null;
  /** True while the game is paused (physics/resources/game-time halted). */
  paused: boolean;
  /** True when the player is clipped to a tether anchor. */
  tethered: boolean;
  /** Seconds until the next Columbus shuttle arrival (null if shuttle is on-screen). */
  shuttleTimer: number | null;
}
