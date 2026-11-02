/** Chord-backing maths: which bar box a click falls on and which comes next. Pure. */

import { BEATS_PER_BAR } from "../../timeline/timeline";

/** Where click `beat` (0 = the first, counting on through loops; -1 = stopped) falls on `bars` looping one-chord bars. */
export function stripAt(beat: number, bars: number): { now: number; next: number; beat: number } | null {
  if (beat < 0 || bars < 1) return null;
  const now = Math.floor(beat / BEATS_PER_BAR) % bars;
  return { now, next: (now + 1) % bars, beat: beat % BEATS_PER_BAR };
}
