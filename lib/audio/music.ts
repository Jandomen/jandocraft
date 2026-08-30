/**
 * Generative space-ambient music engine with multiple themes.
 *
 * Uses the Web Audio API to schedule self-contained, looping ambient tracks -
 * slow chord progressions with soft pads, drones and sparse sparkle. It runs
 * entirely locally (no external assets or services) and is decoupled from the
 * audio manager so themes can be added/replaced without touching the rest of
 * the system.
 *
 * Each theme has its own scale, chords, tempo, drone and mood. A lookahead
 * scheduler queues notes a little ahead of the audio clock so the loop stays
 * seamless, and the theme can be cycled at runtime (see `setTheme`).
 */

export interface MusicTheme {
  /** Human-readable name shown to the player (e.g. on track switch). */
  name: string;
  /** Frequencies used as scale degrees (0 = root). */
  scale: number[];
  /** Each row lists scale-degree indices to stack as a pad chord. */
  chords: number[][];
  bpm: number;
  /** Sub/master drone frequencies (Hz). */
  drone: number[];
  /** 0..1 chance that a chord gets a sparkle accent. */
  sparkleDensity: number;
  /** Rhythmic low pulse on every beat when true. */
  pulse: boolean;
  /** Pad oscillator waveform: sine, triangle, sawtooth, square. */
  padWave?: "sine" | "triangle" | "sawtooth" | "square";
  /** Bass oscillator waveform. */
  bassWave?: "sine" | "triangle" | "sawtooth" | "square";
  /** Low-pass filter cutoff in Hz (0..22050). */
  filterCutoff?: number;
  /** Delay feedback amount 0..1. */
  delayFeedback?: number;
  /** Delay time in seconds. */
  delayTime?: number;
  /** Whether to play a simple bass note on root. */
  bass?: boolean;
  /** Whether to play sparse arpeggiated accents. */
  arpeggio?: boolean;
}

