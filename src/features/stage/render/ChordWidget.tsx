"use client";

import { useMemo, useState } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import Icon from "@/components/Icon";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { strumShape } from "@/lib/chordKit/playback";

/** One chord box for a typed chord ("E6"): click it to strum; ‹ › step through the other shapes for the same chord. */
export default function ChordWidget({ symbol }: { symbol: string }) {
  const choices = useMemo(() => {
    const parsed = parseChordQuery(symbol);
    return parsed ? shapesForTones(parsed.rootPc, parsed.semis).map((c) => c.choice) : [];
  }, [symbol]);
  const [index, setIndex] = useState(0);
  const choice = choices[Math.min(index, choices.length - 1)];

  if (!choice) return <p className="p-4 text-center text-sm text-slate-300">No shape for {symbol}</p>;
  const step = (d: number) => setIndex((i) => (i + d + choices.length) % choices.length);

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
      <p className="text-lg font-medium text-slate-100">{symbol}</p>
      <ChordDiagram shape={choice.shape} rootFret={choice.fret} onPlay={() => strumShape(choice.shape, choice.fret)} />
      {choices.length > 1 && (
        <div data-chrome className="flex items-center gap-2 text-xs text-slate-400">
          <button type="button" title="Previous shape" onClick={() => step(-1)} className="p-1 hover:text-slate-100">
            <Icon name="chevron-left" size={14} />
          </button>
          {index + 1} / {choices.length}
          <button type="button" title="Next shape" onClick={() => step(1)} className="p-1 hover:text-slate-100">
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
