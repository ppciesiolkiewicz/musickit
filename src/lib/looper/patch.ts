/**
 * The patch graph: what is connected to what. Pure data and rules, no audio and no React; the engine turns the active
 * connections into Web Audio connects (see spec/patch.md). Imports nothing outside src/lib/looper.
 */

export type PatchKind = "input" | "sequencer" | "piano" | "synth" | "fx" | "switch" | "bus" | "loop" | "recorder" | "master";

export interface PatchNode {
  id: string;
  kind: PatchKind;
  /** place on the canvas, stage units */
  x: number;
  y: number;
  muted: boolean;
  /** switch only: which of its outgoing connections is open (0-based, in creation order) */
  selected?: number;
}

export interface PatchLink {
  id: string;
  from: string;
  to: string;
  muted: boolean;
}

export interface Patch {
  nodes: PatchNode[];
  links: PatchLink[];
}

/** Kinds that make sound or pass it on (they have an audio output). */
const HAS_OUT: PatchKind[] = ["input", "sequencer", "piano", "synth", "fx", "switch", "bus", "loop"];
/** Kinds that accept audio. A loop gets its sound from the recorder, so it has no input; it joins a bus by sitting inside the group. */
const HAS_IN: PatchKind[] = ["fx", "switch", "bus", "recorder", "master"];

export const hasOut = (k: PatchKind) => HAS_OUT.includes(k);
export const hasIn = (k: PatchKind) => HAS_IN.includes(k);

export const emptyPatch = (): Patch => ({ nodes: [], links: [] });

const node = (p: Patch, id: string) => p.nodes.find((n) => n.id === id);

/** True when `to` can already be reached from `from` by following links (muted or not): connecting back would make a loop of sound. */
export function reaches(p: Patch, from: string, to: string): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    p.links.forEach((l) => l.from === cur && stack.push(l.to));
  }
  return false;
}

/** Why a link cannot be made, or null when it can. */
export function whyNot(p: Patch, from: string, to: string): string | null {
  const a = node(p, from);
  const b = node(p, to);
  if (!a || !b) return "Unknown element";
  if (from === to) return "Cannot connect to itself";
  if (!hasOut(a.kind)) return `${a.kind} has no output`;
  if (!hasIn(b.kind)) return b.kind === "loop" ? "A loop plays into the bus of its group" : `${b.kind} has no input`;
  if (a.kind === "loop") return "A loop plays into the bus of its group";
  if (p.links.some((l) => l.from === from && l.to === to)) return "Already connected";
  if (reaches(p, to, from)) return "That would feed sound back into itself";
  return null;
}

let counter = 0;
const newId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Add a link if the rules allow it; returns the new patch (or the same one when refused). */
export function connect(p: Patch, from: string, to: string, id: string = newId()): Patch {
  if (whyNot(p, from, to)) return p;
  return { ...p, links: [...p.links, { id, from, to, muted: false }] };
}

export function disconnect(p: Patch, linkId: string): Patch {
  const gone = p.links.find((l) => l.id === linkId);
  if (!gone) return p;
  const src = node(p, gone.from);
  const nodes = src?.kind === "switch" ? p.nodes.map((n) => (n.id === src.id ? { ...n, selected: clampSelected(n, p.links.filter((l) => l.id !== linkId).filter((l) => l.from === n.id).length) } : n)) : p.nodes;
  return { nodes, links: p.links.filter((l) => l.id !== linkId) };
}

const clampSelected = (n: PatchNode, outs: number) => Math.max(0, Math.min(Math.max(0, outs - 1), n.selected ?? 0));

export const setLinkMuted = (p: Patch, linkId: string, muted: boolean): Patch => ({ ...p, links: p.links.map((l) => (l.id === linkId ? { ...l, muted } : l)) });
export const setNodeMuted = (p: Patch, id: string, muted: boolean): Patch => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, muted } : n)) });

/** Choose which output a switch lets through. */
export function setSwitch(p: Patch, id: string, selected: number): Patch {
  const n = node(p, id);
  if (!n || n.kind !== "switch") return p;
  const outs = p.links.filter((l) => l.from === id).length;
  return { ...p, nodes: p.nodes.map((m) => (m.id === id ? { ...m, selected: Math.max(0, Math.min(Math.max(0, outs - 1), Math.round(selected))) } : m)) };
}

/** Remove an element and every link that touches it. */
export function removeNode(p: Patch, id: string): Patch {
  return { nodes: p.nodes.filter((n) => n.id !== id), links: p.links.filter((l) => l.from !== id && l.to !== id) };
}

