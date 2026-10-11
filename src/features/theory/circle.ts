/**
 * The circle of fifths: tonics ordered by fifths, key signatures, and the keys around any key.
 * Pure: no React, no sound. Shared by the circle of fifths page and the creator.
 */
import { TONICS, tonicName, type Tonic } from "./theory";

/** Position of a tonic on the circle of fifths: C 0, G 1, D 2 ... F♯ 6 ... D♭ 11. */
export const fifthsPosition = (pc: number): number => (((pc * 7) % 12) + 12) % 12;

/** The twelve tonics in circle-of-fifths order, starting at C. (F♯ and D♭ are the two spellings kept by TONICS.) */
export const CIRCLE: Tonic[] = [...TONICS].sort((a, b) => fifthsPosition(a.pc) - fifthsPosition(b.pc));

/** Sharps (+) or flats (-) in the key signature of a major key on this tonic. */
export function majorSignature(pc: number): number {
  const p = fifthsPosition(pc);
  return p <= 6 ? p : p - 12;
}

const SHARPS = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"];
const FLATS = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"];

/** The accidentals of a key signature, in the order they are written: +2 gives F♯ C♯, -3 gives B♭ E♭ A♭. */
export const signatureNotes = (n: number): string[] => (n >= 0 ? SHARPS.slice(0, n) : FLATS.slice(0, -n));

/** "2♯", "3♭" or "no ♯ ♭". */
export const signatureText = (n: number): string => (n === 0 ? "no ♯ ♭" : `${Math.abs(n)}${n > 0 ? "♯" : "♭"}`);

/** The tonic of the relative minor (a minor third below) and of the relative major (a minor third above). */
export const relativeMinor = (majorPc: number) => (majorPc + 9) % 12;
export const relativeMajor = (minorPc: number) => (minorPc + 3) % 12;

export interface CircleKey {
  pc: number;
  minor: boolean;
}

export interface CircleChord {
  roman: string;
  name: string;
  rootPc: number;
  quality: "maj" | "min" | "dim";
  /** which ring of the circle it sits on */
  ring: "major" | "minor" | "dim";
  /** position on the circle (0 = C at the top) */
  pos: number;
}

/**
 * The seven chords of a major or natural minor key, as they sit on the circle: three neighbouring majors (IV I V),
 * the three minors inside them (ii vi iii) and the diminished chord (vii°). For a minor key the same chords, renamed from its tonic.
 */
export function circleChords(k: CircleKey): CircleChord[] {
  const major = k.minor ? relativeMajor(k.pc) : k.pc;
  const p = fifthsPosition(major);
  const at = (step: number) => (p + step + 12) % 12;
  const pcAt = (pos: number) => CIRCLE[pos].pc;
  const majors = [-1, 0, 1].map((s) => ({ pos: at(s), pc: pcAt(at(s)) }));
  const romanMajor = ["IV", "I", "V"], romanMinor = ["ii", "vi", "iii"];
  const romanFromMinor = { maj: ["VI", "III", "VII"], min: ["iv", "i", "v"] };
  const out: CircleChord[] = [];
  majors.forEach((m, i) => {
    out.push({ roman: k.minor ? romanFromMinor.maj[i] : romanMajor[i], name: tonicName(m.pc), rootPc: m.pc, quality: "maj", ring: "major", pos: m.pos });
    const r = relativeMinor(m.pc);
    out.push({ roman: k.minor ? romanFromMinor.min[i] : romanMinor[i], name: `${tonicName(r)}m`, rootPc: r, quality: "min", ring: "minor", pos: m.pos });
  });
  const dim = (major + 11) % 12;
  out.push({ roman: k.minor ? "ii°" : "vii°", name: `${tonicName(dim)}°`, rootPc: dim, quality: "dim", ring: "dim", pos: p });
  return out;
}

/** Display order of the chords of a key, by scale degree from its tonic. */
export function chordsInScaleOrder(k: CircleKey): CircleChord[] {
  const order = k.minor ? ["i", "ii°", "III", "iv", "v", "VI", "VII"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  const all = circleChords(k);
  return order.map((r) => all.find((c) => c.roman === r)!);
}

/** The dominant (one step clockwise) and subdominant (one step anticlockwise) keys, keeping major or minor. */
export function neighbours(k: CircleKey): { dominant: CircleKey; subdominant: CircleKey } {
  return { dominant: { pc: (k.pc + 7) % 12, minor: k.minor }, subdominant: { pc: (k.pc + 5) % 12, minor: k.minor } };
}

export const keyName = (k: CircleKey) => `${tonicName(k.pc)} ${k.minor ? "minor" : "major"}`;
