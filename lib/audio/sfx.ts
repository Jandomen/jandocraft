/**
 * SFX registry - decoupled map of named, procedurally-synthesized sound effects.
 *
 * Each entry is a function that schedules a short one-shot sound into the
 * provided context/bus using the Web Audio API. Adding a new sound is as simple
 * as appending an entry here (and, for gameplay wiring, calling
 * `audioManager.playSfx("name")`).
 *
 * No external assets or services are used.
 */

export type SfxName =
  | "build"
  | "remove"
  | "door"
  | "equip"
  | "unequip"
  | "repair"
  | "alarm"
  | "death"
  | "click"
  | "step";

type SfxBuilder = (ctx: BaseAudioContext, dest: AudioNode, when: number) => void;

/** Deterministic tiny noise buffer shared across effects. */
let noiseBuffer: AudioBuffer | null = null;
function getNoise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const frameCount = Math.floor(ctx.sampleRate * 1.2);
  noiseBuffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function env(
  ctx: BaseAudioContext,
  when: number,
  peak: number,
  attack: number,
  dur: number,
  out: AudioNode
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + dur);
  g.connect(out);
  return g;
}

function osc(
  ctx: BaseAudioContext,
  when: number,
  type: OscillatorType,
  f0: number,
  f1: number,
  peak: number,
  attack: number,
  dur: number,
  out: AudioNode
): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(1, f0), when);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + attack + dur);
  const g = env(ctx, when, peak, attack, dur, out);
  o.connect(g);
  g.connect(out);
  o.start(when);
  o.stop(when + attack + dur + 0.05);
}

function burst(
  ctx: BaseAudioContext,
  when: number,
  peak: number,
  dur: number,
  hp: number,
  out: AudioNode
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = hp;
  const g = env(ctx, when, peak, 0.002, dur, out);
  src.connect(filt);
  filt.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + dur + 0.05);
}

export const SFX_REGISTRY: Record<SfxName, SfxBuilder> = {
  // Solid placement thunk.
  build: (c, d, w) => {
    osc(c, w, "triangle", 300, 130, 0.5, 0.005, 0.12, d);
    burst(c, w, 0.25, 0.06, 900, d);
  },
  // Break/shatter.
  remove: (c, d, w) => {
    burst(c, w, 0.4, 0.12, 1400, d);
    osc(c, w, "square", 700, 90, 0.18, 0.002, 0.14, d);
  },
  // Sliding airlock whoosh + clunk.
  door: (c, d, w) => {
    burst(c, w, 0.28, 0.4, 300, d);
    osc(c, w, "sine", 130, 320, 0.25, 0.12, 0.28, d);
    osc(c, w + 0.34, "triangle", 240, 180, 0.28, 0.005, 0.08, d);
  },
  // Hissing airlock seal (on/off suit toggle).
  equip: (c, d, w) => {
    burst(c, w, 0.35, 0.5, 250, d);
    osc(c, w, "sine", 180, 420, 0.18, 0.1, 0.4, d);
  },
  unequip: (c, d, w) => {
    burst(c, w, 0.3, 0.45, 250, d);
    osc(c, w, "sine", 420, 160, 0.16, 0.1, 0.38, d);
  },
  // Short ratchet/metal tick.
  repair: (c, d, w) => {
    for (let i = 0; i < 4; i++) {
      const t = w + i * 0.07;
      osc(c, t, "triangle", 900 - i * 120, 600, 0.2, 0.002, 0.05, d);
      burst(c, t, 0.08, 0.03, 2500, d);
    }
  },
  // Warning klaxon (repeated beep - call repeatedly for a loop).
  alarm: (c, d, w) => {
    osc(c, w, "square", 620, 620, 0.22, 0.01, 0.16, d);
    osc(c, w + 0.24, "square", 620, 620, 0.22, 0.01, 0.16, d);
  },
  // Low downward thud.
  death: (c, d, w) => {
    osc(c, w, "sine", 220, 40, 0.6, 0.03, 0.7, d);
    osc(c, w, "sawtooth", 110, 30, 0.3, 0.03, 0.6, d);
  },
  // UI tick.
  click: (c, d, w) => {
    osc(c, w, "square", 900, 700, 0.12, 0.002, 0.05, d);
  },
  // Light footstep.
  step: (c, d, w) => {
    burst(c, w, 0.12, 0.05, 500, d);
  },
};
