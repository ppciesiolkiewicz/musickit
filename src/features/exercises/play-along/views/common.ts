import type { Cue } from "../../cues/cues";

export interface ViewProps {
  /** cues to draw (backing left out, hidden ones already removed) */
  cues: Cue[];
  /** beat within the loop, -1 when stopped */
  pos: number;
  /** loop length in beats */
  length: number;
}

export const isNow = (c: Cue, pos: number) => pos >= 0 && pos >= c.at && pos < c.at + c.beats;
export const shade = (c: Cue, now: boolean) => (now ? "var(--color-sky-300)" : c.highlighted ? "var(--color-slate-100)" : "var(--color-slate-600)");
