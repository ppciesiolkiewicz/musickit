import type { FxSpec, LooperAction } from "./actions";
import { INPUT_PRESETS } from "./inputPresets";

/**
 * Starter rigs. An input (a guitar, a piano) gets a few buses of its own, each with effects; one is open at a time (radio) and each bus
 * plays to the master and records into every group, so the person picks the sound with one click. Pure: it only builds the actions;
 * the caller runs them as one batch so one undo takes the whole rig away.
 */
export const RIG_PRESETS = ["sparkle", "crunch", "lead", "nam"] as const;

let counter = 0;
const stamp = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

interface BusSpec {
  name: string;
  effects: (FxSpec & { post?: boolean })[];
}

/** The nodes and links of one input with its buses: the first bus open, the others closed, every bus to the master and into every group's recorder. */
function bundle(a: { input: string; buses: BusSpec[]; groups: string[]; tag: string; at: { x: number; y: number } }): { actions: LooperAction[]; ids: string[] } {
  const actions: LooperAction[] = [];
  const ids = a.buses.map((_, i) => `fx:${a.tag}${i}`);
  a.buses.forEach((b, i) => {
    const effects = b.effects.map((e, j) => ({ id: `${a.tag}${i}e${j}`, ...e }));
    actions.push({ type: "patch.node", node: { id: ids[i], kind: "fx", owner: a.input, x: a.at.x, y: a.at.y + i * 70, name: b.name, ...(effects.length ? { effects } : {}) } });
  });
  ids.forEach((id, i) => actions.push({ type: "patch.link", link: { id: `l${a.tag}i${i}`, from: a.input, to: id, muted: i > 0 } }));
  ids.forEach((id, i) => {
    actions.push({ type: "patch.link", link: { id: `l${a.tag}m${i}`, from: id, to: "master" } });
    a.groups.forEach((g, k) => actions.push({ type: "patch.link", link: { id: `l${a.tag}g${i}_${k}`, from: id, to: `group:${g}`, port: "rec" } }));
  });
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
}): { actions: LooperAction[]; buses: string[] } {
  const presets = RIG_PRESETS.map((id) => INPUT_PRESETS.guitar.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const b = bundle({ input: a.input, groups: a.groups, tag: `rig${stamp()}`, at: a.at ?? { x: 20, y: 660 }, buses: presets.map((p) => ({ name: p.name, effects: p.effects.map((e) => ({ kind: e.kind, ...(e.post ? { post: true } : {}), ...(e.params ? { params: e.params } : {}) })) })) });
  return { actions: [...a.directLinks.map((id): LooperAction => ({ type: "patch.unlink", id })), ...b.actions], buses: b.ids };
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
  { name: "Piano A minor pentatonic", root: 9, scale: "minorPentatonic", octave: 3 },
  { name: "Piano E blues", root: 4, scale: "blues", octave: 2 },
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
