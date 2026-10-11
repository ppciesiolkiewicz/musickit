"use client";

import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine } from "@/lib/looper/engine";
import { CONTROLLERS, CONTROLLER_NAMES, type Controller } from "@/lib/looper/instrumentModel";
import { field } from "./GeneratorPanel";
import type { Inst } from "./instrumentView";

/** Behind an instrument strip's pencil: what you play. (What makes the sound is the strip's Sound generator row.) */
export default function InstrumentEdit({ engine, inst }: { engine: LooperEngine; inst: Inst }) {
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id: inst.id, patch });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <label className="flex items-center gap-1">Play with
        <select className={field} value={inst.controller} aria-label="Controller" onChange={(e) => { set({ controller: e.target.value as Controller }); e.target.blur(); }}>
          {CONTROLLERS.map((c) => <option key={c} value={c}>{CONTROLLER_NAMES[c]}</option>)}
        </select>
      </label>
    </div>
  );
}
