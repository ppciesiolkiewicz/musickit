import { SCALE_NECK_FRETS, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { shiftPosition } from "../scale-neck/boxes";

/**
 * Every place a position fits on the neck (frets 0 to `SCALE_NECK_FRETS`), an octave apart, lowest first: C minor
 * pentatonic position 3 at frets 0–4 and again at 12–16. A position that fits nowhere else is its one place.
 */
export function octaves(p: ScalePosition): ScalePosition[] {
  const fits = (q: ScalePosition) => q.notes.every((c) => c.fret >= 0 && c.fret <= SCALE_NECK_FRETS);
  const all = [-24, -12, 0, 12, 24].map((s) => shiftPosition(p, s)).filter(fits);
  return all.length ? all : [p];
}
