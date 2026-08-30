"use client";

import { useEffect, useRef, useCallback } from "react";
import type { BlockKind, Door, GameSnapshot, SaveData, Vec2, Zone } from "@/types/game";
import { STATION_X0, STATION_X1, STATION_TOP_Y, CELL, createStationModules } from "@/data/station";
import { stepPhysics, SPACE_GRAVITY, GRAVITY, PLAYER_W, PLAYER_H } from "@/lib/game/physics";
import {
  targetCell,
  cellContains,
  placeBlock,
  removeBlock,
  hasSolidNeighbour,
  initialWorldBounds,
} from "@/lib/game/world";
import {
  solidsForZone,
  findUsableDoor,
  doorSpot,
  oppositeZone,
} from "@/lib/game/zones";
import { craftBlock } from "@/lib/game/crafting";
import { blockCost } from "@/data/blocks";
import {
  findTetherAnchor,
  stepTether,
  isTaut,
  TETHER_MAX_LEN,
  type TetherState,
} from "@/lib/game/tether";
import { saveGame } from "@/lib/supabase";
import {
  currentModule,
  stepSurvival,
  toggleSuit,
  repairModule,
  respawnSurvival,
  isExposed,
  REPAIR_GAIN,
} from "@/lib/game/survival";
import { STATION_MODULE_ID } from "@/data/station";
import { drawBackground, loadBackgroundAssets } from "./background";
import { advanceSpaceTime, zeroSpaceTime, type SpaceTime } from "@/lib/game/spaceTime";
import { drawStation, drawDoorsExterior, drawPlacementPreview } from "./station";
import { drawInterior } from "./interior";
import { drawCharacter, drawTetherRope, drawNPC, createNPC, stepNPC, type NPCState } from "./character";
import { audioManager, ensureAudioStarted } from "@/lib/audio/audioManager";
import { freshShuttle, stepShuttle, collectCrate, shuttleVisible, type ShuttleState } from "@/lib/game/shuttle";
import { addResource } from "@/lib/game/inventory";
import { drawShuttle } from "./shuttleRenderer";


export type Tool = "build" | "remove";

interface GameCanvasProps {
  initialSave: SaveData;
  selectedKind: BlockKind;
  tool: Tool;
  onSnapshot: (snap: GameSnapshot) => void;
}

interface Transition {
  active: boolean;
  /** Progress 0..1 over the whole fade. */
  t: number;
  /** Target zone for this transition. */
  toZone: Zone;
  door: Door | null;
  teleported: boolean;
}

const TRANSITION_DURATION = 0.5;

/** Oxygen consumed per second when firing thrusters in space. */
const THRUST_OXYGEN_COST = 5;

const RESPAWN_DELAY = 2.2;

/** Camera follows the player with this smoothing (higher = snappier). */
const CAM_SMOOTH = 6;

interface MutableState {
  save: SaveData;
  tool: Tool;
  selectedKind: BlockKind;
  pointer: { x: number; y: number; inside: boolean };
  autosaveTimer: number;
  saveStatus: GameSnapshot["saveStatus"];
  lastEmit: number;
  transition: Transition | null;
  doorPrompt: string | null;
  notice: string | null;
  noticeTimer: number;
  deathTimer: number;
  exposed: boolean;
  spaceTime: SpaceTime;
  /** True while the game is paused. */
  paused: boolean;
  /** Accumulator for the hazard alarm SFX while exposed. */
  alarmTimer: number;
  /** Current camera top-left in world coords (smoothed, clamped to world). */
  cam: Vec2;
  /** Reference camera used to derive background parallax offsets. */
  baseCam: Vec2;
  /** World-space bounds of the playable area (kept for future systems). */
  world: { minX: number; maxX: number; minY: number; maxY: number };
  /** Active tether (lazo) anchor the player is clipped to, if any. */
  tether: TetherState | null;
  /** Columbus shuttle state. */
  shuttle: ShuttleState;
  /** Airlock visual animation phase. */
  airlockAnim: "idle" | "opening" | "closing";
  airlockAnimTimer: number;
  /** NPC companion inside the station. */
  npc: NPCState;

}

