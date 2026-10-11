"use client";

import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine } from "@/lib/looper/engine";
import { CONTROLLERS, CONTROLLER_NAMES, withGenerator, type Controller } from "@/lib/looper/instrumentModel";
import { field } from "./GeneratorPanel";
import type { Inst } from "./instrumentView";

/** Behind an instrument strip's pencil: what you play and what makes the sound. */
export default function InstrumentEdit({ engine, inst }: { engine: LooperEngine; inst: Inst }) {
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id: inst.id, patch });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <label className="flex items-center gap-1">Play with
        <select className={field} value={inst.controller} aria-label="Controller" onChange={(e) => { set({ controller: e.target.value as Controller }); e.target.blur(); }}>
          {CONTROLLERS.map((c) => <option key={c} value={c}>{CONTROLLER_NAMES[c]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1">Sound
        <select className={field} value={inst.generator.kind} aria-label="Sound generator" onChange={(e) => { set({ generator: withGenerator(inst, e.target.value as "piano" | "sampler").generator }); e.target.blur(); }}>
          <option value="piano">Piano</option>
          <option value="sampler">Sampler</option>
        </select>
      </label>
    </div>
  );
}
