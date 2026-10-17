/**
 * A key for the theory piano: its signature, the names of its notes and the degree of any note in it.
 * Every key is read off a parent major scale, so the tonic's name and the signature always agree.
 * Pure maths, no audio and no DOM (tested).
 */

export type ScaleId = "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian"
  | "harmonicMinor" | "melodicMinor" | "majorPentatonic" | "minorPentatonic" | "blues" | "chromatic";

type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
type Alter = -2 | -1 | 0 | 1 | 2;

export interface Spelled {
  midi: number;
  letter: Letter;
  alter: Alter;
  octave: number;
  /** "F♯" */
  name: string;
  /** "3", "♯4", "♭7" */
  degree: string;
}

export interface KeyContext {
  tonicPc: number;
  scale: ScaleId;
  /** display name, e.g. "E♭" */
  tonic: string;
  /** fifths: +2 = two sharps, -3 = three flats; 0 for chromatic */
  signature: number;
  /** pitch classes highlighted on the piano (the scale itself: a pentatonic has 5) */
  scalePcs: Set<number>;
  /** the 7-note scale degrees are counted against, in tonal spelling ("Eb") */
  reference: string[];
}

interface ScaleDef {
  id: ScaleId;
  name: string;
  /** degree of the parent major the tonic sits on (0 = major, 5 = natural minor) */
  mode: number;
  /** raise these reference degrees (0-based) by a semitone: harmonic and melodic minor */
  raise?: number[];
  /** semitones of the notes played, when not the reference scale itself */
  steps?: number[];
  noSignature?: boolean;
}

const DEFS: ScaleDef[] = [
  { id: "major", name: "Major", mode: 0 },
  { id: "minor", name: "Natural minor", mode: 5 },
  { id: "dorian", name: "Dorian", mode: 1 },
  { id: "phrygian", name: "Phrygian", mode: 2 },
  { id: "lydian", name: "Lydian", mode: 3 },
  { id: "mixolydian", name: "Mixolydian", mode: 4 },
  { id: "locrian", name: "Locrian", mode: 6 },
  { id: "harmonicMinor", name: "Harmonic minor", mode: 5, raise: [6] },
  { id: "melodicMinor", name: "Melodic minor", mode: 5, raise: [5, 6] },
  { id: "majorPentatonic", name: "Major pentatonic", mode: 0, steps: [0, 2, 4, 7, 9] },
  { id: "minorPentatonic", name: "Minor pentatonic", mode: 5, steps: [0, 3, 5, 7, 10] },
  { id: "blues", name: "Blues", mode: 5, steps: [0, 3, 5, 6, 7, 10] },
  { id: "chromatic", name: "Chromatic", mode: 0, steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], noSignature: true },
];

export const PIANO_SCALES: { id: ScaleId; name: string }[] = DEFS.map(({ id, name }) => ({ id, name }));

const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
/** fifths from the tonic of each major-scale degree */
const DEGREE_FIFTHS = [0, 2, 4, -1, 1, 3, 5];
const SHOW: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };

const mod = (n: number, m: number) => ((n % m) + m) % m;

interface Name { li: number; alter: number }

/** The note at `f` fifths from C on the line of fifths (F = -1, C = 0, G = 1, … C♯ = 7). */
const fromFifths = (f: number): Name => ({ li: LETTERS.indexOf("FCGDAEB"[mod(f + 1, 7)] as Letter), alter: Math.floor((f + 1) / 7) });
const pcOf = (n: Name) => mod(LETTER_PC[n.li] + n.alter, 12);
const show = (n: Name) => LETTERS[n.li] + SHOW[n.alter];
const tonal = (n: Name) => LETTERS[n.li] + (n.alter > 0 ? "#".repeat(n.alter) : "b".repeat(-n.alter));

interface Built extends KeyContext { tonicName: Name; ref: Name[] }

const cache = new Map<string, Built>();

