"use client";

import ScaleChords from "@/components/chordKit/ScaleChords";
import ScaleOnGuitar from "@/components/chordKit/ScaleOnGuitar";
import ScaleRelatives from "@/components/chordKit/ScaleRelatives";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import type { KeyContext } from "@/features/theory";
import type { ScaleSection } from "../model/subject";

/** A section of the scale page as a widget, in the widget's key. "Same notes" re-keys the widget instead of leaving the page. */
export default function SectionWidget({ ctx, section, familyIndex, onPick }: { ctx: KeyContext; section: ScaleSection; familyIndex: number; onPick: (s: { modeIndex: number; tonicPc: number }) => void }) {
  const player = useNotePlayer();
  switch (section) {
    case "chords":
      return <ScaleChords ctx={ctx} />;
    case "relatives":
      return <ScaleRelatives ctx={ctx} familyIndex={familyIndex} onPick={onPick} />;
    case "guitar":
      return <ScaleOnGuitar ctx={ctx} player={player} />;
  }
}
