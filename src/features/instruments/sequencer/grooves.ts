import { MAX_STEPS, emptyCells, fromRows, type Cells } from "./pattern";
import { BASS_SEMIS } from "./sequencer";

/**
 * Grooves: one bar of 4/4 as data, the single source for the backing track's styles and the band's step grids. Pure, no audio.
 * Drums are lanes of 16 steps; the bass says WHEN it plays and WHAT ROLE the note has (the arranger or the grid turns that into notes).
 */

export const DRUM_LANE_IDS = ["kick", "snare", "clap", "hat", "open", "tom"] as const;
export type DrumLane = (typeof DRUM_LANE_IDS)[number];

/**
 * A bass note's role over the chord that sounds when it plays:
 * R root · 3 the chord's third · 5 its fifth · 7 its seventh (the octave on a triad) · b7 a minor 7th above the root ·
 * 6 a major 6th above the root · 8 the octave · A the note a half step below the NEXT chord's root (a walking approach).
 * A note that falls on the first beat of a chord always plays its root.
 */
export type BassRole = "R" | "3" | "5" | "7" | "b7" | "6" | "8" | "A";

export interface BassHit {
  /** step in the bar */
  at: number;
  /** length in steps */
  len: number;
  note: BassRole;
  /** 0-1, 0.8 by default */
  vel?: number;
}

export type GrooveId = "pop" | "rock" | "ballad" | "swing" | "shuffle" | "bossa" | "funk" | "reggae";

export interface Groove {
  id: GrooveId;
  name: string;
  bpm: number;
  /** 0 straight eighths, 1 full triplet swing */
  swing: number;
  /** one string per lane, 16 steps: "X" accent, "x" normal, "o" ghost (soft), anything else a rest */
  drums: Partial<Record<DrumLane, string>>;
  bass: BassHit[];
}

const hits = (spec: [number, number, BassRole, number?][]): BassHit[] => spec.map(([at, len, note, vel]) => ({ at, len, note, ...(vel !== undefined && { vel }) }));

export const GROOVES: Groove[] = [
  {
    id: "pop",
    name: "Pop",
    bpm: 100,
    swing: 0,
    drums: { kick: "x.......x.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 6, "R"], [6, 2, "R", 0.6], [8, 6, "R"], [14, 2, "5", 0.6]]),
  },
  {
    id: "rock",
    name: "Rock",
    bpm: 112,
    swing: 0,
    drums: { kick: "x.....x.x.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 2, "R", 0.9], [2, 2, "R", 0.6], [4, 2, "R", 0.8], [6, 2, "R", 0.6], [8, 2, "R", 0.9], [10, 2, "R", 0.6], [12, 2, "R", 0.8], [14, 2, "R", 0.6]]),
  },
  {
    id: "ballad",
    name: "Ballad",
    bpm: 72,
    swing: 0,
    drums: { kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 8, "R"], [8, 8, "5", 0.7]]),
  },
  {
    id: "swing",
    name: "Swing",
    bpm: 140,
    swing: 1,
    // the ride's "spang-a-lang" on the hat, a feathered kick, the hat's foot on 2 and 4 on the clap lane, softly
    drums: { hat: "X...x.x.X...x.x.", kick: "o...o...o...o...", clap: "....o.......o..." },
    bass: hits([[0, 4, "R"], [4, 4, "3", 0.7], [8, 4, "5", 0.75], [12, 4, "A", 0.7]]),
  },
  {
    id: "shuffle",
    name: "Blues shuffle",
    bpm: 96,
    swing: 1,
    drums: { kick: "x.......x.......", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    // the boogie line: R 3 5 6 ♭7 6 5 3
    bass: hits([[0, 2, "R"], [2, 2, "3", 0.6], [4, 2, "5", 0.75], [6, 2, "6", 0.6], [8, 2, "b7", 0.75], [10, 2, "6", 0.6], [12, 2, "5", 0.75], [14, 2, "3", 0.6]]),
  },
  {
    id: "bossa",
    name: "Bossa nova",
    bpm: 120,
    swing: 0,
    drums: { kick: "x..x....x..x....", clap: "x..x..x...x..x..", hat: "oooooooooooooooo" },
    bass: hits([[0, 6, "R"], [6, 2, "5", 0.6], [8, 6, "5", 0.75], [14, 2, "R", 0.6]]),
  },
  {
    id: "funk",
    name: "Funk",
    bpm: 98,
    swing: 0,
    drums: { kick: "x.x....x..x.....", snare: "....X..o.o..X..o", hat: "xoxoxoxoxoxoxoxo" },
    bass: hits([[0, 2, "R"], [3, 1, "R", 0.6], [6, 1, "8", 0.7], [7, 1, "R", 0.6], [10, 2, "b7", 0.7], [12, 1, "R", 0.75], [14, 1, "5", 0.6], [15, 1, "8", 0.65]]),
  },
  {
    id: "reggae",
    name: "Reggae",
    bpm: 76,
    swing: 0,
    // the one drop: kick and snare together on 3, nothing on 1
    drums: { kick: "........X.......", clap: "........x.......", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 4, "R"], [6, 2, "R", 0.6], [8, 2, "5", 0.75], [10, 4, "8", 0.65]]),
  },
];

export const findGroove = (id: string): Groove | null => GROOVES.find((g) => g.id === id) ?? null;

/** The drums as a grid, lanes in the drum machine's order. The grid has no ghost level, so "o" is a normal hit. */
export const grooveDrumCells = (g: Groove): Cells => fromRows(DRUM_LANE_IDS.map((lane) => (g.drums[lane] ?? "").replace(/o/g, "x").padEnd(16, ".")));

/** Semitones over the root for each bass role on the minor pentatonic ladder (the 7th and the approach note take the ♭7). */
const ROLE_SEMIS: Record<BassRole, number> = { R: 0, "3": 3, "5": 7, "6": 7, "7": 10, b7: 10, A: 10, "8": 12 };

/** The bass as a grid over the bass synth's lanes (the lowest note is the last lane). Loud hits are accents. */
export function grooveBassCells(g: Groove): Cells {
  const cells = emptyCells(BASS_SEMIS.length);
  for (const h of g.bass) {
    const lane = BASS_SEMIS.length - 1 - BASS_SEMIS.indexOf(ROLE_SEMIS[h.note]);
    const v = (h.vel ?? 0.8) >= 0.8 ? 2 : 1;
    for (let s = h.at; s < MAX_STEPS; s += 16) cells[lane][s] = v;
  }
  return cells;
}
