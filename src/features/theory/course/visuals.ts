import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones, type ChordShapeChoice } from "@/lib/chordKit/chordShapes";
import { DEGREE_COLOURS, degreeColour } from "../scales";
import { MAJOR, rotate } from "../theory";
import type { TrackId } from "./outline";

/**
 * What each track of a stage shows next to its text: the same chord boxes, necks, circle and scale wheels the explorers use,
 * set up for that lesson. Pure data so the stage page stays a server component and the shapes can be tested.
 */
export interface Dot { string: number; fret: number; label: string; fill: string; big?: boolean }
export type Visual =
  | { kind: "chords"; caption: string; chords: { name: string; tag?: string; prefer?: string }[] }
  | { kind: "neck"; caption: string; from: number; to: number; dots: Dot[]; window?: { from: number; to: number }; legend: { label: string; colour: string }[] }
  | { kind: "circle"; caption: string }
  | { kind: "wheels"; caption: string; wheels: { name: string; mood: string; steps: number[] }[] };

/** Open-string pitch classes, low E (string 0) to high e. */
export const OPEN_PCS = [4, 9, 2, 7, 11, 4];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

/** The natural notes on some strings, each letter in its own colour so the same note is easy to spot on both strings. */
export function naturalDots(strings: number[], to: number): Dot[] {
  return strings.flatMap((s) => Array.from({ length: to + 1 }, (_, f) => f).flatMap((f) => {
    const li = NATURAL_PCS.indexOf((OPEN_PCS[s] + f) % 12);
    return li < 0 ? [] : [{ string: s, fret: f, label: LETTERS[li], fill: DEGREE_COLOURS[li], big: f === 0 }];
  }));
}

/** A scale on the neck between two frets, coloured and labelled by degree; `degrees` maps each step to its 0–6 degree and label. */
export function scaleDots(rootPc: number, steps: number[], degrees: { d: number; label: string }[], from: number, to: number): Dot[] {
  const out: Dot[] = [];
  for (let s = 0; s < 6; s++) for (let f = from; f <= to; f++) {
    const i = steps.indexOf((((OPEN_PCS[s] + f - rootPc) % 12) + 12) % 12);
    if (i >= 0) out.push({ string: s, fret: f, label: degrees[i].label, fill: degreeColour(degrees[i].d), big: degrees[i].d === 0 });
  }
  return out;
}

const PENT_MINOR = [0, 3, 5, 7, 10];
const PENT_DEGREES = [{ d: 0, label: "R" }, { d: 2, label: "♭3" }, { d: 3, label: "4" }, { d: 4, label: "5" }, { d: 6, label: "♭7" }];
const MAJOR_DEGREES = ["R", "2", "3", "4", "5", "6", "7"].map((label, d) => ({ d, label }));
const legendOf = (ds: { d: number; label: string }[]) => ds.map((x) => ({ label: x.label, colour: degreeColour(x.d) }));
const A = 9, G = 7;

const VISUALS: Record<string, Visual> = {
  "1-chords": {
    kind: "chords", caption: "The eight open chords. Tap one to hear it.",
    chords: ["Em", "Am", "C", "D", "G", "E", "A", "Dm"].map((name) => ({ name })),
  },
  "1-ear": {
    kind: "neck", caption: "Natural notes on the low E and A strings. Every barre chord later on starts from one of these.",
    from: 0, to: 12, dots: naturalDots([0, 1], 12), legend: LETTERS.map((l, i) => ({ label: l, colour: DEGREE_COLOURS[i] })),
  },
  "2-chords": {
    kind: "chords", caption: "Colour chords, 7ths and power chords. No barre needed.",
    chords: [{ name: "Fmaj7" }, { name: "B7" }, { name: "E7" }, { name: "A7" }, { name: "Cadd9" }, { name: "Asus2" }, { name: "Dsus4" }, { name: "E5", tag: "power" }],
  },
  "2-lead": {
    kind: "neck", caption: "A minor pentatonic, box 1, at the 5th fret. The roots are the big dots.",
    from: 3, to: 10, window: { from: 5, to: 8 }, dots: scaleDots(A, PENT_MINOR, PENT_DEGREES, 5, 8), legend: legendOf(PENT_DEGREES),
  },
  "2-ear": {
    kind: "neck", caption: "From an A on the low E string: the 4th, the 5th and the octave are the same shapes in every key.",
    from: 3, to: 9,
    dots: [
      { string: 0, fret: 5, label: "R", fill: degreeColour(0), big: true },
      { string: 1, fret: 5, label: "4", fill: degreeColour(3) },
      { string: 1, fret: 7, label: "5", fill: degreeColour(4) },
      { string: 2, fret: 7, label: "8", fill: degreeColour(0), big: true },
    ],
    legend: [{ label: "root", colour: degreeColour(0) }, { label: "4th", colour: degreeColour(3) }, { label: "5th", colour: degreeColour(4) }],
  },
  "3-chords": {
    kind: "chords", caption: "Two barre shapes, moved up the neck, play every major and minor chord.",
    chords: ([["F", "E-shape"], ["G", "E-shape"], ["F♯m", "E-shape"], ["B♭", "A-shape"], ["C", "A-shape"], ["Bm", "A-shape"]] as const).map(([name, tag]) => ({ name, tag, prefer: "barre" })),
  },
  "3-lead": {
    kind: "neck", caption: "A minor pentatonic over the whole neck. Box 1 is shaded; the other four boxes join on either side.",
    from: 0, to: 15, window: { from: 5, to: 8 }, dots: scaleDots(A, PENT_MINOR, PENT_DEGREES, 0, 15), legend: legendOf(PENT_DEGREES),
  },
  "3-ear": { kind: "circle", caption: "Pick a key: its chords light up, with its relative minor inside and its neighbours either side." },
  "4-chords": {
    kind: "chords", caption: "The jazz ii–V–I and its minor cousin, the changes of Autumn Leaves.",
    chords: ["Cm7", "F7", "B♭maj7", "E♭maj7", "Am7♭5", "D7", "Gm"].map((name) => ({ name })),
  },
  "4-lead": {
    kind: "neck", caption: "G major in the 2nd-position box, every degree in its own colour.",
    from: 1, to: 7, window: { from: 2, to: 5 }, dots: scaleDots(G, MAJOR, MAJOR_DEGREES, 2, 5), legend: legendOf(MAJOR_DEGREES),
  },
  "4-ear": {
    kind: "wheels", caption: "Three modes against plain major (dashed). The ringed note is the one that gives each mode its colour.",
    wheels: [
      { name: "Dorian", mood: "minor, but warm", steps: rotate(MAJOR, 1) },
      { name: "Mixolydian", mood: "bluesy major", steps: rotate(MAJOR, 4) },
      { name: "Lydian", mood: "dreamy, floating", steps: rotate(MAJOR, 3) },
    ],
  },
};

export const trackVisual = (stage: number, track: TrackId): Visual | undefined => VISUALS[`${stage}-${track}`];

/** The shape a lesson shows for a chord name: the simplest full voicing, or the first one tagged `prefer` (e.g. "barre"). */
export function lessonShape(name: string, prefer?: string): ChordShapeChoice | undefined {
  const q = parseChordQuery(name);
  if (!q) return undefined;
  const all = shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice);
  return (prefer && all.find((c) => c.shape.tags.includes(prefer))) || all[0];
}