/** Public interface returned by createMusicEngine. */
export interface MusicEngine {
  start(): void;
  pause(): void;
  resume(): void;
  setTheme(i: number): void;
  currentTheme(): string;
  stop(): void;
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

const A_MINOR = [110, 123.47, 130.81, 146.83, 164.81, 220, 247];
const D_MAJOR = [146.83, 164.81, 185, 220, 246.94, 293.66, 330];
const C_DARK = [65.41, 98, 110, 130.81, 146.83, 196, 220];
const E_MIXO = [82.41, 110, 123.47, 146.83, 164.81, 220, 246.94];
const G_MAJOR = [196, 220, 246.94, 261.63, 293.66, 329.63, 369.99];
const F_SHARP_MINOR = [92.5, 110, 123.47, 138.59, 164.81, 185, 220];
const BB_LYDIAN = [116.54, 130.81, 146.83, 164.81, 174.61, 196, 220];
const D_DORIAN = [146.83, 164.81, 174.61, 196, 220, 246.94, 277.18];
const A_PHRYGIAN = [110, 116.54, 130.81, 146.83, 164.81, 174.61, 196];
const E_BLUES = [82.41, 110, 123.47, 138.59, 146.83, 164.81, 185];
const C_MAJOR_PENTA = [130.81, 146.83, 164.81, 196, 220, 261.63];
const D_MINOR = [146.83, 164.81, 174.61, 196, 220, 233.08, 293.66];
const G_MIXO = [196, 220, 246.94, 261.63, 293.66, 329.63, 392];
const F_MAJOR = [174.61, 196, 220, 261.63, 293.66, 329.63, 349.23];
const B_MINOR = [123.47, 146.83, 164.81, 174.61, 196, 220, 246.94];

export const MUSIC_THEMES: MusicTheme[] = [
  {
    name: "Nebula Drift",
    scale: A_MINOR,
    chords: [
      [0, 1, 2, 4],
      [0, 2, 3, 4],
      [2, 4, 0, 3],
      [3, 4, 1, 2],
    ],
    bpm: 66,
    drone: [55, 110],
    sparkleDensity: 0.4,
    pulse: false,
    padWave: "sine",
    bassWave: "triangle",
    filterCutoff: 1800,
    delayFeedback: 0.25,
    delayTime: 0.6,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Solar Winds",
    scale: D_MAJOR,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 4, 6],
      [0, 3, 5, 6],
      [3, 4, 6, 1],
    ],
    bpm: 84,
    drone: [73.42, 146.83],
    sparkleDensity: 0.7,
    pulse: true,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 2200,
    delayFeedback: 0.3,
    delayTime: 0.5,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Deep Void",
    scale: C_DARK,
    chords: [
      [0, 1, 3, 5],
      [0, 2, 3, 6],
      [1, 3, 5, 0],
      [2, 4, 5, 1],
    ],
    bpm: 52,
    drone: [32.7, 65.41, 98],
    sparkleDensity: 0.18,
    pulse: false,
    padWave: "sine",
    bassWave: "triangle",
    filterCutoff: 900,
    delayFeedback: 0.45,
    delayTime: 0.7,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Starfall",
    scale: E_MIXO,
    chords: [
      [0, 2, 3, 4],
      [1, 3, 4, 6],
      [0, 4, 5, 2],
      [3, 4, 6, 0],
    ],
    bpm: 96,
    drone: [82.41, 164.81],
    sparkleDensity: 0.8,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3200,
    delayFeedback: 0.2,
    delayTime: 0.35,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Dawn Horizon",
    scale: G_MAJOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 72,
    drone: [98, 196],
    sparkleDensity: 0.55,
    pulse: false,
    padWave: "sine",
    bassWave: "sine",
    filterCutoff: 2800,
    delayFeedback: 0.25,
    delayTime: 0.55,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Crimson Twilight",
    scale: F_SHARP_MINOR,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 3, 4, 6],
      [2, 4, 6, 0],
    ],
    bpm: 58,
    drone: [46.25, 92.5, 138.59],
    sparkleDensity: 0.3,
    pulse: false,
    padWave: "sine",
    bassWave: "triangle",
    filterCutoff: 1600,
    delayFeedback: 0.35,
    delayTime: 0.65,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Celestial Garden",
    scale: BB_LYDIAN,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 4, 6, 2],
      [3, 5, 0, 4],
    ],
    bpm: 78,
    drone: [58.27, 116.54],
    sparkleDensity: 0.65,
    pulse: false,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 2400,
    delayFeedback: 0.28,
    delayTime: 0.52,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Ancient Station",
    scale: D_DORIAN,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 3, 4, 6],
      [2, 4, 6, 1],
    ],
    bpm: 68,
    drone: [73.42, 146.83],
    sparkleDensity: 0.42,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 2800,
    delayFeedback: 0.22,
    delayTime: 0.4,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Shadow Depths",
    scale: A_PHRYGIAN,
    chords: [
      [0, 1, 3, 5],
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
    ],
    bpm: 54,
    drone: [55, 82.41, 110],
    sparkleDensity: 0.22,
    pulse: false,
    padWave: "sine",
    bassWave: "triangle",
    filterCutoff: 800,
    delayFeedback: 0.5,
    delayTime: 0.75,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Cosmic Blues",
    scale: E_BLUES,
    chords: [
      [0, 2, 3, 4],
      [1, 3, 4, 6],
      [0, 3, 5, 6],
      [2, 4, 6, 0],
    ],
    bpm: 76,
    drone: [41.2, 82.41, 123.47],
    sparkleDensity: 0.35,
    pulse: true,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 2000,
    delayFeedback: 0.32,
    delayTime: 0.58,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Stellar Rock",
    scale: E_BLUES,
    chords: [
      [0, 2, 4, 5],
      [0, 3, 5, 6],
      [1, 4, 6, 0],
      [2, 5, 0, 3],
    ],
    bpm: 110,
    drone: [41.2, 82.41],
    sparkleDensity: 0.6,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3000,
    delayFeedback: 0.18,
    delayTime: 0.3,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Nebula Jazz",
    scale: D_MINOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 92,
    drone: [73.42, 146.83],
    sparkleDensity: 0.5,
    pulse: false,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 2600,
    delayFeedback: 0.26,
    delayTime: 0.48,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Astro Pop",
    scale: C_MAJOR_PENTA,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 4, 6, 2],
      [3, 5, 0, 4],
    ],
    bpm: 118,
    drone: [130.81, 261.63],
    sparkleDensity: 0.75,
    pulse: true,
    padWave: "square",
    bassWave: "triangle",
    filterCutoff: 3400,
    delayFeedback: 0.15,
    delayTime: 0.28,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Void Ambient",
    scale: C_DARK,
    chords: [
      [0, 1, 3, 5],
      [0, 2, 3, 6],
      [1, 3, 5, 0],
      [2, 4, 5, 1],
    ],
    bpm: 44,
    drone: [32.7, 65.41, 98],
    sparkleDensity: 0.12,
    pulse: false,
    padWave: "sine",
    bassWave: "sine",
    filterCutoff: 700,
    delayFeedback: 0.55,
    delayTime: 0.8,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Orbital Disco",
    scale: G_MIXO,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 3, 4, 6],
      [2, 4, 6, 1],
    ],
    bpm: 120,
    drone: [98, 196],
    sparkleDensity: 0.8,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3200,
    delayFeedback: 0.2,
    delayTime: 0.35,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Lunar Lullaby",
    scale: F_MAJOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 66,
    drone: [87.31, 174.61],
    sparkleDensity: 0.3,
    pulse: false,
    padWave: "sine",
    bassWave: "sine",
    filterCutoff: 2000,
    delayFeedback: 0.3,
    delayTime: 0.6,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Comet Chase",
    scale: G_MAJOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 140,
    drone: [98, 196],
    sparkleDensity: 0.85,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3200,
    delayFeedback: 0.18,
    delayTime: 0.32,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Dark Matter Dub",
    scale: B_MINOR,
    chords: [
      [0, 1, 3, 5],
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
    ],
    bpm: 72,
    drone: [61.74, 123.47],
    sparkleDensity: 0.4,
    pulse: true,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 1800,
    delayFeedback: 0.4,
    delayTime: 0.68,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Synthwave Cruise",
    scale: G_MIXO,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 3, 4, 6],
      [2, 4, 6, 1],
    ],
    bpm: 92,
    drone: [98, 196],
    sparkleDensity: 0.7,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 2800,
    delayFeedback: 0.22,
    delayTime: 0.38,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Ambient Station",
    scale: F_MAJOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 60,
    drone: [87.31, 174.61],
    sparkleDensity: 0.25,
    pulse: false,
    padWave: "sine",
    bassWave: "sine",
    filterCutoff: 1600,
    delayFeedback: 0.35,
    delayTime: 0.7,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Meteor Shower",
    scale: D_MINOR,
    chords: [
      [0, 2, 4, 6],
      [1, 3, 5, 0],
      [2, 4, 6, 1],
      [3, 5, 0, 2],
    ],
    bpm: 130,
    drone: [73.42, 146.83],
    sparkleDensity: 0.8,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3000,
    delayFeedback: 0.2,
    delayTime: 0.32,
    bass: false,
    arpeggio: true,
  },
  {
    name: "Zero Gravity Lounge",
    scale: C_MAJOR_PENTA,
    chords: [
      [0, 2, 4, 5],
      [1, 3, 5, 6],
      [0, 4, 6, 2],
      [3, 5, 0, 4],
    ],
    bpm: 84,
    drone: [130.81, 261.63],
    sparkleDensity: 0.45,
    pulse: false,
    padWave: "triangle",
    bassWave: "sine",
    filterCutoff: 2200,
    delayFeedback: 0.3,
    delayTime: 0.55,
    bass: true,
    arpeggio: false,
  },
  {
    name: "Nova Burst",
    scale: E_BLUES,
    chords: [
      [0, 2, 3, 4],
      [1, 3, 4, 6],
      [0, 3, 5, 6],
      [2, 4, 6, 0],
    ],
    bpm: 150,
    drone: [41.2, 82.41, 123.47],
    sparkleDensity: 0.9,
    pulse: true,
    padWave: "sawtooth",
    bassWave: "square",
    filterCutoff: 3400,
    delayFeedback: 0.15,
    delayTime: 0.28,
    bass: false,
    arpeggio: true,
  },
];

