/**
 * CREPE pitch detection (Kim et al. 2018, the model ml5 used): a small neural network that hears 1024 samples at 16 kHz and scores
 * 360 pitch bins, 20 cents apart from C1. Steadier than YIN on real strings (no octave slips on a decaying note). The model files
 * live in `public/models/crepe`; the last few cents come from the waveform itself (`refinePitch`); tfjs is loaded only when a tuner first asks, so pages without a tuner never download it.
 */

import { refinePitch, type Pitch } from "./pitch";

const MODEL_URL = "/models/crepe/model.json";
const RATE = 16000;
const SIZE = 1024;
const BINS = 360;
/** The pitch of bin 0, in cents above 10 Hz (C1, 32.7 Hz); each bin is 20 cents higher. */
const CENTS_0 = 1997.3794084376191;
/** Below this the model is guessing: no pitch. */
export const MIN_CONFIDENCE = 0.5;

/**
 * The last `SIZE` samples at 16 kHz from a buffer at `sampleRate`: averaged over each output sample's span (a cheap low-pass, so
 * nothing above 8 kHz folds down), read with linear interpolation. Null when the buffer is too short. Pure.
 */
export function to16k(buf: Float32Array, sampleRate: number): Float32Array | null {
  const step = sampleRate / RATE;
  const need = Math.ceil(SIZE * step) + 1;
  if (buf.length < need) return null;
  const start = buf.length - need;
  const out = new Float32Array(SIZE);
  const span = Math.max(1, Math.round(step));
  for (let i = 0; i < SIZE; i++) {
    const at = start + i * step;
    const k = Math.floor(at), f = at - k;
    let s = 0;
    for (let j = 0; j < span; j++) {
      const a = buf[Math.min(buf.length - 1, k + j)], b = buf[Math.min(buf.length - 1, k + j + 1)];
      s += a + (b - a) * f;
    }
    out[i] = s / span;
  }
  return out;
}

/** Zero mean, unit spread: what the model was trained on. Leaves a flat frame alone. Pure, in place. */
export function normalise(x: Float32Array): Float32Array {
  let mean = 0;
  for (const v of x) mean += v;
  mean /= x.length;
  let sq = 0;
  for (const v of x) sq += (v - mean) ** 2;
  const sd = Math.sqrt(sq / x.length) || 1;
  for (let i = 0; i < x.length; i++) x[i] = (x[i] - mean) / sd;
  return x;
}

/** The pitch the 360 scores point at: a weighted mean of the bins around the best one (finer than 20 cents). Pure. */
export function decode(scores: ArrayLike<number>): Pitch {
  let best = 0;
  for (let i = 1; i < BINS; i++) if (scores[i] > scores[best]) best = i;
  let sum = 0, weight = 0;
  for (let i = Math.max(0, best - 4); i <= Math.min(BINS - 1, best + 4); i++) {
    sum += scores[i] * (CENTS_0 + 20 * i);
    weight += scores[i];
  }
  return { freq: 10 * 2 ** (sum / weight / 1200), clarity: scores[best] };
}

export interface Crepe { detect(buf: Float32Array, sampleRate: number): Promise<Pitch | null> }

let loading: Promise<Crepe> | null = null;

/** The model, loaded once and shared by every tuner. Rejects when it cannot be fetched (offline); the next call tries again. */
export function loadCrepe(): Promise<Crepe> {
  loading ??= (async (): Promise<Crepe> => {
    const tf = await import("@tensorflow/tfjs");
    const model = await tf.loadLayersModel(MODEL_URL);
    return {
      async detect(buf, sampleRate) {
        const x = to16k(buf, sampleRate);
        if (!x) return null;
        // the caller refills buf while the model runs
        const frame = buf.slice();
        const out = tf.tidy(() => model.predict(tf.tensor2d(normalise(x), [1, SIZE])) as import("@tensorflow/tfjs").Tensor);
        const scores = await out.data();
        out.dispose();
        const p = decode(scores);
        // the model finds the note; its bins are 20 cents wide and land a few cents off, so the exact period is measured near it
        return p.clarity >= MIN_CONFIDENCE ? { freq: refinePitch(frame, sampleRate, p.freq), clarity: p.clarity } : null;
      },
    };
  })().catch((e) => { loading = null; throw e; });
  return loading;
}
