import { BOOK, barsOf } from "@/features/theory/singingMelodies";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { isObj, keyPc, num, repeatsOf } from "./common";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** A melody-book tune as one step per note, semitones from the key's Do, `beats` the note length. */
export function melody(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const key = keyPc(raw.key);
  const tune = BOOK.find((t) => t.n === raw.tune);
  if (key === null || !tune) return null;
  const events: TimelineEvent[] = [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  for (const n of tune.notes) {
    const semis = MAJOR[((n.step % 7) + 7) % 7] + 12 * Math.floor(n.step / 7);
    events.push({ type: "step", at: n.at, beats: n.beats, chord: "", step: { kind: "note", semis, from: "key" } });
  }
  return clampTimeline({ bpm: num(raw.bpm, 80), bars: barsOf(tune.notes), events, ...repeatsOf(raw) });
}
