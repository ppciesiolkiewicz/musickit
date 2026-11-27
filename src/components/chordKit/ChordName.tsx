"use client";

import { useMemo } from "react";
import { chordShapeFor } from "@/features/exercises/cues/voicing";
import { strumShape } from "@/lib/chordKit/playback";
import ChordDiagram from "./ChordDiagram";
import ChordPeek from "./ChordPeek";

/** A chord's name: pointing at it (or tapping it) opens its chord box with its Play. A name with no shape is plain text. */
export default function ChordName({ name, className = "" }: { name: string; className?: string }) {
  const voiced = useMemo(() => chordShapeFor(name.replace("♯", "#").replace("♭", "b"), "open"), [name]);
  const label = name.replace("#", "♯");
  if (!voiced) return <span className={className}>{label}</span>;
  const root = label.match(/^[A-G][♯♭]?/)?.[0];
  return (
    <ChordPeek label={label} className={`${className} text-left decoration-dotted underline-offset-4 hover:underline`}
      card={<>
        <span className="font-medium text-slate-100">{label}</span>
        <div className="w-40 self-center">
          <ChordDiagram shape={voiced.shape} rootFret={voiced.fret} rootName={root} onPlay={() => strumShape(voiced.shape, voiced.fret)} />
        </div>
      </>} />
  );
}
