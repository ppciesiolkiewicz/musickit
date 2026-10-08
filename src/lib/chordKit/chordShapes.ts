import { RICH_SHAPES, rootFretFor, shapeSemitones, type Difficulty, type RichShape } from "./shapeTools";
import { modeChords } from "./scales";
import type { KeyContext } from "./theory";

/** A guitar shape placed on one chord of a mode, ready to draw. */
export interface ChordShapeChoice {
  shape: RichShape;
  /** pitch class of the chord root, C = 0 */
  rootPc: number;
  /** fret where the root sits (lowest position) */
  fret: number;
  /** true when the shape holds only the chord's own root, 3rd, 5th and 7th */
  exact: boolean;
}

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Shapes that play the diatonic chord on `degree` of the mode, best first:
 * shapes made only of the chord's own tones, then easier fingerings, then lower on the neck.
 * Shapes without the chord's 3rd are dropped (they would not say major or minor).
 * `difficulties` limits the result; if that leaves nothing, every difficulty is used.
 */
export function shapesForChord(ctx: KeyContext, degree: number, difficulties: Difficulty[] = ["easy", "medium"]): ChordShapeChoice[] {
  const chord = modeChords(ctx)[degree];
  const [, third, fifth, seventh] = chord.notes.map((n) => n.semis);
  const stack = new Set([0, third, fifth, seventh]);
  const rootPc = (ctx.tonic.pc + ctx.steps[degree]) % 12;
  const rel = new Set(ctx.steps.map((_, i) => (ctx.steps[(degree + i) % 7] - ctx.steps[degree] + 12) % 12));

  const all: ChordShapeChoice[] = [];
  RICH_SHAPES.forEach((shape) => {
    const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
    if (!tones.has(third)) return;
    if (![...tones].every((t) => rel.has(t))) return;
    all.push({ shape, rootPc, fret: rootFretFor(shape, rootPc), exact: [...tones].every((t) => stack.has(t)) });
  });

  const wanted = all.filter((c) => difficulties.includes(c.shape.diff));
  const list = wanted.length ? wanted : all;
  return list.sort((a, b) => Number(b.exact) - Number(a.exact) || DIFF_RANK[a.shape.diff] - DIFF_RANK[b.shape.diff] || a.fret - b.fret || a.shape.id - b.shape.id);
}

/** Wrap-around step for a carousel. */
export const carouselStep = (index: number, delta: number, length: number): number =>
  length === 0 ? 0 : (((index + delta) % length) + length) % length;
