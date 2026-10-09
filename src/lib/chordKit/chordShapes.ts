import { RICH_SHAPES, intervalLabel, rootFretFor, shapeSemitones, type Difficulty, type RichShape } from "./shapeTools";
import { modeChords } from "@/features/theory/scales";
import type { KeyContext } from "@/features/theory/theory";

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

/** One sounding chord tone of a shape, as a bubble: its role in the chord and its place in the mode. */
export interface ShapeTone {
  /** role in the chord: R, ♭3, 5, ♭7, 9 ... */
  role: string;
  /** scale degree of the mode, 0-based */
  scaleDegree: number;
  /** note name spelled for the key */
  note: string;
}

/** The distinct chord tones of a placed shape, low to high by interval, named and located in the mode. */
export function shapeTones(ctx: KeyContext, choice: ChordShapeChoice): ShapeTone[] {
  const semis = [...new Set(shapeSemitones(choice.shape).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  return semis.map((s) => {
    const pc = (choice.rootPc + s) % 12;
    const scaleDegree = ctx.steps.findIndex((st) => (ctx.tonic.pc + st) % 12 === pc);
    return { role: intervalLabel(choice.shape, s), scaleDegree, note: ctx.names[scaleDegree] };
  });
}

/**
 * Guitar shapes for any chord given as a root and its semitones above the root (e.g. Cmaj9 = [0,4,7,11,2]).
 * A shape may leave out the 5th (and the root when the chord is big) but must not play a note outside the chord.
 * `full` is true when the shape has every note except possibly the 5th; otherwise it is the closest fingering
 * that still keeps the chord's colour (its 3rd or sus note, and its 7th when the chord has one).
 */
export function shapesForTones(rootPc: number, semis: number[], difficulties: Difficulty[] = ["easy", "medium"]): { choice: ChordShapeChoice; full: boolean }[] {
  const want = new Set(semis.map((s) => ((s % 12) + 12) % 12));
  const colour = [...want].filter((s) => s !== 0 && s !== 7);
  const out: { choice: ChordShapeChoice; full: boolean; score: number }[] = [];
  RICH_SHAPES.forEach((shape) => {
    const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
    if (![...tones].every((t) => want.has(t))) return;
    const hit = colour.filter((c) => tones.has(c)).length;
    const third = colour.filter((c) => c >= 2 && c <= 5);
    if (third.length && !third.some((c) => tones.has(c))) return;
    const full = hit === colour.length;
    if (!full && hit < Math.max(1, colour.length - 1)) return;
    out.push({ choice: { shape, rootPc, fret: rootFretFor(shape, rootPc), exact: tones.size === want.size }, full, score: hit });
  });
  const wanted = out.filter((o) => difficulties.includes(o.choice.shape.diff));
  const list = wanted.length ? wanted : out;
  return list
    .sort((a, b) => Number(b.full) - Number(a.full) || b.score - a.score || Number(b.choice.exact) - Number(a.choice.exact) || DIFF_RANK[a.choice.shape.diff] - DIFF_RANK[b.choice.shape.diff] || a.choice.fret - b.choice.fret || a.choice.shape.id - b.choice.shape.id)
    .map(({ choice, full }) => ({ choice, full }));
}
