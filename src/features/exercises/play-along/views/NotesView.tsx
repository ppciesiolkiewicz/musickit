"use client";

import { midiToName } from "@/features/sound";
import { isNow, type ViewProps } from "./common";

/** The cues as note names in order, the chord named above each new chord (none for melody notes). */
export default function NotesView({ cues, pos }: ViewProps) {
  return (
    <div className="flex flex-wrap items-end gap-1.5">
      {cues.map((c, i) => {
        const now = isNow(c, pos);
        const label = c.chord && c.chord !== cues[i - 1]?.chord ? c.chord : "";
        return (
          <div key={`${c.at}-${i}`} className="flex flex-col items-center gap-0.5">
            <span className="h-4 text-[10px] text-slate-500">{label}</span>
            <span className={`rounded-md border px-1.5 py-0.5 font-mono text-xs transition ${now ? "border-sky-400 bg-sky-500/20 text-sky-100" : c.highlighted ? "border-slate-700 text-slate-100" : "border-slate-800 text-slate-600"}`}>
              {c.kind === "strum" ? `${c.chord} ↓` : c.midi.map(midiToName).join(" ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
