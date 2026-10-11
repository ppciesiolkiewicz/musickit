import { OPEN_MIDI } from "./shapeTools";
import { degreeLabel, type KeyContext } from "@/features/theory/theory";
import { degreeLabels } from "@/features/theory/scales";

/**
 * A scale on the guitar neck: every place its notes fall, and the five positions ("boxes") guitarists learn it in. The positions
 * are the pentatonic boxes, named by the strings the root is on; the full scale fills the mode's other notes into the same boxes.
 */

export const SCALE_NECK_FRETS = 17;

export interface Pentatonic {
  /** "Major pentatonic", "Minor pentatonic", or the formula when the scale has neither */
  name: string;
  /** 0-based scale degrees it keeps */
  degrees: number[];
  /** degree labels of those notes: "1 2 3 5 6" */
  formula: string[];
}

/**
 * The five-note scale inside a mode. With a major 3rd it drops the 4th and 7th (major pentatonic in Ionian, Lydian, Mixolydian),
 * with a minor 3rd the 2nd and 6th (minor pentatonic in Dorian, Phrygian, Aeolian). Other modes get the same cut, named by formula.
 */
export function pentatonicOf(steps: number[]): Pentatonic {
  const degrees = steps[2] === 4 ? [0, 1, 2, 4, 5] : [0, 2, 3, 4, 6];
  const semis = degrees.map((d) => steps[d]).join(",");
  const labels = degreeLabels(steps);
  const formula = degrees.map((d) => labels[d]);
  const name = semis === "0,2,4,7,9" ? "Major pentatonic" : semis === "0,3,5,7,10" ? "Minor pentatonic" : `Pentatonic ${formula.join(" ")}`;
  return { name, degrees, formula };
}

export interface ScaleCell {
  string: number; // 0 = low E
  fret: number;
  midi: number;
  pc: number;
  /** 0-based scale degree */
  degree: number;
  name: string;
  /** semitones above the key root */
  semi: number;
  degreeText: string;
}

const cellAt = (ctx: KeyContext, string: number, fret: number): ScaleCell | null => {
  const midi = OPEN_MIDI[string] + fret;
  const pc = midi % 12;
  const semi = (pc - ctx.tonic.pc + 12) % 12;
  const degree = ctx.steps.indexOf(semi);
  if (degree < 0) return null;
  return { string, fret, midi, pc, degree, name: ctx.names[degree], semi, degreeText: degreeLabel(pc, ctx) };
};

/** Every note of the scale on the neck, frets 0 to `to`. */
export function scaleCells(ctx: KeyContext, to = SCALE_NECK_FRETS): ScaleCell[] {
  const out: ScaleCell[] = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= to; f++) {
    const c = cellAt(ctx, s, f);
    if (c) out.push(c);
  }
  return out;
}

export interface ScalePosition {
  /** 1 to 5: position 1 starts on the root on the low E string, each next one on the next pentatonic note */
  number: number;
  /** scale degree it starts on (on the low E string); 0 is position 1 */
  startDegree: number;
  /** low string to high, low note to high on each string */
  notes: ScaleCell[];
  from: number;
  to: number;
}

export type PositionKind = "pentatonic" | "scale";

const inDegrees = (ctx: KeyContext, degrees: Set<number>) => (midi: number) => {
  const d = ctx.steps.indexOf((midi - ctx.tonic.pc + 120) % 12);
  return d >= 0 && degrees.has(d);
};

/**
 * The five pentatonic boxes, two notes per string. Box k starts on the k-th pentatonic note on the low E string and climbs string by
 * string, so the root always falls on the same strings: 1 on E, D and e; 2 on D and B; 3 on A and B; 4 on A and G; 5 on G, E and e.
 * Box 1 sits where the root is on the low E string (frets 0-11); the others climb from it, and one that would run past fret 17 is
 * played an octave lower. Next to the nut the open strings join the shape. A note too low for the next string stays on its string, so nothing goes below the nut. A pentatonic with
 * half steps (1 ♭2 3 5 ♭6) can leave a note one fret below a string's lowest note, such as the root or an open string: it belongs to
 * the box. Major and minor pentatonic have no half steps.
 */
