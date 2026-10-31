import type { CompPattern } from "@/lib/practice/comping";
import { isCompPattern } from "@/lib/practice/comping";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { addCues, arr, BEATS_PER_BAR, chordName, fillSteps, fromOf, isObj, keyPc, num, parseSteps, placeOf, repeatsOf, voicingOf, type StepEvent } from "./common";
import { numeralChord } from "./numerals";

/** Chords (or numerals in the key) cycled over `bars`, each `beatsPerChord` beats, with the step template repeated. */
export function progression(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const key = keyPc(raw.key);
  if (key === null) return null;
  const names = (raw.numerals !== undefined ? arr(raw.numerals).map((n) => (typeof n === "string" ? numeralChord(n, key) : null)) : arr(raw.chords).map(chordName)).filter((c): c is string => !!c && !!chordName(c));
  if (!names.length) return null;
  const bars = Math.max(1, Math.round(num(raw.bars, 4)));
  const per = raw.beatsPerChord === 2 || raw.beatsPerChord === 3 ? raw.beatsPerChord : 4;
  const from = fromOf(raw.degreesFrom);
  const steps = parseSteps(raw.steps, from);
  const voicing = voicingOf(raw.voicing);
  const backing = arr(raw.backing).filter(isCompPattern) as CompPattern[];
  const places = arr(raw.place).map(placeOf);
  const events: TimelineEvent[] = [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  const stepEvents: StepEvent[] = [];
  for (let i = 0, at = 0; at < bars * BEATS_PER_BAR; i++, at += per) {
    const name = names[i % names.length];
    const place = places[i];
    events.push({ type: "chord", at, beats: per, name, voicing, ...(place ? { place } : {}), ...(backing[0] ? { backing: backing[0] } : {}) });
    stepEvents.push(...fillSteps(steps, at, per, name, place));
  }
  const t: Timeline = { bpm: num(raw.bpm, 80), bars, events: [...events, ...addCues(stepEvents, undefined)], ...repeatsOf(raw) };
  if (backing.length) t.backingChoices = backing;
  return clampTimeline(t);
}
