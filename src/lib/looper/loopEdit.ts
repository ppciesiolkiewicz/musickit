/**
 * Loop editing: pure maths, no Web Audio.
 *
 * A take keeps a little audio before and after the loop (`Take.start` frames before it, the rest after it), so the loop can later be
 * slid earlier or later, or its seam smoothed with the sound that really came before it. Edits never change the loop's length,
 * so an edited loop stays in time. The edit is plain data (`LoopEdit`); the playing buffer is always `renderLoop(take, edit)`.
 */

/** Seconds of sound kept before and after every take. */
export const TAKE_MARGIN_SECONDS = 1;

export interface Take {
  l: Float32Array;
  r: Float32Array;
  /** index in l/r where the loop as recorded begins (= the frames kept before it) */
  start: number;
  /** length of the loop in frames */
  length: number;
}

export interface LoopEdit {
  /** frames to slide the loop window: positive takes sound from later in the take, negative from earlier */
  shift: number;
  /** linear gain applied last */
  gain: number;
  reverse: boolean;
  /** milliseconds */
  fadeIn: number;
  fadeOut: number;
  /** milliseconds of crossfade at the loop seam, blending the end into the sound that came just before the start */
  seam: number;
}

export const DEFAULT_EDIT: LoopEdit = { shift: 0, gain: 1, reverse: false, fadeIn: 0, fadeOut: 0, seam: 0 };
export const MAX_FADE_MS = 2000;
export const MAX_SEAM_MS = 500;
export const MAX_GAIN = 8;

export const isDefaultEdit = (e: LoopEdit) => (Object.keys(DEFAULT_EDIT) as (keyof LoopEdit)[]).every((k) => e[k] === DEFAULT_EDIT[k]);

/** How far the window may slide each way without leaving the recorded audio. */
export function shiftRange(t: Take): { min: number; max: number } {
  return { min: -t.start, max: Math.max(0, t.l.length - t.start - t.length) };
}

/** An edit with every field inside its limits for this take (anything missing or broken falls back to the default). */
export function clampEdit(t: Take | null, e: Partial<LoopEdit>): LoopEdit {
  const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const range = t ? shiftRange(t) : { min: 0, max: 0 };
  return {
    shift: Math.round(num(e.shift, 0, range.min, range.max)),
    gain: num(e.gain, 1, 0, MAX_GAIN),
    reverse: e.reverse === true,
    fadeIn: num(e.fadeIn, 0, 0, MAX_FADE_MS),
    fadeOut: num(e.fadeOut, 0, 0, MAX_FADE_MS),
    seam: num(e.seam, 0, 0, MAX_SEAM_MS),
  };
}

const msFrames = (ms: number, sr: number) => Math.max(0, Math.round((ms / 1000) * sr));

/** Seam crossfade length in frames that the audio before the window can actually supply. */
export function seamFrames(t: Take, e: LoopEdit, sr: number): number {
  const before = t.start + e.shift;
  return Math.min(msFrames(e.seam, sr), before, Math.floor(t.length / 2));
}

/** The loop as it should play: the window cut from the take, its seam smoothed, maybe reversed, faded and scaled. Always `t.length` frames. */
export function renderLoop(t: Take, edit: LoopEdit, sr: number): { l: Float32Array; r: Float32Array } {
  const e = clampEdit(t, edit);
  const n = t.length;
  const from = t.start + e.shift;
  const out = [new Float32Array(n), new Float32Array(n)];
  const src = [t.l, t.r];
  const x = seamFrames(t, e, sr);
  for (let c = 0; c < 2; c++) {
    const s = src[c];
    const o = out[c];
    for (let i = 0; i < n; i++) {
      const k = from + i;
      o[i] = k >= 0 && k < s.length ? s[k] : 0;
    }
    // the last x frames fade over to the x frames before the window, so the loop ends on the sound that leads into its start
    for (let i = 0; i < x; i++) {
      const p = (i + 0.5) / x;
      const a = Math.cos((p * Math.PI) / 2);
      const b = Math.sin((p * Math.PI) / 2);
      o[n - x + i] = o[n - x + i] * a + s[from - x + i] * b;
    }
    if (e.reverse) o.reverse();
    const fi = Math.min(msFrames(e.fadeIn, sr), n);
    for (let i = 0; i < fi; i++) o[i] *= i / fi;
    const fo = Math.min(msFrames(e.fadeOut, sr), n);
    for (let i = 0; i < fo; i++) o[n - 1 - i] *= i / fo;
    if (e.gain !== 1) for (let i = 0; i < n; i++) o[i] *= e.gain;
  }
  return { l: out[0], r: out[1] };
}

/** The gain that brings the loudest sample of the edited loop (before its gain) to `target`. */
export function normaliseGain(t: Take, edit: LoopEdit, sr: number, target = 0.95): number {
  const { l, r } = renderLoop(t, { ...edit, gain: 1 }, sr);
  let pk = 0;
  for (let i = 0; i < l.length; i++) pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i]));
  return pk > 1e-6 ? Math.min(MAX_GAIN, target / pk) : 1;
}

/** Min and max of each of `buckets` slices of [from, to), for drawing a waveform. */
export function minMax(data: Float32Array, from: number, to: number, buckets: number): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const span = Math.max(0, to - from) / buckets;
  for (let b = 0; b < buckets; b++) {
    const a = Math.max(0, Math.floor(from + b * span));
    const z = Math.min(data.length, Math.max(a + 1, Math.floor(from + (b + 1) * span)));
    let lo = 0;
    let hi = 0;
    for (let i = a; i < z; i++) {
      const v = data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[b] = lo;
    max[b] = hi;
  }
  return { min, max };
}
