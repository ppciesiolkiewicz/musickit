import { findPentatonic, pentatonicContext } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { makeKeyContext, type KeyContext } from "@/features/theory/theory";
import { extraCells, pentatonicPositions, positionsFor, scaleCells, type ExtraNote, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";

export const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const cellKey = (c: { string: number; fret: number }) => `${c.string}-${c.fret}`;
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** A note from outside the scale, as an extra note of `ctx`: coloured as the scale degree just under it. */
function addedNote(ctx: KeyContext, pc: number): ExtraNote {
  const semi = (pc - ctx.tonic.pc + 12) % 12;
  const below = ctx.steps.map((s, d) => [s, d] as const).filter(([s]) => s <= semi).pop();
  return { degree: below ? below[1] : 0, semi, name: SHARP[pc], degreeText: SEMI_TEXT[semi] };
}

/** A box moved along the neck by `shift` frets (an octave down: -12), its notes with it. */
export function shiftPosition(p: ScalePosition, shift: number): ScalePosition {
  if (!shift) return p;
  const notes = p.notes.map((c) => ({ ...c, fret: c.fret + shift, midi: c.midi + shift }));
  return { number: p.number, startDegree: p.startDegree, notes, from: p.from + shift, to: p.to + shift };
}

/**
 * The scale (a pentatonic or mode slug) in key `pc` on the neck: its title, every note on the neck and its five positions,
 * with the `add`ed pitch classes from outside the scale played wherever they fall inside each position's frets, and the key
 * it is cut from (a pentatonic's major or minor key), whose chords `chords` finds in the positions.
 */
export function scaleBoxes(slug: string, pc: number, add?: number[]): { title: string; ctx: KeyContext; cells: ScaleCell[]; positions: ScalePosition[] } {
  const pent = findPentatonic(slug);
  let base: { title: string; ctx: KeyContext; cells: ScaleCell[]; positions: ScalePosition[] };
  if (pent) {
    const p = pentatonicContext(pc, pent);
    const t = p.tones.find((x) => x.blue);
    const blue = t && { degree: t.degree, semi: t.semis, name: t.name, degreeText: t.label };
    base = { title: p.title, ctx: p.host, cells: [...scaleCells(p.host), ...(blue ? extraCells(p.host, blue) : [])], positions: pentatonicPositions(p.host, p.degrees, blue).positions };
  } else {
    const m = findModePage(slug)!;
    const ctx = makeKeyContext(pc, m.familyIndex, m.modeIndex);
    base = { title: `${ctx.names[0]} ${ctx.modeName}`, ctx, cells: scaleCells(ctx), positions: positionsFor(ctx, "scale") };
  }
  if (!add?.length) return base;
  // added notes are played: each goes into every box wherever it falls inside the box's frets
  const added = add.flatMap((n) => extraCells(base.ctx, addedNote(base.ctx, n)));
  const positions = base.positions.map((p) => {
    const from = p.from <= 1 ? 0 : p.from;
    const have = new Set(p.notes.map(cellKey));
    return { ...p, notes: [...p.notes, ...added.filter((c) => c.fret >= from && c.fret <= p.to && !have.has(cellKey(c)))] };
  });
  return { title: `${base.title} + ${add.map((n) => SHARP[n]).join(", ")}`, ctx: base.ctx, cells: [...base.cells, ...added], positions };
}
