/** Pitch detection (YIN) and note maths for the tuner. Pure functions, no browser APIs. */

export interface Pitch { freq: number; clarity: number }

/** Fundamental frequency of a mono buffer, or null when it is too quiet or not clearly pitched. */
export function detectPitch(buf: Float32Array, sampleRate: number, opts: { minHz?: number; maxHz?: number; threshold?: number; minRms?: number } = {}): Pitch | null {
  const { minHz = 60, maxHz = 1000, threshold = 0.12, minRms = 0.01 } = opts;
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

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteReading { midi: number; name: string; octave: number; cents: number; target: number }

/** The nearest note to a frequency and how many cents sharp (+) or flat (−) it is. */
export function hzToNote(hz: number, a4 = 440): NoteReading {
  const exact = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(exact);
  return { midi, name: NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: (exact - midi) * 100, target: a4 * 2 ** ((midi - 69) / 12) };
}

export const GUITAR_STRINGS = [
  { name: "E", octave: 2, midi: 40 },
  { name: "A", octave: 2, midi: 45 },
  { name: "D", octave: 3, midi: 50 },
  { name: "G", octave: 3, midi: 55 },
  { name: "B", octave: 3, midi: 59 },
  { name: "e", octave: 4, midi: 64 },
];

/** The open string closest to a frequency, and the cents away from it. */
export function nearestString(hz: number, a4 = 440): { index: number; cents: number } {
  let best = 0, bestAbs = Infinity, cents = 0;
  GUITAR_STRINGS.forEach((s, i) => {
    const c = 1200 * Math.log2(hz / (a4 * 2 ** ((s.midi - 69) / 12)));
    if (Math.abs(c) < bestAbs) { bestAbs = Math.abs(c); best = i; cents = c; }
  });
  return { index: best, cents };
}
