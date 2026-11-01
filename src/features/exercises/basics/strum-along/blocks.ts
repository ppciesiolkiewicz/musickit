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

/** Down, up, or a miss: the hand still moves but doesn't touch the strings. */
export type Stroke = "D" | "U" | ".";

/**
 * One bar of strokes ("D . D U . U D U"; "|" only for reading) split into beats: 1 to 4 strokes a beat, the same in every beat.
 * Null when it doesn't read or doesn't fill the bar evenly. No pattern is a down on every beat.
 */
export function strumPattern(spec: string | undefined, beats: number): Stroke[][] | null {
  const steps = (spec ?? "").toUpperCase().trim().split(/\s+/).filter((t) => t && t !== "|");
  if (!steps.length) return Array.from({ length: beats }, () => ["D"]);
  if (steps.some((t) => t !== "D" && t !== "U" && t !== ".")) return null;
  const per = steps.length / beats;
  if (!Number.isInteger(per) || per > 4) return null;
  return Array.from({ length: beats }, (_, b) => steps.slice(b * per, (b + 1) * per) as Stroke[]);
}

/** The count under each stroke of beat `beat` (0 = beat 1): "1", "1 &", "1 & a", "1 e & a". */
export function strumCounts(beat: number, per: number): string[] {
  const sub = per === 4 ? ["e", "&", "a"] : per === 3 ? ["&", "a"] : per === 2 ? ["&"] : [];
  return [String(beat + 1), ...sub];
}
