"use client";

import type { ReactNode } from "react";
import { DEFAULT_DRONE, DRONE_MAX_OCTAVE, DRONE_MAX_RATE, DRONE_MIN_OCTAVE, DRONE_MIN_RATE, FILTERS, MOD_TARGETS, NOTE_NAMES, WAVES, droneCutoff, droneName, type DroneParams } from "./drone";
import DroneScope from "./DroneScope";
import { Select, hueAt, hueClass, type Hue } from "@/components/ui";
const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const on = "!border-sky-400 !bg-sky-500/20 !text-sky-100";

type NumKey = "fifth" | "upper" | "sub" | "detune" | "tone" | "resonance" | "level" | "modDepth";
const pct = (v: number) => `${Math.round(v * 100)}%`;
const hz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`);

const SOUND: { key: NumKey; label: string; max: number; step: number; show?: (v: number) => string }[] = [
  { key: "level", label: "Volume", max: 1, step: 0.01 },
  { key: "sub", label: "Octave below", max: 1, step: 0.01 },
  { key: "fifth", label: "Fifth", max: 1, step: 0.01 },
  { key: "upper", label: "Octave above", max: 1, step: 0.01 },
  { key: "detune", label: "Detune", max: 30, step: 0.5, show: (v) => `${v} ¢` },
];
const FILTER: typeof SOUND = [
  { key: "tone", label: "Cut-off", max: 1, step: 0.01, show: (v) => `${hz(droneCutoff(v))} Hz` },
  { key: "resonance", label: "Resonance", max: 1, step: 0.01 },
];

const waveName = (w: string) => (w === "sawtooth" ? "Saw" : w[0].toUpperCase() + w.slice(1));
const FILTER_NAMES: Record<(typeof FILTERS)[number], string> = { lowpass: "Low-pass", bandpass: "Band-pass", highpass: "High-pass" };
/** A colour per note letter, its sharp sharing it: C D E F G A B. */
const LETTER_HUES: Hue[] = ["red", "amber", "emerald", "teal", "sky", "violet", "pink"];
const NATURAL_INDEX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const noteHue = (pc: number) => LETTER_HUES[NATURAL_INDEX[pc]];
const cbtn = "grid h-8 min-w-8 place-items-center rounded-lg border px-1.5 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const MOD_NAMES: Record<(typeof MOD_TARGETS)[number], string> = { off: "Off", filter: "Filter", pitch: "Pitch", volume: "Volume" };

/** The rate slider runs 0 to 1 and is spaced like pitch, so slow and fast speeds both get room. */
const RATE_SPAN = Math.log(DRONE_MAX_RATE / DRONE_MIN_RATE);
const rateToSlider = (r: number) => Math.log(r / DRONE_MIN_RATE) / RATE_SPAN;
const sliderToRate = (v: number) => Math.round(DRONE_MIN_RATE * Math.exp(v * RATE_SPAN) * 100) / 100;

const isDefault = (p: DroneParams) => (Object.keys(DEFAULT_DRONE) as (keyof DroneParams)[]).every((k) => p[k] === DEFAULT_DRONE[k]);

function Sliders({ value, onChange, items }: { value: DroneParams; onChange: (patch: Partial<DroneParams>) => void; items: typeof SOUND }) {
  return (
    <>
      {items.map((s) => (
        <label key={s.key} className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-24 shrink-0">{s.label}</span>
          <input type="range" className="min-w-0 flex-1 accent-sky-400" min={0} max={s.max} step={s.step} value={value[s.key]} onChange={(e) => onChange({ [s.key]: Number(e.target.value) })} />
          <span className="w-14 text-right tabular-nums text-slate-400">{s.show ? s.show(value[s.key]) : pct(value[s.key])}</span>
        </label>
      ))}
    </>
  );
}

const heading = "text-[11px] font-medium uppercase tracking-wide text-slate-400";
const card = "flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3";

/** A section heading row of fixed height, so the sliders of side-by-side sections line up whatever sits beside the heading. */
function Head({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      <p className={heading}>{title}</p>
      {children}
    </div>
  );
}

/**
 * The note and sound of a drone: used by the looper's drone window and by the theory page, so both look and behave the same.
 * It owns no audio and has no play button: the host starts and stops the drone (the page with its own button in `header`, the looper
 * from the stage circle). `header` sits on the first row, Reset at its end. `playing` makes the pictures move; `analyser` adds the
 * live wave. The layout follows the width it is given (container queries), so a narrow looper window stacks the sections.
 */
export default function DroneControls({ value, onChange, playing = false, analyser = null, header }: { value: DroneParams; onChange: (patch: Partial<DroneParams>) => void; playing?: boolean; analyser?: AnalyserNode | null; header?: ReactNode }) {
  return (
    <div className="@container flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {header}
        <button type="button" className={`${ibtn} ml-auto px-2.5`} disabled={isDefault(value)} onClick={() => onChange(DEFAULT_DRONE)} title="Put every setting back to how it started">Reset</button>
      </div>

      <section className={card}>
        <Head title="Note">
          <Select value={value.wave} onChange={(wave) => onChange({ wave })} aria-label="Waveform" options={WAVES.map((w) => ({ value: w, label: waveName(w) }))} />
        </Head>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div role="group" aria-label="Note" className="grid grid-cols-6 gap-1 @lg:grid-cols-12">
            {NOTE_NAMES.map((n, i) => (
              <button key={n} type="button" aria-pressed={value.root === i} onClick={() => onChange({ root: i })} className={`${cbtn} w-9 ${hueClass(noteHue(i), value.root === i)}`}>{n}</button>
            ))}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Octave">
            <button type="button" className={ibtn} disabled={value.octave <= DRONE_MIN_OCTAVE} onClick={() => onChange({ octave: value.octave - 1 })} aria-label="Octave down">−</button>
            <span className="w-10 text-center text-sm tabular-nums text-slate-100" aria-live="polite">{droneName(value)}</span>
            <button type="button" className={ibtn} disabled={value.octave >= DRONE_MAX_OCTAVE} onClick={() => onChange({ octave: value.octave + 1 })} aria-label="Octave up">+</button>
          </div>
        </div>
        <DroneScope value={value} playing={playing} analyser={analyser} />
      </section>

      <div className="grid gap-3 @xl:grid-cols-2">
        <section className={card}>
          <Head title="Sound" />
          <Sliders value={value} onChange={onChange} items={SOUND} />
        </section>
        <div className="flex min-w-0 flex-col gap-3">
          <section className={card}>
            <Head title="Filter">
              <Select value={value.filter} onChange={(filter) => onChange({ filter })} aria-label="Filter type" options={FILTERS.map((f) => ({ value: f, label: FILTER_NAMES[f] }))} />
            </Head>
            <Sliders value={value} onChange={onChange} items={FILTER} />
          </section>
          <section className={card}>
            <Head title="Modulation">
              <Select value={value.modWave} disabled={value.mod === "off"} onChange={(modWave) => onChange({ modWave })} aria-label="Modulation shape" options={WAVES.map((w) => ({ value: w, label: waveName(w) }))} />
            </Head>
            <div role="group" aria-label="What the modulation moves" className="grid grid-cols-4 gap-1">
              {MOD_TARGETS.map((m) => (
                <button key={m} type="button" aria-pressed={value.mod === m} onClick={() => onChange({ mod: m })} className={`${cbtn} ${m === "off" ? (value.mod === m ? on : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500") : hueClass(hueAt(MOD_TARGETS.indexOf(m)), value.mod === m)}`}>{MOD_NAMES[m]}</button>
              ))}
            </div>
            <fieldset disabled={value.mod === "off"} className="flex min-w-0 flex-col gap-2 disabled:opacity-40">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-24 shrink-0">Speed</span>
                <input type="range" className="min-w-0 flex-1 accent-sky-400" min={0} max={1} step={0.005} value={rateToSlider(value.modRate)} onChange={(e) => onChange({ modRate: sliderToRate(Number(e.target.value)) })} />
                <span className="w-14 text-right tabular-nums text-slate-400">{value.modRate} Hz</span>
              </label>
              <Sliders value={value} onChange={onChange} items={[{ key: "modDepth", label: "Depth", max: 1, step: 0.01 }]} />
            </fieldset>
          </section>
        </div>
      </div>
    </div>
  );
}
