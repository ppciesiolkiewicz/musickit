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
  { id: "empty", name: "Empty", rows: ["................", "................", "................", "................", "................", "................"] },
];

/** Bass presets over eight lanes (the lowest note first). */
export const BASS_PRESETS: Preset[] = [
  { id: "root", name: "Root pulse", rows: ["x.x.x.x.x.x.x.x.", "................", "................", "................", "................", "................", "................", "................"] },
  { id: "walk", name: "Walk", rows: ["x...............", "........x.......", "....x...........", "............x...", "................", "................", "................", "................"] },
  { id: "empty", name: "Empty", rows: ["................", "................", "................", "................", "................", "................", "................", "................"] },
];
