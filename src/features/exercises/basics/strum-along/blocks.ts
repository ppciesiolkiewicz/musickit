/** Strum-along maths: which block a click falls on and how the blocks group into bars. Pure. */

export type StrumPer = "bar" | "beat";

/** Where click `index` (0 = the first, the count-in's beat 1) falls: in the count-in, or on a block and its beat. */
export type StrumPos = { countIn: number } | { block: number; beat: number };

/** One bar of count-in, then the blocks loop. `beat` is the beat of the bar (0 = beat 1). */
export function strumAt(index: number, blocks: number, per: StrumPer, beats: number): StrumPos {
  if (index < beats) return { countIn: index + 1 };
  const pos = index - beats;
  const beat = pos % beats;
  const block = (per === "bar" ? Math.floor(pos / beats) : pos) % blocks;
  return { block, beat };
}

/** The block indexes grouped by bar: one block a bar, or `beats` blocks a bar (the last bar may be short). */
export function strumBars(blocks: number, per: StrumPer, beats: number): number[][] {
  const size = per === "bar" ? 1 : beats;
  const bars: number[][] = [];
  for (let i = 0; i < blocks; i += size) bars.push(Array.from({ length: Math.min(size, blocks - i) }, (_, j) => i + j));
  return bars;
}
