import { shapesForChord, type ChordShapeChoice } from "./chordShapes";
import type { KeyContext } from "@/features/theory/theory";

/** One four-chord loop per scale degree, as degrees of the mode. Each holds its own degree, and no two are the same. */
const LOOPS: { degs: [number, number, number, number]; note: string }[] = [
  { degs: [0, 5, 3, 4], note: "Home, down a third to the 6th chord, then the 4th and 5th chords lead back. The most common loop shape there is." },
  { degs: [0, 5, 1, 4], note: "Home and the 6th chord, then the 2nd and 5th chords: roots falling by fifths into the top again." },
  { degs: [0, 2, 5, 3], note: "Home, up a third to the 3rd chord, then the 6th and the 4th. Home and the 3rd chord share two notes, so the first move is soft." },
  { degs: [0, 3, 1, 4], note: "Home to the 4th chord, then the 2nd and 5th chords as a turnaround back to the top." },
  { degs: [0, 4, 5, 3], note: "Home, the 5th chord, the 6th, then the 4th. The same four chords as the pop loop, in another order." },
  { degs: [5, 3, 0, 4], note: "Starts away from home on the 6th chord, then the 4th, so home only arrives on the third chord before the 5th sends it round again." },
  { degs: [0, 3, 6, 2], note: "Roots fall by fifths: 1, 4, 7, 3. The chord on the 7th degree sits mid-chain, so it never has to resolve on its own." },
];

export interface DegreeProgressionChord {
  degree: number;
  roman: string;
  name: string;
  /** best guitar shape for this chord (the full 7th first), or null when the library has none */
  pick: ChordShapeChoice | null;
}

export interface DegreeProgression {
  note: string;
  chords: DegreeProgressionChord[];
}

/** The four-chord loop built for the chord on `degree` of the mode, with a shape for each chord. */
export function progressionForDegree(ctx: KeyContext, degree: number): DegreeProgression {
  const loop = LOOPS[((degree % 7) + 7) % 7];
  return {
    note: loop.note,
    chords: loop.degs.map((d) => ({ degree: d, roman: ctx.chords[d].roman, name: ctx.chords[d].seventhName, pick: shapesForChord(ctx, d)[0] ?? null })),
  };
}
