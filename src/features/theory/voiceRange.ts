import { VOICES, type Range, type Voice } from "./singing";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** A MIDI note's name with octave, C4 = 60. */
export const noteName = (midi: number): string => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/**
 * The note held over the last `minFrames` readings, as a rounded MIDI number, or null when there are too few readings, any is
 * missing (no pitch heard), or they wander more than half a semitone from their mean.
 */
export function steadyNote(midis: (number | null)[], minFrames: number): number | null {
  if (midis.length < minFrames || minFrames < 1) return null;
  const tail = midis.slice(-minFrames);
  if (tail.some((m) => m === null)) return null;
  const notes = tail as number[];
  const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
  return notes.every((m) => Math.abs(m - mean) <= 0.5) ? Math.round(mean) : null;
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
