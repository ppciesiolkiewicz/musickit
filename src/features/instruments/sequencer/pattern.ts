/**
 * Pure maths and presets for the step sequencer. No Web Audio, no DOM; unit tested.
 * A pattern is a grid of lanes by steps; each step is 0 (off), 1 (normal) or 2 (accent). Sixteen steps make a bar of 4/4.
 */

export const STEPS_PER_BEAT = 4;
export const MAX_STEPS = 96; // 2 bars of up to 12 beats
export const MAX_BARS = 2;

export type Cells = number[][];

export const stepsInPattern = (bars: number, beatsPerBar: number) => Math.min(MAX_STEPS, Math.max(1, bars) * Math.max(1, beatsPerBar) * STEPS_PER_BEAT);

/** Seconds between two steps. */
export const stepSeconds = (beatSeconds: number) => beatSeconds / STEPS_PER_BEAT;

/** Beats to push a 16th step late for swing: the off-beat eighth (step 2 of a beat) moves up to the last triplet at full swing. */
export const swingOffset = (step: number, swing: number) => (step % STEPS_PER_BEAT === 2 ? swing / 6 : 0);

/** When step `n` sounds, counting from step 0 at `anchor` (n may be negative); swing 0 is the plain grid. */
export const stepTime = (anchor: number, n: number, beatSeconds: number, swing: number) => anchor + n * stepSeconds(beatSeconds) + swingOffset(((n % 16) + 16) % 16, swing) * beatSeconds;

/** Which step of the pattern (0 to steps-1) is sounding at `now`, counting from step 0 at `anchor`. Before the anchor it counts back from the end. */
export function stepAt(now: number, anchor: number, beatSeconds: number, steps: number): number {
  const n = Math.floor((now - anchor) / stepSeconds(beatSeconds) + 1e-9);
  return ((n % steps) + steps) % steps;
}

export const emptyCells = (lanes: number): Cells => Array.from({ length: lanes }, () => new Array<number>(MAX_STEPS).fill(0));

/** A one-bar (16 step) pattern written as one string per lane: "x" normal, "X" accent, "." off. */
export function fromRows(rows: string[]): Cells {
  const cells = emptyCells(rows.length);
  rows.forEach((row, lane) => {
    for (let s = 0; s < MAX_STEPS; s++) {
      const ch = row[s % 16];
      cells[lane][s] = ch === "X" ? 2 : ch === "x" ? 1 : 0;
    }
  });
  return cells;
}

/** The preset these cells are, unchanged (its id), or undefined once a step has been edited. */
export function presetOf(presets: Preset[], cells: Cells): string | undefined {
  return presets.find((p) => {
    const want = fromRows(p.rows);
    return want.length === cells.length && want.every((row, l) => row.every((v, s) => (cells[l]?.[s] ?? 0) === v));
  })?.id;
}

export interface Preset {
  id: string;
  name: string;
  rows: string[];
}

/** Drum presets, lanes in order: kick, snare, clap, hat, open hat, tom. */
export const DRUM_PRESETS: Preset[] = [
  { id: "rock", name: "Rock", rows: ["X...x...X...x...", "....X.......X...", "................", "x.x.x.x.x.x.x.x.", "................", "................"] },
  { id: "four", name: "Four on the floor", rows: ["X...X...X...X...", "................", "....x.......x...", "..x...x...x...x.", "..x...x...x...x.", "................"] },
  { id: "hiphop", name: "Hip-hop", rows: ["X.....x...x.....", "....X.......X...", "................", "x.x.x.x.x.x.x.xx", "..............x.", "..............x."] },
  { id: "shuffle", name: "Eighth groove", rows: ["X..x..x...x.x...", "....X.......X...", "................", "xxxxxxxxxxxxxxxx", "................", "................"] },
  { id: "halftime", name: "Half-time", rows: ["X.........x.....", "........X.......", "................", "x.x.x.x.x.x.x.x.", "..............x.", "................"] },
  { id: "empty", name: "Empty", rows: ["................", "................", "................", "................", "................", "................"] },
];

/** Bass presets over eight lanes (the lowest note first). */
export const BASS_PRESETS: Preset[] = [
  { id: "root", name: "Root pulse", rows: ["x.x.x.x.x.x.x.x.", "................", "................", "................", "................", "................", "................", "................"] },
  { id: "walk", name: "Walk", rows: ["x...............", "........x.......", "....x...........", "............x...", "................", "................", "................", "................"] },
  { id: "octave", name: "Octaves", rows: ["x...x...x...x...", "................", "................", "................", "................", "..x...x...x...x.", "................", "................"] },
  { id: "offbeat", name: "Offbeat", rows: ["..x...x...x...x.", "................", "................", "................", "................", "................", "................", "................"] },
  { id: "syncop", name: "Syncopated", rows: ["x..x....x.......", "................", "...........x....", "......x.........", "..............x.", "................", "................", "................"] },
  { id: "empty", name: "Empty", rows: ["................", "................", "................", "................", "................", "................", "................", "................"] },
];
