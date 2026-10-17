"use client";

import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine } from "@/lib/looper/engine";
import { CONTROLLERS, CONTROLLER_NAMES } from "@/lib/looper/instrumentModel";
import type { Inst } from "./instrumentView";
import { Select } from "@/components/ui";

/** Behind an instrument strip's pencil: what you play. (What makes the sound is the strip's Sound generator row.) */
export default function InstrumentEdit({ engine, inst }: { engine: LooperEngine; inst: Inst }) {
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id: inst.id, patch });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <label className="flex items-center gap-1">Play with
        <Select value={inst.controller} aria-label="Controller" onChange={(controller) => set({ controller })} options={CONTROLLERS.map((c) => ({ value: c, label: CONTROLLER_NAMES[c] }))} />
      </label>
    </div>
  );
}
