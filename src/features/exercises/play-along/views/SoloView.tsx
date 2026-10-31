"use client";

import { useMemo } from "react";
import { ScaleNeck, cellKey, type DotState } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { noteLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { SCALE_NECK_FRETS, type ScaleCell } from "@/lib/chordKit/scalePositions";
import type { SoloTargets } from "../solo";
import { cellOf, noteOf } from "./common";

/**
 * Solo-over: the chord sounding now, its scale on the neck with the targets highlighted (the rest muted, or hidden),
 * or as note labels. Labels count from the chord root and follow the label setting. No fixed notes to follow: the
 * student improvises around the highlighted ones.
 */
export default function SoloView({ targets, mode, others }: { targets: SoloTargets; mode: "neck" | "notes" | "tab"; others: "muted" | "hidden" }) {
  const [system] = useLabelSystem();
  const { active, tap } = useNotePlayer();
  const root = parseChordQuery(targets.chord)?.rootPc ?? 0;
  const lit = useMemo(() => new Set(targets.lit), [targets.lit]);
  const shown = others === "hidden" ? targets.lit : targets.pcs;
  const cells = useMemo(() => {
    const keep = new Set(shown);
    const out: ScaleCell[] = [];
    for (let s = 0; s < 6; s++) for (let f = 0; f <= SCALE_NECK_FRETS; f++) {
      const c = cellOf(s, f, root);
      if (keep.has(c.pc)) out.push(c);
    }
    return out;
  }, [shown, root]);
  if (mode === "notes")
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">Over {targets.chord}, aim for</span>
        {shown.map((pc) => {
          const n = noteOf(pc, root);
          return <span key={pc} className={`rounded-md border px-1.5 py-0.5 font-mono ${lit.has(pc) ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-800 text-slate-500"}`}>{noteLabel(system, n)}</span>;
        })}
      </div>
    );
  const states = (c: ScaleCell): DotState => (lit.has(c.pc) ? "highlighted" : "muted");
  return (
    <div className="flex flex-col gap-1">
      {mode === "tab" && <p className="text-[11px] text-slate-500">Improvise: no fixed tab. Aim for the ringed notes over {targets.chord}.</p>}
      <ScaleNeck cells={cells} big={() => true} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title={`Notes to aim for over ${targets.chord}`} states={states} />
    </div>
  );
}
