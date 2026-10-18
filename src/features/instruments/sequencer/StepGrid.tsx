"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { lanesIn, type Instrument } from "./sequencer";
import type { Cells } from "./pattern";
import { ibtn, Select } from "@/components/ui";
import { degreeColour } from "@/features/theory/scales";

/** A drum lane's colour, on and accented (lighter, ringed): kick, snare, clap... each its own, so a groove reads at a glance. */
const LANE_ON = ["bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-sky-500", "bg-teal-500", "bg-pink-500", "bg-emerald-500", "bg-red-500"];
const LANE_ACCENT = ["bg-amber-300", "bg-rose-300", "bg-violet-300", "bg-sky-300", "bg-teal-300", "bg-pink-300", "bg-emerald-300", "bg-red-300"];
const LANE_DOT = ["bg-amber-400", "bg-rose-400", "bg-violet-400", "bg-sky-400", "bg-teal-400", "bg-pink-400", "bg-emerald-400", "bg-red-400"];
const ACCENT_RING = "ring-2 ring-inset ring-white/70";


/**
 * The pattern's settings row: load a preset, one or two bars, clear. `leading` and `trailing` are the host's own controls (the looper
 * puts the instrument and where the sound goes there; a page its play button).
 */
export function PatternBar({ instrument, bars, onPreset, onBars, onClear, leading, trailing }: { instrument: Instrument; bars: number; onPreset: (id: string) => void; onBars: (bars: number) => void; onClear: () => void; leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {leading}
      <Select value="" onChange={(id) => id && onPreset(id)} aria-label="Load a pattern" options={[{ value: "", label: "Pattern…", disabled: true }, ...instrument.presets.map((p) => ({ value: p.id, label: p.name }))]} />
      <Select value={bars} onChange={onBars} aria-label="Bars in the pattern" options={[{ value: 1, label: "1 bar" }, { value: 2, label: "2 bars" }]} />
      {trailing}
      <button type="button" className={ibtn} onClick={onClear} title="Clear the pattern" aria-label="Clear the pattern"><Icon name="trash" /></button>
    </div>
  );
}

/**
 * The step grid: one row per lane, click a step for on, again for an accent, again to clear. `position` is read every frame to light the
 * step that sounds. `musicKey` (0 = C) names a pitched instrument's lanes in that key.
 */
/** `fit` squeezes the steps into the width given instead of scrolling sideways (a page on a phone). */
export default function StepGrid({ instrument, cells, steps, beatsPerBar, musicKey, position, onStep, fit = false }: { instrument: Instrument; cells: Cells; steps: number; beatsPerBar: number; musicKey?: number; position: () => number | null; onStep: (lane: number, step: number, value: 0 | 1 | 2) => void; fit?: boolean }) {
  const heads = useRef<(HTMLSpanElement | null)[]>([]);
  // read by the frame loop, so a new function each render does not restart it
  const pos = useRef(position);
  useEffect(() => { pos.current = position; }, [position]);
  const lanes = musicKey === undefined ? instrument.lanes : lanesIn(instrument, musicKey);
  const bpb = beatsPerBar;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = pos.current();
      heads.current.forEach((el, i) => {
        if (!el) return;
        el.style.background = p === i ? "var(--color-amber-400)" : "";
        el.style.color = p === i ? "var(--color-slate-950)" : "";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [steps]);

  const gap = (s: number) => (s % (bpb * 4) === 0 && s > 0 ? "ml-1.5" : s % 4 === 0 && s > 0 ? "ml-0.5" : "");
  return (
    <div className={fit ? "" : "overflow-x-auto"}>
      <div className={`grid gap-y-1 ${fit ? "" : "min-w-max"}`} style={{ gridTemplateColumns: fit ? `3.5rem repeat(${steps}, minmax(0, 1fr))` : `4.5rem repeat(${steps}, minmax(1.5rem, 1fr))` }} role="grid" aria-label={`${instrument.name} pattern, ${steps} steps`}>
        <span />
        {Array.from({ length: steps }, (_, s) => (
          <span key={s} ref={(el) => { heads.current[s] = el; }} className={`mb-0.5 grid h-4 place-items-center rounded text-[9px] tabular-nums text-slate-500 ${gap(s)}`}>
            {s % 4 === 0 ? (s / 4) % bpb + 1 : "·"}
          </span>
        ))}
        {lanes.map((lane, l) => (
          <div key={lane.id} className="contents" role="row">
            <span className="flex min-w-0 items-center gap-1.5 pr-1 text-xs text-slate-300" title={lane.label}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${lane.degree === undefined ? LANE_DOT[l % LANE_DOT.length] : ""}`} style={lane.degree === undefined ? undefined : { background: degreeColour(lane.degree) }} />
              <span className="truncate">{lane.label}</span>
            </span>
            {Array.from({ length: steps }, (_, s) => {
              const v = cells[l]?.[s] ?? 0;
              // a pitched lane takes its degree's colour (as on every neck), a drum lane its own hue
              const pitched = lane.degree !== undefined;
              const fill = v === 0 ? (s % 8 < 4 ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-800/60 hover:bg-slate-700") : pitched ? (v === 2 ? ACCENT_RING : "") : `${(v === 2 ? LANE_ACCENT : LANE_ON)[l % LANE_ON.length]} ${v === 2 ? ACCENT_RING : ""}`;
              return (
                <button
                  key={s}
                  type="button"
                  role="gridcell"
                  aria-label={`${lane.label}, step ${s + 1}: ${v === 0 ? "off" : v === 1 ? "on" : "accent"}`}
                  onClick={() => onStep(l, s, ((v + 1) % 3) as 0 | 1 | 2)}
                  className={`mx-px h-7 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${gap(s)} ${fill}`}
                  style={v !== 0 && pitched ? { background: degreeColour(lane.degree!), opacity: v === 2 ? 1 : 0.85 } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
