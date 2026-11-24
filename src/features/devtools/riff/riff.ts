import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { KeyContext } from "@/features/theory/theory";

/** One riff note on the neck: string 0 is the low E. A rest has no string or fret. */
export interface RiffNote {
  string: number | null;
  fret: number | null;
  beats: number;
}

export const MAX_FRET = 17;
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

export const midiOf = (n: RiffNote): number | null => (n.string === null || n.fret === null ? null : OPEN_MIDI[n.string] + n.fret);

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

/** Plain-text tab, high e on top, one column per note, dashes padded by length. */
export function asciiTab(notes: RiffNote[]): string {
  const rows = STRING_NAMES.map((n) => `${n}|`).reverse();
  let beat = 0;
  for (const n of notes) {
    const cell = n.fret === null ? "" : String(n.fret);
    const w = Math.max(2, Math.round(n.beats * 4)) + 1;
    for (let r = 0; r < 6; r++) {
      const s = 5 - r;
      const txt = n.string === s ? cell : "";
      rows[r] += txt.padEnd(w, "-");
    }
    beat += n.beats;
    if (Math.abs(beat % 4) < 1e-6) for (let r = 0; r < 6; r++) rows[r] += "|";
  }
  return rows.join("\n");
}
