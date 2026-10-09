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
  /** switch only: false (the default) lets one incoming connection through at a time (radio), true any combination (checkboxes) */
  inMulti?: boolean;
  /** switch only: the same for its outgoing connections */
  outMulti?: boolean;
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
  if (a.kind === "group" && b.kind !== "master") return "A group plays into the master";
  if (a.kind === "sequencer" && b.kind !== "group" && b.kind !== "master") return "A sequencer keeps its own routing for now";
  if (a.kind === "synth") return "Sound generators are not wired yet";
  if (b.kind !== "group" && port === "rec") return "Only a group has a recorder";
  if (p.links.some((l) => l.from === from && l.to === to && (l.port ?? "bus") === port)) return "Already connected";
  if (reaches(p, to, from)) return "That would feed sound back into itself";
  return null;
}

let counter = 0;
const newId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Add a link if the rules allow it; returns the new patch (or the same one when refused). A link made on a switch side that lets
 * one through at a time starts closed when another is already open. `muted` asks for an exact state (restoring a saved link).
 */
export function connect(p: Patch, from: string, to: string, id: string = newId(), port: Port = "bus", muted?: boolean): Patch {
  if (whyNot(p, from, to, port)) return p;
  const closed = muted ?? (switchSideBusy(p, to, "in") || switchSideBusy(p, from, "out"));
  return { ...p, links: [...p.links, { id, from, to, ...(port === "rec" ? { port } : {}), muted: closed }] };
}

/** True when `id` is a switch whose side lets one through at a time and one is already open. */
function switchSideBusy(p: Patch, id: string, side: "in" | "out"): boolean {
  const n = node(p, id);
  if (!n || n.kind !== "switch" || (side === "in" ? n.inMulti : n.outMulti)) return false;
  return p.links.some((l) => (side === "in" ? l.to : l.from) === id && !l.muted);
}

const sideLinks = (p: Patch, id: string, side: "in" | "out") => p.links.filter((l) => (side === "in" ? l.to : l.from) === id);

/** A side that lets one through at a time has exactly one open link (the first open one, or the first link), when it has any. */
function settleSwitch(p: Patch, id: string): Patch {
  const n = node(p, id);
  if (!n || n.kind !== "switch") return p;
  let links = p.links;
  (["in", "out"] as const).forEach((side) => {
    if (side === "in" ? n.inMulti : n.outMulti) return;
    const mine = links.filter((l) => (side === "in" ? l.to : l.from) === id);
    if (!mine.length) return;
    const keep = (mine.find((l) => !l.muted) ?? mine[0]).id;
    links = links.map((l) => (mine.some((m) => m.id === l.id) ? { ...l, muted: l.id !== keep } : l));
  });
  return { ...p, links };
}

export function disconnect(p: Patch, linkId: string): Patch {
  const gone = p.links.find((l) => l.id === linkId);
  if (!gone) return p;
  let next: Patch = { nodes: p.nodes, links: p.links.filter((l) => l.id !== linkId) };
  for (const id of [gone.from, gone.to]) next = settleSwitch(next, id);
  return next;
}

export const setLinkMuted = (p: Patch, linkId: string, muted: boolean): Patch => ({ ...p, links: p.links.map((l) => (l.id === linkId ? { ...l, muted } : l)) });
export const setNodeMuted = (p: Patch, id: string, muted: boolean): Patch => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, muted } : n)) });

/** Choose how one side of a switch works: one connection at a time (radio) or any combination (checkboxes). Going to one-at-a-time keeps the first open link. */
export function setSwitchMode(p: Patch, id: string, side: "in" | "out", multi: boolean): Patch {
  const n = node(p, id);
  if (!n || n.kind !== "switch") return p;
  const next = { ...p, nodes: p.nodes.map((m) => (m.id === id ? { ...m, [side === "in" ? "inMulti" : "outMulti"]: multi } : m)) };
  return multi ? next : settleSwitch(next, id);
}

