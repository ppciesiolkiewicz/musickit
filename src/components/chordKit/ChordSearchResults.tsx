"use client";

import { useMemo } from "react";
import ChordDiagram from "./ChordDiagram";
import { DIFF_CLASS } from "./palette";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { STRING_SHORT } from "@/lib/chordKit/shapeTools";
import { strumShape } from "@/lib/chordKit/playback";

/** Every shape that plays one chord, simplest first: open chord, first barre, then the rest. */
export default function ChordSearchResults({ rootPc, semis, name }: { rootPc: number; semis: number[]; name: string }) {
  const list = useMemo(() => shapesForTones(rootPc, semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice), [rootPc, semis]);
  if (!list.length) return <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No shape in the library plays {name} yet.</p>;
  return (
    <section aria-label={`Shapes for ${name}`} className="flex flex-col gap-2">
      <p className="text-xs text-slate-400"><b className="text-slate-200">{list.length}</b> way{list.length === 1 ? "" : "s"} to play <b className="text-slate-200">{name}</b>, simplest first.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((c) => (
          <div key={c.shape.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs">
              <span className={`rounded-full border px-1.5 ${DIFF_CLASS[c.shape.diff]}`}>{c.shape.diff}</span>
              {c.shape.at !== undefined ? <span className="text-sky-300">open</span> : c.shape.v && <span className="text-slate-400">{c.shape.v}</span>}
            </div>
            <ChordDiagram shape={c.shape} rootFret={c.fret} onPlay={() => strumShape(c.shape, c.fret)} />
            <div className="text-xs text-slate-500">{c.shape.at !== undefined ? "open position" : `${STRING_SHORT[c.shape.rs]} string root · fret ${c.fret}`}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
