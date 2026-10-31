"use client";

import { noteState, type Others, type Visibility } from "../../cues/visibility";
import { useCallback, useMemo } from "react";
import { PositionBox, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { findPentatonic, pentatonicContext } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { makeKeyContext, type KeyContext } from "@/features/theory/theory";
import { extraCells, pentatonicPositions, positionLine, positionsFor, scaleCells, type ExtraNote, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** A note from outside the scale, as an extra note of `ctx`: coloured as the scale degree just under it. */
function addedNote(ctx: KeyContext, pc: number): ExtraNote {
  const semi = (pc - ctx.tonic.pc + 12) % 12;
  const below = ctx.steps.map((s, d) => [s, d] as const).filter(([s]) => s <= semi).pop();
  return { degree: below ? below[1] : 0, semi, name: SHARP[pc], degreeText: SEMI_TEXT[semi] };
}

/**
 * The scale's positions on the neck, only the boxes asked for, with any added notes played in them; tap a note to hear
 * it, ▶ to run the box up and down.
 */
export function View({ slug, pc, boxes, add, highlight, mute, hide: hidden, others }: { slug: string; pc: number; boxes?: number[]; add?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others }) {
  // the marks are semitones above the key; the states work on pitch classes
  const vis = useMemo((): Visibility => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    return { highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hidden), add, others };
  }, [pc, highlight, mute, hidden, add, others]);
  const state = useCallback((p: number) => noteState(vis, p), [vis]);
  const litNames = [...new Set([...(vis.highlight ?? []), ...(add ?? [])])].filter((p) => state(p) === "highlighted").map((p) => SHARP[p]);
  const [system] = useLabelSystem();
  const { active, play, tap } = useNotePlayer();
  const { title, cells: allCells, positions: allPositions } = useMemo(() => {
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
    return { title: `${base.title} + ${add.map((n) => SHARP[n]).join(", ")}`, cells: [...base.cells, ...added], positions };
  }, [slug, pc, add]);
  // hidden notes leave the boxes and the rings, and the ▶ run
  const cells = useMemo(() => allCells.filter((c) => state(c.pc) !== "hidden"), [allCells, state]);
  const positions = useMemo(() => allPositions.map((p) => ({ ...p, notes: p.notes.filter((c) => state(c.pc) !== "hidden") })), [allPositions, state]);
  const shown = boxes?.length ? positions.filter((p) => boxes.includes(p.number)) : positions;
  const run = (p: ScalePosition) => {
    const up = positionLine(p).map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()]);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400">{title}{litNames.length ? ` · ${litNames.join(" ")} lit` : ""}{boxes?.length ? ` · box${boxes.length > 1 ? "es" : ""} ${boxes.join(" & ")}` : ""}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((p) => (
          <div key={p.number} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Box {p.number}</span>
              <button type="button" onClick={() => run(p)} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">▶ Play</button>
            </div>
            <PositionBox position={p} cells={cells} rings active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} states={state} />
          </div>
        ))}
      </div>
    </div>
  );
}
