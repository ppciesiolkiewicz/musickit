import type { FxSpec, LooperAction } from "./actions";
import { INPUT_PRESETS } from "./inputPresets";

/**
 * The starter rig for a guitar: the input feeds a few effect chains (the guitar presets), a switch lets one chain
 * through at a time (or several, if you change its mode), and the switch plays to the master and records into every group.
 * Pure: it only builds the actions; the caller runs them as one batch so one undo takes the whole rig away.
 */
export const RIG_PRESETS = ["sparkle", "crunch", "lead", "nam"] as const;

let counter = 0;
const stamp = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export function starterRig(a: {
  /** the patch id of the input, e.g. "in:3" */
  input: string;
  /** group ids (without the "group:" prefix) */
  groups: string[];
  /** links that already take this input straight into a group's recorder: they are removed, so only the rig records */
  directLinks: string[];
  /** where the first chain goes, in stage units */
  at?: { x: number; y: number };
}): { actions: LooperAction[]; chains: string[]; switchId: string } {
  const at = a.at ?? { x: 20, y: 660 };
  const tag = stamp();
  const actions: LooperAction[] = a.directLinks.map((id) => ({ type: "patch.unlink", id }));
  const presets = RIG_PRESETS.map((id) => INPUT_PRESETS.guitar.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const chains = presets.map((_, i) => `fx:rig${tag}${i}`);
  const switchId = `sw:rig${tag}`;
  presets.forEach((p, i) => {
    const effects: (FxSpec & { id: string })[] = p.effects.map((e, j) => ({ id: `rig${tag}${i}e${j}`, kind: e.kind, ...(e.post ? { post: true } : {}), ...(e.params ? { params: e.params } : {}) }));
    actions.push({ type: "patch.node", node: { id: chains[i], kind: "fx", x: at.x + i * 196, y: at.y, name: p.name, effects } });
  });
  actions.push({ type: "patch.node", node: { id: switchId, kind: "switch", x: at.x + 196, y: at.y + 200, name: "Guitar Switch", outMulti: true } });
  chains.forEach((c, i) => actions.push({ type: "patch.link", link: { id: `l${tag}a${i}`, from: a.input, to: c } }));
  chains.forEach((c, i) => actions.push({ type: "patch.link", link: { id: `l${tag}b${i}`, from: c, to: switchId } }));
  actions.push({ type: "patch.link", link: { id: `l${tag}m`, from: switchId, to: "master" } });
  a.groups.forEach((g, i) => actions.push({ type: "patch.link", link: { id: `l${tag}g${i}`, from: switchId, to: `group:${g}`, port: "rec" } }));
  return { actions, chains, switchId };
}

/** The reverb buses of the starter piano rig. A bus with no effects is the dry piano. */
export const PIANO_PRESETS: { id: string; name: string; effects: (FxSpec & { post?: boolean })[] }[] = [
  { id: "dry", name: "Dry piano", effects: [] },
  { id: "room", name: "Room", effects: [{ kind: "reverb", post: true, params: { decay: 1.2, tone: 7000, mix: 0.22 } }] },
  { id: "hall", name: "Hall", effects: [{ kind: "reverb", post: true, params: { decay: 3, tone: 6000, mix: 0.32 } }] },
  { id: "cathedral", name: "Cathedral", effects: [{ kind: "reverb", post: true, params: { decay: 6, tone: 4500, mix: 0.45 } }] },
  { id: "dream", name: "Dreamy", effects: [{ kind: "chorus", params: { rate: 0.5, depth: 0.5, mix: 0.35 } }, { kind: "tapeDelay", post: true, params: { time: 420, feedback: 0.35, tone: 2600, wow: 0.35, mix: 0.25 } }, { kind: "reverb", post: true, params: { decay: 4.5, tone: 5000, mix: 0.4 } }] },
];

/** The starter settings of the default pianos: different keys and scales, so each one sounds like another instrument to play. */
export const PIANO_STARTS: { name: string; root: number; scale: string; octave: number }[] = [
  { name: "Piano C major", root: 0, scale: "major", octave: 3 },
  { name: "Piano A minor pentatonic", root: 9, scale: "minorPentatonic", octave: 3 },
  { name: "Piano E blues", root: 4, scale: "blues", octave: 2 },
];

/**
 * The starter piano rig: every piano feeds every reverb bus, the buses feed a Piano Switch (one at a time on the inputs, any
 * combination on the outputs, the same logic as the guitar rig) and the switch plays to the master and records into every group.
 * Pure: builds the actions only.
 */
export function pianoRig(a: {
  /** the patch ids of the pianos, e.g. "in:4" */
  inputs: string[];
  groups: string[];
  directLinks: string[];
  at?: { x: number; y: number };
}): { actions: LooperAction[]; buses: string[]; switchId: string } {
  const at = a.at ?? { x: 20, y: 1100 };
  const tag = stamp();
  const actions: LooperAction[] = a.directLinks.map((id) => ({ type: "patch.unlink", id }));
  const buses = PIANO_PRESETS.map((_, i) => `fx:pno${tag}${i}`);
  const switchId = `sw:pno${tag}`;
  PIANO_PRESETS.forEach((p, i) => {
    const effects = p.effects.map((e, j) => ({ id: `pno${tag}${i}e${j}`, ...e }));
    actions.push({ type: "patch.node", node: { id: buses[i], kind: "fx", x: at.x + i * 196, y: at.y, name: p.name, ...(effects.length ? { effects } : {}) } });
  });
  actions.push({ type: "patch.node", node: { id: switchId, kind: "switch", x: at.x + 196, y: at.y + 200, name: "Piano Switch", outMulti: true } });
  a.inputs.forEach((inp, k) => buses.forEach((b, i) => actions.push({ type: "patch.link", link: { id: `l${tag}p${k}_${i}`, from: inp, to: b } })));
  buses.forEach((b, i) => actions.push({ type: "patch.link", link: { id: `l${tag}q${i}`, from: b, to: switchId } }));
  actions.push({ type: "patch.link", link: { id: `l${tag}m`, from: switchId, to: "master" } });
  a.groups.forEach((g, i) => actions.push({ type: "patch.link", link: { id: `l${tag}g${i}`, from: switchId, to: `group:${g}`, port: "rec" } }));
  return { actions, buses, switchId };
}
