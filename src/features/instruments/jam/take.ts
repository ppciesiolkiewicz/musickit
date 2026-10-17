/** The jam loops' maths: pure, tested. Times are seconds on the AudioContext clock, frames are samples on it. */

export const LOOP_BARS = [1, 2, 4, 8] as const;
export const DEFAULT_LOOP_BARS = 2;
export const MAX_LOOPS = 8;

/** Bars a loop can record: one of `LOOP_BARS`, anything else gives the default. */
export const clampBars = (bars: number): number => ((LOOP_BARS as readonly number[]).includes(bars) ? bars : DEFAULT_LOOP_BARS);

/** How far into a loop of `length` seconds that began at `origin` the time `at` is (0 up to `length`). */
export function loopOffset(at: number, origin: number, length: number): number {
  if (!(length > 0)) return 0;
  const r = (at - origin) % length;
  return r < 0 ? r + length : r;
}

/** A block of recorded sound and the frame its first sample was taken at. */
export interface Chunk {
  frame: number;
  data: Float32Array;
}

/**
 * Cut `length` frames starting at frame `from` out of the recorded chunks (in any order, gaps stay silent). Frames before the first
 * chunk or after the last are silent too.
 */
export function cutTake(chunks: readonly Chunk[], from: number, length: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.max(0, Math.round(length)));
  for (const c of chunks) {
    const start = Math.max(from, c.frame);
    const end = Math.min(from + out.length, c.frame + c.data.length);
    for (let f = start; f < end; f++) out[f - from] = c.data[f - c.frame];
  }
  return out;
}

/** Fade the first and last `frames` samples in and out, so a loop's seam does not click. */
export function fadeEdges(data: Float32Array<ArrayBuffer>, frames: number): Float32Array<ArrayBuffer> {
  const n = Math.min(frames, Math.floor(data.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    data[i] *= g;
    data[data.length - 1 - i] *= g;
  }
  return data;
}
