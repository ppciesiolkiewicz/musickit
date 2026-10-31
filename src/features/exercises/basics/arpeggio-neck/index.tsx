"use client";

import type { Others } from "../../cues/visibility";
import { useMemo } from "react";
import { PositionBox, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { ScaleCell, ScalePosition } from "@/lib/chordKit/scalePositions";
import type { Degree } from "../../timeline/types";
import { arpeggioPartNotes } from "../arpeggio";

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
/** semitones above the root to the 0-based degree whose colour the dot takes */
const SEMI_DEGREE = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6];

/**
 * A chord's arpeggio in one box, or two neighbouring boxes drawn as one with the shared notes ringed (the seam); only the
 * `part` asked for; tap a note to hear it, ▶ to run it up and down.
 */
export function View({ chord, boxes, part, highlight, others }: { chord: string; boxes?: number[]; part?: Degree[]; highlight?: number[]; others?: Others }) {
  const [system] = useLabelSystem();
  const { active, play, tap } = useNotePlayer();
  const rootPc = parseChordQuery(chord)?.rootPc ?? 0;
  const lit = useMemo(() => (highlight?.length ? new Set(highlight.map((semi) => (rootPc + semi) % 12)) : undefined), [highlight, rootPc]);
  const { position, seam } = useMemo(() => {
    const all = arpeggioPartNotes(chord, { part, boxes });
    const kept = others === "hidden" && lit ? all.filter((n) => lit.has(n.midi % 12)) : all;
    const notes: ScaleCell[] = kept.map((n) => ({ string: n.string, fret: n.fret, midi: n.midi, pc: n.midi % 12, degree: SEMI_DEGREE[n.semis], name: SHARP[n.midi % 12], semi: n.semis, degreeText: SEMI_TEXT[n.semis] }));
    const frets = notes.map((n) => n.fret);
    const position: ScalePosition | null = notes.length ? { number: boxes?.[0] ?? 1, startDegree: 0, notes, from: Math.min(...frets), to: Math.max(...frets) } : null;
    return { position, seam: new Set(kept.filter((n) => n.seam).map(cellKey)) };
  }, [chord, part, boxes, others, lit]);
  if (!position) return <p className="text-xs text-slate-500">No arpeggio for {chord}.</p>;
  const run = () => {
    const up = position.notes.map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()]);
  };
  const shown = boxes?.length ? boxes : [1];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span>{chord} arpeggio · box{shown.length > 1 ? "es" : ""} {shown.join(" & ")}{part?.length ? ` · ${part.join(" ")}` : ""}{seam.size ? " · dashed rings: the notes both boxes share" : ""}</span>
        <button type="button" onClick={run} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">▶ Play</button>
      </div>
      <PositionBox position={position} cells={[]} rings={false} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} highlight={lit} seam={seam} />
    </div>
  );
}
