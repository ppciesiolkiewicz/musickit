/** The jam's clock maths: pure, tested. */

export const MIN_BPM = 40;
export const MAX_BPM = 200;
export const DEFAULT_BPM = 90;

/** A whole tempo in range; anything that is not a number gives the default. */
export const clampTempo = (bpm: number): number => (Number.isFinite(bpm) ? Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm))) : DEFAULT_BPM);

/** The first beat line at or after `now` on the grid that has beat 1 at `anchor` (the anchor itself when it is still ahead). */
export function nextBeat(now: number, anchor: number, beatSeconds: number): number {
  if (now <= anchor) return anchor;
  return anchor + Math.ceil((now - anchor) / beatSeconds - 1e-9) * beatSeconds;
}
