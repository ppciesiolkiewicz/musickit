/**
 * Effects for the looper's buses and input strips, built from native Web Audio nodes (they run on the audio thread, so they cost the page nothing).
 * Every effect has a dry/wet `mix`. The parameter list of each kind drives the UI, so adding an effect only needs an entry
 * in EFFECT_DEFS and a case in createEffect. Imports nothing outside src/lib/looper.
 */

export type EffectKind = "tapeDelay" | "reverb" | "filter" | "distortion" | "chorus" | "phaser" | "tremolo" | "compressor" | "eq" | "nam";

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  unit?: string;
  /** the value is the id of an option from the choice source registered under this name (see choices.ts) */
  choice?: string;
  /** an on/off switch: off below 0.5 */
  toggle?: boolean;
}

export interface EffectDef {
  kind: EffectKind;
  name: string;
  params: ParamDef[];
}

const DEFS: EffectDef[] = [
  {
    kind: "tapeDelay",
    name: "Tape delay",
    params: [
      { key: "time", label: "Time", min: 60, max: 900, step: 1, def: 320, unit: "ms" },
      { key: "feedback", label: "Repeats", min: 0, max: 0.9, step: 0.01, def: 0.42 },
      { key: "tone", label: "Tone", min: 800, max: 8000, step: 50, def: 3200, unit: "Hz" },
      { key: "wow", label: "Wow", min: 0, max: 1, step: 0.01, def: 0.3 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 0.35 },
    ],
  },
  {
    kind: "reverb",
    name: "Reverb",
    params: [
      { key: "decay", label: "Decay", min: 0.3, max: 6, step: 0.1, def: 2.2, unit: "s" },
      { key: "tone", label: "Tone", min: 1000, max: 12000, step: 100, def: 6000, unit: "Hz" },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 0.3 },
    ],
  },
  {
    kind: "filter",
    name: "Filter",
    params: [
      { key: "mode", label: "Low pass (0) / high pass (1)", min: 0, max: 1, step: 1, def: 0 },
      { key: "cutoff", label: "Cutoff", min: 40, max: 18000, step: 10, def: 1200, unit: "Hz" },
      { key: "resonance", label: "Resonance", min: 0.1, max: 18, step: 0.1, def: 0.9 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 1 },
    ],
  },
  {
    kind: "distortion",
    name: "Distortion",
    params: [
      { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01, def: 0.5 },
      { key: "tone", label: "Tone", min: 500, max: 12000, step: 50, def: 4500, unit: "Hz" },
      { key: "level", label: "Level", min: 0, max: 1.5, step: 0.01, def: 0.7 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 1 },
    ],
  },
  {
    kind: "chorus",
    name: "Chorus",
    params: [
      { key: "rate", label: "Rate", min: 0.1, max: 8, step: 0.1, def: 0.9, unit: "Hz" },
      { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01, def: 0.5 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },
  {
    kind: "phaser",
    name: "Phaser",
    params: [
      { key: "rate", label: "Rate", min: 0.05, max: 6, step: 0.05, def: 0.5, unit: "Hz" },
      { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01, def: 0.7 },
      { key: "feedback", label: "Feedback", min: 0, max: 0.9, step: 0.01, def: 0.4 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },
  {
    kind: "tremolo",
    name: "Tremolo",
    params: [
      { key: "rate", label: "Rate", min: 0.5, max: 16, step: 0.1, def: 5, unit: "Hz" },
      { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01, def: 0.6 },
    ],
  },
  {
    kind: "compressor",
    name: "Compressor",
    params: [
      { key: "threshold", label: "Threshold", min: -60, max: 0, step: 1, def: -24, unit: "dB" },
      { key: "ratio", label: "Ratio", min: 1, max: 20, step: 0.5, def: 4 },
      { key: "attack", label: "Attack", min: 1, max: 200, step: 1, def: 10, unit: "ms" },
      { key: "release", label: "Release", min: 20, max: 1000, step: 10, def: 200, unit: "ms" },
      { key: "makeup", label: "Make-up", min: 0, max: 18, step: 0.5, def: 4, unit: "dB" },
    ],
  },
  {
    kind: "eq",
    name: "EQ",
    params: [
      { key: "low", label: "Low", min: -18, max: 18, step: 0.5, def: 0, unit: "dB" },
      { key: "mid", label: "Mid", min: -18, max: 18, step: 0.5, def: 0, unit: "dB" },
      { key: "high", label: "High", min: -18, max: 18, step: 0.5, def: 0, unit: "dB" },
      { key: "midFreq", label: "Mid freq", min: 300, max: 5000, step: 10, def: 1000, unit: "Hz" },
    ],
  },
  {
    kind: "nam",
    name: "Amp model (NAM)",
    params: [
      { key: "model", label: "Model", min: 0, max: 1000000, step: 1, def: 0, choice: "nam-model" },
      { key: "input", label: "Input", min: -24, max: 24, step: 0.5, def: 0, unit: "dB" },
      { key: "output", label: "Output", min: -24, max: 24, step: 0.5, def: 0, unit: "dB" },
      { key: "gate", label: "Gate", min: -90, max: -30, step: 1, def: -90, unit: "dB" },
      { key: "match", label: "Level match", min: 0, max: 1, step: 1, def: 1, toggle: true },
      { key: "size", label: "Size", min: 0, max: 1, step: 0.01, def: 1 },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 1 },
    ],
  },
];

export const EFFECT_DEFS = Object.fromEntries(DEFS.map((d) => [d.kind, d])) as Record<EffectKind, EffectDef>;

export const EFFECT_KINDS = Object.keys(EFFECT_DEFS) as EffectKind[];

export interface EffectSpec {
  id: string;
  kind: EffectKind;
  bypass: boolean;
  /** false: before the fader (volume, mute) so the fader also cuts the effect; true: after it, so a tail rings on */
  post: boolean;
  params: Record<string, number>;
}

export const defaultParams = (kind: EffectKind): Record<string, number> => Object.fromEntries(EFFECT_DEFS[kind].params.map((p) => [p.key, p.def]));

/** Keep each parameter inside its range; unknown keys are dropped and missing ones take the default. */
export function clampParams(kind: EffectKind, params: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of EFFECT_DEFS[kind].params) {
    const v = Number(params?.[p.key]);
    out[p.key] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.def;
  }
  return out;
}

/** Check a saved effect list: unknown kinds are dropped, parameters are clamped. */
export function sanitiseEffects(raw: unknown): EffectSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: EffectSpec[] = [];
  raw.slice(0, 8).forEach((e, i) => {
    if (e && typeof e === "object" && typeof e.kind === "string" && e.kind in EFFECT_DEFS) {
      out.push({ id: typeof e.id === "string" ? e.id : `fx${i}`, kind: e.kind, bypass: e.bypass === true, post: e.post === true, params: clampParams(e.kind, e.params ?? {}) });
    }
  });
  return out;
}

