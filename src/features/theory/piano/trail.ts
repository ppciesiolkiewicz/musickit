/**
 * The trail of what was played, oldest first; the last step is "now". Every press is a step that shows all
 * held notes; presses close together are one struck chord. Releasing never adds a step. Spellings are stored
 * per step, so the caller resets to `emptyTrail` when the key changes (tested).
 */
import { describe, intervalName, type Sounding } from "./harmony";
import type { KeyContext, Spelled } from "./key";

/** steps on the staff, "now" included */
export const TRAIL_LENGTH = 4;
/** presses within this many ms of the previous one join its step (a chord struck on MIDI or several keys) */
export const CHORD_WINDOW_MS = 40;

export interface Step {
  id: number;
  sounding: Sounding;
  /** from the previous step; null for the first */
  interval: string | null;
}

export interface TrailState {
  /** oldest first; last = "now" */
  steps: Step[];
  held: number[];
  /** notes already held when the "now" step began, so a chord struck over them measures to the struck notes */
  heldBefore: number[];
  lastPressAt: number;
  nextId: number;
}

export const emptyTrail: TrailState = { steps: [], held: [], heldBefore: [], lastPressAt: -Infinity, nextId: 1 };

/** The interval into a new step: from the previous step's nearest note to the lowest added note when notes were held, else lowest to lowest. */
function intervalInto(prev: Sounding, next: Sounding, added: number[], wasHolding: boolean): string {
  if (!wasHolding) return intervalName(lowest(prev), lowest(next));
  const target = Math.min(...added);
  return intervalName(nearest(prev, target), next.notes.find((n) => n.midi === target)!);
}

const lowest = (s: Sounding): Spelled => s.notes[0];
const nearest = (s: Sounding, midi: number): Spelled =>
  s.notes.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));

export function press(s: TrailState, key: KeyContext, midi: number, at: number): TrailState {
  if (s.held.includes(midi)) return s;
  const held = [...s.held, midi];
  const sounding = describe(key, held);
  const merge = s.steps.length > 0 && at - s.lastPressAt <= CHORD_WINDOW_MS;
  if (merge) {
    const before = s.steps[s.steps.length - 2];
    const now = s.steps[s.steps.length - 1];
    const added = held.filter((m) => !s.heldBefore.includes(m));
    const step: Step = { id: now.id, sounding, interval: before ? intervalInto(before.sounding, sounding, added, s.heldBefore.length > 0) : null };
    return { ...s, steps: [...s.steps.slice(0, -1), step], held, lastPressAt: at };
  }
  const prev = s.steps[s.steps.length - 1];
  const interval = prev ? intervalInto(prev.sounding, sounding, [midi], s.held.length > 0) : null;
  const steps = [...s.steps, { id: s.nextId, sounding, interval }].slice(-TRAIL_LENGTH);
  return { steps, held, heldBefore: s.held, lastPressAt: at, nextId: s.nextId + 1 };
}

export function release(s: TrailState, midi: number): TrailState {
  if (!s.held.includes(midi)) return s;
  return { ...s, held: s.held.filter((m) => m !== midi) };
}
