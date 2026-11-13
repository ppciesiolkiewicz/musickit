import { isCompPattern } from "@/lib/practice/comping";
import { parseDegrees } from "../timeline/degrees";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { arr, BEATS_PER_BAR, chordName, chordRoot, isObj, isScale, keyPc, num, parseGrip, repeatsOf } from "./common";

/**
 * The exercise's scale (from the key) at the start, then per chord its own scale (from the chord root, when given) and
 * a chord event with the target degrees highlighted and its `stab` (a grip struck on beat 1), comped by `backing`
 * (default bass + chord); no steps. Free: the views show every scale's notes for the whole progression.
 */
export function soloOver(raw: unknown): Timeline | null {
  const key = isObj(raw) ? keyPc(raw.key) : null;
  if (!isObj(raw) || key === null) return null;
  const per = Math.max(1, Math.round(num(raw.bars, 1))) * BEATS_PER_BAR;
  const backing = isCompPattern(raw.backing) ? raw.backing : "bass-chord";
  const events: TimelineEvent[] = isScale(raw.scale) ? [{ type: "scale", at: 0, key, scale: raw.scale }] : [];
  const hints: { at: number; text: string }[] = [];
  let at = 0;
  for (const c of arr(raw.chords)) {
    if (!isObj(c)) continue;
    const name = chordName(c.chord);
    if (!name) continue;
    if (isScale(c.scale)) events.push({ type: "scale", at, key: chordRoot(name), scale: c.scale });
    const stab = parseGrip(c.stab, "chord");
    events.push({ type: "chord", at, beats: per, name, voicing: "open", highlight: parseDegrees(c.target), backing, ...(stab ? { stab } : {}) });
    if (typeof c.approach === "string" && c.approach.trim()) hints.push({ at, text: c.approach.trim() });
    at += per;
  }
  if (!at) return null;
  const t: Timeline = { bpm: num(raw.bpm, 80), bars: at / BEATS_PER_BAR, events, free: "over-chords", ...repeatsOf(raw) };
  if (hints.length) t.hints = hints;
  return clampTimeline(t);
}
