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
