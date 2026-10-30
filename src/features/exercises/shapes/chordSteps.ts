import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { addCues, arr, BEATS_PER_BAR, chordName, fillSteps, fromOf, isObj, keyPc, num, parseSteps, placeOf, repeatsOf, voicingOf, type StepEvent } from "./common";

/** Per chord a step list, one beat a step; each chord one bar, or as many whole bars as its steps need. */
export function chordSteps(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const key = raw.key === undefined ? null : keyPc(raw.key);
  if (raw.key !== undefined && key === null) return null;
  const from = key === null ? "chord" : fromOf(raw.degreesFrom);
  const voicing = voicingOf(raw.voicing);
  const events: TimelineEvent[] = key === null ? [] : [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  const stepEvents: StepEvent[] = [];
  let at = 0;
  for (const c of arr(raw.chords)) {
    if (!isObj(c)) continue;
    const name = chordName(c.chord);
    if (!name) continue;
    const steps = parseSteps(c.steps, from);
    const beats = Math.max(1, Math.ceil(steps.length / BEATS_PER_BAR)) * BEATS_PER_BAR;
    const place = placeOf(c.place);
    events.push({ type: "chord", at, beats, name, voicing, ...(place ? { place } : {}) });
    stepEvents.push(...fillSteps(steps, at, beats, name, place));
    at += beats;
  }
  if (!at) return null;
  return clampTimeline({ bpm: num(raw.bpm, 80), bars: at / BEATS_PER_BAR, events: [...events, ...addCues(stepEvents, raw.guide)], ...repeatsOf(raw) });
}
