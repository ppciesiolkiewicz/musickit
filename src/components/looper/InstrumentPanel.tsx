"use client";

import { useState } from "react";
import { Piano, ScalePiano, midiToName } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { useSampleLibrary } from "@/features/sampler";
import GeneratorPanel from "./GeneratorPanel";
import { missingIn } from "./instrumentView";
import Soundboard from "./Soundboard";

/** An instrument's play window: its controller (keyboard, scale keys or pads) playing the routed voice, then its sound generator. */
export default function InstrumentPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const [selected, setSelected] = useState(0);
  const lib = useSampleLibrary();
  const inst = snap.instruments.find((x) => x.id === id);
  const voice = engine.getInstrument(id);
  if (!inst || !voice) return null;
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id, patch });
  const g = inst.generator;
  const have = new Set(lib.samples.map((s) => s.id));
  const names = Object.fromEntries(lib.samples.map((s) => [s.id, s.name]));
  const pad = Math.min(selected, inst.pads - 1);
  return (
    <div className="flex flex-col">
      {inst.controller === "piano" && <div className="p-2"><Piano voice={voice} /></div>}
      {inst.controller === "scalepiano" && (
        <ScalePiano state={inst} hideSound voice={voice} onChange={(p) => set(Object.fromEntries(Object.entries(p).filter(([k]) => k !== "instrument")) as InstrumentPatch)} />
      )}
      {inst.controller === "soundboard" && (
        <Soundboard pads={inst.pads} voice={voice} selected={pad} onSelect={setSelected}
          labels={g.kind === "piano" ? g.padNotes.map((n) => midiToName(n)) : g.padSamples.map((s) => (s ? names[s] ?? "missing" : null))}
          warn={lib.ready ? missingIn(inst, have) : Array.from({ length: inst.pads }, () => false)} />
      )}
      <GeneratorPanel inst={inst} latest={() => engine.getSnapshot().instruments.find((x) => x.id === id)} set={set} selected={pad} onSelect={setSelected} />
    </div>
  );
}
