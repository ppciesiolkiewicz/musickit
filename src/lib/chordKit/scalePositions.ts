import { OPEN_MIDI } from "./shapeTools";
import { degreeLabel, type KeyContext } from "@/features/theory/theory";
import { degreeLabels } from "@/features/theory/scales";

/**
 * A scale on the guitar neck: every place its notes fall, and the positions ("boxes") guitarists learn it in.
 * Pentatonic boxes take two notes per string, the full scale three notes per string. Position 1 starts on the root on the
 * low E string; each next position starts on the next note of the scale, so they climb the neck and link up (wrapping back
 * towards the nut when the next one would run off the top of the neck).
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
  /** 1-based */
  number: number;
  /** scale degree it starts on (on the low E string) */
  startDegree: number;
  /** low string to high, low note to high on each string */
  notes: ScaleCell[];
  from: number;
  to: number;
}

export type PositionKind = "pentatonic" | "threeNps";

/**
 * The positions of a scale (or of the given subset of its degrees), `perString` notes on each string.
 * Each starts on one of the notes on the low E string and climbs the scale from there, string by string.
 */
export function scalePositions(ctx: KeyContext, degrees: number[], perString: number): ScalePosition[] {
  const keep = new Set(degrees);
  const inSet = (midi: number) => {
    const d = ctx.steps.indexOf((midi - ctx.tonic.pc + 120) % 12);
    return d >= 0 && keep.has(d);
  };
  const rootLow = (ctx.tonic.pc - OPEN_MIDI[0] + 120) % 12;
  return degrees.map((startDegree, i) => {
    const startPc = (ctx.tonic.pc + ctx.steps[startDegree]) % 12;
    const build = (lowFret: number) => {
      const line: number[] = [];
      for (let m = OPEN_MIDI[0] + lowFret; line.length < 6 * perString; m++) if (inSet(m)) line.push(m);
      return line.map((midi, k) => {
        const s = Math.floor(k / perString);
        return cellAt(ctx, s, midi - OPEN_MIDI[s])!;
      });
    };
    const low = (startPc - OPEN_MIDI[0] + 120) % 12;
    let notes = build(low);
    // a box that starts near the nut can need a note below the open string, and a box below position 1 reads better above it
    // (so they climb the neck in order): play those an octave up, as long as they still fit on the neck
    const up = build(low + 12);
    const fits = up.every((n) => n.fret <= SCALE_NECK_FRETS);
    if (notes.some((n) => n.fret < 0) || (low < rootLow && fits)) notes = up;
    const frets = notes.map((n) => n.fret);
    return { number: i + 1, startDegree, notes, from: Math.min(...frets), to: Math.max(...frets) };
  });
}

/** The positions for one kind: pentatonic boxes (2 notes per string) or the whole scale at 3 notes per string. */
export function positionsFor(ctx: KeyContext, kind: PositionKind): ScalePosition[] {
  return kind === "pentatonic" ? scalePositions(ctx, pentatonicOf(ctx.steps).degrees, 2) : scalePositions(ctx, [0, 1, 2, 3, 4, 5, 6], 3);
}

/** A position played up and back down, as MIDI. */
export function positionMidi(p: ScalePosition): number[] {
  const up = p.notes.map((n) => n.midi);
  return [...up, ...up.slice(0, -1).reverse()];
}

/** The scale one octave up from the root and back, starting at the root nearest middle C. */
export function scaleLineMidi(ctx: KeyContext, base = 60): number[] {
  const root = base + ctx.tonic.pc;
  const up = [...ctx.steps.map((s) => root + s), root + 12];
  return [...up, ...up.slice(0, -1).reverse()];
}
