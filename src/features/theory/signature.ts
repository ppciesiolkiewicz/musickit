/**
 * The key signature a scale is written with. Pure: no React.
 * Modes of the major scale take their parent major's signature (D Dorian: none). Harmonic and melodic minor take
 * their tonic's natural minor signature and their modes the parent's (E Phrygian dominant: A minor's). A scale of its
 * own borrows its tonic's minor signature when its 3rd is flat and the major one when not. The notes that differ are
 * written in as accidentals (A harmonic minor: none, plus G♯).
 */
import type { KeyContext } from "./theory";

export interface ScaleSignature {
  /** sharps (+) or flats (-), -7..7 */
  count: number;
  /** the scale's notes that need an accidental against the signature, e.g. ["G♯"] or ["B♮"] */
  extras: string[];
  /** the major and minor keys that use this signature */
  major: string;
  minor: string;
  /** where it came from: the mode's parent major, its tonic's major or minor key, or the closest fit when those spellings run past 7 */
  basis: "parent" | "major" | "minor" | "nearest";
}

const LETTERS = "CDEFGAB";
/** sharps in the major key on each natural letter: C 0, D 2, E 4, F -1, G 1, A 3, B 5 */
const LETTER_SIG = [0, 2, 4, -1, 1, 3, 5];
const SHARP_ORDER = "FCGDAEB";
const FLAT_ORDER = "BEADGCF";
/** index = count + 7 */
const MAJOR_KEYS = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];
const MINOR_KEYS = ["A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯", "G♯", "D♯", "A♯"];

const parse = (name: string) => ({ letter: name[0], alter: [...name.slice(1)].reduce((a, c) => a + (c === "♯" ? 1 : c === "♭" ? -1 : 0), 0) });

/** what a signature does to a letter: +1 sharp, -1 flat, 0 natural */
function alterUnder(letter: string, count: number): number {
  if (count > 0) return SHARP_ORDER.indexOf(letter) < count ? 1 : 0;
  if (count < 0) return FLAT_ORDER.indexOf(letter) < -count ? -1 : 0;
  return 0;
}

const glyphs = (alter: number) => (alter === 0 ? "♮" : (alter > 0 ? "♯" : "♭").repeat(Math.abs(alter)));

/** The notes that need an accidental when these notes are written with this signature. */
export function accidentalsAgainst(names: string[], count: number): string[] {
  return names.flatMap((n) => {
    const { letter, alter } = parse(n);
    return alter === alterUnder(letter, count) ? [] : [letter + glyphs(alter)];
  });
}

/** Sharps (+) or flats (-) in the major key on a spelled tonic; can run past 7 (G♯ major is 8). */
export function majorSignatureOf(tonic: string): number {
  const { letter, alter } = parse(tonic);
  return LETTER_SIG[LETTERS.indexOf(letter)] + 7 * alter;
}

/** The signature with the fewest accidentals for these notes; ties go to the one with fewer sharps or flats. */
function nearest(names: string[]): number {
  let best = 0;
  for (let c = -7; c <= 7; c++) {
    const d = accidentalsAgainst(names, c).length - accidentalsAgainst(names, best).length;
    if (d < 0 || (d === 0 && Math.abs(c) < Math.abs(best))) best = c;
  }
  return best;
}

export function scaleSignature(ctx: KeyContext): ScaleSignature {
  const minor = ctx.steps[2] === 3;
  let count: number;
  let basis: ScaleSignature["basis"];
  if (ctx.familyIndex === 0) {
    // a mode of the major scale fits its parent's signature exactly, unless that parent would need more than 7
    count = nearest(ctx.names);
    basis = accidentalsAgainst(ctx.names, count).length === 0 ? "parent" : "nearest";
  } else {
    // modes of harmonic and melodic minor are written in their parent minor key; a scale of its own goes by its 3rd
    const parent = ctx.familyIndex !== 3 && ctx.modeIndex !== 0;
    const own = parent ? majorSignatureOf(ctx.names[(7 - ctx.modeIndex) % 7]) - 3 : majorSignatureOf(ctx.names[0]) - (minor ? 3 : 0);
    if (Math.abs(own) <= 7) {
      count = own;
      basis = parent ? "parent" : minor ? "minor" : "major";
    } else {
      count = nearest(ctx.names);
      basis = "nearest";
    }
  }
  return { count, extras: accidentalsAgainst(ctx.names, count), major: MAJOR_KEYS[count + 7], minor: MINOR_KEYS[count + 7], basis };
}
