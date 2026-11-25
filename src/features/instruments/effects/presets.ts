import { clampParams, type EffectKind, type EffectSpec } from "./effects";

/**
 * What a hardware input is for, and ready-made effect stacks for it: the looper adds an input with one (all editable afterwards) and
 * builds its guitar and vocal rigs from them, and a recorder puts one on its input (`INPUT_STACKS`, `stackSpecs`). Pure data; the
 * effect names and parameters are checked by the tests against `EFFECT_DEFS`.
 */

export type InputRole = "clean" | "guitar" | "vocal";

export interface PresetFx {
  kind: EffectKind;
  /** after the fader (a tail that should survive a mute) */
  post?: boolean;
  params?: Record<string, number>;
  /** an amp model to look up by the words of its name (NAM only), see `EffectSpec.amp` */
  amp?: string;
}

export interface InputPreset {
  id: string;
  name: string;
  /** one short line */
  about: string;
  effects: PresetFx[];
}

const gate = (threshold = -62): PresetFx => ({ kind: "denoise", params: { threshold, reduction: 36, release: 30, hum: 70, hiss: 14000 } });

export const INPUT_ROLES: { id: InputRole; name: string; about: string; monitor: boolean }[] = [
  { id: "clean", name: "Clean", about: "Any source as it is: keys, a mic on an acoustic.", monitor: true },
  { id: "guitar", name: "Guitar", about: "Guitar or bass straight from the interface (DI).", monitor: true },
  { id: "vocal", name: "Vocal", about: "A voice. Use headphones: a mic near speakers feeds back.", monitor: false },
];

export const INPUT_PRESETS: Record<InputRole, InputPreset[]> = {
  clean: [
    { id: "flat", name: "Flat", about: "No effects.", effects: [] },
    { id: "polish", name: "Polished", about: "Noise gate, gentle compression, a little air.", effects: [gate(-66), { kind: "compressor", params: { threshold: -22, ratio: 2.5, attack: 20, release: 250, makeup: 2 } }, { kind: "eq", params: { low: 0, mid: 0, high: 2 } }] },
  ],
  guitar: [
    { id: "dry", name: "Dry DI", about: "Gate only. Add a NAM amp yourself.", effects: [gate()] },
    { id: "nam", name: "Amp model (NAM)", about: "Gate, then a NAM amp (pick a model in it), then reverb.", effects: [gate(), { kind: "nam" }, { kind: "reverb", post: true, params: { decay: 1.6, mix: 0.18 } }] },
    { id: "sparkle", name: "Clean sparkle", about: "Compressed clean with chorus and a room.", effects: [gate(), { kind: "compressor", params: { threshold: -24, ratio: 3, attack: 15, release: 200, makeup: 3 } }, { kind: "chorus", params: { rate: 0.7, depth: 0.4, mix: 0.3 } }, { kind: "reverb", post: true, params: { decay: 2.2, mix: 0.22 } }] },
    { id: "crunch", name: "Crunch", about: "Mid drive, tone shaped, slap delay.", effects: [gate(), { kind: "distortion", params: { drive: 0.45, tone: 3800, level: 0.6, mix: 1 } }, { kind: "eq", params: { low: 1, mid: 1.5, high: -1 } }, { kind: "tapeDelay", post: true, params: { time: 140, feedback: 0.2, tone: 3000, wow: 0.2, mix: 0.2 } }] },
    { id: "lead", name: "Lead", about: "High gain, tape delay and a hall.", effects: [gate(-58), { kind: "distortion", params: { drive: 0.75, tone: 3200, level: 0.55, mix: 1 } }, { kind: "eq", params: { low: -1, mid: 2, high: -1.5 } }, { kind: "tapeDelay", post: true, params: { time: 380, feedback: 0.35, tone: 2800, wow: 0.3, mix: 0.28 } }, { kind: "reverb", post: true, params: { decay: 2.8, mix: 0.22 } }] },
  ],
  vocal: [
    { id: "natural", name: "Natural", about: "Gate, rumble cut, light compression.", effects: [gate(-58), { kind: "eq", params: { low: -6, mid: 0, high: 1.5 } }, { kind: "compressor", params: { threshold: -24, ratio: 3, attack: 8, release: 180, makeup: 3 } }] },
    { id: "radio", name: "Radio", about: "Narrow, forward and squashed.", effects: [gate(-55), { kind: "eq", params: { low: -12, mid: 5, high: -3, midFreq: 1800 } }, { kind: "compressor", params: { threshold: -30, ratio: 6, attack: 4, release: 120, makeup: 6 } }] },
    { id: "room", name: "Big room", about: "Natural plus plate reverb and an echo.", effects: [gate(-58), { kind: "compressor", params: { threshold: -24, ratio: 3, attack: 8, release: 180, makeup: 3 } }, { kind: "tapeDelay", post: true, params: { time: 300, feedback: 0.3, tone: 3500, wow: 0.15, mix: 0.18 } }, { kind: "reverb", post: true, params: { decay: 3.2, mix: 0.28 } }] },
  ],
};

