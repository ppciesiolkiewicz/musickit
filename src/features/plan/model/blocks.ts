import type { Cell, SectionCell } from "./tools";

/** A timed stretch of an exercise: a section with `minutes`. `index` is the section's place in the block's cells. */
export interface TimedBlock { title: string; minutes: number; index: number }

/** The exercise's timed blocks, in order; [] when no section has minutes. Cells before the first timed section belong to block 1; sections without minutes start none. */
export function blocksOf(cells: Cell[]): TimedBlock[] {
  return cells.flatMap((c, index) => (c.type === "section" && c.minutes ? [{ title: c.heading, minutes: c.minutes, index }] : []));
}

/**
 * Scale the blocks' minutes so they add up to `minutes` (largest remainder, every block at least 1). With fewer minutes than
 * blocks, the last blocks lose their minutes and become plain sections. The exercise's own minutes never change.
 */
export function fitBlocks<T extends Cell>(cells: T[], minutes: number): { cells: T[]; changed: boolean } {
  const blocks = blocksOf(cells);
  if (!blocks.length) return { cells, changed: false };
  const kept = blocks.slice(0, Math.max(1, Math.floor(minutes)));
  const total = kept.reduce((n, b) => n + b.minutes, 0);
  if (kept.length === blocks.length && total === minutes) return { cells, changed: false };
  const extra = minutes - kept.length;
  const quota = kept.map((b) => (extra * b.minutes) / total);
  const given = quota.map(Math.floor);
  let left = extra - given.reduce((n, g) => n + g, 0);
  quota.map((q, i) => ({ i, r: q - given[i] })).sort((a, b) => b.r - a.r || a.i - b.i).forEach(({ i }) => {
    if (left-- > 0) given[i]++;
  });
  const out = cells.map((c) => ({ ...c }) as T);
  blocks.forEach((b, n) => {
    const s = out[b.index] as SectionCell;
    if (n < kept.length) s.minutes = 1 + given[n];
    else delete s.minutes;
  });
  return { cells: out, changed: true };
}

/** The block running `elapsedSeconds` into the exercise and the seconds left in it; null once the blocks' minutes are used up. */
export function blockAt(blocks: TimedBlock[], elapsedSeconds: number): { index: number; leftInBlock: number } | null {
  let end = 0;
  for (let index = 0; index < blocks.length; index++) {
    end += blocks[index].minutes * 60;
    if (elapsedSeconds < end) return { index, leftInBlock: end - elapsedSeconds };
  }
  return null;
}
