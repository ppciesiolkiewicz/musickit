import { buildArpeggio, type Arpeggio } from "./arpeggios";
import type { RootString, Shape } from "./shapes";
import { OPEN_MIDI, OPEN_NOTE, RICH_SHAPES, ROOT_INDEX, rootFretFor, type RichShape } from "./shapeTools";
import { degreeLabel, makeKeyContext, type KeyContext } from "@/features/theory/theory";

/**
 * The CAGED system: five open chord shapes (C, A, G, E, D) that can each be slid up the neck as a barre chord.
 * Each one pins down a "box" of the neck, and together the five boxes tile the whole fretboard, in the order C A G E D.
 */

export type CagedQuality = "major" | "minor";
export const CAGED_LETTERS = ["C", "A", "G", "E", "D"] as const;
export type CagedLetter = (typeof CAGED_LETTERS)[number];
export const NECK_END = 17;

interface FormDef {
  letter: CagedLetter;
  rs: RootString;
  /** fret offsets from the root fret, low E to high e (null = not played) */
  f: (number | null)[];
}

const N = null;
const MAJOR_FORMS: FormDef[] = [
  { letter: "C", rs: 5, f: [N, 0, -1, -3, -2, -3] },
  { letter: "A", rs: 5, f: [N, 0, 2, 2, 2, 0] },
  { letter: "G", rs: 6, f: [0, -1, -3, -3, -3, 0] },
  { letter: "E", rs: 6, f: [0, 2, 2, 1, 0, 0] },
  { letter: "D", rs: 4, f: [N, N, 0, 2, 3, 2] },
];
const MINOR_FORMS: FormDef[] = [
  { letter: "C", rs: 5, f: [N, 0, -2, -3, -2, N] },
  { letter: "A", rs: 5, f: [N, 0, 2, 2, 1, 0] },
  { letter: "G", rs: 6, f: [0, -2, -3, -3, 0, 0] },
  { letter: "E", rs: 6, f: [0, 2, 2, 0, 0, 0] },
  { letter: "D", rs: 4, f: [N, N, 0, 2, 3, 1] },
];
export const formsFor = (q: CagedQuality) => (q === "major" ? MAJOR_FORMS : MINOR_FORMS);

/** What the layers mean for each quality. All intervals are semitones above the key root. */
export const CAGED_THEORY: Record<CagedQuality, { scaleName: string; pentName: string; scale: number[]; pent: number[]; modeIndex: number }> = {
  major: { scaleName: "Major scale", pentName: "Major pentatonic", scale: [0, 2, 4, 5, 7, 9, 11], pent: [0, 2, 4, 7, 9], modeIndex: 0 },
  minor: { scaleName: "Natural minor scale", pentName: "Minor pentatonic", scale: [0, 2, 3, 5, 7, 8, 10], pent: [0, 3, 5, 7, 10], modeIndex: 5 },
};

/** The key as a KeyContext (major = Ionian, minor = Aeolian) so spelling and degrees match the rest of the site. */
export const cagedContext = (rootPc: number, q: CagedQuality): KeyContext => makeKeyContext(rootPc, 0, CAGED_THEORY[q].modeIndex);

export interface CagedBox {
  letter: CagedLetter;
  quality: CagedQuality;
  /** the movable chord shape, in the library's own format */
  shape: Shape;
  rootFret: number;
  /** absolute fret per string (low E first), null = not played, 0 = open */
  frets: (number | null)[];
  /** lowest and highest fretted note of the chord shape */
  lo: number;
  hi: number;
  /** the fret window of the scale box around the chord */
  from: number;
  to: number;
  chordName: string;
}

/** The five boxes for a root, ordered from the nut upwards. */
export function cagedBoxes(rootPc: number, quality: CagedQuality): CagedBox[] {
  const ctx = cagedContext(rootPc, quality);
  const boxes = formsFor(quality).map((def): CagedBox => {
    const nums = def.f.filter((v): v is number => v !== null);
    const minOff = Math.min(...nums);
    let rf = (rootPc - OPEN_NOTE[ROOT_INDEX[def.rs]] + 12) % 12;
    while (rf + minOff < 0) rf += 12;
    const frets = def.f.map((v) => (v === null ? null : rf + v));
    const played = frets.filter((v): v is number => v !== null);
    const fretted = played.filter((v) => v > 0);
    const lo = fretted.length ? Math.min(...fretted) : 0;
    const hi = Math.max(...played);
    const shape: Shape = { rs: def.rs, suf: quality === "minor" ? "m" : "", fam: quality, ext: "triad", f: def.f, tags: [], exp: quality === "minor" ? [0, 3, 7] : [0, 4, 7] };
    return {
      letter: def.letter, quality, shape, rootFret: rf, frets, lo, hi,
      from: Math.max(0, (played.includes(0) ? 0 : lo) - 1),
      to: Math.min(NECK_END, hi + 1),
      chordName: ctx.names[0] + shape.suf,
    };
  });
  return boxes.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
}

