/** Note names and numbers. Pure, no audio: a note is a MIDI number (60 = middle C) or a name such as "C4" or "F#3". */

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export type NoteLike = number | string;

/** "C4" -> 60, "F#3" -> 54, "Bb2" -> 46; numbers pass through. null when it is not a note. */
export function noteToMidi(n: NoteLike): number | null {
  if (typeof n === "number") return Number.isFinite(n) ? Math.round(n) : null;
  const m = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/.exec(n.trim());
  if (!m) return null;
  const acc = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + PC[m[1].toUpperCase()] + acc;
}

export const midiToName = (midi: number): string => `${SHARPS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** The sample closest to `target` (in semitones) and the playback rate that tunes it to the target. */
export function closestSample<T extends { midi: number }>(target: number, samples: readonly T[]): { sample: T; rate: number } | null {
  let best: T | null = null;
  for (const s of samples) if (best === null || Math.abs(s.midi - target) < Math.abs(best.midi - target)) best = s;
  return best ? { sample: best, rate: 2 ** ((target - best.midi) / 12) } : null;
}