export interface FxNode {
  input: AudioNode;
  output: AudioNode;
  update(params: Record<string, number>): void;
  dispose(): void;
}

/** A decaying stereo noise burst used as the reverb's room. */
export function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

const safeDisconnect = (n: AudioNode | null | undefined) => {
  try {
    n?.disconnect();
  } catch {
    /* already disconnected */
  }
};

function tapeDelay(ctx: AudioContext, p: Record<string, number>): FxNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(1.5);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  const feedback = ctx.createGain();
  // the tape wobble: a slow LFO nudging the delay time
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.7;
  const wobble = ctx.createGain();
  lfo.connect(wobble);
  wobble.connect(delay.delayTime);
  lfo.start();
  input.connect(dry);
  dry.connect(output);
  input.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(wet);
  wet.connect(output);
  const update = (q: Record<string, number>) => {
    const t = ctx.currentTime;
    delay.delayTime.setTargetAtTime(q.time / 1000, t, 0.05);
    feedback.gain.setTargetAtTime(q.feedback, t, 0.02);
    tone.frequency.setTargetAtTime(q.tone, t, 0.02);
    wobble.gain.setTargetAtTime(q.wow * 0.0035, t, 0.05);
    wet.gain.setTargetAtTime(q.mix, t, 0.02);
    dry.gain.setTargetAtTime(1 - q.mix * 0.5, t, 0.02);
  };
  update(p);
  return {
    input,
    output,
    update,
    dispose() {
      try {
        lfo.stop();
      } catch {
        /* already stopped */
      }
      [input, output, dry, wet, delay, tone, feedback, lfo, wobble].forEach(safeDisconnect);
    },
  };
}

function reverb(ctx: AudioContext, p: Record<string, number>): FxNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  const conv = ctx.createConvolver();
  input.connect(dry);
  dry.connect(output);
  input.connect(tone);
  tone.connect(conv);
  conv.connect(wet);
  wet.connect(output);
  let decay = 0;
  const update = (q: Record<string, number>) => {
    const t = ctx.currentTime;
    if (Math.abs(q.decay - decay) > 0.05) {
      conv.buffer = makeImpulse(ctx, q.decay);
      decay = q.decay;
    }
    tone.frequency.setTargetAtTime(q.tone, t, 0.02);
    wet.gain.setTargetAtTime(q.mix * 1.4, t, 0.02);
    dry.gain.setTargetAtTime(1 - q.mix * 0.4, t, 0.02);
  };
  update(p);
  return {
    input,
    output,
    update,
    dispose() {
      [input, output, dry, wet, tone, conv].forEach(safeDisconnect);
    },
  };
}

