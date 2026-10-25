/**
 * Where a spelled note sits on the grand staff: which clef, which line or space, whether it needs an accidental
 * against the key signature, and which ledger lines to draw. Pure maths (tested).
 */
import type { Spelled } from "./key";

/** "treble8" is the tenor's clef: a treble clef with an 8 under it, sounding an octave lower than written. */
export type Clef = "treble" | "treble8" | "bass";

/** step 0 = bottom line of the clef's staff, +1 per line or space (treble: E4 = 0, F5 = 8; treble8: E3 = 0, F4 = 8; bass: G2 = 0, A3 = 8) */
export interface Placed {
  clef: Clef;
  step: number;
  accidental: "♯" | "♭" | "♮" | "𝄪" | "𝄫" | null;
  ledgers: number[];
}

const LETTER_INDEX: Record<Spelled["letter"], number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
/** diatonic index (octave * 7 + letter) of each clef's bottom line */
const BOTTOM: Record<Clef, number> = { treble: 4 * 7 + 2, treble8: 3 * 7 + 2, bass: 2 * 7 + 4 };
const SHARP_ORDER: Spelled["letter"][] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: Spelled["letter"][] = ["B", "E", "A", "D", "G", "C", "F"];
/** conventional treble positions (the tenor's treble too); the bass clef sits two steps lower */
const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
const FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];
const GLYPH: Record<number, Placed["accidental"]> = { [-2]: "𝄫", [-1]: "♭", 0: "♮", 1: "♯", 2: "𝄪" };

/** what the signature does to a letter: +1 sharp, -1 flat, 0 natural */
function signatureAlter(letter: Spelled["letter"], signature: number): number {
  if (signature > 0) return SHARP_ORDER.indexOf(letter) < signature ? 1 : 0;
  if (signature < 0) return FLAT_ORDER.indexOf(letter) < -signature ? -1 : 0;
  return 0;
}

/** `clef` pins the note to one staff (the singing page has only one); by default middle C and up go on the treble. */
export function place(note: Spelled, signature: number, clef: Clef = note.midi >= 60 ? "treble" : "bass"): Placed {
  const step = note.octave * 7 + LETTER_INDEX[note.letter] - BOTTOM[clef];
  const ledgers: number[] = [];
  for (let s = 10; s <= step; s += 2) ledgers.push(s);
  for (let s = -2; s >= step; s -= 2) ledgers.push(s);
  const accidental = note.alter === signatureAlter(note.letter, signature) ? null : GLYPH[note.alter];
  return { clef, step, accidental, ledgers };
}

export function signatureGlyphs(signature: number, clef: Clef): { glyph: "♯" | "♭"; step: number }[] {
  const shift = clef === "bass" ? -2 : 0;
  const n = Math.min(7, Math.abs(signature));
  const steps = signature > 0 ? SHARP_STEPS : FLAT_STEPS;
  const glyph = signature > 0 ? "♯" : "♭";
  return steps.slice(0, n).map((s) => ({ glyph, step: s + shift }));
}
