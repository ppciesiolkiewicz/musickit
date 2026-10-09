import type { EffectKind } from "./effects";

/**
 * What a new hardware input is for, and ready-made effect stacks for it. Choosing one adds the input with these effects
 * (all editable afterwards). Pure data; the effect names and parameters are checked by the tests against `EFFECT_DEFS`.
 */

export type InputRole = "clean" | "guitar" | "vocal";

export interface PresetFx {
  kind: EffectKind;
  /** after the fader (a tail that should survive a mute) */
  post?: boolean;
  params?: Record<string, number>;
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
