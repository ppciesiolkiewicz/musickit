import { shapesForChord, type ChordShapeChoice } from "./chordShapes";
import { shapeMidi } from "./shapeTools";
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

/** How many of each chord's best shapes the voice leading chooses from. */
const CANDIDATES = 10;

const midiOf = (c: ChordShapeChoice) => shapeMidi(c.shape, c.fret);

/** How far the voices move from one chord to the next: every note to the nearest note of the other chord, both ways, per note (semitones). */
export function chordMotion(a: number[], b: number[]): number {
  const near = (x: number, ys: number[]) => Math.min(...ys.map((y) => Math.abs(x - y)));
  return (a.reduce((s, x) => s + near(x, b), 0) + b.reduce((s, y) => s + near(y, a), 0)) / (a.length + b.length);
}

/** The motion round a whole loop, the last chord back to the first included. */
export function loopMotion(picks: ChordShapeChoice[]): number {
  return picks.reduce((s, p, i) => s + chordMotion(midiOf(p), midiOf(picks[(i + 1) % picks.length])), 0);
}

/** A small preference on top of the motion: the whole chord first, a colour shape (adds a mode note) next, a bare triad or shell last; open strings ring, hard shapes cost. */
function preference(c: ChordShapeChoice, rank: number): number {
  const kind = c.full ? 0 : c.exact ? 0.6 : 0.4;
  return kind + (c.shape.at !== undefined ? -0.5 : 0) + (c.shape.diff === "hard" ? 1 : 0) + rank * 0.05;
}

/**
 * Shapes for a loop chosen together, so the chords move smoothly into each other (and back round to the start).
 * Each chord picks from its best few shapes; the loop never moves more than simply taking every chord's first shape.
 */
function voiceLead(lists: ChordShapeChoice[][]): (ChordShapeChoice | null)[] {
  const pools = lists.map((l) => l.slice(0, CANDIDATES));
  if (pools.some((p) => !p.length)) return lists.map((l) => l[0] ?? null);
  const limit = loopMotion(pools.map((p) => p[0])) + 1e-9;
  let best: { picks: ChordShapeChoice[]; cost: number } | null = null;
  const walk = (i: number, picks: ChordShapeChoice[], pref: number) => {
    if (i === pools.length) {
      const motion = loopMotion(picks);
      if (motion > limit) return;
      const cost = motion + pref;
      if (!best || cost < best.cost) best = { picks: [...picks], cost };
      return;
    }
    pools[i].forEach((c, rank) => {
      picks.push(c);
      walk(i + 1, picks, pref + preference(c, rank));
      picks.pop();
    });
  };
  walk(0, [], 0);
  return (best as { picks: ChordShapeChoice[] } | null)?.picks ?? pools.map((p) => p[0]);
}

/** The four-chord loop built for the chord on `degree` of the mode, with shapes chosen to voice-lead into each other. */
export function progressionForDegree(ctx: KeyContext, degree: number): DegreeProgression {
  const loop = LOOPS[((degree % 7) + 7) % 7];
  const picks = voiceLead(loop.degs.map((d) => shapesForChord(ctx, d)));
  return {
    note: loop.note,
    chords: loop.degs.map((d, i) => {
      const pick = picks[i];
      // the name says what the shape plays: a triad shape on a 7th chord is named as the triad
      return { degree: d, roman: ctx.chords[d].roman, name: pick ? ctx.names[d] + pick.shape.suf : ctx.chords[d].seventhName, pick };
    }),
  };
}
