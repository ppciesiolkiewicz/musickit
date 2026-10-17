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

export type PositionKind = "pentatonic" | "scale" | "3nps";

interface Spot {
  string: number;
  fret: number;
  midi: number;
}

/**
 * The five classic minor pentatonic boxes, as fret offsets from the root on the low E string, two per string (low E to high e).
 * In A minor (root at fret 5) they are the boxes at frets 5-8, 7-10, 9-13, 12-15 and 14-17. The root falls on the same strings in
 * every key: 1 on E, D and e; 2 on D and B; 3 on A and B; 4 on A and G; 5 on G, E and e.
 */
export const MINOR_PENTATONIC_BOXES: [number, number][][] = [
  [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
  [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
  [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]],
  [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]],
  [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]],
];

/**
 * The five classic major pentatonic boxes, the same way. They are the minor boxes of the relative minor (three frets lower), taken
 * from its second box so that box 1 again has the root on E, D and e: in C major (root at fret 8) the boxes at frets 7-10, 9-13,
 * 12-15, 14-17 and 17-20.
 */
export const MAJOR_PENTATONIC_BOXES: [number, number][][] = [1, 2, 3, 4, 0].map((k, i) =>
  MINOR_PENTATONIC_BOXES[k].map(([a, b]): [number, number] => [a - 3 + (i === 4 ? 12 : 0), b - 3 + (i === 4 ? 12 : 0)]),
);

/**
 * The frets of the five boxes for this key: the major pentatonic boxes when the mode has a major 3rd, the minor ones when not.
 * Each sits at the root's fret on the low E string. A box that dips below the nut keeps its place when every note that would fall
 * there can move to the next lower string (E major box 1 is the open position, its G♯, C♯ and F♯ played at the 4th fret a string
 * down); otherwise it moves an octave up. One that would run past fret 17 moves an octave down. So position 1 in E is always open.
 */
function frames(ctx: KeyContext): Spot[][] {
  const boxes = ctx.steps[2] === 4 ? MAJOR_PENTATONIC_BOXES : MINOR_PENTATONIC_BOXES;
  const root = (ctx.tonic.pc - OPEN_MIDI[0] + 120) % 12;
  const place = (box: [number, number][], base: number) =>
    box.flatMap(([a, b], s) => [a, b].map((o) => ({ string: s, fret: base + o, midi: OPEN_MIDI[s] + base + o })));
  /** The spots below the nut moved a string down, or null when one cannot move (on the low E, or still below the nut). */
  const lowered = (spots: Spot[]): Spot[] | null => {
    const out: Spot[] = [];
    for (const sp of spots) {
      if (out.some((o) => o.midi === sp.midi)) continue;
      if (sp.fret >= 0) out.push(sp);
      else if (sp.string > 0 && sp.midi - OPEN_MIDI[sp.string - 1] >= 0) out.push({ string: sp.string - 1, fret: sp.midi - OPEN_MIDI[sp.string - 1], midi: sp.midi });
      else return null;
    }
    return out;
  };
  return boxes.map((box) => {
    const offs = box.flat();
    let base = root;
    if (base + Math.min(...offs) < 0) {
      const open = lowered(place(box, base));
      if (open) return open;
      base += 12;
    }
    if (base + Math.max(...offs) > SCALE_NECK_FRETS && base - 12 + Math.min(...offs) >= 0) base -= 12;
    return place(box, base);
  });
}

/**
 * Put the given degrees of the mode into each of the five boxes. Each string keeps the frets the regular pentatonic box uses on it,
 * one either side: the box's own notes stay where they are when the mode has them, and every other note of the mode that falls in
 * those frets is placed once, on the string where it sits inside the box's frets (then the string with fewer notes, then the
 * lower). A filled-in note left 4 frets or more from the rest of its string then moves (or the note it stretches from does) to a
 * string where it sits next to the others.
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
    // a filled-in note 4 frets or more from everything else on its string (three empty frets between) moves to a string where it sits
    // next to the other notes, when it has one: C at the 1st fret of the B string rather than a stretch from G♯ to C on the G string.
    // When it has nowhere closer, the lone note it stretches from moves instead, unless that is a root (roots name the position).
    const [boxFrom, boxTo] = [Math.min(...notes.map((n) => n.fret)), Math.max(...notes.map((n) => n.fret))];
    const others = (c: ScaleCell) => notes.filter((n) => n !== c && n.string === c.string);
    const alone = (c: ScaleCell) => others(c).length > 0 && others(c).every((n) => Math.abs(n.fret - c.fret) >= 4);
    const nearOn = (c: ScaleCell) => notes.some((m) => m.string === c.string && Math.abs(m.fret - c.fret) < 4);
    const elsewhere = (n: ScaleCell) => [0, 1, 2, 3, 4, 5]
      .filter((s) => s !== n.string)
      .sort((a, b) => Math.abs(a - n.string) - Math.abs(b - n.string))
      .map((s) => cellAt(ctx, s, n.midi - OPEN_MIDI[s]))
      .find((c): c is ScaleCell => !!c && c.fret >= boxFrom && c.fret <= boxTo && nearOn(c));
    notes.slice().forEach((n) => {
      if (!options.has(n.midi) || !alone(n)) return;
      const near = options.get(n.midi)!.map((o) => o.c).find((c) => c.string !== n.string && nearOn(c));
      if (near) return notes.splice(notes.indexOf(n), 1, near);
      const partner = others(n);
      if (partner.length !== 1 || partner[0].degree === 0) return;
      const moved = elsewhere(partner[0]);
      if (moved) notes.splice(notes.indexOf(partner[0]), 1, moved);
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

/**
 * The seven three-notes-per-string patterns, one starting on each degree on the low E string. Climbing the scale from there, every
 * string takes the next three notes, each at the fret its pitch falls on that string (so the B string's shift comes out by itself).
 * A pattern starts at its degree's lowest fret on the low E (0 to 11), or an octave up when that would put a note below the nut.
 * They are numbered up the neck, so position 1 is the one nearest the nut.
 */
export function threeNotesPerString(ctx: KeyContext): ScalePosition[] {
  const build = (startFret: number): ScaleCell[] => {
    const start = OPEN_MIDI[0] + startFret;
    const startSemi = (start - ctx.tonic.pc + 120) % 12;
    const d0 = ctx.steps.indexOf(startSemi);
    const out: ScaleCell[] = [];
    for (let i = 0; i < 18; i++) {
      const d = d0 + i;
      const midi = start - ctx.steps[d0] + ctx.steps[d % 7] + 12 * Math.floor(d / 7);
      const string = Math.floor(i / 3);
      out.push(cellAt(ctx, string, midi - OPEN_MIDI[string])!);
    }
    return out;
  };
  return ctx.steps
    .map((st, degree) => {
      const lowest = (ctx.tonic.pc + st - OPEN_MIDI[0] + 120) % 12;
      let notes = build(lowest);
      // a wide step (the augmented 2nd of harmonic minor) can push a pattern that starts at the nut below it: play it an octave up
      if (notes.some((n) => n.fret < 0)) notes = build(lowest + 12);
      const frets = notes.map((n) => n.fret);
      return { number: 0, startDegree: degree, notes, from: Math.min(...frets), to: Math.max(...frets) };
    })
    .sort((a, b) => a.from - b.from)
    .map((p, i) => ({ ...p, number: i + 1 }));
}

/** The positions for one kind: the five pentatonic boxes, the full scale filled into them, or the seven three-notes-per-string patterns. */
export function positionsFor(ctx: KeyContext, kind: PositionKind): ScalePosition[] {
  if (kind === "3nps") return threeNotesPerString(ctx);
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
