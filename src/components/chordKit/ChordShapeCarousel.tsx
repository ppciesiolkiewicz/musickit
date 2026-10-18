"use client";

import { useEffect, useMemo, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import { DIFF_CLASS } from "./palette";
import { carouselStep, placedChordName, shapesForChord } from "@/lib/chordKit/chordShapes";
import type { KeyContext } from "@/features/theory/theory";
import { strumShape } from "@/lib/chordKit/playback";

/** One guitar shape for one chord of the mode, with previous/next arrows and links to a progression and the full list. */
export default function ChordShapeCarousel({ ctx, degree, onShowAll, onShowProgression }: { ctx: KeyContext; degree: number; onShowAll: () => void; onShowProgression: () => void }) {
  const list = useMemo(() => shapesForChord(ctx, degree), [ctx, degree]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setI(0), [ctx, degree]);

  const cur = list[Math.min(i, list.length - 1)];
  if (!cur) return <p className="text-xs text-slate-500">No shape in the library for this chord yet.</p>;
  const idx = Math.min(i, list.length - 1);
  const name = placedChordName(ctx, degree, cur.shape);
  const go = (d: number) => setI((n) => carouselStep(n, d, list.length));
  const play = () => {
    strumShape(cur.shape, cur.fret);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 600);
  };
  const arrow = "h-7 w-7 shrink-0 rounded-full border border-slate-700 text-slate-300 hover:border-slate-500";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-56" aria-roledescription="carousel" aria-label={`Guitar shapes for ${ctx.chords[degree].seventhName}`}>
      <div className="flex items-center gap-1.5">
        <button type="button" className={arrow} onClick={() => go(-1)} aria-label="Previous shape">‹</button>
        <div className="min-w-0 flex-1"><ChordDiagram shape={cur.shape} rootFret={cur.fret} onPlay={play} active={playing} ctx={ctx} /></div>
        <button type="button" className={arrow} onClick={() => go(1)} aria-label="Next shape">›</button>
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="min-w-0 truncate text-base font-medium text-slate-100">{name}</span>
        <span className="tabular-nums text-xs text-slate-500">{idx + 1}/{list.length}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
        <span className={`rounded-full border px-1.5 ${DIFF_CLASS[cur.shape.diff]}`}>{cur.shape.diff}</span>
        <span className="tabular-nums">{cur.shape.at !== undefined ? "open" : `fret ${cur.fret}`}</span>
        {cur.shape.v && <span>· {cur.shape.v}</span>}
        {!cur.full && <span className="text-slate-500">· {cur.exact ? "smaller chord, also fits" : "adds mode notes"}</span>}
      </div>
      <div className="flex items-center justify-center gap-3 text-xs">
        <button type="button" onClick={onShowProgression} className="text-sky-300 hover:underline">Progression →</button>
        <button type="button" onClick={onShowAll} className="text-sky-300 hover:underline">All shapes →</button>
      </div>
    </div>
  );
}
