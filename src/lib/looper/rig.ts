import type { FxSpec, LooperAction } from "./actions";
import { INPUT_PRESETS } from "./inputPresets";

/**
 * Starter rigs. An input (a guitar, a piano) gets a few buses of its own, each with effects; one is open at a time (radio) and each bus
 * plays to the master and records into every group, so the person picks the sound with one click. The guitar's buses go through a
 * tuner first. Pure: it only builds the actions; the caller runs them as one batch so one undo takes the whole rig away.
 */
export const RIG_PRESETS = ["sparkle", "crunch", "lead"] as const;

/**
 * The amps of the guitar rig, one bus each, named after the amp. `find` holds words of the model's file name in the online amp library
 * (`nam/` in the Blob store); the app fetches the model when its bus is first chosen. Without the library the bus has an empty amp.
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

const gate = (threshold: number): FxSpec => ({ kind: "denoise", params: { threshold, reduction: 36, release: 30, hum: 70, hiss: 14000 } });

/** The effects of an amp bus: a gate (tighter for more gain), the amp, and a room after the fader. */
const ampBus = (a: (typeof GUITAR_AMPS)[number]): BusSpec => ({
  name: a.name,
  effects: [
    gate(a.gain === "high" ? -56 : a.gain === "drive" ? -60 : -64),
    { kind: "nam", amp: a.find },
    { kind: "reverb", post: true, params: { decay: a.gain === "clean" ? 2 : 1.4, mix: a.gain === "clean" ? 0.2 : 0.14 } },
  ],
});

let counter = 0;
const stamp = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

interface BusSpec {
  name: string;
  effects: (FxSpec & { post?: boolean })[];
}

/**
 * The nodes and links of one input with its buses: the first bus open, the others closed, every bus to the master and into every group's
 * recorder. With `via` (a tuner's id) every bus goes into it instead, and it goes on to the master and the recorders.
 */
function bundle(a: { input: string; buses: BusSpec[]; groups: string[]; tag: string; at: { x: number; y: number }; via?: string }): { actions: LooperAction[]; ids: string[] } {
  const actions: LooperAction[] = [];
  const ids = a.buses.map((_, i) => `fx:${a.tag}${i}`);
  a.buses.forEach((b, i) => {
    const effects = b.effects.map((e, j) => ({ id: `${a.tag}${i}e${j}`, ...e }));
    actions.push({ type: "patch.node", node: { id: ids[i], kind: "fx", owner: a.input, x: a.at.x, y: a.at.y + i * 70, name: b.name, ...(effects.length ? { effects } : {}) } });
  });
  ids.forEach((id, i) => actions.push({ type: "patch.link", link: { id: `l${a.tag}i${i}`, from: a.input, to: id, muted: i > 0 } }));
  const outs = (from: string, n: string) => {
    actions.push({ type: "patch.link", link: { id: `l${a.tag}m${n}`, from, to: "master" } });
    a.groups.forEach((g, k) => actions.push({ type: "patch.link", link: { id: `l${a.tag}g${n}_${k}`, from, to: `group:${g}`, port: "rec" } }));
  };
  if (a.via) {
    ids.forEach((id, i) => actions.push({ type: "patch.link", link: { id: `l${a.tag}t${i}`, from: id, to: a.via! } }));
    outs(a.via, "t");
  } else ids.forEach((id, i) => outs(id, String(i)));
  return { actions, ids };
}

export function starterRig(a: {
  /** the patch id of the input, e.g. "in:3" */
  input: string;
  /** group ids (without the "group:" prefix) */
  groups: string[];
  /** links that already take this input straight into a group's recorder: they are removed, so only the rig records */
  directLinks: string[];
  /** where the buses start, in stage units */
  at?: { x: number; y: number };
}): { actions: LooperAction[]; buses: string[]; tuner: string } {
  const preset = (id: string): BusSpec[] => INPUT_PRESETS.guitar.filter((p) => p.id === id).map((p) => ({ name: p.name, effects: p.effects.map((e) => ({ kind: e.kind, ...(e.post ? { post: true } : {}), ...(e.params ? { params: e.params } : {}) })) }));
  const [first, ...rest] = RIG_PRESETS;
  // the clean sound needs nothing from the library, so it is the one open at first; the amps follow, the built-in drives last
  const buses = [...preset(first), ...GUITAR_AMPS.map(ampBus), ...rest.flatMap(preset)];
  const tag = `rig${stamp()}`;
  const at = a.at ?? { x: 20, y: 660 };
  const tuner = `tuner:${tag}`;
  const b = bundle({ input: a.input, groups: a.groups, tag, at, buses, via: tuner });
  return {
    actions: [...a.directLinks.map((id): LooperAction => ({ type: "patch.unlink", id })), { type: "patch.node", node: { id: tuner, kind: "tuner", x: at.x + 360, y: at.y, name: "Tuner" } }, ...b.actions],
    buses: b.ids,
    tuner,
  };
}