/** One position on the neck inside a box, with everything we know about it. */
export interface CagedCell {
  string: number; // 0 = low E
  fret: number;
  pc: number;
  midi: number;
  name: string;
  /** degree in the key: "1", "♭3", "5" */
  degreeText: string;
  /** semitones above the key root */
  semi: number;
  /** 0-based index in the 7-note scale, null if outside it */
  scaleDegree: number | null;
  inScale: boolean;
  inPent: boolean;
  /** a note of the arpeggio (triad or 7th) */
  arpRole: string | null;
  /** a note the chord shape actually plays here */
  inChord: boolean;
  isRoot: boolean;
}

export type ArpKind = "triad" | "seventh";

export function boxArpeggio(ctx: KeyContext, kind: ArpKind): Arpeggio {
  return buildArpeggio(ctx, 0, kind);
}

/** Every position in the box window, tagged with the layers it belongs to. */
export function boxCells(rootPc: number, quality: CagedQuality, box: CagedBox, arpKind: ArpKind): CagedCell[] {
  const ctx = cagedContext(rootPc, quality);
  const th = CAGED_THEORY[quality];
  const scalePcs = th.scale.map((s) => (rootPc + s) % 12);
  const pentPcs = new Set(th.pent.map((s) => (rootPc + s) % 12));
  const arp = boxArpeggio(ctx, arpKind);
  const out: CagedCell[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = box.from; f <= box.to; f++) {
      const midi = OPEN_MIDI[s] + f;
      const pc = midi % 12;
      const deg = scalePcs.indexOf(pc);
      const a = arp.notes.find((n) => n.pc === pc);
      out.push({
        string: s, fret: f, pc, midi,
        name: a ? a.name : deg >= 0 ? ctx.names[deg] : "",
        degreeText: degreeLabel(pc, ctx),
        semi: (pc - rootPc + 12) % 12,
        scaleDegree: deg >= 0 ? deg : null,
        inScale: deg >= 0,
        inPent: pentPcs.has(pc),
        arpRole: a ? a.role : null,
        inChord: box.frets[s] === f,
        isRoot: pc === rootPc,
      });
    }
  }
  return out;
}

/** Notes of each layer as plain text, for the summary under a box. */
export function layerNotes(rootPc: number, quality: CagedQuality, arpKind: ArpKind) {
  const ctx = cagedContext(rootPc, quality);
  const th = CAGED_THEORY[quality];
  const arp = boxArpeggio(ctx, arpKind);
  const nameAt = (semi: number) => ctx.names[th.scale.indexOf(semi)];
  return {
    scale: th.scale.map(nameAt),
    pent: th.pent.map(nameAt),
    arp: arp.notes.map((n) => `${n.name}`),
    arpTitle: arp.title,
  };
}

/** MIDI notes of a scale or pentatonic, one octave up and back to the root. */
export function ladderMidi(rootPc: number, semis: number[]): number[] {
  const base = 48 + rootPc;
  const up = [...semis.map((s) => base + s), base + 12];
  return [...up, ...up.slice(0, -1).reverse()];
}

const SUFFIXES: Record<CagedQuality, string[]> = {
  major: ["", "maj7", "6", "6/9", "maj9", "7", "9", "sus4", "sus2"],
  minor: ["m", "m7", "m6", "m9", "m11", "m(maj7)"],
};

export interface BoxChord {
  shape: RichShape;
  rootFret: number;
  name: string;
}

/** Library chords on this root whose whole shape sits inside the box window, easiest first. */
export function boxChords(rootPc: number, quality: CagedQuality, box: CagedBox): BoxChord[] {
  const ctx = cagedContext(rootPc, quality);
  const out: BoxChord[] = [];
  RICH_SHAPES.forEach((shape) => {
    if (!SUFFIXES[quality].includes(shape.suf) || shape.diff === "hard") return;
    const base = rootFretFor(shape, rootPc);
    for (const rf of [base, base + 12]) {
      const frets = shape.f.filter((v): v is number => v !== null).map((v) => rf + v);
      const fretted = frets.filter((v) => v > 0);
      if (!fretted.length || Math.min(...fretted) < box.from || Math.max(...frets) > box.to) continue;
      out.push({ shape, rootFret: rf, name: ctx.names[0] + shape.suf });
      break;
    }
  });
  const rank = { easy: 0, medium: 1, hard: 2 } as const;
  return out.sort((a, b) => rank[a.shape.diff] - rank[b.shape.diff] || SUFFIXES[quality].indexOf(a.shape.suf) - SUFFIXES[quality].indexOf(b.shape.suf) || a.shape.id - b.shape.id);
}

