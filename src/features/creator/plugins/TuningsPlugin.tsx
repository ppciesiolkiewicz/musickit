"use client";

import { useState } from "react";
import { INSTRUMENTS, instrumentById, type InstrumentId } from "@/features/theory";
import { strum } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { Body, Hint, PlayButton } from "./common";
import { Select } from "@/components/ui";
const TUNED = INSTRUMENTS.filter((i) => i.tunings.length > 0);

/** An instrument's tuning, string by string. With a key, the open strings that are notes of the key are lit (they ring freely in it). */
export default function TuningsPlugin() {
  const { ctx } = useCreatorKey();
  const [inst, setInst] = useState<InstrumentId>("guitar");
  const [tuningId, setTuningId] = useState("standard");
  const instrument = instrumentById(inst)!;
  const tuning = instrument.tunings.find((t) => t.id === tuningId) ?? instrument.tunings[0];
  const inKey = ctx ? new Set(ctx.steps.map((s) => (ctx.tonic.pc + s) % 12)) : null;
  const ringing = inKey ? tuning.strings.filter((s) => inKey.has(s.midi % 12)).length : 0;
  return (
    <Body title="Tunings" general={!ctx} aside={<PlayButton label={`Hear ${tuning.name}`} onClick={() => strum(tuning.strings.map((s) => s.midi), { gapMs: 220, holdMs: 2000 })} />}>
      <div className="flex flex-wrap gap-1.5">
        <Select size="xs" value={inst} aria-label="Instrument" onChange={(id) => { setInst(id); setTuningId(instrumentById(id)!.tunings[0].id); }} options={TUNED.map((i) => ({ value: i.id, label: i.name }))} />
        {instrument.tunings.length > 1 && (
          <Select size="xs" value={tuning.id} aria-label="Tuning" onChange={setTuningId} options={instrument.tunings.map((t) => ({ value: t.id, label: t.name }))} />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tuning.strings.map((s, i) => {
          const lit = inKey?.has(s.midi % 12);
          return (
            <button key={i} type="button" onClick={() => strum([s.midi], { gapMs: 0, holdMs: 1500 })} title={`Hear ${s.name}${s.octave}`}
              className={`min-w-10 rounded-lg border px-2 py-1 text-sm ${lit ? "border-sky-500/60 bg-sky-500/15 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-200"} hover:border-slate-500`}>
              {s.name}<span className="text-[10px] text-slate-500">{s.octave}</span>
            </button>
          );
        })}
      </div>
      <Hint>{inKey ? `${ringing} of ${tuning.strings.length} open strings are in ${ctx!.tonic.name} ${ctx!.modeName}.` : tuning.note ?? "Pick a key to see which open strings belong to it."}</Hint>
    </Body>
  );
}
