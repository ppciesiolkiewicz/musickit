/**
 * Pure helpers for drawing the patch over the page: the colour of a connection (that of the group it ends in) and which sides
 * of two blocks a wire joins. Imports nothing outside src/lib/looper.
 */

import type { Patch, PatchLink, Port } from "./patch";

/** Neutral colours: a connection that reaches several groups, and one that reaches none (only the master). */
export const MANY_GROUPS = "#e2e8f0";
export const NO_GROUP = "#94a3b8";

/** The groups a connection ends in, following links forward through chains and switches. A group ends the walk. */
export function reachedGroups(p: Patch, from: string): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  const walk = (cur: string) => {
    if (seen.has(cur)) return;
    seen.add(cur);
    const n = p.nodes.find((m) => m.id === cur);
    if (!n) return;
    if (n.kind === "group") {
      found.push(cur);
      return;
    }
    if (n.kind === "master") return;
    p.links.filter((l) => l.from === cur).forEach((l) => walk(l.to));
  };
  walk(from);
  return found;
}

/** The colour a connection carries: that of the one group it ends in, or neutral when it reaches several or none. `groups` maps "group:<id>" to its colour. */
export function linkColour(p: Patch, l: PatchLink, groups: Record<string, string>): string {
  const ends = reachedGroups(p, l.to);
  if (ends.length === 1) return groups[ends[0]] ?? NO_GROUP;
  return ends.length > 1 ? MANY_GROUPS : NO_GROUP;
}

export type Side = "left" | "right" | "top" | "bottom";
export interface Box { x: number; y: number; w: number; h: number }

/** Which side of each block a wire leaves and arrives at, from where the two blocks sit: facing sides when one is clear of the other, else by the way their centres lie. */
export function sidesFor(a: Box, b: Box): { from: Side; to: Side } {
  if (a.x + a.w <= b.x) return { from: "right", to: "left" };
  if (b.x + b.w <= a.x) return { from: "left", to: "right" };
  if (a.y + a.h <= b.y) return { from: "bottom", to: "top" };
  if (b.y + b.h <= a.y) return { from: "top", to: "bottom" };
  const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? { from: "right", to: "left" } : { from: "left", to: "right" };
  return dy >= 0 ? { from: "bottom", to: "top" } : { from: "top", to: "bottom" };
}

/** The unit vector pointing out of a block through a side. */
export const outward = (s: Side): { x: number; y: number } => (s === "right" ? { x: 1, y: 0 } : s === "left" ? { x: -1, y: 0 } : s === "bottom" ? { x: 0, y: 1 } : { x: 0, y: -1 });

/** The point on a side: `frac` along it (0.5 is the middle) and `shift` pixels further along, to keep several connections apart. */
export function sidePoint(b: Box, s: Side, frac = 0.5, shift = 0): { x: number; y: number } {
  if (s === "left") return { x: b.x, y: b.y + b.h * frac + shift };
  if (s === "right") return { x: b.x + b.w, y: b.y + b.h * frac + shift };
  if (s === "top") return { x: b.x + b.w * frac + shift, y: b.y };
  return { x: b.x + b.w * frac + shift, y: b.y + b.h };
}

/** Shifts for n connections on one side: 0, +10, -10, +20 ... around the middle. */
export const spread = (i: number): number => (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 10);

/** The id the page's elements carry for a mixer strip. */
export const stripPatchId = (strip: { id: number; kind: string; sourceId?: string }): string => (strip.kind === "sequencer" ? `seq:${strip.sourceId ?? ""}` : `in:${strip.id}`);

/**
 * The links that really carry sound somewhere: open (`active`), and the block they feed goes on through open links to a group or the
 * master. A link into a bus whose way on is closed by a switch is open but leads nowhere, so it is not in this set.
 */
export function flowingLinks(p: Patch, active: ReadonlySet<string>): Set<string> {
  const memo = new Map<string, boolean>();
  const reaches = (id: string, seen: Set<string>): boolean => {
    const n = p.nodes.find((m) => m.id === id);
    if (!n) return false;
    if (n.kind === "group" || n.kind === "master") return true;
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    if (seen.has(id)) return false;
    seen.add(id);
    const ok = p.links.some((l) => l.from === id && active.has(l.id) && reaches(l.to, seen));
    memo.set(id, ok);
    return ok;
  };
  // and sound must arrive at the link's start: a sound maker is always live, anything else only through an open link
  const live = new Set(p.nodes.filter((n) => n.kind === "input" || n.kind === "piano" || n.kind === "sequencer" || n.kind === "synth").map((n) => n.id));
  for (let grew = true; grew; ) {
    grew = false;
    p.links.forEach((l) => {
      if (active.has(l.id) && live.has(l.from) && !live.has(l.to)) {
        live.add(l.to);
        grew = true;
      }
    });
  }
  return new Set(p.links.filter((l) => active.has(l.id) && live.has(l.from) && reaches(l.to, new Set())).map((l) => l.id));
}

/** Where an element's sound leaves from: its own buses when it has any (an input with buses sends only through them), else itself. */
export function outSources(p: Patch, id: string): string[] {
  const buses = p.nodes.filter((n) => n.owner === id).map((n) => n.id);
  return buses.length ? buses : [id];
}

/** One place an element sends to, gathered over all its buses: open when any of its links is. */
export interface Destination { key: string; to: string; port: Port; links: PatchLink[]; on: boolean }

/** The places an element sends to (one entry per target and port, whichever bus the links leave from), in the order first made. */
export function destinations(p: Patch, id: string): Destination[] {
  const from = new Set(outSources(p, id));
  const out: Destination[] = [];
  p.links.forEach((l) => {
    if (!from.has(l.from)) return;
    const port: Port = l.port ?? "bus";
    const key = `${l.to}|${port}`;
    const d = out.find((x) => x.key === key);
    if (d) {
      d.links.push(l);
      d.on ||= !l.muted;
    } else out.push({ key, to: l.to, port, links: [l], on: !l.muted });
  });
  return out;
}

/** What ticking a destination on or off changes, as link mutes: every link to it, from every bus, follows. */
export function destinationChoice(p: Patch, id: string, key: string, on: boolean): { id: string; muted: boolean }[] {
  const d = destinations(p, id).find((x) => x.key === key);
  return d ? d.links.filter((l) => l.muted === on).map((l) => ({ id: l.id, muted: !on })) : [];
}

/** What choosing a place does: with one place at a time it opens every link to it and closes the rest (nothing when it is already the one); otherwise it ticks the place on or off. */
export function destinationPick(p: Patch, id: string, key: string): { id: string; muted: boolean }[] {
  const all = destinations(p, id);
  const d = all.find((x) => x.key === key);
  if (!d) return [];
  if (!p.nodes.find((n) => n.id === id)?.destOne) return destinationChoice(p, id, key, !d.on);
  if (d.on && all.every((x) => x.key === key || !x.on) && d.links.every((l) => !l.muted)) return [];
  return all.flatMap((x) => x.links.filter((l) => l.muted === (x.key === key)).map((l) => ({ id: l.id, muted: x.key !== key })));
}

/** The element a link is drawn from: the input that owns the bus it leaves, or its own start. */
export function drawnFrom(p: Patch, l: PatchLink): string {
  return p.nodes.find((n) => n.id === l.from)?.owner ?? l.from;
}
