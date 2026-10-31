"use client";

import { NoteDot } from "@/components/chordKit/NoteDot";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { hoverLabel, noteLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import type { InlineNoteInfo } from "../model/noteText";

/**
 * A note named in an exercise's text, drawn as the fretboard's dot on the line: its degree's colour, labelled by the
 * global label setting, the other name on hover; tap it to hear it.
 */
export default function InlineNote({ info }: { info: InlineNoteInfo }) {
  const [system] = useLabelSystem();
  const { active, tap } = useNotePlayer();
  const key = `inline-${info.midi}`;
  const cell = { string: 0, fret: 0, midi: info.midi, pc: info.midi % 12, degree: info.degree, name: info.name, semi: info.semi, degreeText: info.degreeText };
  return (
    <svg viewBox="-19 -19 38 38" className="mx-0.5 inline-block h-[1.9em] w-[1.9em] align-[-0.6em]" role="img" aria-label={`${info.name}, tap to hear`}>
      <NoteDot c={cell} x={0} y={0} r={14} ring={false} label={noteLabel(system, cell)} hover={hoverLabel(system, cell)} active={active === key} dim={false} onNote={() => tap(key, info.midi)} />
    </svg>
  );
}