/** The links that carry sound right now: not muted, neither end muted, and a switch only lets its selected output through. Order is creation order. */
export function activeLinks(p: Patch): PatchLink[] {
  return p.links.filter((l) => {
    if (l.muted) return false;
    const a = node(p, l.from);
    const b = node(p, l.to);
    if (!a || !b || a.muted || b.muted) return false;
    if (a.kind === "switch") {
      const outs = p.links.filter((x) => x.from === a.id);
      return outs[clampSelected(a, outs.length)]?.id === l.id;
    }
    return true;
  });
}

/** Everything an element's sound passes through on its way to `target` (a master or recorder id), over active links only. Empty when it does not arrive. */
export function pathTo(p: Patch, from: string, target: string): string[] {
  const act = activeLinks(p);
  const prev = new Map<string, string>();
  const queue = [from];
  prev.set(from, "");
  while (queue.length) {
    const cur = queue.shift() as string;
    if (cur === target) {
      const out: string[] = [];
      for (let at: string = cur; at; at = prev.get(at) as string) out.unshift(at);
      return out;
    }
    act.forEach((l) => {
      if (l.from === cur && !prev.has(l.to)) {
        prev.set(l.to, cur);
        queue.push(l.to);
      }
    });
  }
  return [];
}

/** Clean up a saved patch: unknown kinds, duplicate ids, dangling links and links the rules refuse are dropped. */
export function sanitisePatch(raw: unknown): Patch {
  const kinds: PatchKind[] = ["input", "sequencer", "piano", "synth", "fx", "switch", "bus", "loop", "recorder", "master"];
  const r = (raw ?? {}) as { nodes?: unknown; links?: unknown };
  const nodes: PatchNode[] = [];
  if (Array.isArray(r.nodes)) {
    for (const n of r.nodes.slice(0, 200)) {
      if (!n || typeof n.id !== "string" || !kinds.includes(n.kind) || nodes.some((m) => m.id === n.id)) continue;
      nodes.push({ id: n.id, kind: n.kind, x: Number.isFinite(n.x) ? n.x : 0, y: Number.isFinite(n.y) ? n.y : 0, muted: n.muted === true, ...(n.kind === "switch" ? { selected: Math.max(0, Math.round(Number(n.selected) || 0)) } : {}) });
    }
  }
  let p: Patch = { nodes, links: [] };
  if (Array.isArray(r.links)) {
    for (const l of r.links.slice(0, 600)) {
      if (!l || typeof l.id !== "string" || typeof l.from !== "string" || typeof l.to !== "string" || p.links.some((m) => m.id === l.id)) continue;
      const next = connect(p, l.from, l.to, l.id);
      if (next !== p) p = setLinkMuted(next, l.id, l.muted === true);
    }
  }
  return { nodes: p.nodes.map((n) => (n.kind === "switch" ? { ...n, selected: clampSelected(n, p.links.filter((l) => l.from === n.id).length) } : n)), links: p.links };
}

/**
 * The patch that matches today's fixed routing, so old saves open unchanged: hardware and software inputs feed the recorder
 * (or master when only monitored is not modelled here), each group is a bus into master, sequencers feed the bus of their group.
 */
export function defaultPatch(opts: { inputs: { id: number; kind: "device" | "extra" | "sequencer" | "scalepiano"; sourceId?: string }[]; groups: string[]; sequencers: { id: string; group: string | null }[] }): Patch {
  let p: Patch = emptyPatch();
  const add = (id: string, kind: PatchKind, x: number, y: number) => {
    p = { ...p, nodes: [...p.nodes, { id, kind, x, y, muted: false, ...(kind === "switch" ? { selected: 0 } : {}) }] };
  };
  add("recorder", "recorder", 700, 40);
  add("master", "master", 700, 400);
  opts.groups.forEach((g, i) => {
    add(`bus:${g}`, "bus", 300 + i * 90, 400);
    p = connect(p, `bus:${g}`, "master");
  });
  opts.inputs.forEach((inp, i) => {
    if (inp.kind === "sequencer") return; // a sequencer is its own node below
    add(`in:${inp.id}`, inp.kind === "scalepiano" ? "piano" : "input", 20 + i * 90, 40);
    p = connect(p, `in:${inp.id}`, "recorder");
  });
  opts.sequencers.forEach((q, i) => {
    add(`seq:${q.id}`, "sequencer", 20 + i * 90, 200);
    p = connect(p, `seq:${q.id}`, q.group ? `bus:${q.group}` : "master");
  });
  return p;
}
