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

/* ---------------------------------------------------------------- metronome and quantising */

export type Quantise = "off" | "beat" | "bar";

/** Frames in one beat at this tempo (rounded to a whole frame). */
export const beatFrames = (bpm: number, sampleRate: number) => Math.max(1, Math.round((60 / bpm) * sampleRate));

/** Frames in the unit a take is rounded to: one beat, one bar, or 0 when quantising is off. */
export function quantUnitFrames(mode: Quantise, bpm: number, beatsPerBar: number, sampleRate: number): number {
  if (mode === "off") return 0;
  const beat = beatFrames(bpm, sampleRate);
  return mode === "beat" ? beat : beat * Math.max(1, beatsPerBar);
}

/** Length of a take rounded to the nearest whole number of units (at least one). A unit of 0 leaves the length alone. */
export function quantiseLength(frames: number, unit: number): number {
  if (unit <= 0) return frames;
  return Math.max(1, Math.round(frames / unit)) * unit;
}

/** Which beat of the bar the time falls in (0 is the downbeat). Negative times before the anchor count back from the bar end. */
export function beatInBar(now: number, anchor: number, period: number, beatsPerBar: number): { beat: number; index: number } {
  const index = Math.floor((now - anchor) / period + 1e-9);
  return { beat: ((index % beatsPerBar) + beatsPerBar) % beatsPerBar, index };
}

/** Loop lengths a later take may have, as multiples of the first loop (and the bar counts offered for the first one). */
export const LENGTH_STEPS = [1, 2, 4, 8, 16] as const;

/** The smallest allowed multiple (1, 2, 4, 8, 16) of `base` that holds `elapsed`; a little overshoot (2%) still counts as the lower one. */
export function lengthMultiple(elapsed: number, base: number): number {
  if (!(base > 0)) return 1;
  const x = elapsed / base;
  for (const n of LENGTH_STEPS) if (x <= n * 1.02) return n;
  return LENGTH_STEPS[LENGTH_STEPS.length - 1];
}

export interface TakeStatus {
  phase: "armed" | "recording" | "stopping";
  /** beats until the take starts (armed) or ends (stopping), else 0 */
  beatsLeft: number;
  /** the bar being recorded (1-based), the bars the take is planned or heading for, and the beat in that bar (1-based) */
  bar: number;
  totalBars: number;
  beat: number;
}

/**
 * What a person should see during a take. Times are in seconds on the audio clock; `period` is one beat.
 * A free take heads for the next 1, 2, 4, 8, 16 ... bars (3/4, then 5/8), a planned one for its own length.
 */
export function takeStatus(o: { now: number; start: number; end: number | null; stopping: boolean; started: boolean; period: number; beatsPerBar: number; minBars?: number }): TakeStatus {
  const bar = o.period * o.beatsPerBar;
  if (!o.started && o.now < o.start) return { phase: "armed", beatsLeft: Math.max(1, Math.ceil((o.start - o.now) / o.period - 1e-6)), bar: 0, totalBars: 0, beat: 0 };
  const el = Math.max(0, o.now - o.start);
  const barIdx = Math.floor(el / bar + 1e-9) + 1;
  const beat = Math.floor((el % bar) / o.period + 1e-9) + 1;
  let total: number;
  if (o.end !== null) total = Math.max(1, Math.round((o.end - o.start) / bar));
  else {
    total = Math.max(1, o.minBars ?? 1);
    while (total < barIdx) total *= 2;
  }
  const left = o.stopping && o.end !== null ? Math.max(1, Math.ceil((o.end - o.now) / o.period - 1e-6)) : 0;
  return { phase: o.stopping ? "stopping" : "recording", beatsLeft: left, bar: Math.min(barIdx, total), totalBars: total, beat: Math.min(beat, o.beatsPerBar) };
}

/** The timeline's length in bars: the longest loop (rounded to whole bars), never less than one bar. */
export function cycleBars(loopBars: number[]): number {
  return loopBars.reduce((m, b) => Math.max(m, Math.round(b)), 1);
}

export interface TimelinePos {
  /** bar inside the cycle (0-based); during the count-in, count-in bars left minus one */
  bar: number;
  /** beat in the bar, 0-based */
  beat: number;
  /** 0..1 through the whole cycle (0 during the count-in) */
  fraction: number;
  countIn: boolean;
}

/** Where on the timeline the time falls: bar, beat and how far through the cycle. Before the anchor it is the count-in. */
export function timelinePosition(now: number, anchor: number, period: number, beatsPerBar: number, cycle: number): TimelinePos {
  const barSec = period * beatsPerBar;
  const { beat } = beatInBar(now, anchor, period, beatsPerBar);
  if (now < anchor) return { bar: Math.max(0, Math.ceil((anchor - now) / barSec - 1e-9) - 1), beat, fraction: 0, countIn: true };
  const len = barSec * Math.max(1, cycle);
  const x = loopOffset(now, anchor, len);
  return { bar: Math.floor(x / barSec + 1e-9), beat, fraction: x / len, countIn: false };
}
