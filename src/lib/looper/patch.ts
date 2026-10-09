/**
 * The patch graph: what is connected to what. Pure data and rules, no audio and no React; the engine turns the active
 * connections into Web Audio connects (see spec/patch.md). Imports nothing outside src/lib/looper.
 */

import { sanitiseEffects, type EffectSpec } from "./effects";

export type PatchKind = "input" | "sequencer" | "piano" | "synth" | "fx" | "switch" | "group" | "loop" | "master";

export interface PatchNode {
  id: string;
  kind: PatchKind;
  /** place on the canvas, stage units */
  x: number;
  y: number;
  muted: boolean;
  /** switch only: which of its outgoing connections is open (0-based, in creation order) */
  selected?: number;
  /** effect chains and switches can be named */
  name?: string;
  /** effect chain only: its effects, in order */
  effects?: EffectSpec[];
}

/** A group has two inputs: its recorder (what its loops in recording mode record) and its bus (heard through the group's effects and fader). */
export type Port = "rec" | "bus";

export interface PatchLink {
  id: string;
  from: string;
  to: string;
  /** only for a link into a group; "bus" when left out */
  port?: Port;
  muted: boolean;
}

export interface Patch {
  nodes: PatchNode[];
  links: PatchLink[];
}

/** Kinds that make sound or pass it on (they have an audio output). */
const HAS_OUT: PatchKind[] = ["input", "sequencer", "piano", "synth", "fx", "switch", "group", "loop"];
/** Kinds that accept audio. A group has no global recorder: each group starts with its own, and the loops inside it record from it (and play into its bus). A loop has no input of its own. */
const HAS_IN: PatchKind[] = ["fx", "switch", "group", "master"];

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
export function whyNot(p: Patch, from: string, to: string, port: Port = "bus"): string | null {
  const a = node(p, from);
  const b = node(p, to);
  if (!a || !b) return "Unknown element";
  if (from === to) return "Cannot connect to itself";
  if (!hasOut(a.kind)) return `${a.kind} has no output`;
  if (!hasIn(b.kind)) return b.kind === "loop" ? "A loop plays into the bus of its group" : `${b.kind} has no input`;
  if (a.kind === "loop") return "A loop plays into the bus of its group";
  if (b.kind !== "group" && port === "rec") return "Only a group has a recorder";
  if (p.links.some((l) => l.from === from && l.to === to && (l.port ?? "bus") === port)) return "Already connected";
  if (reaches(p, to, from)) return "That would feed sound back into itself";
  return null;
}

