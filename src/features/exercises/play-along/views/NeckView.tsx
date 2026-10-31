"use client";

import { useMemo } from "react";
import { ScaleNeck, cellKey, type DotState } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelRoot, useLabelSystem } from "@/features/theory/useLabelSystem";
import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { cellOf, currentCue, isNow, rootOf, type ViewProps } from "./common";

/**
 * Every place the cues use on the whole neck at once, so nothing jumps: the current chord's notes stand out (ringed
 * when a highlight was asked for), the other chords' notes and the ones not highlighted are muted, and the notes
 * sounding now are lit. Labels and colours follow the label settings; tap a note to hear it.
 */
export default function NeckView({ cues, pos, keyPc, marked = false }: ViewProps) {
  const [system] = useLabelSystem();
  const [from] = useLabelRoot();
  const { active, tap } = useNotePlayer();
  const chordNow = currentCue(cues, pos)?.chord;
  const { cells, states, sounding } = useMemo(() => {
    const byKey = new Map<string, { cell: ScaleCell; chords: Set<string>; lit: boolean }>();
    const sounding = new Set<string>();
    // the current chord first, so a place two chords share is labelled for the one playing
    const order = [...cues.filter((c) => c.chord === chordNow), ...cues.filter((c) => c.chord !== chordNow)];
    for (const c of order) {
      const root = rootOf(c, keyPc, from);
      for (const f of c.frets) {
        const k = cellKey(f);
        const had = byKey.get(k) ?? { cell: cellOf(f.string, f.fret, root), chords: new Set<string>(), lit: false };
        had.chords.add(c.chord);
        had.lit ||= c.highlighted;
        byKey.set(k, had);
        if (isNow(c, pos)) sounding.add(k);
      }
    }
    const states = (cell: ScaleCell): DotState => {
      const e = byKey.get(cellKey(cell));
      if (!e) return "normal";
      if (!e.lit || (chordNow !== undefined && !e.chords.has(chordNow))) return "muted";
      return marked ? "highlighted" : "normal";
    };
    return { cells: [...byKey.values()].map((e) => e.cell), states, sounding };
  }, [cues, pos, chordNow, keyPc, from, marked]);
  return <ScaleNeck cells={cells} big={() => true} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title="The notes on the neck" states={states} sounding={sounding} />;
}
