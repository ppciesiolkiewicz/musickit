"use client";

import { useMemo } from "react";
import { ScaleNeck, cellKey, type DotState } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelRoot, useLabelSystem } from "@/features/theory/useLabelSystem";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { Cue, Fret } from "../../cues/cues";
import { cellOf, currentCue, isNow, rootOf, type ViewProps } from "./common";

/**
 * Every place the cues use on the whole neck at once, so nothing jumps: the current chord's enabled notes are drawn in
 * full (the highlighted ones ringed), the other chords' notes and the ones not enabled are muted, and the notes
 * sounding now are lit. Labels and colours follow the label settings; tap a note to hear it.
 */
export default function NeckView({ cues, pos, keyPc, marks }: ViewProps) {
  const [system] = useLabelSystem();
  const [from] = useLabelRoot();
  const { active, tap } = useNotePlayer();
  const chordNow = currentCue(cues, pos)?.chord;
  const { cells, states, sounding } = useMemo(() => {
    const byKey = new Map<string, { cell: ScaleCell; chords: Set<string>; enabled: boolean; highlighted: boolean }>();
    const sounding = new Set<string>();
    // a cue of several notes is enabled or highlighted when any one is: each place is marked by its own note
    const placeMarks = (c: Cue, f: Fret) => {
      if (c.frets.length < 2 || !marks) return c;
      const semi = (OPEN_MIDI[f.string] + f.fret - (parseChordQuery(c.chord)?.rootPc ?? keyPc ?? 0) + 120) % 12;
      const has = (list: number[]) => list.some((s) => (s % 12 + 12) % 12 === semi);
      return { enabled: !marks.enable || has(marks.enable), highlighted: !!marks.highlight && has(marks.highlight) };
    };
    // the current chord first, so a place two chords share is labelled for the one playing
    const order = [...cues.filter((c) => c.chord === chordNow), ...cues.filter((c) => c.chord !== chordNow)];
    for (const c of order) {
      const root = rootOf(c, keyPc, from);
      for (const f of c.frets) {
        const k = cellKey(f);
        const had = byKey.get(k) ?? { cell: cellOf(f.string, f.fret, root), chords: new Set<string>(), enabled: false, highlighted: false };
        had.chords.add(c.chord);
        const m = placeMarks(c, f);
        had.enabled ||= m.enabled;
        had.highlighted ||= m.highlighted;
        byKey.set(k, had);
        if (isNow(c, pos)) sounding.add(k);
      }
    }
    const states = (cell: ScaleCell): DotState => {
      const e = byKey.get(cellKey(cell));
      if (!e) return "normal";
      if (!e.enabled || (chordNow !== undefined && !e.chords.has(chordNow))) return "muted";
      return e.highlighted ? "highlighted" : "normal";
    };
    return { cells: [...byKey.values()].map((e) => e.cell), states, sounding };
  }, [cues, pos, chordNow, keyPc, from, marks]);
  return <ScaleNeck cells={cells} big={() => true} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title="The notes on the neck" states={states} sounding={sounding} />;
}
