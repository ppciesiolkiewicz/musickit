"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** "Tune 3 of 12" over a dot per pass, filled up to the one being sung; nothing outside a timeline or during the intro. */
export default function ProgressWidget() {
  const p = useContext(TimelineContext)?.progress;
  if (!p) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/80 px-8 py-5 text-center">
      <span className="text-4xl font-semibold text-slate-50">
        Tune {p.tune} of {p.tunes}
      </span>
      <div className="flex items-center gap-3">
        {Array.from({ length: p.times }, (_, i) => (
          <span key={i} className={`h-5 w-5 rounded-full ${p.pass !== null && i < p.pass ? "bg-sky-400" : "bg-slate-700"}`} />
        ))}
      </div>
      <span className="text-2xl text-slate-300">{p.pass === null ? `Sing it ${p.times} ${p.times === 1 ? "time" : "times"}` : `Pass ${p.pass} of ${p.times}`}</span>
    </div>
  );
}
