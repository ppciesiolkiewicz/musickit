import type { ScaleCell } from "@/lib/chordKit/scalePositions";

/**
 * How far an island's notes may sit from its root: one string over, two for the octave or in an island of more than three
 * notes (a whole octave of a pentatonic), and this many frets either way (a hand's span).
 */
const STRING_REACH = 1;
const WIDE_STRING_REACH = 2;
const FRET_REACH = 4;

/** A few scale notes around one root, all under one hand: the same notes in the same order wherever on the neck it is played. */
export interface Island {
  root: ScaleCell;
  /** the root and its notes, low to high */
  cells: ScaleCell[];
  /** the frets it spans */
  from: number;
  to: number;
}

/**
 * An island's notes as semitones from its root, low to high: the degrees (semitones above the key) written before the
 * root sit under it, the ones after it above it. [10, 0, 2] (♭7 1 2) is -2, 0, 2: Te Do Re; [0, 5, 7] (1 4 5) is 0, 5, 7.
 * No root in the list: every degree above it.
 */
export function islandSteps(semis: readonly number[]): number[] {
  const at = semis.indexOf(0);
  const steps = semis.map((s, i) => (s === 0 ? 0 : at > i ? s - 12 : s));
  return [...new Set([0, ...steps])].sort((a, b) => a - b);
}

const near = (root: ScaleCell, c: ScaleCell, wide: boolean) =>
  Math.abs(c.string - root.string) <= (wide || Math.abs(c.midi - root.midi) >= 12 ? WIDE_STRING_REACH : STRING_REACH) && Math.abs(c.fret - root.fret) <= FRET_REACH;
/** the closer place wins, a step along the string before a string over */
const cost = (root: ScaleCell, c: ScaleCell) => Math.abs(c.fret - root.fret) + 2 * Math.abs(c.string - root.string);

/** The island around one root: each note (`islandSteps`) at its nearest place; null when one isn't in reach. */
export function islandAt(cells: readonly ScaleCell[], root: ScaleCell, steps: readonly number[]): Island | null {
  const picked: ScaleCell[] = [];
  for (const step of steps) {
    if (step === 0) { picked.push(root); continue; }
    const best = cells
      .filter((c) => c.midi === root.midi + step && near(root, c, steps.length > 3))
      .sort((a, b) => cost(root, a) - cost(root, b) || a.string - b.string || a.fret - b.fret)[0];
    if (!best) return null;
    picked.push(best);
  }
  const frets = picked.map((c) => c.fret);
  return { root, cells: picked, from: Math.min(...frets), to: Math.max(...frets) };
}

/**
 * Up to `count` islands of these degrees (semitones above the key, in the order `islandSteps` reads) along the neck, none
 * sharing a fret with another, as far apart as they can be: of every such set, the one with the widest smallest gap
 * between two neighbours, then the one nearest the nut. The same cells and steps give the same islands, so a major and a
 * minor scale on one root ring a shared island (1 4 5) in the same places. Islands end by fret 7 when there's room for
 * `count` of them there, and never past fret 12.
 */
export function findIslands(cells: readonly ScaleCell[], semis: readonly number[], count = 3): Island[] {
  const steps = islandSteps(semis);
  const found = cells
    .filter((c) => c.semi === 0)
    .map((root) => islandAt(cells, root, steps))
    .filter((i): i is Island => i !== null)
    .sort((a, b) => a.from - b.from || a.to - b.to || a.root.string - b.root.string);
  // Low on the neck, where a beginner plays: up to fret 7 when that still gives every island, never past 12.
  const low = found.filter((i) => i.to <= PREFERRED_TOP);
  const all = pickFrom(low, count).length >= count ? low : found.filter((i) => i.to <= HIGHEST_TOP);
  return pickFrom(all, count);
}

/** Islands end by this fret when there's room for them all, and never past `HIGHEST_TOP`. */
const PREFERRED_TOP = 7;
const HIGHEST_TOP = 12;

function pickFrom(all: readonly Island[], count: number): Island[] {
  let best: { set: Island[]; gap: number; start: number } | null = null;
  const walk = (set: Island[], next: number) => {
    const gap = set.length < 2 ? 0 : Math.min(...set.slice(1).map((i, k) => i.from - set[k].to));
    const start = set.reduce((n, i) => n + i.from, 0);
    if (!best || set.length > best.set.length || (set.length === best.set.length && (gap > best.gap || (gap === best.gap && start < best.start)))) best = { set, gap, start };
    if (set.length === count) return;
    for (let i = next; i < all.length; i++) if (!set.length || all[i].from > set[set.length - 1].to) walk([...set, all[i]], i + 1);
  };
  walk([], 0);
  return (best as { set: Island[] } | null)?.set ?? [];
}

/**
 * What an island plays, always rising: the root, its other notes above it in order (a note under the root an octave up),
 * then the root an octave up (Do Fa Sol Do; Do Re Te Do). Two notes are an interval and play just the two (Do Re; Do Do). A note outside the island lights its nearest place in
 * `cells`.
 */
export function islandTune(island: Island, cells: readonly ScaleCell[]): ScaleCell[] {
  const root = island.root;
  const above = island.cells
    .filter((c) => c !== root)
    .map((c) => (c.midi < root.midi ? c.midi + 12 : c.midi))
    .sort((a, b) => a - b);
  const place = (midi: number) =>
    island.cells.find((c) => c.midi === midi) ??
    cells.filter((c) => c.midi === midi).sort((a, b) => cost(root, a) - cost(root, b) || a.string - b.string)[0] ??
    { ...root, midi };
  // two notes are an interval: just the two; an island with the octave in it already ends on the Do above
  const top = island.cells.length > 2 && above[above.length - 1] !== root.midi + 12 ? [place(root.midi + 12)] : [];
  return [root, ...above.map(place), ...top];
}