/** What clicking a link of a switch changes, as link mutes: any combination toggles it; one at a time opens it and closes the others on its side. Nothing when it is already the open one. */
export function switchChoice(p: Patch, id: string, linkId: string): { id: string; muted: boolean }[] {
  const n = node(p, id);
  const l = p.links.find((x) => x.id === linkId);
  if (!n || n.kind !== "switch" || !l) return [];
  const side = l.to === id ? "in" : "out";
  if (side === "in" ? n.inMulti : n.outMulti) return [{ id: l.id, muted: !l.muted }];
  if (!l.muted) return [];
  return sideLinks(p, id, side).filter((x) => x.id === l.id || !x.muted).map((x) => ({ id: x.id, muted: x.id !== l.id }));
}

/** Remove an element and every link that touches it. */
export function removeNode(p: Patch, id: string): Patch {
  return { nodes: p.nodes.filter((n) => n.id !== id), links: p.links.filter((l) => l.from !== id && l.to !== id) };
}

/** The links that carry sound right now: not muted, neither end muted, and a link a switch has closed is a muted link. Order is creation order. */
export function activeLinks(p: Patch): PatchLink[] {
  return p.links.filter((l) => {
    if (l.muted) return false;
    const a = node(p, l.from);
    const b = node(p, l.to);
    return !!a && !!b && !a.muted && !b.muted;
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
  const legacySel = new Map<string, number>();
  if (Array.isArray(r.nodes)) {
    for (const n of r.nodes.slice(0, 200)) {
      if (!n || typeof n.id !== "string" || !kinds.includes(n.kind) || nodes.some((m) => m.id === n.id)) continue;
      // saves from before the two modes: every input passed, one output was open (the others become closed links below)
      const legacy = n.kind === "switch" && n.inMulti === undefined && n.outMulti === undefined;
      if (legacy && Number.isFinite(Number(n.selected))) legacySel.set(n.id, Math.max(0, Math.round(Number(n.selected))));
      nodes.push({
        id: n.id,
        kind: n.kind,
        x: Number.isFinite(n.x) ? n.x : 0,
        y: Number.isFinite(n.y) ? n.y : 0,
        muted: n.muted === true,
        ...(n.kind === "switch" ? { inMulti: legacy ? true : n.inMulti === true, outMulti: n.outMulti === true } : {}),
        ...(typeof n.name === "string" ? { name: n.name.slice(0, 40) } : {}),
        ...(n.kind === "fx" ? { effects: sanitiseEffects(n.effects) } : {}),
      });
    }
  }
  let p: Patch = { nodes, links: [] };
  if (Array.isArray(r.links)) {
    for (const l of r.links.slice(0, 600)) {
      if (!l || typeof l.id !== "string" || typeof l.from !== "string" || typeof l.to !== "string" || p.links.some((m) => m.id === l.id)) continue;
      p = connect(p, l.from, l.to, l.id, l.port === "rec" ? "rec" : "bus", l.muted === true);
    }
  }
  // an old save's single open output: close the others
  legacySel.forEach((sel, id) => {
    const outs = p.links.filter((l) => l.from === id);
    p = { ...p, links: p.links.map((l) => (outs.includes(l) ? { ...l, muted: l.muted || outs[Math.min(sel, outs.length - 1)]?.id !== l.id } : l)) };
  });
  return [...p.nodes].reduce((q, n) => (n.kind === "switch" ? settleSwitch(q, n.id) : q), p);
}

/**
 * The patch that matches today's fixed routing, so old saves open unchanged: every hardware and software input feeds the
 * recorder of every group (any loop can record any input), each group is a bus into master, sequencers feed the bus of their group.
 */
export function defaultPatch(opts: { inputs: { id: number; kind: "device" | "extra" | "sequencer" | "scalepiano"; sourceId?: string }[]; groups: string[]; sequencers: { id: string; group: string | null }[] }): Patch {
  let p: Patch = emptyPatch();
  const add = (id: string, kind: PatchKind, x: number, y: number) => {
    p = { ...p, nodes: [...p.nodes, { id, kind, x, y, muted: false, ...(kind === "switch" ? { inMulti: false, outMulti: false } : {}) }] };
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
  return { ...p, nodes: [...p.nodes, { ...n, muted: n.muted === true, ...(n.kind === "switch" ? { inMulti: n.inMulti === true, outMulti: n.outMulti === true } : { effects: n.effects ?? [] }) }] };
}

export const moveNode = (p: Patch, id: string, x: number, y: number): Patch => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, x: Math.max(0, Math.min(4000, x)), y: Math.max(0, Math.min(3000, y)) } : n)) });
