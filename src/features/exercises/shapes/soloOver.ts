import { isCompPattern } from "@/lib/practice/comping";
import { parseDegrees } from "../timeline/degrees";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { arr, BEATS_PER_BAR, chordName, chordRoot, isObj, isScale, keyPc, num, repeatsOf } from "./common";

/** Per chord: its scale (from the chord root) and a chord event with the target degrees highlighted; no steps. */
export function soloOver(raw: unknown): Timeline | null {
  if (!isObj(raw) || keyPc(raw.key) === null) return null;
  const per = Math.max(1, Math.round(num(raw.bars, 1))) * BEATS_PER_BAR;
  const backing = isCompPattern(raw.backing) ? raw.backing : undefined;
  const events: TimelineEvent[] = [];
  const hints: { at: number; text: string }[] = [];
  let at = 0;
  for (const c of arr(raw.chords)) {
    if (!isObj(c)) continue;
    const name = chordName(c.chord);
    if (!name) continue;
    if (isScale(c.scale)) events.push({ type: "scale", at, key: chordRoot(name), scale: c.scale });
    events.push({ type: "chord", at, beats: per, name, voicing: "open", highlight: parseDegrees(c.target), ...(backing ? { backing } : {}) });
    if (typeof c.approach === "string" && c.approach.trim()) hints.push({ at, text: c.approach.trim() });
    at += per;
  }
  if (!at) return null;
  const t: Timeline = { bpm: num(raw.bpm, 80), bars: at / BEATS_PER_BAR, events, ...repeatsOf(raw) };
  if (hints.length) t.hints = hints;
  return clampTimeline(t);
}
