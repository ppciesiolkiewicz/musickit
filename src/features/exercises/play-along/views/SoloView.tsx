"use client";

import { useMemo } from "react";
import { ScaleNeck, cellKey, type DotState } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { noteLabel } from "@/features/theory/labels";
import { useLabelRoot, useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { SCALE_NECK_FRETS, type ScaleCell } from "@/lib/chordKit/scalePositions";
import type { SoloTargets } from "../solo";
import { cellOf, noteOf } from "./common";

/**
 * Improvising (solo-over, two-scales): one fixed set of notes on the whole neck for the whole exercise, so nothing
 * jumps when the chord changes. Only the highlight moves, to the sounding chord's targets (its tones when it has
 * none); in a scale switch the notes outside the scale playing now are muted. `others: "hidden"` leaves only the highlighted notes. Labels count from
 * the key or the chord root, by the label setting; tap a note to hear it.
 */
export default function SoloView({ targets, mode, others, keyPc }: { targets: SoloTargets; mode: "neck" | "notes" | "tab"; others: "muted" | "hidden"; keyPc?: number }) {
  const [system] = useLabelSystem();
  const [from] = useLabelRoot();
  const { active, tap } = useNotePlayer();
  const chordRoot = parseChordQuery(targets.chord)?.rootPc;
  const root = (from === "scale" && keyPc !== undefined ? keyPc : chordRoot) ?? keyPc ?? 0;
  const lit = useMemo(() => new Set(targets.lit), [targets.lit]);
  const muted = useMemo(() => new Set(targets.muted), [targets.muted]);
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
  const stateOf = (pc: number): DotState => (lit.has(pc) ? "highlighted" : muted.has(pc) ? "muted" : "normal");
  const over = targets.chord ? ` over ${targets.chord}` : "";
  if (mode === "notes")
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">Play from</span>
        {shown.map((pc) => {
          const n = noteOf(pc, root);
          const st = stateOf(pc);
          return <span key={pc} className={`rounded-md border px-1.5 py-0.5 font-mono ${st === "highlighted" ? "border-sky-400 bg-sky-500/20 text-sky-100" : st === "muted" ? "border-slate-800 text-slate-600" : "border-slate-700 text-slate-300"}`}>{noteLabel(system, n)}</span>;
        })}
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      {mode === "tab" && <p className="text-[11px] text-slate-500">Improvise: no fixed tab. Aim for the ringed notes{over}.</p>}
      <ScaleNeck cells={cells} big={() => true} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title={`Notes to play from${over}`} states={(c) => stateOf(c.pc)} />
    </div>
  );
}
