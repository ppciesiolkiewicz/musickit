"use client";

import { useMemo } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { strumShape } from "@/lib/chordKit/playback";
import { chordShapeFor, shapeFromFrets } from "../../cues/voicing";
import type { Voicing } from "../../timeline/types";

/** One shape per chord, in order (the easy open one, the barre one, or the frets written for it); tap a box to strum it. */
export function View({ chords, voicing = "open", frets }: { chords: string[]; voicing?: Voicing; frets?: (string | null)[] }) {
  useCoverage({ hints: 1 });
  const shapes = useMemo(
    () => chords.flatMap((name, i) => {
      const fr = frets?.[i];
      const c = (fr ? shapeFromFrets(name, fr) : null) ?? chordShapeFor(name, voicing);
      return c ? [{ name, c }] : [];
    }),
    [chords, voicing, frets],
  );
  return (
    <div data-tour="chord-shapes-chords" className="flex flex-wrap gap-3">
      {shapes.map(({ name, c }, i) => (
        <div key={`${name}-${i}`} className="flex w-48 flex-col items-center gap-1">
          <span className="text-base font-medium text-slate-100">{name}</span>
          <Hint title={name} description="Tap the chord box to hear it strummed.">
            <div data-tour="chord-shapes-box"><ChordDiagram shape={c.shape} rootFret={c.fret} rootName={name.match(/^[A-G][♯♭#b]?/)?.[0]} onPlay={() => strumShape(c.shape, c.fret)} /></div>
          </Hint>
        </div>
      ))}
    </div>
  );
}