type Factory = (ctx: AudioContext, p: Record<string, number>) => FxNode;

/** Wrap a built graph into an FxNode. Every effect below is plain native Web Audio nodes, so it runs on the audio thread. */
function node(ctx: AudioContext, nodes: AudioNode[], input: AudioNode, output: AudioNode, update: (q: Record<string, number>) => void, p: Record<string, number>, oscs: OscillatorNode[] = []): FxNode {
  update(p);
  void ctx;
  return {
    input,
    output,
    update,
    dispose() {
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      [...nodes, ...oscs, input, output].forEach(safeDisconnect);
    },
  };
}

/** Parallel dry/wet around a wet path: returns the pieces every mixed effect shares. */
function mixer(ctx: AudioContext) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry);
  dry.connect(output);
  wet.connect(output);
  return { input, output, dry, wet, setMix: (m: number, t: number) => { wet.gain.setTargetAtTime(m, t, 0.02); dry.gain.setTargetAtTime(1 - m * 0.5, t, 0.02); } };
}

const filter: Factory = (ctx, p) => {
  const m = mixer(ctx);
  const f = ctx.createBiquadFilter();
  m.input.connect(f);
  f.connect(m.wet);
  return node(ctx, [m.dry, m.wet, f], m.input, m.output, (q) => {
    const t = ctx.currentTime;
    f.type = q.mode >= 0.5 ? "highpass" : "lowpass";
    f.frequency.setTargetAtTime(q.cutoff, t, 0.02);
    f.Q.setTargetAtTime(q.resonance, t, 0.02);
    // a filter replaces the sound: fully wet is the filtered signal alone
    m.wet.gain.setTargetAtTime(q.mix, t, 0.02);
    m.dry.gain.setTargetAtTime(1 - q.mix, t, 0.02);
  }, p);
};