function build(tonicPc: number, scale: ScaleId): Built {
  const def = DEFS.find((d) => d.id === scale) ?? DEFS[0];
  const pc = mod(tonicPc, 12);
  const parentPc = mod(pc - MAJOR_STEPS[def.mode], 12);
  const candidates: number[] = [];
  for (let f = -7; f <= 7; f++) if (mod(7 * f, 12) === parentPc) candidates.push(f);
  const tonicOf = (f: number) => fromFifths(f + DEGREE_FIFTHS[def.mode]);
  candidates.sort((a, b) => {
    if (Math.abs(a) !== Math.abs(b)) return Math.abs(a) - Math.abs(b);
    const ta = Math.abs(tonicOf(a).alter), tb = Math.abs(tonicOf(b).alter);
    if (ta !== tb) return ta - tb;
    const sharpFirst = pc === 6;
    return sharpFirst ? b - a : a - b;
  });
  const parent = candidates[0];
  const ref: Name[] = [];
  for (let i = 0; i < 7; i++) {
    const n = fromFifths(parent + DEGREE_FIFTHS[(def.mode + i) % 7]);
    ref.push(def.raise?.includes(i) ? { li: n.li, alter: n.alter + 1 } : n);
  }
  const steps = def.steps ?? ref.map((n) => mod(pcOf(n) - pc, 12));
  return {
    tonicPc: pc,
    scale: def.id,
    tonic: show(ref[0]),
    signature: def.noSignature ? 0 : parent,
    scalePcs: new Set(steps.map((s) => mod(pc + s, 12))),
    reference: ref.map(tonal),
    tonicName: ref[0],
    ref,
  };
}

export function makeKey(tonicPc: number, scale: ScaleId): KeyContext {
  const id = `${mod(tonicPc, 12)}:${scale}`;
  let k = cache.get(id);
  if (!k) cache.set(id, (k = build(tonicPc, scale)));
  return k;
}

const built = (key: KeyContext): Built => makeKey(key.tonicPc, key.scale) as Built;

function degreeOf(k: Built, n: Name): string {
  const d = mod(n.li - k.tonicName.li, 7);
  const diff = n.alter - k.ref[d].alter;
  return (SHOW[Math.max(-2, Math.min(2, diff))] ?? "") + String(d + 1);
}

function spelled(k: Built, midi: number, n: Name): Spelled {
  return {
    midi,
    letter: LETTERS[n.li],
    alter: n.alter as Alter,
    octave: (midi - n.alter - LETTER_PC[n.li]) / 12 - 1,
    name: show(n),
    degree: degreeOf(k, n),
  };
}

/** The note spelled with a given letter (chord tones are spelled from the chord's root). */
export function spellAs(key: KeyContext, midi: number, letter: Spelled["letter"]): Spelled {
  const li = LETTERS.indexOf(letter);
  let alter = mod(midi - LETTER_PC[li], 12);
  if (alter > 6) alter -= 12;
  return spelled(built(key), midi, { li, alter });
}

/**
 * Which degree each semitone above the tonic is written as when it is not in the scale: the fixed table
 * ♭2 ♭3 ♯4 ♭6 ♭7 (and 3, 6, 7 for the major-scale notes a minor or modal scale lacks), so a note outside
 * the key reads the same in every key.
 */
const DEGREE_OF_SEMITONE = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/** A single note in the key. Notes of the reference scale keep their spelling; any other note takes its degree from the fixed table. */
export function spellNote(key: KeyContext, midi: number): Spelled {
  const k = built(key);
  const pc = mod(midi, 12);
  const hit = k.ref.find((n) => pcOf(n) === pc);
  if (hit) return spelled(k, midi, hit);
  const li = mod(k.tonicName.li + DEGREE_OF_SEMITONE[mod(pc - k.tonicPc, 12)], 7);
  let alter = mod(pc - LETTER_PC[li], 12);
  if (alter > 6) alter -= 12;
  return spelled(k, midi, { li, alter });
}
