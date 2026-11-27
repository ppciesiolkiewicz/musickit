"use client";

import { Fragment, useMemo, useState } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { Chip, ChipRow } from "@/components/ui";
import { shapeFromFrets } from "@/features/exercises/cues/voicing";
import { barreChord, cagedBoxes, islandChord } from "@/lib/chordKit/caged";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { strumShape } from "@/lib/chordKit/playback";

export interface ChainLink { chord: string; frets: string; caption: string }

/** A chord's five CAGED shapes from the nut up, as chain links: each shape's island (`islandChord`), or with `barre` the whole chord (`barreChord`). */
export function cagedLinks(chord: string, barre = false): ChainLink[] {
  const q = parseChordQuery(chord);
  if (!q) return [];
  return cagedBoxes(q.rootPc, q.semis.includes(3) ? "minor" : "major").map((b) => ({ chord, frets: barre ? barreChord(b) : islandChord(b), caption: `${b.letter} shape` }));
}

/**
 * One chord moving up the neck through its shapes: chord boxes in a row with an arrow between each, every box with its exact
 * frets (checked by `shapeFromFrets`, as `chord-shapes` does) the chord's name above it and a caption under it. Wider than the column on a wide screen.
 */
export default function ChordChain({ chords }: { chords: ChainLink[] }) {
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
            <span className="text-lg font-medium text-slate-100">{b.chord}</span>
            <ChordDiagram name={b.chord} shape={b.v.shape} rootFret={b.v.fret} rootName={b.chord.match(/^[A-G][♯♭#b]?/)?.[0]} onPlay={() => strumShape(b.v.shape, b.v.fret)} />
            <figcaption className="text-sm text-slate-400">{b.caption}</figcaption>
          </figure>
        </Fragment>
      ))}
    </div>
  );
}

/** A chord through its five CAGED shapes, with a Chord selector over it when there is more than one chord to pick (`chain` on an article exercise). */
export function CagedChain({ chords, barre = false }: { chords: string[]; barre?: boolean }) {
  const [chord, setChord] = useState(chords[0]);
  const links = useMemo(() => cagedLinks(chord, barre), [chord, barre]);
  return (
    <div className="flex flex-col gap-3">
      {chords.length > 1 && (
        <ChipRow label="Chord">
          {chords.map((c) => <Chip key={c} on={c === chord} onClick={() => setChord(c)}>{c}</Chip>)}
        </ChipRow>
      )}
      <ChordChain chords={links} />
    </div>
  );
}
