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
  /** 1 to 5: position 1 has the root on the low E string, D and high e; see `frames` */
  number: number;
  /** degree of its lowest note on the low E string */
  startDegree: number;
  /** low string to high, low note to high on each string */
  notes: ScaleCell[];
  from: number;
  to: number;
}

export type PositionKind = "pentatonic" | "scale";

interface Spot {
  string: number;
  fret: number;
  midi: number;
}

/** The regular pentatonic every mode's positions are laid out on: major (1 2 3 5 6) with a major 3rd, minor (1 ♭3 4 5 ♭7) without. */
const frameSemis = (steps: number[]) => (steps[2] === 4 ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]);

/**
 * The five boxes of the regular pentatonic on the key's root, two notes per string. Box k starts on the k-th note on the low E
 * string and climbs string by string, so the root falls on the same strings in every key: 1 on E, D and e; 2 on D and B; 3 on A
 * and B; 4 on A and G; 5 on G, E and e. Box 1 sits where the root is on the low E string (frets 0-11); the others climb from it,
 * and one that would run past fret 17 is played an octave lower. A note too low for the next string stays on its string, and
 * a box that starts at the nut (low E fret 0 or 1) takes in the open strings.
 */
function frames(ctx: KeyContext): Spot[][] {
  const semis = frameSemis(ctx.steps);
  const pcs = new Set(semis.map((x) => (ctx.tonic.pc + x) % 12));
  const inSet = (midi: number) => pcs.has(midi % 12);
  const spot = (string: number, fret: number): Spot => ({ string, fret, midi: OPEN_MIDI[string] + fret });
  const build = (lowFret: number) => {
    const line: number[] = [];
    for (let m = OPEN_MIDI[0] + lowFret; line.length < 24; m++) if (inSet(m)) line.push(m);
    const spots: Spot[] = [];
    let k = 0;
    for (let s = 0; s < 6; s++) {
      for (let n = 0; n < 2 || (s < 5 && line[k] < OPEN_MIDI[s + 1]); n++, k++) spots.push(spot(s, line[k] - OPEN_MIDI[s]));
      const lowest = Math.min(...spots.filter((x) => x.string === s).map((x) => x.fret));
      if (lowFret <= 1 && lowest > 0 && lowest <= 2 && inSet(OPEN_MIDI[s])) spots.push(spot(s, 0));
    }
    return spots;
  };
  const rootLow = (ctx.tonic.pc - OPEN_MIDI[0] + 120) % 12;
  return semis.map((semi) => {
    let low = (ctx.tonic.pc + semi - OPEN_MIDI[0] + 120) % 12;
    if (low < rootLow) low += 12;
    const spots = build(low);
    return low >= 12 && spots.some((x) => x.fret > SCALE_NECK_FRETS) ? build(low - 12) : spots;
  });
}

/**
 * Put the given degrees of the mode into each of the five boxes. Each string keeps the frets the regular pentatonic box uses on it,
 * one either side: the box's own notes stay where they are when the mode has them, and every other note of the mode that falls in
 * those frets is placed once, on the string where it sits inside the box's frets (then the string with fewer notes, then the lower).
 */
export function boxesFor(ctx: KeyContext, degrees: number[]): ScalePosition[] {
  const keep = new Set(degrees);
  return frames(ctx).map((frame, i) => {
    const notes: ScaleCell[] = [];
    const taken = new Set<number>();
    for (const sp of frame) {
      const c = cellAt(ctx, sp.string, sp.fret);
      if (c && keep.has(c.degree)) {
        notes.push(c);
        taken.add(c.midi);
      }
    }
    const range = [0, 1, 2, 3, 4, 5].map((s) => {
      const fr = frame.filter((x) => x.string === s).map((x) => x.fret);
      return { lo: Math.min(...fr), hi: Math.max(...fr) };
    });
    const options = new Map<number, { c: ScaleCell; inside: boolean }[]>();
    range.forEach(({ lo, hi }, s) => {
      for (let f = Math.max(0, lo - 1); f <= Math.min(SCALE_NECK_FRETS, hi + 1); f++) {
        const c = cellAt(ctx, s, f);
        if (!c || !keep.has(c.degree) || taken.has(c.midi)) continue;
        options.set(c.midi, [...(options.get(c.midi) ?? []), { c, inside: f >= lo && f <= hi }]);
      }
    });
    [...options.keys()].sort((a, b) => a - b).forEach((midi) => {
      const count = (s: number) => notes.filter((n) => n.string === s).length;
      const [best] = options.get(midi)!.sort((a, b) => Number(b.inside) - Number(a.inside) || count(a.c.string) - count(b.c.string) || a.c.string - b.c.string);
      notes.push(best.c);
    });
    notes.sort((a, b) => a.string - b.string || a.fret - b.fret);
    const frets = notes.map((n) => n.fret);
    return { number: i + 1, startDegree: notes[0].degree, notes, from: Math.min(...frets), to: Math.max(...frets) };
  });
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
  return boxesFor(ctx, kind === "pentatonic" ? pentatonicOf(ctx.steps).degrees : [0, 1, 2, 3, 4, 5, 6]);
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
