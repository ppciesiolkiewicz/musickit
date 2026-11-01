import { SCALE_NECK_FRETS, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { shiftPosition } from "../scale-neck/boxes";

/** A crossing between two positions, as the view holds it. `string`: 0 is the low E (the props say 6). */
export interface Crossing {
  from: number;
  to: number;
  string: number;
}

/** The G string: where the classic crossings slide (A minor pentatonic position 1 to 2: D at the 7th fret up to E at the 9th). */
export const CROSS_STRING = 3;

const key = (c: ScaleCell) => `${c.string}-${c.fret}`;
const fits = (p: ScalePosition) => p.notes.every((c) => c.fret >= 0 && c.fret <= SCALE_NECK_FRETS);
const overlap = (a: ScalePosition, b: ScalePosition) => b.from <= a.to && a.from <= b.to;

/**
 * The way across from one position to another: up the lower one on the strings under `string`, both on `string` (the
 * shift, a slide from one to the other), the upper one on the strings above. The two are put next to each other on the
 * neck first (`b` an octave up or down when that is where it touches `a`: position 5 under position 1); null when they don't
 * touch. `lower` and `upper` are the two positions as placed, `notes` the path, low string to high, low fret to high.
 */
export function crossingPath(a: ScalePosition, b: ScalePosition, string: number): { lower: ScalePosition; upper: ScalePosition; notes: ScaleCell[] } | null {
  // either one may move: position 5 an octave down under position 1, or position 1 an octave up over position 5
  const pairs = [0, -12, 12].flatMap((s) => [[a, shiftPosition(b, s)], [shiftPosition(a, s), b]]).filter(([x, y]) => fits(x) && fits(y) && overlap(x, y));
  if (!pairs.length) return null;
  const [x, y] = pairs[0];
  const [lower, upper] = y.from < x.from || (y.from === x.from && y.to < x.to) ? [y, x] : [x, y];
  const seen = new Set<string>();
  const notes = [
    ...lower.notes.filter((c) => c.string <= string),
    ...upper.notes.filter((c) => c.string >= string),
  ].filter((c) => !seen.has(key(c)) && !!seen.add(key(c)));
  notes.sort((x, y) => x.string - y.string || x.fret - y.fret);
  return { lower, upper, notes };
}

/** Notes played up and back down, each pitch once (an open string and the same note fretted sound alike). */
export function upAndDown(notes: ScaleCell[]): ScaleCell[] {
  const seen = new Set<number>();
  const up = [...notes].sort((x, y) => x.midi - y.midi || x.string - y.string).filter((c) => !seen.has(c.midi) && !!seen.add(c.midi));
  return [...up, ...up.slice(0, -1).reverse()];
}
