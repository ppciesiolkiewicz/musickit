import { clampTimeline } from "../timeline/timeline";
import type { Place, Timeline, TimelineEvent } from "../timeline/types";
import { addCues, arr, BEATS_PER_BAR, chordName, fillSteps, isObj, num, parseSteps, placeOf, repeatsOf, type StepEvent } from "./common";

/**
 * Arpeggio degrees (from each chord root) one per beat, chords cycled a bar each over `bars`. `place` sets each
 * chord's box; `across` (when no `place`) puts the first half in `from` and the rest in `to`.
 */
export function arpeggioPart(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const names = arr(raw.chords).map(chordName).filter((c): c is string => !!c);
  const steps = parseSteps(raw.degrees, "chord").filter((s) => s.kind === "note");
  if (!names.length || !steps.length) return null;
  const bars = Math.max(1, Math.round(num(raw.bars, names.length)));
  const places = arr(raw.place).map(placeOf);
  const across = isObj(raw.across) ? { from: placeOf(raw.across.from), to: placeOf(raw.across.to) } : null;
  const events: TimelineEvent[] = [];
  const stepEvents: StepEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const name = names[bar % names.length];
    const at = bar * BEATS_PER_BAR;
    const place: Place | undefined = places.length ? places[bar] : across ? (bar < Math.ceil(bars / 2) ? across.from : across.to) : undefined;
    events.push({ type: "chord", at, beats: BEATS_PER_BAR, name, voicing: "open", ...(place ? { place } : {}) });
    stepEvents.push(...fillSteps(steps, at, BEATS_PER_BAR, name, place));
  }
  return clampTimeline({ bpm: num(raw.bpm, 80), bars, events: [...events, ...addCues(stepEvents, raw.guide)], ...repeatsOf(raw) });
}
