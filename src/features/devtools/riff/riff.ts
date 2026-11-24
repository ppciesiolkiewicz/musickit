import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { KeyContext } from "@/features/theory/theory";
import { MAX_FRET, columnsOf, midiOf, riffTimeline, type Column, type RiffNote } from "@/features/exercises/riffs/riff";

// the riff itself (its notes, steps and timeline) lives with the exercises that play it
export { MAX_FRET, columnsOf, midiOf, riffTimeline, type Column, type RiffNote };

/** Index of the first note of the column note `i` sits in. */
export const headOf = (notes: RiffNote[], i: number): number => { while (i > 0 && notes[i]?.with) i--; return i; };

export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];


export const inScale = (ctx: KeyContext, midi: number) => ctx.steps.includes((midi - ctx.tonic.pc + 120) % 12);

/** Every place a pitch sits on the neck, low string first. */
export const placesOf = (midi: number): { string: number; fret: number }[] =>
  OPEN_MIDI.map((open, string) => ({ string, fret: midi - open })).filter((p) => p.fret >= 0 && p.fret <= MAX_FRET);

/** The best place for a pitch near a fret: closest to `near`, then the higher string. */
export function placeNear(midi: number, near: number): { string: number; fret: number } | null {
  const opts = placesOf(midi);
  opts.sort((a, b) => Math.abs(a.fret - near) - Math.abs(b.fret - near) || b.string - a.string);
  return opts[0] ?? null;
}

/** The next scale pitch above (dir 1) or below (dir -1) a pitch. */
export function scaleStep(ctx: KeyContext, midi: number, dir: 1 | -1): number {
  let m = midi + dir;
  while (!inScale(ctx, m)) m += dir;
  return m;
}

/** The pitch of a scale degree (0-based) nearest to `midi`. */
export function degreeNear(ctx: KeyContext, degree: number, midi: number): number {
  const pc = (ctx.tonic.pc + ctx.steps[degree]) % 12;
  let best = midi;
  let dist = 99;
  for (let m = midi - 6; m <= midi + 6; m++) if (((m % 12) + 12) % 12 === pc && Math.abs(m - midi) < dist) { best = m; dist = Math.abs(m - midi); }
  return best;
}

/** Plain-text tab, high e on top, one column per time step, dashes padded by length. */
export function asciiTab(notes: RiffNote[]): string {
  const rows = STRING_NAMES.map((n) => `${n}|`).reverse();
  let beat = 0;
  for (const col of columnsOf(notes)) {
    const w = Math.max(2, Math.round(col.beats * 4)) + 1;
    for (let r = 0; r < 6; r++) {
      const hit = col.idx.map((i) => notes[i]).find((n) => n.string === 5 - r);
      rows[r] += (hit?.fret == null ? "" : String(hit.fret)).padEnd(w, "-");
    }
    beat += col.beats;
    if (Math.abs(beat % 4) < 1e-6) for (let r = 0; r < 6; r++) rows[r] += "|";
  }
  return rows.join("\n");
}

/** A note of a shape: `d` strings above the root's, `semi` semitones or `steps` scale steps above the root. */
export interface ShapePart { d: number; semi?: number; steps?: number }
export interface RiffShape { id: string; label: string; parts: ShapePart[] }

export const SHAPES: RiffShape[] = [
  { id: "note", label: "Single note", parts: [{ d: 0, semi: 0 }] },
  { id: "power", label: "Power chord (R 5)", parts: [{ d: 0, semi: 0 }, { d: 1, semi: 7 }] },
  { id: "power8", label: "Power chord + octave", parts: [{ d: 0, semi: 0 }, { d: 1, semi: 7 }, { d: 2, semi: 12 }] },
  { id: "octave", label: "Octave (skip a string)", parts: [{ d: 0, semi: 0 }, { d: 2, semi: 12 }] },
  { id: "3rds", label: "3rd in the scale", parts: [{ d: 0, semi: 0 }, { d: 1, steps: 2 }] },
  { id: "4ths", label: "4th in the scale", parts: [{ d: 0, semi: 0 }, { d: 1, steps: 3 }] },
  { id: "6ths", label: "6th in the scale (skip a string)", parts: [{ d: 0, semi: 0 }, { d: 2, steps: 5 }] },
  { id: "triad", label: "Triad in the scale", parts: [{ d: 0, semi: 0 }, { d: 1, steps: 2 }, { d: 2, steps: 4 }] },
  { id: "maj", label: "Major triad", parts: [{ d: 0, semi: 0 }, { d: 1, semi: 4 }, { d: 2, semi: 7 }] },
  { id: "min", label: "Minor triad", parts: [{ d: 0, semi: 0 }, { d: 1, semi: 3 }, { d: 2, semi: 7 }] },
];

/** The shape's notes with its root at string/fret, or null when a note falls off the neck. */
export function shapeAt(ctx: KeyContext, shape: RiffShape, string: number, fret: number): { string: number; fret: number }[] | null {
  const root = OPEN_MIDI[string] + fret;
  const out: { string: number; fret: number }[] = [];
  for (const p of shape.parts) {
    const s = string + p.d;
    if (s > 5) return null;
    let m = root + (p.semi ?? 0);
    for (let k = 0; k < (p.steps ?? 0); k++) m = scaleStep(ctx, m, 1);
    const f = m - OPEN_MIDI[s];
    if (f < 0 || f > MAX_FRET) return null;
    out.push({ string: s, fret: f });
  }
  return out;
}

/** A riff note placed in a take: seconds from the take's start, its pitch and where the riff puts it on the neck. */
export interface Timed { start: number; end: number; midi: number; string: number; fret: number }

/** The riff's notes in seconds, beat 1 at `downbeat` seconds, at `bpm`. Rests are left out; notes played together share a start. */
export function riffTimes(notes: RiffNote[], bpm: number, downbeat = 0): Timed[] {
  const sec = 60 / bpm;
  return columnsOf(notes).flatMap((c) => c.idx.flatMap((i) => {
    const n = notes[i], midi = midiOf(n);
    if (midi === null) return [];
    const start = downbeat + c.start * sec;
    return [{ start, end: start + n.beats * sec, midi, string: n.string!, fret: n.fret! }];
  }));
}