export function pentatonicBoxes(ctx: KeyContext): ScalePosition[] {
  const degrees = pentatonicOf(ctx.steps).degrees;
  const inSet = inDegrees(ctx, new Set(degrees));
  const rootLow = (ctx.tonic.pc - OPEN_MIDI[0] + 120) % 12;
  const build = (lowFret: number) => {
    const line: number[] = [];
    for (let m = OPEN_MIDI[0] + lowFret; line.length < 24; m++) if (inSet(m)) line.push(m);
    const notes: ScaleCell[] = [];
    let k = 0;
    for (let s = 0; s < 6; s++) {
      for (let n = 0; n < 2 || (s < 5 && line[k] < OPEN_MIDI[s + 1]); n++, k++) notes.push(cellAt(ctx, s, line[k] - OPEN_MIDI[s])!);
    }
    for (let s = 0; s < 6; s++) {
      const lowest = Math.min(...notes.filter((n) => n.string === s).map((n) => n.fret));
      if (lowest > 0 && inSet(OPEN_MIDI[s] + lowest - 1)) notes.push(cellAt(ctx, s, lowest - 1)!);
      // next to the nut the open string is part of the shape
      else if (lowest > 0 && lowest <= 2 && inSet(OPEN_MIDI[s])) notes.push(cellAt(ctx, s, 0)!);
    }
    return notes;
  };
  const fits = (notes: ScaleCell[]) => notes.every((n) => n.fret <= SCALE_NECK_FRETS);
  const key = (notes: ScaleCell[]) => new Set(notes.map((n) => `${n.string}-${n.fret}`));
  const boxes: ScalePosition[] = [];
  degrees.forEach((startDegree, i) => {
    let low = (ctx.tonic.pc + ctx.steps[startDegree] - OPEN_MIDI[0] + 120) % 12;
    if (low < rootLow) low += 12;
    let notes = build(low);
    if (low >= 12 && !fits(notes)) notes = build((low -= 12));
    // at the nut a box of a pentatonic with half steps can come out the same as the one before: play it an octave away
    const mine = key(notes);
    if (boxes.some((b) => [...mine].every((k) => key(b.notes).has(k)))) {
      const up = build(low + 12);
      notes = fits(up) ? up : low >= 12 ? build(low - 12) : notes;
    }
    boxes.push(withSpan({ number: i + 1, startDegree, notes, from: 0, to: 0 }));
  });
  return boxes;
}

/**
 * The five positions of the full scale: each pentatonic box with the scale's other notes filled in where they fall inside it
 * (or one fret either side), each on the string next to its neighbours in pitch. These are the CAGED scale shapes.
 */
export function scaleBoxes(ctx: KeyContext): ScalePosition[] {
  const pentDegrees = new Set(pentatonicOf(ctx.steps).degrees);
  const isExtra = inDegrees(ctx, new Set([0, 1, 2, 3, 4, 5, 6].filter((d) => !pentDegrees.has(d))));
  return pentatonicBoxes(ctx).map((box) => {
    const line = positionLine(box);
    const notes = [...box.notes];
    // a narrow box can borrow a fret either side; a wide one stays inside its frets
    const reach = box.to - box.from <= 4 ? 1 : 0;
    for (let m = line[0].midi - 4; m <= line[line.length - 1].midi + 4; m++) {
      if (!isExtra(m)) continue;
      const below = [...line].reverse().find((n) => n.midi < m);
      const near = below ? below.string : 0;
      const options = [0, 1, 2, 3, 4, 5]
        .map((s) => ({ s, f: m - OPEN_MIDI[s] }))
        .filter(({ f }) => f >= 0 && f <= SCALE_NECK_FRETS && f >= box.from - reach && f <= box.to + reach)
        .map(({ s, f }) => ({ s, f, cost: (f < box.from || f > box.to ? 10 : 0) + (s === near ? 0 : s === near + 1 ? 1 : 2 + Math.abs(s - near)) }))
        .sort((a, b) => a.cost - b.cost);
      if (options.length) notes.push(cellAt(ctx, options[0].s, options[0].f)!);
    }
    return withSpan({ ...box, notes });
  });
}

function withSpan(p: ScalePosition): ScalePosition {
  const notes = p.notes.slice().sort((a, b) => a.string - b.string || a.fret - b.fret);
  const frets = notes.map((n) => n.fret);
  return { ...p, notes, from: Math.min(...frets), to: Math.max(...frets) };
}

/** The strings (0 = low E) a position has the root on: the quickest way to tell the boxes apart and find where each one sits. */
export const rootStrings = (p: ScalePosition): number[] => [...new Set(p.notes.filter((n) => n.degree === 0).map((n) => n.string))].sort((a, b) => a - b);

/** The notes of a position from the lowest to the highest, each pitch once (an open string and the same note fretted sound alike). */
export function positionLine(p: ScalePosition): ScaleCell[] {
  const seen = new Set<number>();
  return p.notes.slice().sort((a, b) => a.midi - b.midi || a.string - b.string).filter((n) => !seen.has(n.midi) && seen.add(n.midi));
}

/** The five positions for one kind: pentatonic boxes, or the full scale filled into them. */
export function positionsFor(ctx: KeyContext, kind: PositionKind): ScalePosition[] {
  return kind === "pentatonic" ? pentatonicBoxes(ctx) : scaleBoxes(ctx);
}

/** A position played up and back down, as MIDI. */
export function positionMidi(p: ScalePosition): number[] {
  const up = positionLine(p).map((n) => n.midi);
  return [...up, ...up.slice(0, -1).reverse()];
}

/** The scale one octave up from the root and back, starting at the root nearest middle C. */
export function scaleLineMidi(ctx: KeyContext, base = 60): number[] {
  const root = base + ctx.tonic.pc;
  const up = [...ctx.steps.map((s) => root + s), root + 12];
  return [...up, ...up.slice(0, -1).reverse()];
}
