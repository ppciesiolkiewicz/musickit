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
  lastPressAt: number;
  nextId: number;
}

export const emptyTrail: TrailState = { steps: [], held: [], lastPressAt: -Infinity, nextId: 1 };

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
    const step: Step = { id: now.id, sounding, interval: before ? intervalName(lowest(before.sounding), lowest(sounding)) : null };
    return { ...s, steps: [...s.steps.slice(0, -1), step], held, lastPressAt: at };
  }
  const prev = s.steps[s.steps.length - 1];
  let interval: string | null = null;
  if (prev) {
    interval = s.held.length > 0
      ? intervalName(nearest(prev.sounding, midi), sounding.notes.find((n) => n.midi === midi)!)
      : intervalName(lowest(prev.sounding), lowest(sounding));
  }
  const steps = [...s.steps, { id: s.nextId, sounding, interval }].slice(-TRAIL_LENGTH);
  return { steps, held, lastPressAt: at, nextId: s.nextId + 1 };
}

export function release(s: TrailState, midi: number): TrailState {
  if (!s.held.includes(midi)) return s;
  return { ...s, held: s.held.filter((m) => m !== midi) };
}
