import { SFX_REGISTRY, type SfxName } from "./sfx";
import { createMusicEngine, type MusicEngine } from "./music";

/**
 * Audio manager - a singleton owning the Web Audio graph and persisted audio
 * preferences.
 *
 * Design goals:
 *  - Fully native (Web Audio API), no external services or audio assets.
 *  - Decoupled: SFX are synthesized from a registry keyed by name; adding new
 *    sounds only requires adding an entry to `lib/audio/sfx.ts`.
 *  - Music is a generative loop driven by a separate, swappable engine
 *    (`lib/audio/music.ts`).
 *  - Volume changes are applied to gain nodes directly (never restarting
 *    audio), and preferences persist to localStorage.
 *  - Global game-pause gating blocks SFX playback while the game is paused,
 *    and optionally pauses/resumes the music per user preference.
 */

export interface AudioPreferences {
  musicVolume: number; // 0..100
  sfxVolume: number; // 0..100
  musicMuted: boolean;
  sfxMuted: boolean;
  /** Whether the music keeps playing while the game is paused. */
  musicInPause: boolean;
}

export const DEFAULT_PREFS: AudioPreferences = {
  musicVolume: 70,
  sfxVolume: 80,
  musicMuted: false,
  sfxMuted: false,
  musicInPause: false,
};

const STORAGE_KEY = "jandocraft-audio-v1";

type Listener = () => void;

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private music: MusicEngine | null = null;
  private themeIndex = 0;

  private prefs: AudioPreferences = loadPrefs();
  private gamePaused = false;
  private listeners = new Set<Listener>();

  /** Creates the AudioContext on first use (must follow a user gesture). */
  init(): void {
    if (this.ctx) {
      // Resume on every (re-)initialization; browsers suspend contexts.
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);

    this.applyPrefsToGraph();
  }

  private applyPrefsToGraph(): void {
    if (!this.ctx) return;
    const mv = this.effectiveMusicVolume();
    if (this.musicBus) this.musicBus.gain.value = mv;
    const sv = this.effectiveSfxVolume();
    if (this.sfxBus) this.sfxBus.gain.value = sv;
  }

  private effectiveMusicVolume(): number {
    return this.prefs.musicMuted ? 0 : clamp(this.prefs.musicVolume, 0, 100) / 100;
  }

  private effectiveSfxVolume(): number {
    return this.prefs.sfxMuted ? 0 : clamp(this.prefs.sfxVolume, 0, 100) / 100;
  }

  // -------------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------------

  getPrefs(): AudioPreferences {
    return { ...this.prefs };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  private setPrefs(patch: Partial<AudioPreferences>): void {
    this.prefs = { ...this.prefs, ...patch };
    persistPrefs(this.prefs);
    this.applyPrefsToGraph();
    this.emit();
  }

  setMusicVolume(percent: number): void {
    this.setPrefs({ musicVolume: clamp(Math.round(percent), 0, 100) });
  }

  setSfxVolume(percent: number): void {
    this.setPrefs({ sfxVolume: clamp(Math.round(percent), 0, 100) });
  }

  toggleMusicMuted(): void {
    this.setPrefs({ musicMuted: !this.prefs.musicMuted });
  }

  toggleSfxMuted(): void {
    this.setPrefs({ sfxMuted: !this.prefs.sfxMuted });
  }

  setMusicInPause(on: boolean): void {
    this.setPrefs({ musicInPause: on });
  }

  // -------------------------------------------------------------------------
  // SFX
  // -------------------------------------------------------------------------

  /** Plays a one-shot synthesized sound by name. Blocked while game-paused. */
  playSfx(name: SfxName): void {
    if (!this.ctx || this.gamePaused) return;
    const builder = SFX_REGISTRY[name];
    if (!builder) return;
    const now = this.ctx.currentTime;
    builder(this.ctx, this.sfxBus!, now);
  }

  // -------------------------------------------------------------------------
  // Music
  // -------------------------------------------------------------------------

  private startMusicInternal(): void {
    if (!this.ctx || !this.musicBus || this.music) return;
    this.music = createMusicEngine(this.ctx, this.musicBus);
    this.music.start();
  }

  startMusic(): void {
    this.init();
    this.startMusicInternal();
  }

  pauseMusic(): void {
    this.music?.pause();
  }

  resumeMusic(): void {
    this.music?.resume();
  }

  /**
   * Cycles to the next background theme and returns its display name. Starts
   * the music if it has not begun yet.
   */
  nextTrack(): string {
    if (!this.ctx) this.init();
    this.startMusicInternal();
    this.themeIndex += 1;
    this.music?.setTheme(this.themeIndex);
    return this.music?.currentTheme() ?? "";
  }

  // -------------------------------------------------------------------------
  // Game pause integration
  // -------------------------------------------------------------------------

  /**
   * Called when the game pauses/resumes. While paused, SFX are suppressed; the
   * music continues or pauses depending on the `musicInPause` preference.
   */
  setGamePaused(paused: boolean): void {
    this.gamePaused = paused;
    if (paused) {
      if (!this.prefs.musicInPause) this.pauseMusic();
    } else {
      // On resume, restart the music if we are not configured to keep it on.
      if (this.prefs.musicMuted) return;
      this.resumeMusic();
    }
  }
}

function loadPrefs(): AudioPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
    return {
      musicVolume: num(parsed.musicVolume, DEFAULT_PREFS.musicVolume, 0, 100),
      sfxVolume: num(parsed.sfxVolume, DEFAULT_PREFS.sfxVolume, 0, 100),
      musicMuted: parsed.musicMuted === true,
      sfxMuted: parsed.sfxMuted === true,
      musicInPause: parsed.musicInPause === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function persistPrefs(prefs: AudioPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage failures
  }
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === "number" && !Number.isNaN(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export const audioManager = new AudioManager();

/** Creates/resumes the audio context (call from the first user gesture). */
export function ensureAudioStarted(): void {
  audioManager.init();
  audioManager.startMusic();
}
