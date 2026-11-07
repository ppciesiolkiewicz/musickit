"use client";

import { keyName } from "@/features/theory/keySlug";

/** The keys a step can be played in, as chips: tapping one moves every tool in the step to it (`transposeStep`). */
export default function KeyChoice({ keys, value, onChange }: { keys: number[]; value: number; onChange: (pc: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Key" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">Key</span>
      {keys.map((pc) => {
        const on = pc === value;
        return (
          <button key={pc} type="button" role="radio" aria-checked={on} onClick={() => onChange(pc)}
            className={`h-8 min-w-10 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.97] ${on ? "border-sky-400/70 bg-sky-500/20 text-sky-50" : "border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}>
            {keyName(pc)}
          </button>
        );
      })}
    </div>
  );
}
