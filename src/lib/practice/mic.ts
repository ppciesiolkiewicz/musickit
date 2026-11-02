/** Mic helpers kept free of React so they can be tested. */

/** Ask for a stream; if the caller stopped listening while the permission prompt was open, release it straight away. */
export async function acquireStream(get: () => Promise<MediaStream>, stopped: () => boolean): Promise<MediaStream | null> {
  const stream = await get();
  if (stopped()) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  return stream;
}

/**
 * Scores a played note once. After a hit the gate stays shut until the heard pitch goes silent or changes,
 * so a note still ringing cannot answer the next question too.
 */
export interface GateState { armed: boolean; last: number | null }
export const micGate = {
  initial: { armed: true, last: null } as GateState,
  step(state: GateState, heard: number | null, target: number): { state: GateState; score: boolean } {
    const armed = state.armed || heard !== state.last;
    if (armed && heard !== null && heard === target) return { state: { armed: false, last: heard }, score: true };
    return { state: { armed, last: heard }, score: false };
  },
};

/** How loud a frame of samples is (root mean square). */
export function rms(data: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return data.length ? Math.sqrt(sum / data.length) : 0;
}

/** below this a channel counts as silent (about -50 dBFS) */
const SILENT = 0.003;

/**
 * Which of a device's inputs to listen to when it has more than one (an audio interface: a guitar on Input 1, a voice on Input 2):
 * the louder one. It moves only when another is clearly louder (twice, about 6 dB) for `frames` readings running, so one strum
 * or breath on the other input does not pull it over, and silence keeps the last choice.
 */
export function createChannelPicker(frames = 6) {
  let current = 0;
  let run = 0;
  return {
    pick(levels: readonly number[]): number {
      let best = current;
      levels.forEach((l, i) => l > levels[best] && (best = i));
      const louder = best !== current && levels[best] > SILENT && levels[best] > 2 * (levels[current] ?? 0);
      run = louder ? run + 1 : 0;
      if (run >= frames) {
        current = best;
        run = 0;
      }
      return current;
    },
  };
}
