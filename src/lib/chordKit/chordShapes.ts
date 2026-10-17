import { ALL_SHAPES, fitsRoot, intervalLabel, rootFretFor, shapeSemitones, type Difficulty, type RichShape } from "./shapeTools";
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
  /** true when the shape is exact and plays the whole chord: with mode fit that means its 7th too, so a bare triad is not full */
  full: boolean;
}

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** How basic a shape is: 0 open chord, 1 first barre (E- or A-shape major/minor triad), 2 everything else. */
export function shapeTier(sh: RichShape): 0 | 1 | 2 {
  if (sh.at !== undefined) return 0;
  if ((sh.rs === 6 || sh.rs === 5) && sh.ext === "triad" && !sh.v && sh.tags.includes("barre") && (sh.fam === "major" || sh.fam === "minor")) return 1;
  return 2;
}

/** Simpler tier first; inside the first-barre tier, lowest on the neck first. */
const byTier = (a: ChordShapeChoice, b: ChordShapeChoice): number => {
  const ta = shapeTier(a.shape), tb = shapeTier(b.shape);
  return ta - tb || (ta === 1 ? a.fret - b.fret : 0);
};

/**
 * Shapes that play the diatonic chord on `degree` of the mode, best first:
 * the whole chord (with its 7th in mode fit), then smaller shapes made only of its own tones (the triad or a shell), then the rest;
 * inside each group open chords, then the first barre, then easier fingerings, then lower on the neck.
 * Shapes without the chord's 3rd are dropped (they would not say major or minor).
 * `fit: "mode"` (default) allows any note of the mode, and the 7th counts as a chord tone.
 * `fit: "triad"` allows only root, 3rd and 5th, so a plain triad never shows as a 7th or a shell.
 * `difficulties` limits the result; if that leaves nothing, every difficulty is used.
 */
export function shapesForChord(ctx: KeyContext, degree: number, difficulties: Difficulty[] = ["easy", "medium"], opts: { fit?: "mode" | "triad" } = {}): ChordShapeChoice[] {
  const triad = opts.fit === "triad";
  const chord = modeChords(ctx)[degree];
  const [, third, fifth, seventh] = chord.notes.map((n) => n.semis);
  const stack = new Set(triad ? [0, third, fifth] : [0, third, fifth, seventh]);
  const rootPc = (ctx.tonic.pc + ctx.steps[degree]) % 12;
  const rel = new Set(ctx.steps.map((_, i) => (ctx.steps[(degree + i) % 7] - ctx.steps[degree] + 12) % 12));

  const all: ChordShapeChoice[] = [];
  ALL_SHAPES.forEach((shape) => {
    if (!fitsRoot(shape, rootPc)) return;
    const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
    if (!tones.has(third)) return;
    if (![...tones].every((t) => (triad ? stack : rel).has(t))) return;
    const exact = [...tones].every((t) => stack.has(t));
    all.push({ shape, rootPc, fret: rootFretFor(shape, rootPc), exact, full: exact && (triad || tones.has(seventh)) });
  });

  const wanted = all.filter((c) => difficulties.includes(c.shape.diff));
  const list = wanted.length ? wanted : all;
  return list.sort((a, b) => Number(b.full) - Number(a.full) || Number(b.exact) - Number(a.exact) || byTier(a, b) || DIFF_RANK[a.shape.diff] - DIFF_RANK[b.shape.diff] || a.fret - b.fret || a.shape.id - b.shape.id);
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
  ALL_SHAPES.forEach((shape) => {
    if (!fitsRoot(shape, rootPc)) return;
    const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
    if (![...tones].every((t) => want.has(t))) return;
    const hit = colour.filter((c) => tones.has(c)).length;
    const third = colour.filter((c) => c >= 2 && c <= 5);
    if (third.length && !third.some((c) => tones.has(c))) return;
    const full = hit === colour.length;
    if (!full && hit < Math.max(1, colour.length - 1)) return;
    out.push({ choice: { shape, rootPc, fret: rootFretFor(shape, rootPc), exact: tones.size === want.size, full }, full, score: hit });
  });
  const wanted = out.filter((o) => difficulties.includes(o.choice.shape.diff));
  const list = wanted.length ? wanted : out;
  return list
    .sort((a, b) => Number(b.full) - Number(a.full) || b.score - a.score || byTier(a.choice, b.choice) || Number(b.choice.exact) - Number(a.choice.exact) || DIFF_RANK[a.choice.shape.diff] - DIFF_RANK[b.choice.shape.diff] || a.choice.fret - b.choice.fret || a.choice.shape.id - b.choice.shape.id)
    .map(({ choice, full }) => ({ choice, full }));
}

const EXT_LABEL: Record<number, string> = { 1: "♭9", 2: "9", 3: "♯9", 5: "11", 6: "♯11", 8: "♭13", 9: "13" };
const NAMED_EXT: Record<string, Record<string, string>> = {
  maj7: { "9": "maj9", "♯11": "maj7♯11", "13": "maj13" },
  "7": { "9": "9", "♭9": "7♭9", "♯9": "7♯9", "13": "13" },
  m7: { "9": "m9", "11": "m11", "13": "m13" },
};

/**
 * The name of the chord a placed shape really plays on `degree` of the mode, e.g. "Cmaj9", "Em(add9)", "Bm7♭5".
 * A missing 5th is heard as the mode's own 5th, so a root-♭3-♭7 shell on the v° of Phrygian is named m7♭5, not m7.
 */
export function placedChordName(ctx: KeyContext, degree: number, shape: RichShape): string {
  const c = ctx.chords[degree];
  const notes = modeChords(ctx)[degree].notes;
  const [third, fifth, seventh] = [notes[1].semis, notes[2].semis, notes[3].semis];
  const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
  if (!tones.has(third)) return c.root + shape.suf;
  const exts = [...tones].filter((t) => t !== 0 && t !== third && t !== fifth && t !== seventh).sort((a, b) => a - b).map((t) => EXT_LABEL[t] ?? "?");
  const triad = c.triadName.slice(c.root.length);
  if (tones.has(seventh)) {
    if (!exts.length) return c.seventhName;
    if (exts.length === 1 && NAMED_EXT[c.seventh]?.[exts[0]]) return c.root + NAMED_EXT[c.seventh][exts[0]];
    return `${c.seventhName}(${exts.join(",")})`;
  }
  if (!exts.length) return c.triadName;
  if (triad === "" && exts.join() === "9,13") return c.root + "6/9";
  if (exts.length === 1 && exts[0] === "13" && (triad === "" || triad === "m")) return c.root + triad + "6";
  if (exts.length === 1 && exts[0] === "9") return c.root + (triad ? `${triad}(add9)` : "add9");
  return `${c.triadName}(add${exts.join(",")})`;
}
