/** Samples per analysis step: about 5.8 ms at 44.1 kHz, the timing resolution of a strum. */
export const HOP = 256;
export const DEFAULT_RISE_DB = 9;

export interface OnsetOptions {
  /** how far (dB) a step's energy must jump above the last ~50 ms to count as a strum; lower hears softer strums, and more noise */
  riseDb?: number;
  /** quieter steps than this (dBFS, of the high-passed signal) are never a strum */
  floorDb?: number;
  /** after a strum, ignore this long (s): the strings of one strum land a few ms apart and ring on */
  refractory?: number;
}

/** The level a step is compared with: the loudest step of this window before it, skipping the one just before (an attack can straddle two). */
const LOOK_BACK = 10, SKIP = 1;

/**
 * A strum detector: finds the moment a guitar is struck in a stream of microphone samples. A strum is a sudden jump in the energy of
 * the signal's high end (pick and string noise), so each 256-sample step's energy (first difference, a gentle high-pass) is compared,
 * in dB, with the loudest step of the ~50 ms before it: a ringing chord only fades, so its tail never jumps above its own past, while a
 * new strum over it does. `push` takes the next block of samples and the audio-clock time of its first sample and returns the times of
 * any strums that start in it. Blocks may be any length; steps run across them.
 */
export function createOnsetDetector(sampleRate: number, { riseDb = DEFAULT_RISE_DB, floorDb = -55, refractory = 0.09 }: OnsetOptions = {}) {
  const past: number[] = []; // dB of the latest steps, newest last
  let prev = 0, acc = 0, filled = 0, stepStart = 0, last = -Infinity;

  return {
    push(samples: Float32Array, time: number): number[] {
      const out: number[] = [];
      for (let i = 0; i < samples.length; i++) {
        if (filled === 0) stepStart = time + i / sampleRate;
        const d = samples[i] - prev;
        prev = samples[i];
        acc += d * d;
        if (++filled < HOP) continue;
        const db = 10 * Math.log10(acc / HOP + 1e-12);
        // until the window has filled, sound already playing is no strum
        if (past.length === LOOK_BACK + SKIP) {
          let ref = -Infinity;
          for (let k = 0; k < LOOK_BACK; k++) ref = Math.max(ref, past[k]);
          if (db > floorDb && db - ref > riseDb && stepStart - last > refractory) {
            out.push(stepStart);
            last = stepStart;
          }
          past.shift();
        }
        past.push(db);
        acc = 0;
        filled = 0;
      }
      return out;
    },
    reset() { prev = acc = filled = 0; past.length = 0; last = -Infinity; },
  };
}

export type OnsetDetector = ReturnType<typeof createOnsetDetector>;
