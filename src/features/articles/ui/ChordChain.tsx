"use client";

import { Fragment, useMemo } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { shapeFromFrets } from "@/features/exercises/cues/voicing";
import { strumShape } from "@/lib/chordKit/playback";

/**
 * One chord moving up the neck through its shapes: chord boxes in a row with an arrow between each, every box with its exact
 * frets (checked by `shapeFromFrets`, as `chord-shapes` does) and a caption under it. Wider than the column on a wide screen.
 */
export default function ChordChain({ chords }: { chords: { chord: string; frets: string; caption: string }[] }) {
  const boxes = useMemo(() => chords.flatMap((c) => {
    const v = shapeFromFrets(c.chord, c.frets);
    return v ? [{ ...c, v }] : [];
  }), [chords]);
  return (
    <div className="bleed my-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-4">
      {boxes.map((b, i) => (
        <Fragment key={`${b.chord}-${b.frets}`}>
          {i > 0 && <span aria-hidden className="text-2xl text-slate-500">→</span>}
          <figure className="flex w-36 flex-col items-center gap-1">
            <ChordDiagram name={b.chord} shape={b.v.shape} rootFret={b.v.fret} rootName={b.chord.match(/^[A-G][♯♭#b]?/)?.[0]} onPlay={() => strumShape(b.v.shape, b.v.fret)} />
            <figcaption className="text-sm font-medium text-slate-200">{b.caption}</figcaption>
          </figure>
        </Fragment>
      ))}
    </div>
  );
}