const modules = createStationModules();

export default function GameCanvas({
  initialSave,
  selectedKind,
  tool,
  onSnapshot,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<MutableState>({
    save: initialSave,
    tool,
    selectedKind,
    pointer: { x: 0, y: 0, inside: false },
    autosaveTimer: 0,
    saveStatus: "idle",
    lastEmit: 0,
    transition: null,
    doorPrompt: null,
    notice: null,
    noticeTimer: 0,
    deathTimer: 0,
    exposed: false,
    spaceTime: zeroSpaceTime(),
    paused: false,
    alarmTimer: 0,
    cam: { x: (STATION_X0 + STATION_X1) / 2, y: STATION_TOP_Y },
    baseCam: { x: (STATION_X0 + STATION_X1) / 2, y: STATION_TOP_Y },
    world: initialWorldBounds(initialSave.blocks),
    tether: null,
    shuttle: freshShuttle(),
    airlockAnim: "idle",
    airlockAnimTimer: 0,
    npc: createNPC(
      (STATION_X0 + STATION_X1) / 2,
      STATION_TOP_Y - 44,
      STATION_X0 + CELL * 3,
      STATION_X1 - CELL * 4
    ),

  });
  const onSnapshotRef = useRef(onSnapshot);
  const propsRef = useRef({ selectedKind, tool });

  // Keep latest render values available to the long-lived RAF loop (refs are
  // only mutated inside effects, never during render).
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  });

  useEffect(() => {
    propsRef.current = { selectedKind, tool };
    stateRef.current.selectedKind = selectedKind;
    stateRef.current.tool = tool;
  });

  const composeSnapshot = useCallback((): GameSnapshot => {
    const st = stateRef.current;
    return {
      player: st.save.player,
      zone: st.save.zone,
      inventory: st.save.inventory,
      blockCount: st.save.blocks.length,
      onGround: st.save.player.onGround,
      canPlace: true,
      doorPrompt: st.doorPrompt,
      saveStatus: st.saveStatus,
      survival: st.save.survival,
      exposed: st.exposed,
      dead: st.save.survival.alive ? false : st.deathTimer > 0,
      notice: st.notice,
      paused: st.paused,
      tethered: st.tether !== null,
      shuttleTimer: st.shuttle.phase === "gone" ? Math.ceil(st.shuttle.timer) : null,
    };
  }, []);

  const performSave = useCallback(async () => {
    const st = stateRef.current;
    st.save.savedAt = new Date().toISOString();
    st.saveStatus = "saving";
    onSnapshotRef.current(composeSnapshot());
    const res = await saveGame(st.save);
    st.saveStatus = res.source === "supabase" ? "saved" : "local";
    onSnapshotRef.current(composeSnapshot());
  }, [composeSnapshot]);

  // Manual save triggered from the HUD save button via a window event.
  useEffect(() => {
    const handler = () => void performSave();
    window.addEventListener("jandocraft:save", handler);
    return () => window.removeEventListener("jandocraft:save", handler);
  }, [performSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    loadBackgroundAssets();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const keys = { left: false, right: false, jump: false, down: false, interact: false };

    let raf = 0;
    let last = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width ?? window.innerWidth;
      height = rect?.height ?? window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Screen-space point from a world-space point using the current camera.
    const screenToWorld = (sx: number, sy: number) => {
      const st = stateRef.current;
      return { x: sx + st.cam.x, y: sy + st.cam.y };
    };

    /**
     * Smoothly follows the player so they stay centred on screen. The camera is
     * never clamped to the world: it always tracks the protagonist so the view
     * never drifts away from them (per design the player is always centred).
     */
    const stepCamera = (dt: number) => {
      const st = stateRef.current;
      const p = st.save.player;
      const focusX = p.pos.x + PLAYER_W / 2;
      const focusY = p.pos.y + PLAYER_H / 2;
      const targetX = focusX - width / 2;
      const targetY = focusY - height / 2;

      const k = 1 - Math.exp(-dt * CAM_SMOOTH);
      st.cam.x += (targetX - st.cam.x) * k;
      st.cam.y += (targetY - st.cam.y) * k;
    };

    /**
     * Whether the build preview (and placement) is allowed at the given cell,
     * applying the tether-point placement rule (exterior + on a solid surface).
     */
    const canPreviewAt = (st: MutableState, cell: { x: number; y: number }) => {
      if (cellContains(st.save.blocks, cell.x, cell.y)) return false;
      if (st.selectedKind === "tether-point") {
        return (
          st.save.zone === "exterior" &&
          hasSolidNeighbour(st.save.blocks, cell.x, cell.y)
        );
      }
      return true;
    };

    const keydown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      // First keyboard interaction unlocks the audio context (autoplay policy).
      ensureAudioStarted();
      switch (e.code) {
        case "Escape": {
          e.preventDefault();
          togglePauseAction();
          break;
        }
        case "ArrowLeft":
        case "KeyA":
          if (st.paused) break;
          keys.left = true;
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          if (st.paused) break;
          keys.right = true;
          e.preventDefault();
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          if (st.paused) break;
          keys.jump = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          if (st.paused) break;
          keys.down = true;
          e.preventDefault();
          break;
        case "KeyE": {
          e.preventDefault();
          if (st.paused) break;
          if (!keys.interact && !st.transition) {
            keys.interact = true;
            toggleTetherOrDoor();
          }
          break;
        }
        case "KeyF":
        case "KeyQ": {
          e.preventDefault();
          if (st.paused) break;
          st.save.survival = toggleSuit(st.save.survival);
          audioManager.playSfx(
            st.save.survival.suit.equipped ? "equip" : "unequip"
          );
          onSnapshotRef.current(composeSnapshot());
          break;
        }
        case "KeyR": {
          e.preventDefault();
          if (st.paused) break;
          repairAction();
          break;
        }
        case "KeyN": {
          // Skip to the next background music theme.
          e.preventDefault();
          ensureAudioStarted();
          const track = audioManager.nextTrack();
          setNotice(track ? "Música: " + track : "Sin música disponible");
          break;
        }
      }
    };
    const keyup = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          keys.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          keys.right = false;
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          keys.jump = false;
          break;
        case "ArrowDown":
        case "KeyS":
          keys.down = false;
          break;
        case "KeyE":
          keys.interact = false;
          break;
      }
    };

    // E interact: toggle the tether (lazo) when near a support, otherwise use
    // the door / transition.
    const toggleTetherOrDoor = () => {
      const st = stateRef.current;

      // Already clipped: release the tether.
      if (st.tether) {
        st.tether = null;
        setNotice("Has soltado el lazo.");
        return;
      }

      // Near a support: clip in.
      const anchor = findTetherAnchor(st.save.blocks, st.save.player);
      if (anchor) {
        st.tether = {
          anchorId: anchor.id,
          anchorX: anchor.x,
          anchorY: anchor.y,
          maxLen: TETHER_MAX_LEN + 40,
        };
        setNotice("Lazo enganchado al soporte.");
        return;
      }

      // Not near a support: fall back to door/transition.
      triggerTransition();
    };

    const triggerTransition = () => {
      const st = stateRef.current;
      const door = findUsableDoor(st.save.player, st.save.zone, modules);
      if (!door) return;
      const zone = st.save.zone;

      // Exiting into open space requires the spacesuit to be worn.
      if (zone === "interior") {
        const suit = st.save.survival.suit;
        if (!suit.equipped) {
          setNotice("🚒 Necesitas el traje espacial (F) para salir.");
          return;
        }
        if (suit.oxygen <= 1) {
          setNotice("Tu traje no tiene oxígeno. Recárgalo dentro de la estación.");
          return;
        }
      }

      st.transition = {
        active: true,
        t: 0,
        toZone: oppositeZone(zone),
        door,
        teleported: false,
      };
      st.doorPrompt = null;
      st.tether = null;
      st.airlockAnim = zone === "interior" ? "opening" : "closing";
      st.airlockAnimTimer = 0;
      audioManager.playSfx("door");
    };

    const repairAction = () => {
      const st = stateRef.current;
      if (st.save.zone !== "interior") return;
      const mod = currentModule(modules, "interior", st.save.player);
      const moduleId = mod?.id ?? STATION_MODULE_ID;
      const res = repairModule(st.save.survival, st.save.inventory, moduleId);
      if (res.repaired) {
        st.save.survival = res.survival;
        st.save.inventory = res.inventory;
        audioManager.playSfx("repair");
        setNotice("Casco reparado (+" + REPAIR_GAIN + ").");
      } else {
        const integrity = st.save.survival.integrity[moduleId] ?? 100;
        setNotice(
          integrity >= 100
            ? "Este módulo está en buen estado."
            : "No tienes recursos (1 metal + 1 silicio)."
        );
      }
      onSnapshotRef.current(composeSnapshot());
    };

    const togglePauseAction = () => {
      const st = stateRef.current;
      st.paused = !st.paused;
      // Reset held keys so no movement persists after resume.
      if (st.paused) {
        keys.left = false;
        keys.right = false;
        keys.jump = false;
        keys.down = false;
        keys.interact = false;
        st.doorPrompt = null;
        st.notice = null;
      }
      audioManager.setGamePaused(st.paused);
      onSnapshotRef.current(composeSnapshot());
    };

    const setNotice = (message: string) => {
      const st = stateRef.current;
      st.notice = message;
      st.noticeTimer = 2.5;
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    const mouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      stateRef.current.pointer = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        inside: true,
      };
    };
    const mouseLeave = () => {
      stateRef.current.pointer = { ...stateRef.current.pointer, inside: false };
    };
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("mouseleave", mouseLeave);

    const click = (e: MouseEvent) => {
      e.preventDefault();
      const st = stateRef.current;
      // Build/remove works in any zone (interior or exterior) so the player can
      // mount tether points / anchors outside; never while paused.
      if (st.transition || st.paused) return;
      const r = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - r.left, e.clientY - r.top);

      // First check if clicking a shuttle crate (resource collection).
      if (st.save.zone === "exterior") {
        const crateResult = collectCrate(st.shuttle, world.x, world.y);
        if (crateResult.gained) {
          st.shuttle = crateResult.state;
          st.save.inventory = addResource(
            st.save.inventory,
            crateResult.gained.kind,
            crateResult.gained.amount
          );
          audioManager.playSfx("click");
          setNotice(
            `+${crateResult.gained.amount} ${crateResult.gained.kind} recogido del Columbus.`
          );
          onSnapshotRef.current(composeSnapshot());
          return;
        }
      }

      // Left-click with remove tool also removes.
      if (st.tool === "remove") {
        const res = removeBlock(st.save.blocks, world);
        if (res.removed) {
          st.save.blocks = res.blocks;
          // Refund 50% of the block's resource cost.
          if (res.removedKind) {
            const cost = blockCost(res.removedKind);
            let refunded = false;
            for (const [kind, amount] of Object.entries(cost)) {
              const refund = Math.floor(amount * 0.5);
              if (refund > 0) {
                st.save.inventory = addResource(st.save.inventory, kind, refund);
                refunded = true;
              }
            }
            if (refunded) {
              setNotice("Bloque eliminado. Recursos recuperados (50%).");
            } else {
              setNotice("Bloque eliminado.");
            }
          }
          audioManager.playSfx("remove");
          onSnapshotRef.current(composeSnapshot());
        }
        return;
      }

      const placeRes = placeBlock(
        st.save.blocks,
        world,
        st.selectedKind,
        st.save.player,
        st.save.zone
      );
      if (!placeRes.placedId) {
        // Give feedback for placement rules the player may not notice.
        if (placeRes.reason === "tether-zone") {
          setNotice("El lazo solo se coloca en el exterior.");
        } else if (placeRes.reason === "tether-surface") {
          setNotice("El lazo debe ir pegado a la superficie de la estación.");
        }
        return;
      }
      const crafted = craftBlock(st.save.inventory, st.selectedKind);
      if (!crafted.ok) return;
      st.save.blocks = placeRes.blocks;
      st.save.inventory = crafted.inv;
      onSnapshotRef.current(composeSnapshot());
    };
    canvas.addEventListener("click", click);

    // Right-click removes blocks (contextmenu event).
    const contextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const st = stateRef.current;
      if (st.transition || st.paused) return;
      const r = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const res = removeBlock(st.save.blocks, world);
      if (res.removed) {
        st.save.blocks = res.blocks;
        if (res.removedKind) {
          const cost = blockCost(res.removedKind);
          let refunded = false;
          for (const [kind, amount] of Object.entries(cost)) {
            const refund = Math.floor(amount * 0.5);
            if (refund > 0) {
              st.save.inventory = addResource(st.save.inventory, kind, refund);
              refunded = true;
            }
          }
          setNotice(refunded ? "Bloque eliminado. Recursos recuperados (50%)." : "Bloque eliminado.");
        }
        audioManager.playSfx("remove");
        onSnapshotRef.current(composeSnapshot());
      }
    };
    canvas.addEventListener("contextmenu", contextMenu);

    const frame = (now: number) => {
      let dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      const st = stateRef.current;
      const transitioning = st.transition !== null;

      // While paused, freeze the whole simulation (physics, survival, sky,
      // camera, timers) but keep rendering so the frozen frame stays visible
      // beneath the pause menu. Only the transition logic that still resolves
      // pending teleports continues below.
      const paused = st.paused;
      if (paused) dt = 0;

      // Advance the sky clock (drives day/night + celestial motion).
      st.spaceTime = advanceSpaceTime(st.spaceTime, dt);

      // --- Transition advancement. ---
      if (st.transition) {
        st.transition.t += dt / TRANSITION_DURATION;
        if (st.transition.t >= 0.5 && !st.transition.teleported) {
          st.transition.teleported = true;
          const tr = st.transition;
          const spot = doorSpot(tr.door!, tr.toZone);
          st.save.zone = tr.toZone;
          st.save.player.pos = { ...spot };
          st.save.player.vel = { x: 0, y: 0 };
          st.save.player.onGround = false;
        }
        if (st.transition.t >= 1) st.transition = null;
      }

      // --- Door prompt (when not transitioning). ---
      if (!transitioning) {
        // Tether hint has priority: if clipped, show release; if near a
        // support, show clip-in; otherwise keep the door prompt.
        if (st.tether) {
          st.doorPrompt = "🔗 Lazo conectado · Pulsa E para soltar";
        } else {
          const anchor = findTetherAnchor(st.save.blocks, st.save.player);
          if (anchor) {
            st.doorPrompt = "🔗 Pulsa E para enganchar el lazo al soporte";
          } else {
            const door = findUsableDoor(st.save.player, st.save.zone, modules);
            if (door) {
              if (st.save.zone === "interior" && !st.save.survival.suit.equipped) {
                st.doorPrompt = "🚒 Sin traje · Pulsa F para ponértelo antes de salir";
              } else if (st.save.zone === "interior") {
                st.doorPrompt = "🚪 Pulsa E para abrir escotilla y salir";
              } else {
                st.doorPrompt = "🚪 Pulsa E para entrar a la estación";
              }
            } else {
              // No door nearby, no tether: clear the prompt.
              st.doorPrompt = null;
            }
          }
        }
      }

      // --- Survival ticking (continues even during transition & death). ---
      {
        const zone = st.save.zone;
        const mod = currentModule(modules, zone, st.save.player);
        const step = stepSurvival(st.save.survival, zone, st.save.blocks, mod, dt);
        st.save.survival = step.survival;
        st.exposed = isExposed(st.save.survival, zone, zone === "interior");

        // Death: begin a short respawn delay, then revive inside the station.
        if (!st.save.survival.alive && st.deathTimer === 0) {
          st.deathTimer = RESPAWN_DELAY;
          if (st.transition) st.transition = null;
          onSnapshotRef.current(composeSnapshot());
        } else if (st.deathTimer > 0) {
          st.deathTimer -= dt;
          if (st.deathTimer <= 0) {
            const res = respawnSurvival(st.save.survival, [STATION_MODULE_ID]);
            st.save.survival = res.survival;
            st.save.player = res.player;
            st.save.zone = "interior";
            st.deathTimer = 0;
            st.tether = null;
            st.transition = null;
            st.airlockAnim = "idle";
            st.doorPrompt = null;
            // Reset camera to station center.
            st.cam = { x: (STATION_X0 + STATION_X1) / 2 - 400, y: STATION_TOP_Y - 300 };
            setNotice("Has muerto. Has reaparecido en la estación.");
          }
        }
      }

      // --- Shuttle (Columbus supply ship). ---
      {
        const prevShuttle = st.shuttle;
        st.shuttle = stepShuttle(st.shuttle, dt);
        // Shuttle notices override player notices briefly.
        if (st.shuttle.notice && st.shuttle.noticeTimer > 0) {
          st.notice = st.shuttle.notice;
          st.noticeTimer = st.shuttle.noticeTimer;
        }
      }

      // --- Airlock animation timer. ---
      if (st.airlockAnim !== "idle") {
        st.airlockAnimTimer += dt;
        if (st.airlockAnimTimer >= 1.5) {
          st.airlockAnim = "idle";
          st.airlockAnimTimer = 0;
        }
      }

      // --- NPC (female astronaut companion). ---
      if (st.save.zone === "interior") {
        stepNPC(st.npc, dt, now / 1000);
      }

      // --- Notice timer. ---
      if (st.noticeTimer > 0) {
        st.noticeTimer -= dt;
        if (st.noticeTimer <= 0) st.notice = null;
      }

      // --- Physics (skipped while transitioning or dead). ---
      if (!transitioning && st.save.survival.alive) {
        const zone = st.save.zone;
        // Interior has normal gravity (walk), exterior uses space thrusters.
        const floaty = zone === "exterior";
        const solids = solidsForZone(zone, st.save.blocks, modules);
        const grav = floaty ? SPACE_GRAVITY : GRAVITY;
        const step = stepPhysics(st.save.player, keys, solids, grav, floaty, dt);
        st.save.player = step.player;

        // Thruster oxygen consumption: when the player fires thrusters in
        // space, suit oxygen is consumed as fuel.
        if (floaty && step.thrusterActive && st.save.survival.suit.equipped && st.save.survival.suit.oxygen > 0) {
          st.save.survival.suit.oxygen = Math.max(0, st.save.survival.suit.oxygen - THRUST_OXYGEN_COST * dt);
        }
        // Tether (lazo): after moving, enforce the rope constraint; if the
        // anchored support was removed, detach automatically.
        if (st.tether) {
          const stillThere = st.save.blocks.some(
            (b) => b.id === st.tether!.anchorId
          );
          if (!stillThere) {
            st.tether = null;
            setNotice("El soporte del lazo ya no existe.");
          } else {
            const res = stepTether(st.save.player, st.tether);
            st.save.player = res.player;
          }
        }
      }

      // --- Save / autosave. ---
      st.autosaveTimer += dt;
      if (st.autosaveTimer >= 15) {
        st.autosaveTimer = 0;
        void performSave();
      }

      // --- Camera follows the player (smoothed + clamped). ---
      stepCamera(dt);

      // --- Render. ---
      ctx.clearRect(0, 0, width, height);

      if (st.save.zone === "interior") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(-st.cam.x, -st.cam.y);
        drawInterior(ctx, modules, st.save.blocks);
        if (st.pointer.inside && !transitioning) {
          const cell = targetCell(screenToWorld(st.pointer.x, st.pointer.y));
          if (st.tool === "build" && canPreviewAt(st, cell)) {
            drawPlacementPreview(ctx, cell.x, cell.y, st.selectedKind, true);
          }
        }
        // Draw the character in the same camera space as the station so it
        // walks across the fixed world.
        drawCharacter(ctx, st.save.player, now / 1000, st.save.survival.suit.equipped);
        if (st.tether) {
          drawTetherRope(ctx, st.tether, st.save.player, isTaut(st.tether, st.save.player));
        }
        // Draw the NPC companion inside the station.
        drawNPC(ctx, st.npc, now / 1000);
        ctx.restore();
      } else {
        // Per-layer parallax: the background shifts less than the station
        // (moving at a fraction of the camera), with a slow autonomous sweep
        // for liveliness so the sky always feels alive.
        const tSec = now / 1000;
        const driftX = (st.cam.x - st.baseCam.x) + Math.sin(tSec * 0.02) * 46;
        const driftY = (st.cam.y - st.baseCam.y) + Math.cos(tSec * 0.013) * 22;
        const bg = drawBackground(
          ctx,
          width,
          height,
          tSec,
          st.spaceTime,
          driftX,
          driftY
        );
        ctx.save();
        ctx.translate(-st.cam.x, -st.cam.y);
        drawStation(ctx, st.save.blocks);
        drawDoorsExterior(ctx, modules);

        if (st.pointer.inside && !transitioning) {
          const cell = targetCell(screenToWorld(st.pointer.x, st.pointer.y));
          if (st.tool === "build" && canPreviewAt(st, cell)) {
            drawPlacementPreview(ctx, cell.x, cell.y, st.selectedKind, true);
          }
        }
        drawCharacter(ctx, st.save.player, now / 1000, st.save.survival.suit.equipped);
        if (st.tether) {
          drawTetherRope(ctx, st.tether, st.save.player, isTaut(st.tether, st.save.player));
        }
        // Draw the Columbus shuttle and resource crates.
        if (shuttleVisible(st.shuttle) || st.shuttle.crates.some((c) => !c.collected)) {
          drawShuttle(ctx, st.shuttle, now / 1000);
        }
        ctx.restore();

        // The Sun lights the whole scene: global brightness/colour overlay.
        const light = bg.sunLight;
        ctx.fillStyle = `rgba(255, 200, 130, ${(light * 0.10).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
        const night = clamp(1 - light, 0, 1);
        ctx.fillStyle = `rgba(10, 22, 46, ${(night * 0.42).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // --- Hazard vignette while suffocating / exposed. ---
      if (st.exposed && st.save.survival.alive) {
        const pulse = 0.18 + 0.12 * Math.sin(now / 150);
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.35,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.72
        );
        grad.addColorStop(0, "rgba(220,38,38,0)");
        grad.addColorStop(1, `rgba(220,38,38,${clamp(pulse, 0, 1).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // --- Transition fade overlay. ---
      if (st.transition) {
        const tr = st.transition;
        const alpha = tr.t < 0.5 ? tr.t * 2 : (1 - tr.t) * 2;
        ctx.fillStyle = `rgba(2,6,23,${clamp(alpha, 0, 1).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // --- Airlock overlay animation (screen-space). ---
      if (st.airlockAnim !== "idle") {
        drawAirlockOverlay(ctx, width, height, st.airlockAnim, st.airlockAnimTimer, now / 1000);
      }

      // --- Death overlay. ---
      if (!st.save.survival.alive) {
        ctx.fillStyle = `rgba(127,29,29,${clamp(st.deathTimer / 2, 0, 1).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (now - st.lastEmit > 100) {
        st.lastEmit = now;
        onSnapshotRef.current(composeSnapshot());
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      canvas.removeEventListener("mousemove", mouseMove);
      canvas.removeEventListener("mouseleave", mouseLeave);
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("contextmenu", contextMenu);
    };
  }, [composeSnapshot, performSave]);

  return <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />;
}

/**
 * Screen-space airlock overlay animation.
 * Shows sliding hatches, pressure gauge, and decompression particles
 * during zone transitions.
 */
function drawAirlockOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: "opening" | "closing",
  timer: number,
  time: number
): void {
  const cx = w / 2;
  const cy = h / 2;
  const t = Math.min(timer / 1.5, 1);

  // Semi-transparent backdrop.
  ctx.fillStyle = `rgba(2,6,23,${(0.7 * Math.min(t * 3, 1)).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);

  // Airlock frame.
  const fw = 180;
  const fh = 120;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh);

  // Left hatch (slides left when opening).
  const hatchW = 60;
  const slideLeft = phase === "opening" ? -t * hatchW : -(1 - t) * hatchW;
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx - fw / 2 + 4 + slideLeft, cy - fh / 2 + 4, hatchW, fh - 8);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(cx - fw / 2 + 4 + slideLeft, cy - fh / 2 + 4, hatchW, 4);
  ctx.fillStyle = "#475569";
  ctx.fillRect(cx - fw / 2 + 4 + slideLeft, cy - 1, hatchW, 2);
  // Seal on right edge.
  ctx.fillStyle = "#f97316";
  ctx.fillRect(cx - fw / 2 + hatchW + slideLeft, cy - fh / 2 + 8, 3, fh - 16);

  // Right hatch (slides right when opening).
  const slideRight = phase === "opening" ? t * hatchW : (1 - t) * hatchW;
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx + fw / 2 - 4 - hatchW + slideRight, cy - fh / 2 + 4, hatchW, fh - 8);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(cx + fw / 2 - 4 - hatchW + slideRight, cy - fh / 2 + 4, hatchW, 4);
  ctx.fillStyle = "#475569";
  ctx.fillRect(cx + fw / 2 - 4 - hatchW + slideRight, cy - 1, hatchW, 2);
  // Seal on left edge.
  ctx.fillStyle = "#f97316";
  ctx.fillRect(cx + fw / 2 - 4 - hatchW + slideRight - 3, cy - fh / 2 + 8, 3, fh - 16);

  // Pressure gauge below.
  const gy = cy + fh / 2 + 12;
  const gw = 120;
  const gh = 8;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(cx - gw / 2, gy, gw, gh);
  const pressure = phase === "opening" ? 1 - t : t;
  const pColor = pressure > 0.6 ? "#22c55e" : pressure > 0.3 ? "#eab308" : "#ef4444";
  ctx.fillStyle = pColor;
  ctx.fillRect(cx - gw / 2, gy, gw * pressure, gh);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - gw / 2, gy, gw, gh);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(pressure * 100)}%`, cx, gy + gh + 14);

  // Particles in the middle.
  const particleCount = phase === "opening" ? 8 : 5;
  for (let i = 0; i < particleCount; i++) {
    const px = cx + Math.cos(time * 3 + i * 1.3) * 30 * t;
    const py = cy + Math.sin(time * 2 + i * 0.9) * 20 - t * 25;
    const alpha = Math.max(0, 0.6 - t * 0.5);
    ctx.fillStyle = `rgba(147,197,253,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Label.
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  const label = phase === "opening" ? "ABRRIENDO ESCOTILLA..." : "CERRANDO ESCOTILLA...";
  ctx.fillText(label, cx, cy + fh / 2 + 36);

  // Warning stripes.
  const stripePhase = (time * 6) % 2;
  ctx.fillStyle = `rgba(249,115,22,${(0.2 + 0.15 * Math.sin(time * 8)).toFixed(2)})`;
  for (let i = 0; i < 4; i++) {
    const sy = cy - fh / 2 - 6 + i * 8 + stripePhase * 4;
    ctx.fillRect(cx - fw / 2 - 10, sy, fw + 20, 3);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
