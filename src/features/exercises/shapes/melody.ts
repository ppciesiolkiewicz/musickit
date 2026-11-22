import { BOOK, barsOf } from "@/features/theory/singingMelodies";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import { melodyTonic } from "../timeline/degrees";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline, TimelineEvent } from "../timeline/types";
import { isObj, keyPc, num, repeatsOf } from "./common";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** The highest fret a tune's note may sit on. */
const TOP_FRET = 17;

/**
 * A melody-book tune as one step per note, semitones from the key's Do, `beats` the note length. With `octave` 1 every
 * note sounds an octave higher; null then when a note would leave the neck (past fret 17 on the high e string).
 */
export function melody(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const key = keyPc(raw.key);
  const tune = BOOK.find((t) => t.n === raw.tune);
  if (key === null || !tune) return null;
  if (raw.octave !== undefined && raw.octave !== 1) return null;
  const lift = raw.octave === 1 ? 12 : 0;
  const events: TimelineEvent[] = [{ type: "scale", at: 0, key, scale: "major-ionian" }];
  for (const n of tune.notes) {
    const semis = MAJOR[((n.step % 7) + 7) % 7] + 12 * Math.floor(n.step / 7) + lift;
    if (lift && melodyTonic(key) + semis > OPEN_MIDI[5] + TOP_FRET) return null;
    events.push({ type: "step", at: n.at, beats: n.beats, chord: "", step: { kind: "note", semis, from: "key" } });
  }
  return clampTimeline({ bpm: num(raw.bpm, 80), bars: barsOf(tune.notes), events, ...repeatsOf(raw) });
}
