/**
 * Pure helpers for the looper: frame arithmetic, no Web Audio, no DOM.
 * Everything here is unit tested; the engine only wires these to the browser.
 */

export interface Chunk {
  /** index of the chunk's first sample on the audio context timeline */
  frame: number;
  l: Float32Array;
  r: Float32Array;
}

/**
 * Cut the samples in [start, end) out of a list of consecutive chunks.
 * Gaps (dropped chunks) become silence so the result always has exactly end - start samples.
 */
export function assemble(chunks: Chunk[], start: number, end: number): { l: Float32Array; r: Float32Array } {
  const n = Math.max(0, Math.round(end - start));
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (const c of chunks) {
    const from = Math.max(start, c.frame);
    const to = Math.min(end, c.frame + c.l.length);
    if (to <= from) continue;
    const srcOff = from - c.frame;
    const dstOff = from - start;
    const len = to - from;
    l.set(c.l.subarray(srcOff, srcOff + len), dstOff);
    r.set(c.r.subarray(srcOff, srcOff + len), dstOff);
  }
  return { l, r };
}

/** Where in the loop (seconds, 0 <= x < length) the given time falls. */
export function loopOffset(now: number, loopStart: number, length: number): number {
  const x = (now - loopStart) % length;
  return x < 0 ? x + length : x;
}

/** The next loop boundary at least `lead` seconds after `now`. */
export function nextBoundary(now: number, loopStart: number, length: number, lead = 0): number {
  const n = Math.ceil((now + lead - loopStart) / length);
  return loopStart + Math.max(0, n) * length;
}

/** Min/max peaks for drawing a waveform, `buckets` of them. */
export function peaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  if (data.length === 0) return out;
  const size = data.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * size);
    const to = Math.max(from + 1, Math.floor((b + 1) * size));
    let m = 0;
    for (let i = from; i < to && i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > m) m = v;
    }
    out[b] = m;
  }
  return out;
}

export type InputMode = "left" | "right" | "stereo" | "sum";

/** Choose / mix the input channels into the stereo pair that gets recorded. */
export function applyInputMode(l: Float32Array, r: Float32Array, mode: InputMode): { l: Float32Array; r: Float32Array } {
  switch (mode) {
    case "left":
      return { l, r: l };
    case "right":
      return { l: r, r };
    case "sum": {
      const m = new Float32Array(l.length);
      for (let i = 0; i < m.length; i++) m[i] = (l[i] + r[i]) * 0.5;
      return { l: m, r: m };
    }
    default:
      return { l, r };
  }
}

export interface MixState {
  volume: number;
  muted: boolean;
  solo: boolean;
}

/** Gain a channel should have given its own state and whether any channel is soloed. */
export function effectiveGain(c: MixState, anySolo: boolean): number {
  if (c.muted) return 0;
  if (anySolo && !c.solo) return 0;
  return c.volume;
}

/** Convert milliseconds of latency compensation to whole frames. */
export const msToFrames = (ms: number, sampleRate: number) => Math.max(0, Math.round((ms / 1000) * sampleRate));
