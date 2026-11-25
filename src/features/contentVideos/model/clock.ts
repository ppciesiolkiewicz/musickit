/**
 * The overlay's clock: where a tool was in its music at each moment of a take. Pure: no React, no browser.
 *
 * While a take records, the tool reports its beat (the riff's beat counting on through its loops, the melody's beat in the
 * tune) or null while it is stopped, and the recorder samples it on a timer (`Sample`). `squeeze` turns the samples into
 * straight pieces (`Piece`: from `t` seconds into the video the beat runs on from `beat` at `rate` beats a second; a
 * held beat has rate 0, a stopped tool beat null). On playback `beatAt` reads the beat at the video's time, so the
 * drawing follows a seek exactly and makes no sound.
 */

/** the tool's beat `beat` (null: stopped) at `t` seconds into the take */
export interface Sample { t: number; beat: number | null }

/** `[t, beat, rate]`: from `t` seconds the beat is `beat + rate * (time - t)`; `beat` null while the tool is stopped */
export type Piece = [t: number, beat: number | null, rate: number];

/** how far (in beats) a piece may sit off a sample: the riff's beat moves in 1/24 steps */
export const TOLERANCE = 0.06;
/** the most pieces a take may carry: about one every second of the longest take, far more than any real take needs */
export const MAX_PIECES = 4000;

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

/**
 * The samples as few straight pieces as keep every sample within `tol` beats: a piece runs while one rate fits all its
 * samples (the cone of rates each sample allows still has room), and a jump (a loop going back, a start, a stop) starts
 * a new one at the sample where it shows.
 */
export function squeeze(samples: Sample[], tol = TOLERANCE): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  while (i < samples.length) {
    const a = samples[i];
    if (a.beat === null) {
      if (out.at(-1)?.[1] !== null || !out.length) out.push([round(a.t, 3), null, 0]);
      i++;
      continue;
    }
    let lo = -Infinity, hi = Infinity, j = i + 1;
    for (; j < samples.length; j++) {
      const s = samples[j];
      if (s.beat === null) break;
      const dt = s.t - a.t;
      if (dt <= 0) continue;
      const nlo = Math.max(lo, (s.beat - tol - a.beat) / dt);
      const nhi = Math.min(hi, (s.beat + tol - a.beat) / dt);
      if (nlo > nhi) break;
      lo = nlo;
      hi = nhi;
    }
    const rate = j === i + 1 ? 0 : (lo + hi) / 2;
    out.push([round(a.t, 3), round(a.beat, 3), round(Math.abs(rate) < 1e-3 ? 0 : rate, 4)]);
    i = j;
  }
  return out;
}

/** The tool's beat at `t` seconds into the video: null before the first piece and while the tool was stopped. */
export function beatAt(pieces: Piece[], t: number): number | null {
  let k = -1;
  for (let lo = 0, hi = pieces.length - 1; lo <= hi;) {
    const mid = (lo + hi) >> 1;
    if (pieces[mid][0] <= t) { k = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (k < 0) return null;
  const [t0, b0, rate] = pieces[k];
  return b0 === null ? null : b0 + rate * (t - t0);
}

/** `x` as pieces, or null when it isn't a list of `[t, beat|null, rate]` in time order with finite numbers. */
export function readPieces(x: unknown): Piece[] | null {
  if (!Array.isArray(x) || x.length > MAX_PIECES) return null;
  let last = -Infinity;
  for (const p of x) {
    if (!Array.isArray(p) || p.length !== 3) return null;
    const [t, b, r] = p;
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0 || t < last) return null;
    if (b !== null && (typeof b !== "number" || !Number.isFinite(b))) return null;
    if (typeof r !== "number" || !Number.isFinite(r)) return null;
    last = t;
  }
  return x as Piece[];
}