export function createMusicEngine(
  ctx: BaseAudioContext,
  dest: AudioNode,
  themeIndex = 0
): MusicEngine {
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(dest);

  const padDelay = ctx.createDelay(2.0);
  padDelay.delayTime.value = 0.45;
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  master.connect(padDelay);
  padDelay.connect(fb);
  fb.connect(padDelay);
  padDelay.connect(master);

  let index = ((themeIndex % MUSIC_THEMES.length) + MUSIC_THEMES.length) % MUSIC_THEMES.length;
  let drones: OscillatorNode[] = [];

  let timer: number | null = null;
  let nextTime = 0;
  let chordIndex = 0;
  let running = false;
  const lookahead = 25; // ms
  const scheduleAhead = 0.6; // s

  function current(): MusicTheme {
    return MUSIC_THEMES[index];
  }

  function padGain(when: number, dur: number, peak: number): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + 0.8);
    g.gain.setValueAtTime(Math.max(0.0001, peak), when + dur - 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    g.connect(master);
    return g;
  }

  function padTone(freq: number, time: number, dur: number, peak: number, wave?: string): void {
    const o = ctx.createOscillator();
    o.type = (wave || "sine") as OscillatorType;
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = (wave === "sawtooth" ? "triangle" : wave === "square" ? "sine" : "triangle") as OscillatorType;
    o2.frequency.value = freq * (wave === "sawtooth" ? 0.5 : 0.5);
    const gain = padGain(time, dur, peak);
    o.connect(gain);
    o2.connect(gain);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    o.start(time);
    o.stop(time + dur);
    o2.start(time);
    o2.stop(time + dur);
    lfo.start(time);
    lfo.stop(time + dur);
  }

  function stopDrones(): void {
    for (const d of drones) {
      try {
        d.stop();
      } catch {
        // already stopped
      }
    }
    drones = [];
  }

  function startDrones(): void {
    for (const freq of current().drone) {
      const o = ctx.createOscillator();
      o.type = current().bassWave || "sine";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      o.connect(g);
      g.connect(master);
      o.start();
      drones.push(o);
    }
  }

  function bassNote(time: number, freq: number): void {
    const o = ctx.createOscillator();
    o.type = current().bassWave || "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.18, time + 0.1);
    g.gain.setValueAtTime(0.18, time + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 2.0);
    o.connect(g);
    g.connect(master);
    o.start(time);
    o.stop(time + 2.1);
  }

  function arpeggioAccent(time: number, freq: number): void {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.08, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    o.connect(g);
    g.connect(master);
    o.start(time);
    o.stop(time + 0.4);
  }

  function sparkle(time: number, density: number): void {
    const o = ctx.createOscillator();
    o.type = "sine";
    const f = 880 + ((Math.random() * 7) | 0) * 55;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.05, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    o.connect(g);
    g.connect(master);
    o.start(time);
    o.stop(time + 0.6);
    void density;
  }

  function pulse(time: number): void {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 55;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.02, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    o.connect(g);
    g.connect(master);
    o.start(time);
    o.stop(time + 0.2);
  }

  function scheduleChord(theme: MusicTheme, chordIdx: number, when: number): void {
    const chord = theme.chords[chordIdx % theme.chords.length];
    const step = 60 / theme.bpm;
    const dur = step * 8;
    chord.forEach((deg, i) => {
      padTone(theme.scale[deg % theme.scale.length], when, dur, 0.05 + i * 0.012, theme.padWave);
    });
    if (theme.pulse) pulse(when);
    if (Math.random() < theme.sparkleDensity) sparkle(when + step * 6, theme.sparkleDensity);
  }

  function tick(): void {
    // delay safety
    if (!running) return;
    const theme = current();
    const step = 60 / theme.bpm;
    while (nextTime < ctx.currentTime + scheduleAhead) {
      scheduleChord(theme, chordIndex, nextTime);
      nextTime += step * 8;
      chordIndex += 1;
    }
    if (timer !== null) {
      timer = window.setTimeout(tick, lookahead);
    }
  }

  function startScheduler(): void {
    if (timer !== null) window.clearTimeout(timer);
    chordIndex = 0;
    nextTime = ctx.currentTime + 0.2;
    timer = window.setTimeout(tick, lookahead);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      startDrones();
      startScheduler();
    },
    pause(): void {
      running = false;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      // Fade out the currently-playing material so it becomes silent.
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    },
    resume(): void {
      if (running) return;
      running = true;
      // Re-anchor the scheduler so it continues seamlessly.
      nextTime = ctx.currentTime + 0.2;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);
      timer = window.setTimeout(tick, lookahead);
    },
    setTheme(i: number): void {
      const next = ((i % MUSIC_THEMES.length) + MUSIC_THEMES.length) % MUSIC_THEMES.length;
      index = next;
      stopDrones();
      if (running) {
        startDrones();
        startScheduler();
      }
    },
    currentTheme(): string {
      return current().name;
    },
    stop(): void {
      running = false;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      stopDrones();
      master.disconnect();
    },
  };
}
