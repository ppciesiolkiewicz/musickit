import { detectPitch, type Pitch } from "./pitch";
import { loadCrepe, type Crepe } from "./crepe";

/** Quieter than this (about -50 dBFS) is silence: a plucked string keeps reading well into its decay, the noise floor does not. */
const MIN_RMS = 0.003;

/**
 * A tuner's pitch detector: CREPE once its model has loaded, YIN until then (and for good when the model cannot load, offline).
 * Reads `buf` before its first await, so the caller may refill it straight away. A call made while the previous one is still
 * running is skipped (`undefined`: no new reading, keep what is shown); `null` is silence or no clear pitch.
 */
export function createDetector(): (buf: Float32Array, sampleRate: number, minHz: number) => Promise<Pitch | null | undefined> {
  let crepe: Crepe | null = null;
  loadCrepe().then((c) => { crepe = c; }, () => {});
  let busy = false;
  return async (buf, sampleRate, minHz) => {
    if (busy) return undefined;
    let sum = 0;
    for (const v of buf) sum += v * v;
    if (Math.sqrt(sum / buf.length) < MIN_RMS) return null;
    if (!crepe) {
      const p = detectPitch(buf, sampleRate, { minHz, minRms: MIN_RMS });
      return p && p.clarity > 0.85 ? p : null;
    }
    busy = true;
    try {
      const p = await crepe.detect(buf, sampleRate);
      // the instrument's lowest string bounds the reading, as it bounds YIN's search
      return p && p.freq >= minHz * 0.9 ? p : null;
    } finally {
      busy = false;
    }
  };
}
