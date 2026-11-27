"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui";
import { parseTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";
import { barreAlternatives } from "../alternatives";

/** The chords people most often look up, one press away. */
const QUICK = ["F", "B", "B♭", "Bm", "F♯m", "C♯m"];

const MESSAGE = {
  unknown: "That isn't a chord name. Type a letter from A to G, with m for a minor chord: Bm.",
  type: "This finds stand-ins for major and minor chords. Type the chord without the number: B, not B7.",
} as const;

/** Type a barre chord, see easier chords for it as chord boxes, best first (`barreAlternatives`). */
export default function ChordFinder() {
  const [q, setQ] = useState("");
  const res = useMemo(() => barreAlternatives(q), [q]);
  return (
    <div className="metal-panel flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-200">Find an easier chord</span>
        <span className="relative">
          <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a barre chord: F, B, Bm"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3 pl-9 pr-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((c) => <Chip key={c} on={res.ok && res.chord === c} onClick={() => setQ(c)}>{c}</Chip>)}
      </div>
      {!res.ok && res.reason !== "empty" && <p className="text-sm text-slate-400">{MESSAGE[res.reason]}</p>}
      {res.ok && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">Easier chords for {res.chord}. Press Play under a chord box to hear it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {res.items.map((it) => {
              const tool = parseTool({ type: "chord-shapes", chords: [it.chord], frets: [it.frets] });
              return (
                <div key={`${it.title}-${it.frets}`} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <h3 className="text-sm font-semibold text-slate-100">{it.title}</h3>
                  <p className="text-sm text-slate-400">{it.text}</p>
                  {tool && <Tool tool={tool} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
