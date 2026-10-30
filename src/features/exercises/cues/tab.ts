import type { Cue, Fret } from "./cues";

/** One tab column: the frets sounding at `at`. */
export type TabColumn = { at: number; cells: Fret[]; highlighted: boolean };

/** Tab columns for the played cues (strums and notes), in order; backing cues are left out. */
export const tabOf = (cues: Cue[]): TabColumn[] =>
  cues.filter((c) => c.kind !== "backing").map((c) => ({ at: c.at, cells: c.frets, highlighted: c.highlighted }));
