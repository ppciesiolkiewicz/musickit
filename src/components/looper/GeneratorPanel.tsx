"use client";

import { useState } from "react";
import Icon from "../Icon";
import { btnSm } from "../controls";
import { AddSample, SamplePicker, detectSampleRoot, sampleLibrary } from "@/features/sampler";
import { midiToName, useInstrumentOptions } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import { MAX_PADS, MIN_PADS } from "@/lib/looper/instrumentModel";
import { GENERATOR_NAMES, type Inst } from "./instrumentView";

export const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-100";
/** C2 to C7 */
export const NOTE_CHOICES = Array.from({ length: 61 }, (_, i) => 36 + i);

/** Under the keys or pads: the sound generator's settings (the controller and generator are chosen behind the strip's pencil). */
export default function GeneratorPanel({ inst, latest, set, selected, onSelect }: { inst: Inst; latest: () => Inst | undefined; set: (p: InstrumentPatch) => void; selected: number; onSelect: (i: number) => void }) {
  const options = useInstrumentOptions();
  const [msg, setMsg] = useState<string | null>(null);
  /** the pad count being typed: saved on blur or Enter, so "12" never passes through 1 pad */
  const [padDraft, setPadDraft] = useState<string | null>(null);
  const g = inst.generator;
  /** A sample that arrives after a wait (a drop, a generation) changes the instrument as it is then, not as it was when the wait began. */
  const assign = (sampleId: string, pad: number | null) => {
    const now = latest()?.generator;
    if (now?.kind !== "sampler") return;
    set({ generator: pad === null ? { ...now, sample: sampleId } : { ...now, padSamples: now.padSamples.map((x, j) => (j === pad ? sampleId : x)) } });
  };
  const commitPads = () => {
    if (padDraft !== null && padDraft.trim()) set({ pads: Number(padDraft) });
    setPadDraft(null);
  };

  const detect = async () => {
    if (g.kind !== "sampler" || !g.sample) return;
    setMsg(null);
    const root = await detectSampleRoot(g.sample).catch(() => null);
    if (root === null) setMsg("No clear pitch.");
    else set({ generator: { ...g, root } });
  };
  const dropOnPad = async (i: number, file: File) => {
    if (g.kind !== "sampler") return;
    setMsg(null);
    try {
      assign((await sampleLibrary.addFile(file)).id, i);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add the file.");
    }
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        <Icon name="audio-lines" size={13} className="text-sky-300" />Sound generator<span className="normal-case tracking-normal text-slate-200">· {GENERATOR_NAMES[g.kind]}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {inst.controller === "soundboard" && (
          <label className="flex items-center gap-1">Pads
            <input type="number" className={`${field} w-14`} aria-label="Pad count" min={MIN_PADS} max={MAX_PADS} value={padDraft ?? inst.pads} onChange={(e) => setPadDraft(e.target.value)} onBlur={commitPads} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
          </label>
        )}
        {g.kind === "piano" && (
          <select className={field} value={g.instrument} aria-label="Sound" title="Sound" onChange={(e) => { set({ generator: { ...g, instrument: e.target.value } }); e.target.blur(); }}>
            {!options.some((o) => o.value === g.instrument) && <option value={g.instrument}>{g.instrument}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>
      {g.kind === "piano" && inst.controller === "soundboard" && (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {g.padNotes.map((n, i) => (
            <select key={i} className={`${field} ${selected === i ? "!border-sky-400" : ""}`} value={n} aria-label={`Pad ${i + 1} note`} onFocus={() => onSelect(i)} onChange={(e) => { set({ generator: { ...g, padNotes: g.padNotes.map((x, j) => (j === i ? Number(e.target.value) : x)) } }); e.target.blur(); }}>
              {NOTE_CHOICES.map((m) => <option key={m} value={m}>{midiToName(m)}</option>)}
            </select>
          ))}
        </div>
      )}
      {g.kind === "sampler" && (
        <AddSample onAdded={(meta) => assign(meta.id, inst.controller === "soundboard" ? selected : null)}>
          {inst.controller !== "soundboard" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <SamplePicker label="Sample" value={g.sample ?? null} onChange={(id) => set({ generator: { ...g, sample: id ?? undefined } })} />
              <select className={field} value={g.root} aria-label="Root note" title="The note the sample sounds at" onChange={(e) => { set({ generator: { ...g, root: Number(e.target.value) } }); e.target.blur(); }}>
                {NOTE_CHOICES.map((m) => <option key={m} value={m}>{midiToName(m)}</option>)}
              </select>
              <button type="button" className={btnSm} disabled={!g.sample} title="Find the note the sample sounds at" onClick={() => void detect()}>
                <Icon name="activity" size={12} />Detect
              </button>
            </div>
          )}
          {inst.controller === "soundboard" && (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {g.padSamples.map((sid, i) => (
                <div key={i}
                  className={`flex items-center gap-1 rounded-md border p-1 ${selected === i ? "border-sky-400" : "border-slate-800"}`}
                  onPointerDown={() => onSelect(i)}
                  onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) void dropOnPad(i, f); }}>
                  <span className="w-5 text-center text-[10px] text-slate-500">{i + 1}</span>
                  <SamplePicker compact label={`Pad ${i + 1} sample`} value={sid} onChange={(id) => set({ generator: { ...g, padSamples: g.padSamples.map((x, j) => (j === i ? id : x)) } })} />
                </div>
              ))}
            </div>
          )}
        </AddSample>
      )}
      {msg && <p role="alert" className="text-xs text-rose-300">{msg}</p>}
    </div>
  );
}
