"use client";

import { useInstrumentOptions } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { Inst } from "./instrumentView";

export const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-100";

/** Under the keys or pads: what makes the sound. */
export default function GeneratorPanel({ inst, set }: { inst: Inst; set: (p: InstrumentPatch) => void }) {
  const options = useInstrumentOptions();
  const g = inst.generator;
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
      {g.kind === "piano" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select className={field} value={g.instrument} aria-label="Sound" title="Sound" onChange={(e) => { set({ generator: { ...g, instrument: e.target.value } }); e.target.blur(); }}>
            {!options.some((o) => o.value === g.instrument) && <option value={g.instrument}>{g.instrument}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
