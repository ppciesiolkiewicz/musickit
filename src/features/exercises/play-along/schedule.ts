import type { Cue } from "../cues/cues";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";

/** Cues starting in `bar` of the loop (`bar` counts on past the end and wraps by `bars`). */
export function barEvents(cues: Cue[], bar: number, bars: number): Cue[] {
  const b = ((bar % bars) + bars) % bars;
  const lo = b * BEATS_PER_BAR, hi = lo + BEATS_PER_BAR;
  return cues.filter((c) => c.at >= lo && c.at < hi);
}

/** Whole loops played by `beat` (beats since the start). */
export const loopsDone = (beat: number, t: Timeline): number => Math.floor(beat / (t.bars * BEATS_PER_BAR));

/** True once every repeat has played; never when `repeats` is absent (loops forever). */
export const isFinished = (beat: number, t: Timeline): boolean => t.repeats !== undefined && loopsDone(beat, t) >= t.repeats;

/** Audio time of the bar after one starting at `barAt`, at `bpm`. */
export const nextBarAt = (barAt: number, bpm: number): number => barAt + (BEATS_PER_BAR * 60) / bpm;

/** The click anchor that puts beat index `bar * 4` at `barAt` at `bpm`, so a tempo change keeps the index continuous. */
export const gridAnchor = (barAt: number, bar: number, bpm: number): number => barAt - (bar * BEATS_PER_BAR * 60) / bpm;

/** What sounds under the steps besides the click: the chords held, a drone on the key, or nothing more. */
export type BackingSound = "chords" | "drone" | "none";

/**
 * The timeline with its backing sound set. Left out, a timeline whose chords have no comping of their own and whose
 * steps are single notes gets "chords", so the student hears the harmony they play over, not just the click. The drone
 * sits on the key (the first scale), else the first chord's root.
 */
export function withBackingSound(t: Timeline, want?: BackingSound): Timeline {
  const chords = t.events.filter((e) => e.type === "chord");
  const bare = chords.some((e) => e.type === "chord" && !e.backing);
  const notes = t.events.some((e) => e.type === "step" && e.chord && e.step.kind === "note");
  const sound = want ?? (bare && notes ? "chords" : "none");
  if (sound === "chords") return bare ? { ...t, pad: true } : t;
  if (sound === "drone") {
    const scale = t.events.find((e) => e.type === "scale");
    const first = chords[0];
    const pc = scale?.type === "scale" ? scale.key : first?.type === "chord" ? parseChordQuery(first.name)?.rootPc : undefined;
    return pc === undefined ? t : { ...t, drone: pc };
  }
  return t;
}
