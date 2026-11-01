import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { buildLadder, VOICES } from "@/features/theory/singing";
import type { Timeline, TimelineEvent } from "../timeline/types";

/** What to play from at a beat of an improvised timeline (solo-over, two-scales). */
export interface SoloTargets {
  /** the chord sounding, "" when there is none */
  chord: string;
  /** the scale playing now ("D Dorian"), for a timeline that switches scales */
  scale?: string;
  /** every note shown, the same for the whole timeline: all its scales' notes, or the chord tones when it has none */
  pcs: number[];
  /** highlighted: the sounding chord's targets, or its tones among the notes shown when it has no targets */
  lit: number[];
  /** shown but outside the scale playing now (a scale switch only), muted */
  muted: number[];
  /** the sounding chord's target notes, named above the neck */
  targets: number[];
}

type ChordEv = Extract<TimelineEvent, { type: "chord" }>;
type ScaleEv = Extract<TimelineEvent, { type: "scale" }>;
const sorted = (s: Iterable<number>) => [...new Set(s)].sort((a, b) => a - b);
const tonesOf = (c: ChordEv): number[] => {
  const q = parseChordQuery(c.name);
  return q ? q.semis.map((s) => (q.rootPc + s) % 12) : [];
};
const targetsOf = (c: ChordEv): number[] => {
  const root = parseChordQuery(c.name)?.rootPc ?? 0;
  return (c.highlight ?? []).map((s) => (((root + s) % 12) + 12) % 12);
};
const scalePcs = (e: ScaleEv): number[] => [...(buildLadder(e.scale, e.key, VOICES.tenor)?.pcs ?? [])];

/** Whether a timeline is improvised over (no fixed notes): the views draw the notes to play from, not cues. */
export const isSolo = (t: Timeline): boolean => !!t.free;

/**
 * At `beat` (the start when stopped, beat < 0): the chord sounding, the fixed set of notes to play from, the chord's
 * targets (else its tones) lit among them, and for a scale switch the notes outside the scale playing now muted.
 */
export function soloTargets(t: Timeline, beat: number): SoloTargets | null {
  const at = Math.max(0, beat);
  const chords = t.events.filter((e): e is ChordEv => e.type === "chord");
  const scales = t.events.filter((e): e is ScaleEv => e.type === "scale").sort((a, b) => a.at - b.at);
  const c = chords.find((e) => at >= e.at && at < e.at + e.beats) ?? chords[0];
  const fromScales = scales.flatMap(scalePcs);
  const all = sorted([...(fromScales.length ? fromScales : chords.flatMap(tonesOf)), ...chords.flatMap(targetsOf)]);
  if (!all.length) return null;
  const set = new Set(all);
  const now = [...scales].reverse().find((e) => e.at <= at) ?? scales[0];
  const nowPcs = new Set(now ? scalePcs(now) : all);
  const sw = t.free === "switch";
  return {
    chord: c?.name ?? "",
    ...(sw && now ? { scale: buildLadder(now.scale, now.key, VOICES.tenor)?.title } : {}),
    pcs: all,
    lit: !c ? [] : targetsOf(c).length ? sorted(targetsOf(c)) : sorted(tonesOf(c).filter((pc) => set.has(pc))),
    muted: sw ? all.filter((pc) => !nowPcs.has(pc)) : [],
    targets: c ? sorted(targetsOf(c)) : [],
  };
}