/** The buses of every piano in the starter piano rig. A bus with no effects is the dry piano. */
export const PIANO_PRESETS: { id: string; name: string; effects: (FxSpec & { post?: boolean })[] }[] = [
  { id: "dry", name: "Dry piano", effects: [] },
  { id: "room", name: "Room", effects: [{ kind: "reverb", post: true, params: { decay: 1.2, tone: 7000, mix: 0.22 } }] },
  { id: "hall", name: "Hall", effects: [{ kind: "reverb", post: true, params: { decay: 3, tone: 6000, mix: 0.32 } }] },
  { id: "dream", name: "Dreamy", effects: [{ kind: "chorus", params: { rate: 0.5, depth: 0.5, mix: 0.35 } }, { kind: "tapeDelay", post: true, params: { time: 420, feedback: 0.35, tone: 2600, wow: 0.35, mix: 0.25 } }, { kind: "reverb", post: true, params: { decay: 4.5, tone: 5000, mix: 0.4 } }] },
];

/** The starter settings of the default pianos: different keys and scales, so each one sounds like another instrument to play. */
export const PIANO_STARTS: { name: string; root: number; scale: string; octave: number }[] = [
  { name: "Piano C major", root: 0, scale: "major", octave: 3 },
];

/** The default groups, in order: each bus has its own effects and is named after its sound, so a loop changes colour by moving it. */
export const GROUP_STARTS: { name: string; effects: (FxSpec & { post?: boolean })[] }[] = [
  { name: "Room", effects: [{ kind: "reverb", post: true, params: { decay: 1.1, tone: 7000, mix: 0.2 } }] },
  { name: "Echo", effects: [{ kind: "tapeDelay", post: true, params: { time: 375, feedback: 0.4, tone: 3000, wow: 0.25, mix: 0.3 } }] },
  { name: "Wide", effects: [{ kind: "chorus", params: { rate: 0.6, depth: 0.6, mix: 0.45 } }, { kind: "reverb", post: true, params: { decay: 2.2, tone: 6500, mix: 0.25 } }] },
  { name: "Lo-fi", effects: [{ kind: "filter", params: { mode: 0, cutoff: 1800, resonance: 1.2, mix: 1 } }, { kind: "tremolo", params: { rate: 4, depth: 0.35 } }] },
  { name: "Space", effects: [{ kind: "phaser", params: { rate: 0.3, depth: 0.6, feedback: 0.3, mix: 0.35 } }, { kind: "reverb", post: true, params: { decay: 5, tone: 5000, mix: 0.45 } }] },
];

/** The default sequencers of each default group, in group order: a drum machine and a bass, each group with its own groove. */
export const SEQUENCER_STARTS: { drums: string; bass: string }[] = [
  { drums: "rock", bass: "root" },
  { drums: "four", bass: "octave" },
  { drums: "hiphop", bass: "walk" },
  { drums: "shuffle", bass: "offbeat" },
  { drums: "halftime", bass: "syncop" },
];

/** The starter piano rig: each piano gets the reverb buses (Dry piano open), each playing to the master and into every group's recorder. */
export function pianoRig(a: {
  /** the patch ids of the pianos, e.g. "in:4" */
  inputs: string[];
  groups: string[];
  directLinks: string[];
  at?: { x: number; y: number };
}): { actions: LooperAction[]; buses: string[] } {
  const at = a.at ?? { x: 20, y: 1100 };
  const actions: LooperAction[] = a.directLinks.map((id): LooperAction => ({ type: "patch.unlink", id }));
  const buses: string[] = [];
  a.inputs.forEach((input, k) => {
    const b = bundle({ input, groups: a.groups, tag: `pno${stamp()}`, at: { x: at.x + k * 220, y: at.y }, buses: PIANO_PRESETS.map((p) => ({ name: p.name, effects: p.effects })) });
    actions.push(...b.actions);
    buses.push(...b.ids);
  });
  return { actions, buses };
}

/**
 * One more output bus inside an input. Like the rigs it plays to the master and into every group's recorder, so the input sounds and
 * records as it did; the first bus also takes over from the input's direct recorder links. Its link starts closed when another is open.
 */
export function addBus(a: { input: string; groups: string[]; directLinks: string[]; name: string; at: { x: number; y: number } }): { actions: LooperAction[]; id: string } {
  const tag = `bus${stamp()}`;
  const id = `fx:${tag}`;
  const actions: LooperAction[] = a.directLinks.map((l): LooperAction => ({ type: "patch.unlink", id: l }));
  actions.push({ type: "patch.node", node: { id, kind: "fx", owner: a.input, x: a.at.x, y: a.at.y, name: a.name } });
  actions.push({ type: "patch.link", link: { id: `l${tag}i`, from: a.input, to: id } });
  actions.push({ type: "patch.link", link: { id: `l${tag}m`, from: id, to: "master" } });
  a.groups.forEach((g, k) => actions.push({ type: "patch.link", link: { id: `l${tag}g${k}`, from: id, to: `group:${g}`, port: "rec" } }));
  return { actions, id };
}
