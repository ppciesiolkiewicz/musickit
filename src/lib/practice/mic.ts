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
