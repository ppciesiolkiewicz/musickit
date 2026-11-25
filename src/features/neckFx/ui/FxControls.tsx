"use client";

import { useState } from "react";
import { A3_BUTTONS, A3_LAYOUT, A3_MARKERS, DEFAULT_FX, EFFECTS, EFFECT_WORDS, FILTERS, readFx, type FxSettings } from "../model/fx";

/** Kept in this browser and shared by every page with Read the neck, so the markers are typed in once. */
const KEY = "musickit.neckFx";

function load(): FxSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? readFx(JSON.parse(raw)) : DEFAULT_FX;
  } catch { return DEFAULT_FX; }
}

/** The neck effects' settings, kept in this browser. */
export function useFx(): [FxSettings, (part: Partial<FxSettings>) => void] {
  const [fx, setState] = useState<FxSettings>(load);
  const set = (part: Partial<FxSettings>) => setState((f) => {
    const next = { ...f, ...part };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* kept for this visit only */ }
    return next;
  });
  return [fx, set];
}

const input = "rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200";
const field = "flex items-center gap-1.5 text-slate-300";
const btn = "rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40";
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Markers, Buttons, Covering and the Effects ticks, for a page that shows NeckView, and where the A3 layout puts each marker. */
export default function FxControls({ fx, set }: { fx: FxSettings; set: (part: Partial<FxSettings>) => void }) {
  const tick = (e: (typeof EFFECTS)[number], on: boolean) => set({ effects: on ? EFFECTS.filter((x) => x === e || fx.effects.includes(x)) : fx.effects.filter((x) => x !== e) });
  const isA3 = fx.markers === A3_MARKERS && fx.buttons === A3_BUTTONS;
  return (
    <div className="flex flex-col gap-2 text-sm">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className={field} title="For each marker, its number and the fret space its centre is in the middle of. A headstock marker by the nut is fret 0 with its size in mm, 0@0/25, and how far its edge is past the nut after a +, 0@0/30+8.">
        Markers
        <input value={fx.markers} onChange={(e) => set({ markers: e.target.value })} placeholder="0@0/25, 1@17" className={`${input} w-32`} />
      </label>
      <label className={field} title={`Cover a marker with your hand to turn on a filter: its number, then the filter. Filters: ${FILTERS.join(", ")}.`}>
        Buttons
        <input value={fx.buttons} onChange={(e) => set({ buttons: e.target.value })} placeholder="56=mono, 57=neon" className={`${input} w-40`} />
      </label>
      <label className={field} title="Hold: the filter is on while the marker is covered. Toggle: cover once for on, again for off.">
        Covering
        <select value={fx.mode} onChange={(e) => set({ mode: e.target.value === "toggle" ? "toggle" : "hold" })} className={input}>
          <option value="hold">Hold</option>
          <option value="toggle">Toggle</option>
        </select>
      </label>
      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <legend className="sr-only">Effects</legend>
        <span className="text-slate-400">Effects</span>
        {EFFECTS.map((e) => (
          <label key={e} className={field}>
            <input type="checkbox" checked={fx.effects.includes(e)} onChange={(ev) => tick(e, ev.target.checked)} className="accent-sky-500" /> {EFFECT_WORDS[e]}
          </label>
        ))}
      </fieldset>
    </div>
    <details className="text-slate-300">
      <summary className="cursor-pointer text-slate-400">Where each marker goes</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-xs text-slate-400">
          The A3 layout uses the <a href="/riff/neck-markers-frets-a3.pdf" target="_blank" rel="noreferrer" className="text-sky-400 underline">fret markers</a> sheet.
          Cut out the markers below and stick each one where it says. Fret markers go on the edge of the fretboard nearest you, centred in their fret space.
        </p>
        <ul className="grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
          {A3_LAYOUT.map((m) => (
            <li key={m.id}><span className="font-mono text-slate-100">{m.id}</span> · {m.mm} mm · {m.where}{m.filter ? ` · turns on ${cap(m.filter)}` : ""}</li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => set({ markers: A3_MARKERS, buttons: A3_BUTTONS })} disabled={isA3} className={btn}>Use the A3 layout</button>
          <span className="text-xs text-slate-500">{isA3 ? "Markers and Buttons are set to this layout." : "Fills Markers and Buttons with this layout."}</span>
        </div>
      </div>
    </details>
    </div>
  );
}
