"use client";

import { Piano, ScalePiano } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import GeneratorPanel from "./GeneratorPanel";

/** An instrument's play window: its controller (keyboard, scale keys or pads) playing the routed voice, then its sound generator. */
export default function InstrumentPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const inst = snap.instruments.find((x) => x.id === id);
  const voice = engine.getInstrument(id);
  if (!inst || !voice) return null;
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id, patch });
  return (
    <div className="flex flex-col">
      {inst.controller === "piano" && <div className="p-2"><Piano voice={voice} /></div>}
      {inst.controller === "scalepiano" && (
        <ScalePiano state={inst} hideSound voice={voice} onChange={(p) => set(Object.fromEntries(Object.entries(p).filter(([k]) => k !== "instrument")) as InstrumentPatch)} />
      )}
      <GeneratorPanel inst={inst} set={set} />
    </div>
  );
}
