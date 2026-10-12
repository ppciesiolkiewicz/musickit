"use client";

import { DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, NOTE_NAMES, WAVES, droneName, type DroneParams } from "@/lib/looper/drone";

const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const SLIDERS: { key: "fifth" | "upper" | "sub" | "detune" | "tone" | "level"; label: string; max: number; step: number; unit?: string }[] = [
  { key: "level", label: "Volume", max: 1, step: 0.01 },
  { key: "tone", label: "Tone", max: 1, step: 0.01 },
  { key: "sub", label: "Octave below", max: 1, step: 0.01 },
  { key: "fifth", label: "Fifth", max: 1, step: 0.01 },
  { key: "upper", label: "Octave above", max: 1, step: 0.01 },
  { key: "detune", label: "Detune", max: 30, step: 0.5, unit: " ¢" },
];

/** The note and sound of a drone: used by the looper's drone panel and by the theory page, so both look and behave the same. */
export default function DroneControls({ value, onChange }: { value: DroneParams; onChange: (patch: Partial<DroneParams>) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Note" className="flex flex-wrap gap-1">
          {NOTE_NAMES.map((n, i) => (
            <button key={n} type="button" aria-pressed={value.root === i} onClick={() => onChange({ root: i })} className={`${ibtn} w-9 ${value.root === i ? "!border-sky-400 !bg-sky-500/20 !text-sky-100" : ""}`}>{n}</button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Octave">
          <button type="button" className={ibtn} disabled={value.octave <= DRONE_MIN_OCTAVE} onClick={() => onChange({ octave: value.octave - 1 })} aria-label="Octave down">−</button>
          <span className="w-12 text-center text-sm tabular-nums text-slate-100" aria-live="polite">{droneName(value)}</span>
          <button type="button" className={ibtn} disabled={value.octave >= DRONE_MAX_OCTAVE} onClick={() => onChange({ octave: value.octave + 1 })} aria-label="Octave up">+</button>
        </div>
        <select className={field} value={value.wave} onChange={(e) => onChange({ wave: e.target.value as DroneParams["wave"] })} aria-label="Waveform">
          {WAVES.map((w) => <option key={w} value={w}>{w === "sawtooth" ? "Saw" : w[0].toUpperCase() + w.slice(1)}</option>)}
        </select>
      </div>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <label key={s.key} className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-24 shrink-0">{s.label}</span>
            <input type="range" className="min-w-0 flex-1 accent-sky-400" min={0} max={s.max} step={s.step} value={value[s.key]} onChange={(e) => onChange({ [s.key]: Number(e.target.value) })} />
            <span className="w-12 text-right tabular-nums text-slate-400">{s.unit ? `${value[s.key]}${s.unit}` : `${Math.round(value[s.key] * 100)}%`}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
