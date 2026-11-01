/**
 * The tune as an endless stream of passes: each pass is the loop region (or the whole tune) laid end to end on one
 * running count of beats, so a view draws the passes in reach and drops the ones gone by. Pure: no React, no sound.
 */

/** a stretch of the tune, in its beats: from inclusive, to exclusive */
export interface Region {
  from: number;
  to: number;
}

/** a note (or chord) of the tune inside a pass: `i` its index in the tune, `at` beats from the pass's start, cut to the pass */
export interface Cut {
  i: number;
  at: number;
  beats: number;
}

export interface Pass {
  /** the stream beat it starts on */
  start: number;
  /** the tune's beats it plays */
  from: number;
  to: number;
  notes: Cut[];
  chords: Cut[];
}

interface Timed {
  at: number;
  beats: number;
}

/** what of `xs` sounds in [from, to), each cut to it and timed from `from` */
export function cut(xs: Timed[], from: number, to: number): Cut[] {
  return xs.flatMap((x, i) => {
    const a = Math.max(x.at, from);
    const b = Math.min(x.at + x.beats, to);
    return b > a ? [{ i, at: a - from, beats: b - a }] : [];
  });
}

export function makePass(notes: Timed[], chords: Timed[], start: number, from: number, to: number): Pass {
  return { start, from, to, notes: cut(notes, from, to), chords: cut(chords, from, to) };
}

export const passEnd = (p: Pass) => p.start + p.to - p.from;

/** the pass playing at stream beat `s` */
export function passAt(passes: Pass[], s: number): Pass | undefined {
  return passes.find((p) => s >= p.start && s < passEnd(p));
}

/**
 * Passes from `passes` on until one reaches past `until`: the region over and over while looping, the whole tune once
 * (and nothing after) when not.
 */
export function fill(passes: Pass[], region: Region | null, until: number, notes: Timed[], chords: Timed[], total: number): Pass[] {
  const out = [...passes];
  if (!region) {
    if (!out.length) out.push(makePass(notes, chords, 0, 0, total));
    return out;
  }
  while (!out.length || passEnd(out[out.length - 1]) <= until) {
    const start = out.length ? passEnd(out[out.length - 1]) : 0;
    out.push(makePass(notes, chords, start, region.from, region.to));
  }
  return out;
}

/** the passes that end after `s` */
export const prune = (passes: Pass[], s: number) => passes.filter((p) => passEnd(p) > s);

/**
 * The loop changed at stream beat `s`: the pass playing goes on, but ends at the new region's end (or, past it, at the
 * next beat, so the new loop starts at once); without a region it plays on to the tune's end. The passes after it go.
 */
export function retime(passes: Pass[], s: number, region: Region | null, notes: Timed[], chords: Timed[], total: number): Pass[] {
  const cur = passAt(passes, s);
  if (!cur) return passes.filter((p) => p.start <= s);
  const tb = cur.from + s - cur.start;
  const to = !region ? total : tb < region.to ? region.to : Math.min(cur.to, Math.floor(tb) + 1);
  return [...passes.filter((p) => p.start < cur.start), makePass(notes, chords, cur.start, cur.from, to)];
}

/** the region two markers make, whichever is first; null when they meet */
export function regionOf(a: number, b: number): Region | null {
  return a === b ? null : { from: Math.min(a, b), to: Math.max(a, b) };
}

/** a beat on the tune snapped to the grid, inside it */
export const snap = (beat: number, total: number, grid = 1) => Math.max(0, Math.min(total, Math.round(beat / grid) * grid));