/** Names for a chosen role and preset, with an effect list the engine can apply. */
export const presetFor = (role: InputRole, id: string): InputPreset | undefined => INPUT_PRESETS[role].find((p) => p.id === id);

/**
 * The amps of the guitar rig, named after the amp. `find` holds words of the model's file name; the app looks for it among the .nam
 * files the player has loaded on this device. Without a match the amp is empty (the signal passes through).
 */
export const GUITAR_AMPS: { name: string; find: string; gain: "clean" | "drive" | "high" }[] = [
  { name: "Fender Twin Reverb", find: "twin reverb clean", gain: "clean" },
  { name: "Fender Super Reverb", find: "fndr bfsr", gain: "clean" },
  { name: "Vox AC15 Top Boost", find: "ac15", gain: "drive" },
  { name: "Marshall JCM800", find: "jcm800", gain: "drive" },
  { name: "Marshall JCM2000 Crunch", find: "jcm2000 crunch", gain: "drive" },
  { name: "Mesa Dual Rectifier", find: "dualrec classic", gain: "high" },
  { name: "5150 Stealth Red", find: "5150 stealth red", gain: "high" },
  { name: "Mesa Mark IV Lead", find: "mark iv lead", gain: "high" },
];

/** The effects of an amp: a gate (tighter for more gain), the amp, and a room after the fader. */
export const ampEffects = (a: (typeof GUITAR_AMPS)[number]): PresetFx[] => [
  gate(a.gain === "high" ? -56 : a.gain === "drive" ? -60 : -64),
  { kind: "nam", amp: a.find },
  { kind: "reverb", post: true, params: { decay: a.gain === "clean" ? 2 : 1.4, mix: a.gain === "clean" ? 0.2 : 0.14 } },
];

/** A ready-made sound for an input outside the looper (a recorder): one of the looper's guitar or vocal stacks. */
export interface InputStack {
  id: string;
  group: "Guitar" | "Vocal";
  name: string;
  effects: PresetFx[];
  /** an amp stack: the words its model is found by. It only sounds like the amp once that model is on this device. */
  amp?: string;
}

/** Every stack a recorder offers: the guitar presets (but the empty amp), the rig's amps, then the vocal presets. */
export const INPUT_STACKS: InputStack[] = [
  ...INPUT_PRESETS.guitar.filter((p) => p.id !== "nam").map((p): InputStack => ({ id: `guitar:${p.id}`, group: "Guitar", name: p.name, effects: p.effects })),
  ...GUITAR_AMPS.map((a): InputStack => ({ id: `amp:${a.find}`, group: "Guitar", name: a.name, effects: ampEffects(a), amp: a.find })),
  ...INPUT_PRESETS.vocal.map((p): InputStack => ({ id: `vocal:${p.id}`, group: "Vocal", name: p.name, effects: p.effects })),
];

/**
 * A stack as the effect list of one `EffectChain`, in the order the sound passes: the effects before the fader, then the ones after it
 * (there is no fader in a recorder). `model` is the library id of the stack's amp model (0: not found, the amp passes the sound through).
 * Ids carry the stack's id, so a chain changed from one stack to another never reuses a node.
 */
export function stackSpecs(stack: InputStack, model = 0): EffectSpec[] {
  const spec = (e: PresetFx, i: number): EffectSpec => ({
    id: `${stack.id}/${i}`,
    kind: e.kind,
    bypass: false,
    post: e.post === true,
    params: clampParams(e.kind, { ...e.params, ...(e.kind === "nam" && model ? { model } : {}) }),
  });
  const all = stack.effects.map(spec);
  return [...all.filter((e) => !e.post), ...all.filter((e) => e.post)];
}
