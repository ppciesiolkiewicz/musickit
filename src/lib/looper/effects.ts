/**
 * Effects for the looper's buses (and, later, input strips): a tape delay and a reverb, built from Web Audio nodes.
 * Every effect has a dry/wet `mix`. The parameter list of each kind drives the UI, so adding an effect only needs an entry
 * in EFFECT_DEFS and a case in createEffect. Imports nothing outside src/lib/looper.
 */

export type EffectKind = "tapeDelay" | "reverb";

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  unit?: string;
}

export interface EffectDef {
  kind: EffectKind;
  name: string;
  params: ParamDef[];
}

export const EFFECT_DEFS: Record<EffectKind, EffectDef> = {
  tapeDelay: {
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
  reverb: {
    kind: "reverb",
    name: "Reverb",
    params: [
      { key: "decay", label: "Decay", min: 0.3, max: 6, step: 0.1, def: 2.2, unit: "s" },
      { key: "tone", label: "Tone", min: 1000, max: 12000, step: 100, def: 6000, unit: "Hz" },
      { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01, def: 0.3 },
    ],
  },
};

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
    if (e && typeof e === "object" && (e.kind === "tapeDelay" || e.kind === "reverb")) {
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

export function createEffect(ctx: AudioContext, spec: EffectSpec): FxNode {
  const p = clampParams(spec.kind, spec.params);
  return spec.kind === "tapeDelay" ? tapeDelay(ctx, p) : reverb(ctx, p);
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
