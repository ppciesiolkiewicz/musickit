/** Pitch detection (YIN) and note maths for the tuner. Pure functions, no browser APIs. */

import { INSTRUMENTS, type TunerString } from "@/features/theory/tunings";

/** How often a tuner measures: 30 times a second, often enough to follow a string without the text flickering. */
export const FRAME_MS = 1000 / 30;

export interface Pitch { freq: number; clarity: number }

/** Fundamental frequency of a mono buffer, or null when it is too quiet or not clearly pitched. */
export function detectPitch(buf: Float32Array, sampleRate: number, opts: { minHz?: number; maxHz?: number; threshold?: number; minRms?: number } = {}): Pitch | null {
  // minRms 0.003 (about -50 dBFS): a plucked string keeps reading well into its decay; lower lets the noise floor read as low notes
  const { minHz = 60, maxHz = 1000, threshold = 0.12, minRms = 0.003 } = opts;
  const W = Math.floor(buf.length / 2);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  if (Math.sqrt(sum / buf.length) < minRms) return null;

  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxTau = Math.min(W - 1, Math.ceil(sampleRate / minHz));
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // cumulative mean normalised difference
  const n = new Float32Array(maxTau + 1);
  n[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    run += d[tau];
    n[tau] = run === 0 ? 1 : (d[tau] * tau) / run;
  }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (n[t] < threshold) {
      while (t + 1 <= maxTau && n[t + 1] < n[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // parabolic interpolation around the minimum
  let better = tau;
  if (tau > 1 && tau < maxTau) {
    const a = n[tau - 1], b = n[tau], c = n[tau + 1];
    const den = 2 * (2 * b - a - c);
    if (den !== 0) better = tau + (c - a) / den;
  }
  return { freq: sampleRate / better, clarity: 1 - n[tau] };
}

/**
 * `hz` made exact: the period near it (within a semitone either way) that best repeats the buffer, to a fraction of a sample. For a
 * coarse estimate that has the right note but not the last few cents (CREPE); the narrow window cannot slip an octave. Pure.
 */
export function refinePitch(buf: Float32Array, sampleRate: number, hz: number): number {
  const W = Math.floor(buf.length / 2);
  const lo = Math.max(2, Math.floor(sampleRate / (hz * 1.06))), hi = Math.min(W - 2, Math.ceil(sampleRate / (hz / 1.06)));
  if (hi <= lo + 1) return hz;
  const d = (tau: number) => {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    return s;
  };
  const ds = new Float64Array(hi + 2);
  let tau = lo;
  for (let t = lo - 1; t <= hi + 1; t++) {
    ds[t] = d(t);
    if (t >= lo && t <= hi && ds[t] < ds[tau]) tau = t;
  }
  const a = ds[tau - 1], b = ds[tau], c = ds[tau + 1];
  const den = a - 2 * b + c;
  return sampleRate / (den > 0 ? tau + (a - c) / (2 * den) : tau);
}

const NAMES =["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteReading { midi: number; name: string; octave: number; cents: number; target: number }

/** The nearest note to a frequency and how many cents sharp (+) or flat (−) it is. */
export function hzToNote(hz: number, a4 = 440): NoteReading {
  const exact = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(exact);
  return { midi, name: NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: (exact - midi) * 100, target: a4 * 2 ** ((midi - 69) / 12) };
}

export const GUITAR_STRINGS: TunerString[] = INSTRUMENTS.find((i) => i.id === "guitar")!.tunings[0].strings;

/** The open string closest to a frequency, and the cents away from it. */
export function nearestString(hz: number, a4 = 440, strings: TunerString[] = GUITAR_STRINGS): { index: number; cents: number } {
  let best = 0, bestAbs = Infinity, cents = 0;
  strings.forEach((s, i) => {
    const c = 1200 * Math.log2(hz / (a4 * 2 ** ((s.midi - 69) / 12)));
    if (Math.abs(c) < bestAbs) { bestAbs = Math.abs(c); best = i; cents = c; }
  });
  return { index: best, cents };
}

/** How many readings the smoother averages: about 200 ms at 30 a second, steady text without a lagging needle. */
const SMOOTH_N = 6;
/** Further than this from the average is a new note, not a wobble. */
const JUMP_CENTS = 50;

/**
 * Smooths a stream of pitch readings with a weighted moving average of the last few, taken in cents (log frequency) so sharp and
 * flat count alike. Newer readings weigh more (1, 2, … SMOOTH_N), and clearer ones more again. A reading far from the average
 * starts a new note, but only once the next reading agrees with it: a lone glitch (an octave slip) is dropped and the average
 * kept. `reset()` on silence. Pure state, no browser APIs.
 */
export function createSmoother(): { push: (p: Pitch) => number; reset: () => void } {
  let hist: { c: number; w: number }[] = [];
  let pending: { c: number; w: number } | null = null;
  const avg = () => {
    let s = 0, ws = 0;
    hist.forEach((h, i) => { const w = (i + 1) * h.w; s += h.c * w; ws += w; });
    return s / ws;
  };
  return {
    push(p) {
      const r = { c: 1200 * Math.log2(p.freq), w: Math.max(0.05, p.clarity) };
      if (hist.length && Math.abs(r.c - avg()) > JUMP_CENTS) {
        if (pending && Math.abs(r.c - pending.c) <= JUMP_CENTS) { hist = [pending]; pending = null; }
        else { pending = r; return 2 ** (avg() / 1200); }
      } else pending = null;
      hist.push(r);
      if (hist.length > SMOOTH_N) hist.shift();
      return 2 ** (avg() / 1200);
    },
    reset() { hist = []; pending = null; },
  };
}
