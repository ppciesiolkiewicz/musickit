/**
 * Pure helpers for drawing the patch over the page: which colour a sound maker gets and which colour a connection carries.
 * Imports nothing outside src/lib/looper.
 */

import type { Patch, PatchLink } from "./patch";

export const SOURCE_COLOURS = ["#38bdf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#22d3ee", "#f97316"];

const SOURCES = ["input", "piano", "sequencer", "synth"];

/** A colour for every sound maker, in the order they were added, so the same input keeps its colour. */
export function sourceColours(p: Patch): Record<string, string> {
  const out: Record<string, string> = {};
  p.nodes.filter((n) => SOURCES.includes(n.kind)).forEach((n, i) => (out[n.id] = SOURCE_COLOURS[i % SOURCE_COLOURS.length]));
  return out;
}

/** The sound makers whose sound reaches this element's output (itself when it is one), following links backwards. */
export function upstreamSources(p: Patch, id: string): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  const walk = (cur: string) => {
    if (seen.has(cur)) return;
    seen.add(cur);
    const n = p.nodes.find((m) => m.id === cur);
    if (!n) return;
    if (SOURCES.includes(n.kind)) {
      found.push(cur);
      return;
    }
    p.links.filter((l) => l.to === cur).forEach((l) => walk(l.from));
  };
  walk(id);
  return found;
}

/** The colour a connection carries: that of the sound maker behind it (the first, when several are mixed). Grey when nothing feeds it. */
export function linkColour(p: Patch, l: PatchLink, colours: Record<string, string>): string {
  const src = upstreamSources(p, l.from)[0];
  return (src && colours[src]) || "#64748b";
}

/** The id the page's elements carry for a mixer strip. */
export const stripPatchId = (strip: { id: number; kind: string; sourceId?: string }): string => (strip.kind === "sequencer" ? `seq:${strip.sourceId ?? ""}` : `in:${strip.id}`);
