/**
 * The notes a voice (or an instrument) holds, read from a stream of pitch readings: what the pitch roll draws as bars.
 * A note starts once the pitch has stayed within `catchCents` of one key for `minMs`, and ends when the pitch moves to
 * another key or has been off it for longer than `graceMs` (a wobble or a dropped reading doesn't split it). Each note
 * keeps how far off its key the readings were on average, so the caller can colour it by the accuracy picked.
 * Pure: no clock, no DOM (tested).
 */

export interface HeldNote {
  midi: number;
  /** ms, when the pitch first sat on the note */
  start: number;
  /** ms, the last reading on the note */
  end: number;
  /** still being held: the last reading counted is the newest */
  live: boolean;
  /** the readings' mean distance from the key, in cents (0 to `catchCents`) */
  meanCents: number;
}

export interface HeldNotesOptions {
  /** how close counts as on a key for a note to show: Easy's band, whatever accuracy is picked */
  catchCents?: number;
  /** how long the pitch has to stay on one key before its note shows */
  minMs?: number;
  /** how long the pitch may leave the key before its note ends */
  graceMs?: number;
}

/** Easy's band: a note shows by it, and goes green by the accuracy picked. */
export const CATCH_CENTS = 40;
export const MIN_HOLD_MS = 100;
export const GRACE_MS = 80;

interface Run { midi: number; start: number; lastOn: number; sum: number; n: number; done: boolean }

export function createHeldNotes({ catchCents = CATCH_CENTS, minMs = MIN_HOLD_MS, graceMs = GRACE_MS }: HeldNotesOptions = {}) {
  const runs: Run[] = [];
  let open: Run | null = null;
  const shown = (r: Run) => r.lastOn - r.start >= minMs;
  const close = () => {
    if (open) open.done = true;
    // a run too short to show is dropped
    if (open && !shown(open)) runs.pop();
    open = null;
  };

  return {
    /** one reading: `midi` fractional, null when nothing pitched is heard */
    push(t: number, midi: number | null) {
      const key = midi === null ? null : Math.round(midi);
      const cents = midi === null || key === null ? Infinity : Math.abs(midi - key) * 100;
      if (key !== null && cents <= catchCents) {
        if (open && open.midi === key) {
          open.lastOn = t;
          open.sum += cents;
          open.n += 1;
          return;
        }
        close();
        open = { midi: key, start: t, lastOn: t, sum: cents, n: 1, done: false };
        runs.push(open);
        return;
      }
      if (open && t - open.lastOn > graceMs) close();
    },
    /** the notes that have shown, oldest first */
    notes(): HeldNote[] {
      return runs.filter(shown).map((r) => ({ midi: r.midi, start: r.start, end: r.lastOn, live: !r.done, meanCents: r.sum / r.n }));
    },
    /** forget notes that ended before `t` */
    prune(t: number) {
      while (runs.length && runs[0].done && runs[0].lastOn < t) runs.shift();
    },
    reset() {
      runs.length = 0;
      open = null;
    },
  };
}
