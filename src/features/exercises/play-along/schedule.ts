import type { Cue } from "../cues/cues";
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
