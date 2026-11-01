import { isCompPattern } from "@/lib/practice/comping";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { BEATS_PER_BAR, chordName, isObj, isScale, keyPc, num, repeatsOf } from "./common";

const side = (v: unknown) => (isObj(v) && isScale(v.scale) ? (() => { const key = keyPc(v.key); return key === null ? null : { key, scale: v.scale as string }; })() : null);

/**
 * One scale, then another from `switchBar` (default half the bars, kept within 1..bars-1). The backing chord, if any,
 * is comped by `backing` (default bass + chord) for the whole timeline. Free: both scales' notes are shown throughout,
 * the ones outside the scale playing now muted.
 */
export function twoScales(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const a = side(raw.a), b = side(raw.b);
  if (!a || !b) return null;
  const bars = Math.max(2, Math.round(num(raw.bars, 8)));
  const sw = Math.min(bars - 1, Math.max(1, Math.round(num(raw.switchBar, Math.floor(bars / 2)))));
  const events: TimelineEvent[] = [{ type: "scale", at: 0, ...a }, { type: "scale", at: sw * BEATS_PER_BAR, ...b }];
  const chord = chordName(raw.backingChord);
  const backing = isCompPattern(raw.backing) ? raw.backing : "bass-chord";
  if (chord) events.push({ type: "chord", at: 0, beats: bars * BEATS_PER_BAR, name: chord, voicing: "open", backing });
  return clampTimeline({ bpm: num(raw.bpm, 80), bars, events, free: "switch", ...repeatsOf(raw) });
}
