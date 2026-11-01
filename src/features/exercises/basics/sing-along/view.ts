import { IN_TUNE_CENTS, type Fit } from "@/features/theory/singing";
import { dueNote, type PlacedNote } from "@/features/theory/singingMelodies";
import { DOT_LAG_MS } from "@/components/theory/singing/MelodyStaff";
import { passAt, type Pass } from "./passes";
import type { Frame } from "./useSingAlong";

/** how the view keeps up with the bar: the notes slide under a bar that stays put, or the bar crosses a page that turns */
export type Motion = "notes" | "bar";

/** where the bar stays across a view whose notes move: a quarter in, so most of what shows is still to come */
export const BAR_AT = 0.25;

export const DOT: Record<Fit, string> = { in: "var(--color-emerald-400)", out: "var(--color-rose-400)", between: "var(--color-amber-300)" };
export const PLAYED = "var(--color-sky-300)";

/** the stream beat at the view's left edge, `span` beats across */
export function camera(s: number, span: number, motion: Motion): number {
  if (motion === "notes") return s - span * BAR_AT;
  const page = Math.max(1, span - 1);
  return Math.floor(s / page) * page - 0.5;
}

/** the passes reaching into [left, right] */
export const inView = (passes: Pass[], left: number, right: number) => passes.filter((p) => p.start + p.to - p.from > left && p.start < right);

export interface Judged {
  /** the pass the bar is in, and the note due under it there (-1 in a rest) */
  pass: Pass | undefined;
  due: number;
  /** where the voice dot is drawn: a little behind the bar, so a note is heard before it is sung against */
  dotS: number;
  fit: Fit;
  hit: boolean;
  cents: number;
}

/** the note due under the bar and how the voice sits against it: green on it, red on another note, amber between */
export function judge(frame: Frame, notes: PlacedNote[], beatMs: number): Judged {
  const pass = passAt(frame.passes, frame.s);
  const due = pass ? dueNote(notes, pass.from + frame.s - pass.start) : -1;
  const dotS = frame.s - DOT_LAG_MS / beatMs;
  const m = frame.midi;
  const note = notes[due];
  const cents = m !== null && note ? (m - note.midi) * 100 : 0;
  const hit = m !== null && !!note && Math.abs(cents) <= IN_TUNE_CENTS;
  const fit: Fit = m === null || !note ? "between" : hit ? "in" : Math.abs(m - Math.round(m)) * 100 <= IN_TUNE_CENTS ? "out" : "between";
  return { pass, due, dotS, fit, hit, cents };
}
