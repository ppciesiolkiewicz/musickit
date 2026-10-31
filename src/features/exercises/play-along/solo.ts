import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { buildLadder, VOICES } from "@/features/theory/singing";
import type { Timeline } from "../timeline/types";

/** What to aim for over the chord sounding at a beat (solo-over). */
export interface SoloTargets {
  chord: string;
  /** pitch classes to play from: the chord's scale, or its chord tones when it has none */
  pcs: number[];
  /** the target pitch classes, lit */
  lit: number[];
}

/** Whether a timeline is improvised over (chords with targets, no step events): the views draw targets, not cues. */
export const isSolo = (t: Timeline): boolean =>
  !t.events.some((e) => e.type === "step") && t.events.some((e) => e.type === "chord" && !!e.highlight?.length);

/** The chord sounding at `beat` (the first chord when stopped, beat < 0), its scale (or chord tones) and the targets lit. */
export function soloTargets(t: Timeline, beat: number): SoloTargets | null {
  const chords = t.events.filter((e) => e.type === "chord");
  const c = beat < 0 ? chords[0] : chords.find((e) => beat >= e.at && beat < e.at + e.beats) ?? chords[0];
  if (!c) return null;
  const q = parseChordQuery(c.name);
  if (!q) return null;
  const root = q.rootPc;
  const scale = t.events.find((e) => e.type === "scale" && e.at === c.at);
  const ladder = scale?.type === "scale" ? buildLadder(scale.scale, scale.key, VOICES.tenor) : null;
  const pcs = ladder ? [...ladder.pcs] : q.semis.map((s) => (root + s) % 12);
  const lit = [...new Set((c.highlight ?? []).map((s) => (root + s) % 12))];
  return { chord: c.name, pcs: [...new Set([...pcs, ...lit])].sort((a, b) => a - b), lit: lit.sort((a, b) => a - b) };
}
