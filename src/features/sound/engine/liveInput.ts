/**
 * What the app hears now: how many listeners have the input open, and while one does, the level of each of the device's inputs
 * (one for a mic, two for an audio interface) and which of them is heard. Listeners (`useMicPitch`, the rhythm game, the range
 * finder) publish; the input chip and anything else that shows the input read it, so the level redraws only the chip, never the page.
 */

export interface LiveInput {
  /** listeners with the input open now */
  listening: number;
  /** each input's level (root mean square, 0..1), empty when none publishes */
  levels: readonly number[];
  /** the input heard, an index into `levels` */
  active: number;
}

const IDLE: LiveInput = { listening: 0, levels: [], active: 0 };
/** levels are published at most this often, so a meter does not redraw every audio frame */
const EVERY_MS = 66;

let live: LiveInput = IDLE;
const listeners = new Set<() => void>();
const set = (next: LiveInput) => {
  live = next;
  listeners.forEach((l) => l());
};

export const readLiveInput = (): LiveInput => live;
export const serverLiveInput = (): LiveInput => IDLE;

export function subscribeLiveInput(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface LiveInputHandle {
  /** this listener's levels and the input it hears; throttled */
  levels(levels: readonly number[], active?: number): void;
  close(): void;
}

/** A listener opened the input: counted until `close`. */
export function openLiveInput(): LiveInputHandle {
  let last = 0;
  let closed = false;
  set({ ...live, listening: live.listening + 1 });
  return {
    levels(levels, active = 0) {
      const now = performance.now();
      if (closed || now - last < EVERY_MS) return;
      last = now;
      set({ ...live, levels: [...levels], active });
    },
    close() {
      if (closed) return;
      closed = true;
      const listening = Math.max(0, live.listening - 1);
      set(listening ? { ...live, listening } : IDLE);
    },
  };
}

/** A level (root mean square) as 0..1 on a meter: -60 dBFS and below is empty, 0 dBFS full. */
export function meterLevel(rms: number): number {
  if (rms <= 0) return 0;
  return Math.min(1, Math.max(0, (20 * Math.log10(rms) + 60) / 60));
}