/** tanh-style soft clipping curve; k grows with drive. */
export function distortionCurve(drive: number, n = 1024): Float32Array<ArrayBuffer> {
  const k = 1 + drive * 60;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

const distortion: Factory = (ctx, p) => {
  const m = mixer(ctx);
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.oversample = "4x";
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  const level = ctx.createGain();
  m.input.connect(pre);
  pre.connect(shaper);
  shaper.connect(tone);
  tone.connect(level);
  level.connect(m.wet);
  let drive = -1;
  return node(ctx, [m.dry, m.wet, pre, shaper, tone, level], m.input, m.output, (q) => {
    const t = ctx.currentTime;
    if (Math.abs(q.drive - drive) > 0.005) {
      shaper.curve = distortionCurve(q.drive);
      drive = q.drive;
    }
    pre.gain.setTargetAtTime(1 + q.drive * 4, t, 0.02);
    tone.frequency.setTargetAtTime(q.tone, t, 0.02);
    level.gain.setTargetAtTime(q.level * 0.6, t, 0.02);
    m.wet.gain.setTargetAtTime(q.mix, t, 0.02);
    m.dry.gain.setTargetAtTime(1 - q.mix, t, 0.02);
  }, p);
};

/** An LFO that nudges an AudioParam by +-amount. */
function lfo(ctx: AudioContext, target: AudioParam) {
  const osc = ctx.createOscillator();
  const amt = ctx.createGain();
  osc.connect(amt);
  amt.connect(target);
  osc.start();
  return { osc, amt };
}

const chorus: Factory = (ctx, p) => {
  const m = mixer(ctx);
  const d1 = ctx.createDelay(0.1);
  const d2 = ctx.createDelay(0.1);
  d1.delayTime.value = 0.018;
  d2.delayTime.value = 0.026;
  const l1 = lfo(ctx, d1.delayTime);
  const l2 = lfo(ctx, d2.delayTime);
  l2.osc.type = "triangle";
  m.input.connect(d1);
  m.input.connect(d2);
  d1.connect(m.wet);
  d2.connect(m.wet);
  return node(ctx, [m.dry, m.wet, d1, d2, l1.amt, l2.amt], m.input, m.output, (q) => {
    const t = ctx.currentTime;
    l1.osc.frequency.setTargetAtTime(q.rate, t, 0.05);
    l2.osc.frequency.setTargetAtTime(q.rate * 1.13, t, 0.05);
    l1.amt.gain.setTargetAtTime(q.depth * 0.006, t, 0.05);
    l2.amt.gain.setTargetAtTime(q.depth * 0.007, t, 0.05);
    m.setMix(q.mix, t);
  }, p, [l1.osc, l2.osc]);
};

const phaser: Factory = (ctx, p) => {
  const m = mixer(ctx);
  const stages = [0, 1, 2, 3].map(() => {
    const a = ctx.createBiquadFilter();
    a.type = "allpass";
    a.frequency.value = 800;
    return a;
  });
  m.input.connect(stages[0]);
  stages.forEach((a, i) => i > 0 && stages[i - 1].connect(a));
  const fb = ctx.createGain();
  stages[3].connect(fb);
  fb.connect(stages[0]);
  stages[3].connect(m.wet);
  const l = stages.map((a) => lfo(ctx, a.frequency));
  return node(ctx, [m.dry, m.wet, fb, ...stages, ...l.map((x) => x.amt)], m.input, m.output, (q) => {
    const t = ctx.currentTime;
    l.forEach((x, i) => {
      x.osc.frequency.setTargetAtTime(q.rate, t, 0.05);
      x.amt.gain.setTargetAtTime(q.depth * (300 + i * 250), t, 0.05);
    });
    fb.gain.setTargetAtTime(q.feedback, t, 0.02);
    m.setMix(q.mix, t);
  }, p, l.map((x) => x.osc));
};

const tremolo: Factory = (ctx, p) => {
  const input = ctx.createGain();
  const amp = ctx.createGain();
  const output = ctx.createGain();
  input.connect(amp);
  amp.connect(output);
  const l = lfo(ctx, amp.gain);
  return node(ctx, [amp, l.amt], input, output, (q) => {
    const t = ctx.currentTime;
    // gain swings between 1 and 1 - depth
    amp.gain.setTargetAtTime(1 - q.depth / 2, t, 0.02);
    l.amt.gain.setTargetAtTime(q.depth / 2, t, 0.02);
    l.osc.frequency.setTargetAtTime(q.rate, t, 0.02);
  }, p, [l.osc]);
};

const compressor: Factory = (ctx, p) => {
  const input = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const makeup = ctx.createGain();
  input.connect(comp);
  comp.connect(makeup);
  return node(ctx, [comp, makeup], input, makeup, (q) => {
    const t = ctx.currentTime;
    comp.threshold.setTargetAtTime(q.threshold, t, 0.02);
    comp.ratio.setTargetAtTime(q.ratio, t, 0.02);
    comp.attack.setTargetAtTime(q.attack / 1000, t, 0.02);
    comp.release.setTargetAtTime(q.release / 1000, t, 0.02);
    makeup.gain.setTargetAtTime(10 ** (q.makeup / 20), t, 0.02);
  }, p);
};

const eq: Factory = (ctx, p) => {
  const lo = ctx.createBiquadFilter();
  lo.type = "lowshelf";
  lo.frequency.value = 200;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.Q.value = 0.9;
  const hi = ctx.createBiquadFilter();
  hi.type = "highshelf";
  hi.frequency.value = 4000;
  lo.connect(mid);
  mid.connect(hi);
  return node(ctx, [lo, mid, hi], lo, hi, (q) => {
    const t = ctx.currentTime;
    lo.gain.setTargetAtTime(q.low, t, 0.02);
    mid.gain.setTargetAtTime(q.mid, t, 0.02);
    mid.frequency.setTargetAtTime(q.midFreq, t, 0.02);
    hi.gain.setTargetAtTime(q.high, t, 0.02);
  }, p);
};

let namFactory: Factory | null = null;

/** The app injects the NAM effect (it lives outside the looper). Until then, and if it throws, the effect passes the signal through. */
export function setNamFactory(f: Factory | null): void {
  namFactory = f;
}

const passthrough: Factory = (ctx, p) => {
  const g = ctx.createGain();
  return node(ctx, [], g, g, () => {}, p);
};

const nam: Factory = (ctx, p) => {
  if (namFactory) {
    try {
      return namFactory(ctx, p);
    } catch {
      /* fall through to a transparent effect */
    }
  }
  return passthrough(ctx, p);
};

const FACTORIES: Record<EffectKind, Factory> = { tapeDelay, reverb, filter, distortion, chorus, phaser, tremolo, compressor, eq, nam };

export function createEffect(ctx: AudioContext, spec: EffectSpec): FxNode {
  return FACTORIES[spec.kind](ctx, clampParams(spec.kind, spec.params));
}

/** Move an effect one place earlier (-1) or later (+1) in its own section (before or after the fader). Order is the order the signal passes through. */
export function moveEffect(list: EffectSpec[], fxId: string, dir: -1 | 1): EffectSpec[] {
  const at = list.findIndex((e) => e.id === fxId);
  if (at < 0) return list;
  const post = list[at].post;
  let j = at + dir;
  while (j >= 0 && j < list.length && list[j].post !== post) j += dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[at], next[j]] = [next[j], next[at]];
  return next;
}
