"use client";

import { useState } from "react";
import Icon from "../Icon";
import { midiToName, useInstrumentOptions } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import { MAX_PADS, MIN_PADS } from "@/lib/looper/instrumentModel";
import type { Inst } from "./instrumentView";
import { Select } from "@/components/ui";

const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-100";
/** C2 to C7 */
export const NOTE_CHOICES = Array.from({ length: 61 }, (_, i) => 36 + i);

/** Under the keys or pads: the sound generator's settings, the built-in instrument and the pads' notes (the controller is chosen behind the strip's pencil). */
export default function GeneratorPanel({ inst, set, selected, onSelect }: { inst: Inst; set: (p: InstrumentPatch) => void; selected: number; onSelect: (i: number) => void }) {
  const options = useInstrumentOptions();
  /** the pad count being typed: saved on blur or Enter, so "12" never passes through 1 pad */
  const [padDraft, setPadDraft] = useState<string | null>(null);
  const g = inst.generator;
  const commitPads = () => {
    if (padDraft !== null && padDraft.trim()) set({ pads: Number(padDraft) });
    setPadDraft(null);
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        <Icon name="audio-lines" size={13} className="text-sky-300" />Sound generator
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {inst.controller === "soundboard" && (
          <label className="flex items-center gap-1">Pads
            <input type="number" className={`${field} w-14`} aria-label="Pad count" min={MIN_PADS} max={MAX_PADS} value={padDraft ?? inst.pads} onChange={(e) => setPadDraft(e.target.value)} onBlur={commitPads} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
          </label>
        )}
        <Select
          size="sm"
          value={g.instrument}
          aria-label="Sound"
          title="Sound"
          onChange={(instrument) => set({ generator: { ...g, instrument } })}
          options={[...(options.some((o) => o.value === g.instrument) ? [] : [{ value: g.instrument, label: g.instrument }]), ...options]}
        />
      </div>
      {inst.controller === "soundboard" && (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {g.padNotes.map((n, i) => (
            <span key={i} onPointerDown={() => onSelect(i)} className="inline-flex">
              <Select
                size="sm"
                highlighted={selected === i}
                value={n}
                aria-label={`Pad ${i + 1} note`}
                onChange={(note) => set({ generator: { ...g, padNotes: g.padNotes.map((x, j) => (j === i ? note : x)) } })}
                options={NOTE_CHOICES.map((m) => ({ value: m, label: midiToName(m) }))}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
