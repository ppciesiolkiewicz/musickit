"use client";

import { useMemo } from "react";
import ScaleOnGuitar, { type PentatonicOnly } from "@/components/chordKit/ScaleOnGuitar";
import { blueNote } from "@/components/chordKit/PentatonicPage";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { findPentatonic, pentatonicContext } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { makeKeyContext } from "@/features/theory/theory";
import { extraCells, pentatonicPositions } from "@/lib/chordKit/scalePositions";

/**
 * The scale-neck with its whole neck: the scales page's guitar section (`ScaleOnGuitar`), as interactive as there (tap a position to
 * light it up on the neck), set up by the tool's props: the neck and/or the positions, only these `boxes`.
 */
export function GuitarView({ slug, pc, boxes, neck, positions }: { slug: string; pc: number; boxes?: number[]; neck: boolean; positions: boolean }) {
  const player = useNotePlayer();
  const made = useMemo(() => {
    const pent = findPentatonic(slug);
    if (pent) {
      const p = pentatonicContext(pc, pent);
      const blue = blueNote(p);
      const guitar = pentatonicPositions(p.host, p.degrees, blue);
      const only: PentatonicOnly = {
        pent: { name: p.title, degrees: p.degrees, formula: p.formula }, positions: guitar.positions, boxes: guitar.boxes, title: p.title, names: p.names,
        extra: blue ? extraCells(p.host, blue) : undefined,
      };
      return { ctx: p.host, only };
    }
    const m = findModePage(slug)!;
    return { ctx: makeKeyContext(pc, m.familyIndex, m.modeIndex), only: undefined };
  }, [slug, pc]);
  return <ScaleOnGuitar ctx={made.ctx} player={player} only={made.only} view={{ neck, positions, boxes }} />;
}
