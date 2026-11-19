import { RANGE_MAX, RANGE_MIN, VOICES, type Range, type Voice } from "./singing";

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

/** A MIDI note's name with octave, C4 = 60. */
export const noteName = (midi: number): string => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** How far a held note's readings may swing from their centre, in semitones: a wide vibrato, as at the top of a range. */
const HELD_SWING = 1;
/** How far the centres of a hold's first and second halves may sit apart, in semitones: more is a slide, not a held note. */
const HELD_DRIFT = 0.5;

const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * The note held over the last `minFrames` readings, as a rounded MIDI number, or null when there are too few readings, any is
 * missing (no pitch heard), they swing more than a semitone from their centre, or the centre moves (a slide or a jump: the
 * window's two halves centre more than half a semitone apart). Vibrato up to a semitone each way still counts as held.
 */
export function steadyNote(midis: (number | null)[], minFrames: number): number | null {
  if (midis.length < minFrames || minFrames < 2) return null;
  const tail = midis.slice(-minFrames);
  if (tail.some((m) => m === null)) return null;
  const notes = tail as number[];
  const mean = meanOf(notes);
  if (!notes.every((m) => Math.abs(m - mean) <= HELD_SWING)) return null;
  const half = Math.floor(notes.length / 2);
  return Math.abs(meanOf(notes.slice(0, half)) - meanOf(notes.slice(half))) <= HELD_DRIFT ? Math.round(mean) : null;
}

/** Two sung notes as a range, lowest first. */
export const normaliseRange = (a: number, b: number): Range => ({ low: Math.min(a, b), high: Math.max(a, b) });

/** The voice type whose range is closest to this one (smallest summed distance of low and high ends). */
export function nearestVoice(range: Range): Voice {
  const keys = Object.keys(VOICES) as Voice[];
  const gap = (v: Voice) => Math.abs(VOICES[v].low - range.low) + Math.abs(VOICES[v].high - range.high);
  return keys.reduce((best, v) => (gap(v) < gap(best) ? v : best));
}

/** Whether a sung high note is far enough above the low one (3 semitones) to count as the top of a range. */
export const isHighEnough = (low: number, high: number): boolean => high - low >= 3;

/**
 * What a player told us about their voice: a voice type, or a range of their own, found with the microphone. One or the
 * other: a range of their own wins, and a type's range is its definition (`VOICES`). Stored in `user_voices`.
 */
export interface SingerVoice {
  type?: Voice;
  range?: Range;
}

/** The narrowest range a singing tool can lay an exercise in: an octave. */
export const MIN_SPAN = 12;

const isNote = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= RANGE_MIN && n <= RANGE_MAX;
const rangeIn = (raw: unknown): Range | null => {
  if (!raw || typeof raw !== "object") return null;
  const { low, high } = raw as Record<string, unknown>;
  return isNote(low) && isNote(high) && low < high ? { low, high } : null;
};

/**
 * A stored or sent voice made safe: `{ range }` when it has a range of whole notes inside C2 to C7, low under high, else
 * `{ type }` for a known type, else null. A bare type name reads as that type, and a bare `{ low, high }` (how the
 * singing page once kept it) as that range, or as the type whose range it is exactly.
 */
export function cleanVoice(raw: unknown): SingerVoice | null {
  if (typeof raw === "string") return Object.hasOwn(VOICES, raw) ? { type: raw as Voice } : null;
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const bare = rangeIn(rec);
  if (bare) {
    const exact = (Object.keys(VOICES) as Voice[]).find((v) => VOICES[v].low === bare.low && VOICES[v].high === bare.high);
    return exact ? { type: exact } : { range: bare };
  }
  const range = rangeIn(rec.range);
  if (range) return { range };
  return typeof rec.type === "string" && Object.hasOwn(VOICES, rec.type) ? { type: rec.type as Voice } : null;
}

/** "A2 to E4": a range in words, for the screen. */
export const rangeWords = (r: Range): string => `${noteName(r.low)} to ${noteName(r.high)}`;

/**
 * The range the singing tools use for a voice: the type's own, or the player's range. A range under an octave is too
 * narrow to lay an exercise in, so it is widened to an octave around its middle (inside C2 to C7).
 */
export function rangeOf(v: SingerVoice): Range {
  if (!v.range) {
    const { low, high } = VOICES[v.type ?? "tenor"];
    return { low, high };
  }
  const { low, high } = v.range;
  if (high - low >= MIN_SPAN) return { low, high };
  const from = Math.min(Math.max(low - Math.floor((MIN_SPAN - (high - low)) / 2), RANGE_MIN), RANGE_MAX - MIN_SPAN);
  return { low: from, high: from + MIN_SPAN };
}

/** The voice type: the one picked, or the one nearest to the player's own range (for the clef and where the registers change). */
export const typeOf = (v: SingerVoice): Voice => (v.range ? nearestVoice(v.range) : v.type ?? "tenor");

/** How the voice is named on the screen: the type's name, or the whole range when it is the player's own ("A2 to E4"). */
export const voiceWords = (v: SingerVoice): string => (v.range ? rangeWords(rangeOf(v)) : VOICES[v.type ?? "tenor"].label);

/** The lowest (`end` "low") or highest note held so far, with one more held note. */
export const furthest = (soFar: number | null, note: number, end: "low" | "high"): number =>
  soFar === null ? note : end === "low" ? Math.min(soFar, note) : Math.max(soFar, note);
