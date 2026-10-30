import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { BEATS_PER_BAR, chordName, isObj, isScale, keyPc, num, repeatsOf } from "./common";

const side = (v: unknown) => (isObj(v) && isScale(v.scale) ? (() => { const key = keyPc(v.key); return key === null ? null : { key, scale: v.scale as string }; })() : null);

/** One scale, then another from `switchBar` (default half the bars, kept within 1..bars-1). */
export function twoScales(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const a = side(raw.a), b = side(raw.b);
  if (!a || !b) return null;
  const bars = Math.max(2, Math.round(num(raw.bars, 8)));
  const sw = Math.min(bars - 1, Math.max(1, Math.round(num(raw.switchBar, Math.floor(bars / 2)))));
  const events: TimelineEvent[] = [{ type: "scale", at: 0, ...a }, { type: "scale", at: sw * BEATS_PER_BAR, ...b }];
  const chord = chordName(raw.backingChord);
  if (chord) events.push({ type: "chord", at: 0, beats: bars * BEATS_PER_BAR, name: chord, voicing: "open" });
  return clampTimeline({ bpm: num(raw.bpm, 80), bars, events, ...repeatsOf(raw) });
}
