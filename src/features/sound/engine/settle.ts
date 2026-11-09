/** The part of an AudioContext the settling looks at. */
export type SettleClock = { readonly state: string; readonly currentTime: number; readonly baseLatency?: number };

/** How long an output that just started gets before anything sounds: its first moments can drop or crackle while the device opens. */
export const SETTLE_SECONDS = 0.2;
/** The clock moves in whole audio buffers and what it shows is already rendered, so "now" is too late for a note's attack. */
const MIN_LOOKAHEAD = 0.005;
const MAX_LOOKAHEAD = 0.05;

/** Keeps track of when an output that (re)started is ready to be heard, on its own clock. */
export function createSettle(ctx: SettleClock, seconds = SETTLE_SECONDS) {
  let running = false;
  let settledAt = seconds;
  // read on every question and not only on statechange: resume() resolves before that event fires
  const look = () => {
    const now = ctx.state === "running";
    if (now && !running) settledAt = ctx.currentTime + seconds;
    running = now;
  };
  /** Seconds of the audio clock until the output is settled. Not running, it has its whole wait still to come. */
  const lead = () => {
    look();
    return running ? Math.max(0, settledAt - ctx.currentTime) : seconds;
  };
  return {
    look,
    lead,
    /** The output was reopened without the context stopping (a new device). */
    restart() {
      look();
      settledAt = ctx.currentTime + seconds;
    },
    /** Nothing starts for at least this long from now. */
    hold(extra: number) {
      look();
      settledAt = Math.max(settledAt, ctx.currentTime + extra);
    },
    /** Seconds from the clock's "now" to the first moment a sound can start whole. */
    startIn: () => Math.max(lead(), Math.min(MAX_LOOKAHEAD, Math.max(MIN_LOOKAHEAD, ctx.baseLatency || 0))),
  };
}
