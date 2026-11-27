"use client";

import { useMemo, useState } from "react";
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
 * One chord through its shapes: chord boxes in a grid, every box with its exact frets (checked by `shapeFromFrets`, as
 * `chord-shapes` does) and a label above it, the chord's name then its caption ("C – A shape"). Wider than the column on a wide screen.
 */
export default function ChordChain({ chords }: { chords: ChainLink[] }) {
  const boxes = useMemo(() => chords.flatMap((c) => {
    const v = shapeFromFrets(c.chord, c.frets);
    return v ? [{ ...c, v }] : [];
  }), [chords]);
  return (
    <div className="bleed my-2 grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-3">
      {boxes.map((b) => (
        <figure key={`${b.chord}-${b.frets}`} className="flex w-full max-w-64 flex-col items-center gap-1">
          <figcaption className="text-center">
            <span className="text-lg font-medium text-slate-100">{b.chord}</span>
            <span className="text-sm text-slate-400"> – {b.caption}</span>
          </figcaption>
          <div className="w-full *:w-full">
            <ChordDiagram name={b.chord} shape={b.v.shape} rootFret={b.v.fret} rootName={b.chord.match(/^[A-G][♯♭#b]?/)?.[0]} onPlay={() => strumShape(b.v.shape, b.v.fret)} />
          </div>
        </figure>
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
