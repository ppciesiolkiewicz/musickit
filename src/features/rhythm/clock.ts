/**
 * The game's clock is "heard time": the audio-clock time of the sound coming out of the speakers right now. A click scheduled at
 * audio time T is heard when heard time reaches T, so taps and strums are compared with the targets on this clock, not on
 * `currentTime` (which runs ahead of the speakers by the output latency, tens of ms on Bluetooth).
 */
export function heardAt(ctx: AudioContext, perfMs: number): number {
  const ts = ctx.getOutputTimestamp?.();
  if (ts?.contextTime !== undefined && ts.performanceTime) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  return ctx.currentTime - (ctx.outputLatency || 0) - ctx.baseLatency - (performance.now() - perfMs) / 1000;
}

export const heardNow = (ctx: AudioContext) => heardAt(ctx, performance.now());
