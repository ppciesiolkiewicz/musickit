"use client";

import { useEffect, useMemo, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import { DIFF_CLASS } from "./palette";
import { Info } from "./ui";
import { carouselStep, shapesForChord } from "@/lib/chordKit/chordShapes";
import type { KeyContext } from "@/lib/chordKit/theory";
import { strumShape } from "@/lib/chordKit/playback";

/** One guitar shape for one chord of the mode, with previous/next arrows and a button for the full list. */
export default function ChordShapeCarousel({ ctx, degree, onShowAll }: { ctx: KeyContext; degree: number; onShowAll: () => void }) {
  const list = useMemo(() => shapesForChord(ctx, degree), [ctx, degree]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setI(0), [ctx, degree]);

  const cur = list[Math.min(i, list.length - 1)];
  if (!cur) return <p className="text-xs text-slate-500">No shape in the library for this chord yet.</p>;
  const go = (d: number) => setI((n) => carouselStep(n, d, list.length));
  const play = () => {
    strumShape(cur.shape, cur.fret);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 600);
  };
  const arrow = "h-7 w-7 shrink-0 rounded-full border border-slate-700 text-slate-300 hover:border-slate-500";

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-48" aria-roledescription="carousel" aria-label={`Guitar shapes for ${ctx.chords[degree].seventhName}`}>
      <div className="flex items-center gap-1.5">
        <button type="button" className={arrow} onClick={() => go(-1)} aria-label="Previous shape">‹</button>
        <div className="min-w-0 flex-1"><ChordDiagram shape={cur.shape} rootFret={cur.fret} onPlay={play} active={playing} /></div>
        <button type="button" className={arrow} onClick={() => go(1)} aria-label="Next shape">›</button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] text-slate-400">
        <span className="text-sm font-medium text-slate-100">{ctx.names[degree]}{cur.shape.suf}</span>
        {cur.shape.v && <span>{cur.shape.v}</span>}
        <span className={`rounded-full border px-1.5 ${DIFF_CLASS[cur.shape.diff]}`}>{cur.shape.diff}</span>
        <span className="tabular-nums">fret {cur.fret}</span>
        <span className="tabular-nums text-slate-500">{Math.min(i, list.length - 1) + 1}/{list.length}</span>
        <Info label="About these shapes">Movable shapes that contain this chord&rsquo;s 3rd and only notes of the mode. Shapes made purely of the chord&rsquo;s own root, 3rd, 5th and 7th come first, then easier fingerings. Use the arrows to flip through, tap the diagram to hear it.</Info>
      </div>
      <button type="button" onClick={onShowAll} className="text-center text-xs text-sky-300 hover:underline">All shapes and chords →</button>
    </div>
  );
}