let counter = 0;
const newId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Add a link if the rules allow it; returns the new patch (or the same one when refused). */
export function connect(p: Patch, from: string, to: string, id: string = newId(), port: Port = "bus"): Patch {
  if (whyNot(p, from, to, port)) return p;
  return { ...p, links: [...p.links, { id, from, to, ...(port === "rec" ? { port } : {}), muted: false }] };
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

/** Everything an element's sound passes through on its way to `target` (an element id, e.g. "master"), over active links only. Empty when it does not arrive. */
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

const SOURCES: PatchKind[] = ["input", "sequencer", "piano", "synth"];

/** The sound makers (inputs, sequencers, pianos, generators) whose sound arrives at a group's port over active links, passing through effects and switches. */
export function feeds(p: Patch, group: string, port: Port): string[] {
  const act = activeLinks(p);
  const out = new Set<string>();
  const walk = (to: string, via: Port | null, seen: Set<string>) => {
    act.forEach((l) => {
      if (l.to !== to || (via !== null && (l.port ?? "bus") !== via) || seen.has(l.from)) return;
      const src = node(p, l.from);
      if (!src) return;
      if (SOURCES.includes(src.kind)) out.add(src.id);
      else if (src.kind === "fx" || src.kind === "switch") walk(src.id, null, new Set(seen).add(src.id));
      // a group's own bus does not feed another group's port in this model
    });
  };
  walk(group, port, new Set([group]));
  return [...out];
}

/** Clean up a saved patch: unknown kinds, duplicate ids, dangling links and links the rules refuse are dropped. */
export function sanitisePatch(raw: unknown): Patch {
  const kinds: PatchKind[] = ["input", "sequencer", "piano", "synth", "fx", "switch", "group", "loop", "master"];
  const r = (raw ?? {}) as { nodes?: unknown; links?: unknown };
  const nodes: PatchNode[] = [];
  if (Array.isArray(r.nodes)) {
    for (const n of r.nodes.slice(0, 200)) {
      if (!n || typeof n.id !== "string" || !kinds.includes(n.kind) || nodes.some((m) => m.id === n.id)) continue;
      nodes.push({
        id: n.id,
        kind: n.kind,
        x: Number.isFinite(n.x) ? n.x : 0,
        y: Number.isFinite(n.y) ? n.y : 0,
        muted: n.muted === true,
        ...(n.kind === "switch" ? { selected: Math.max(0, Math.round(Number(n.selected) || 0)) } : {}),
        ...(typeof n.name === "string" ? { name: n.name.slice(0, 40) } : {}),
        ...(n.kind === "fx" ? { effects: sanitiseEffects(n.effects) } : {}),
      });
    }
  }
  let p: Patch = { nodes, links: [] };
  if (Array.isArray(r.links)) {
    for (const l of r.links.slice(0, 600)) {
      if (!l || typeof l.id !== "string" || typeof l.from !== "string" || typeof l.to !== "string" || p.links.some((m) => m.id === l.id)) continue;
      const next = connect(p, l.from, l.to, l.id, l.port === "rec" ? "rec" : "bus");
      if (next !== p) p = setLinkMuted(next, l.id, l.muted === true);
    }
  }
  return { nodes: p.nodes.map((n) => (n.kind === "switch" ? { ...n, selected: clampSelected(n, p.links.filter((l) => l.from === n.id).length) } : n)), links: p.links };
}

/**
 * The patch that matches today's fixed routing, so old saves open unchanged: every hardware and software input feeds the
 * recorder of every group (any loop can record any input), each group is a bus into master, sequencers feed the bus of their group.
 */
export function defaultPatch(opts: { inputs: { id: number; kind: "device" | "extra" | "sequencer" | "scalepiano"; sourceId?: string }[]; groups: string[]; sequencers: { id: string; group: string | null }[] }): Patch {
  let p: Patch = emptyPatch();
  const add = (id: string, kind: PatchKind, x: number, y: number) => {
    p = { ...p, nodes: [...p.nodes, { id, kind, x, y, muted: false, ...(kind === "switch" ? { selected: 0 } : {}) }] };
  };
  add("master", "master", 700, 500);
  opts.groups.forEach((g, i) => {
    add(`group:${g}`, "group", 300 + i * 90, 300);
    p = connect(p, `group:${g}`, "master");
  });
  opts.inputs.forEach((inp, i) => {
    if (inp.kind === "sequencer") return; // a sequencer is its own element below
    add(`in:${inp.id}`, inp.kind === "scalepiano" ? "piano" : "input", 20 + i * 90, 40);
    opts.groups.forEach((g) => (p = connect(p, `in:${inp.id}`, `group:${g}`, `rec:${inp.id}:${g}`, "rec")));
  });
  opts.sequencers.forEach((q, i) => {
    add(`seq:${q.id}`, "sequencer", 20 + i * 90, 200);
    p = connect(p, `seq:${q.id}`, q.group ? `group:${q.group}` : "master");
  });
  return p;
}

/** Where a new element goes on the canvas: a column per kind (sources, effect chains and switches, groups, master), stacked down. */
export function place(p: Patch, kind: PatchKind): { x: number; y: number } {
  const col = (k: PatchKind) => (k === "input" || k === "piano" || k === "sequencer" || k === "synth" ? 0 : k === "fx" || k === "switch" ? 1 : k === "group" || k === "loop" ? 2 : 3);
  const c = col(kind);
  const n = p.nodes.filter((m) => col(m.kind) === c).length;
  return { x: 24 + c * 300, y: 24 + n * 150 };
}

/** Lay every element out afresh in its column (used once for saves made before the canvas existed). */
export function layoutAll(p: Patch): Patch {
  let out: Patch = { nodes: [], links: p.links };
  for (const n of p.nodes) out = { ...out, nodes: [...out.nodes, { ...n, ...place(out, n.kind) }] };
  return out;
}

/**
 * Does this sound maker's sound travel through the patch? Not when its only links go into group recorders (that is the
 * plain "this input can be recorded" wiring, which also keeps the old "Hear it" monitor). Any link to an effect chain, a
 * switch, a group's bus or the master makes it patched: then what it records and what is heard is exactly what is drawn.
 */
export function isPatched(p: Patch, id: string): boolean {
  return p.links.some((l) => l.from === id && !(node(p, l.to)?.kind === "group" && l.port === "rec"));
}

/** Insert a new element (an effect chain or a switch). Ids must be new. */
export function addNode(p: Patch, n: PatchNode): Patch {
  if (p.nodes.some((m) => m.id === n.id) || (n.kind !== "fx" && n.kind !== "switch")) return p;
  return { ...p, nodes: [...p.nodes, { ...n, muted: n.muted === true, ...(n.kind === "switch" ? { selected: n.selected ?? 0 } : { effects: n.effects ?? [] }) }] };
}

export const moveNode = (p: Patch, id: string, x: number, y: number): Patch => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, x: Math.max(0, Math.min(4000, x)), y: Math.max(0, Math.min(3000, y)) } : n)) });
