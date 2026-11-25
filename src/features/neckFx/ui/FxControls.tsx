"use client";

import { useState } from "react";
import {
  A3_BUTTONS, A3_LAYOUT, A3_MARKERS, AMOUNT_MAX, BEAT_EFFECTS, DEFAULT_FX, EFFECTS, EFFECT_WORDS, FACE_EFFECTS, FILTERS, LOOK_EFFECTS, MOOD_EFFECTS, TEST_EFFECTS, readFx,
  type BeatEffect, type FaceEffect, type FxSettings,
} from "../model/fx";

const FACE_HINTS: Record<FaceEffect, string> = {
  smooth: "Softens the skin. Eyes, brows and lips stay sharp.",
  light: "A soft, warm light on the face.",
  eyes: "Lifts the eyes a little.",
  slim: "Narrows the cheeks and jaw a little.",
};

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
const isMood = (e: string): e is (typeof MOOD_EFFECTS)[number] => (MOOD_EFFECTS as readonly string[]).includes(e);
const isBeat = (e: string): e is BeatEffect => (BEAT_EFFECTS as readonly string[]).includes(e);

/** A 0 to 200% slider, shown as a percentage. */
function Amount({ label, title, value, onChange, disabled }: { label: string; title: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <label className={`${field} ${disabled ? "opacity-40" : ""}`} title={title}>
      {label}
      <input type="range" min={0} max={AMOUNT_MAX} step={0.05} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-24 accent-sky-500" />
      <span className="w-10 text-right font-mono text-xs text-slate-400">{Math.round(value * 100)}%</span>
    </label>
  );
}

/** Markers, Buttons, Covering, the look effects (mood effects with their Strength and Beat, and Hide markers), the test effects, for a page that shows NeckView, and where the A3 layout puts each marker. */
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
    </div>
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-slate-400">Effects</legend>
      {LOOK_EFFECTS.map((e) => {
        const off = !fx.effects.includes(e);
        return (
          <div key={e} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className={`${field} w-32`}>
              <input type="checkbox" checked={!off} onChange={(ev) => tick(e, ev.target.checked)} className="accent-sky-500" /> {EFFECT_WORDS[e]}
            </label>
            {isMood(e) && (
              <Amount label="Strength" title="How strong the effect is. 100% is the usual look." value={fx.strength[e]} disabled={off}
                onChange={(v) => set({ strength: { ...fx.strength, [e]: v } })} />
            )}
            {e === "hide" && <span className="text-xs text-slate-500">Paints over each marker in the colour around it.</span>}
            {isBeat(e) && (
              <Amount label="Beat" title="How much it jumps with each pick and with how loud you play. 0% ignores the beat." value={fx.beat[e]} disabled={off}
                onChange={(v) => set({ beat: { ...fx.beat, [e]: v } })} />
            )}
            {isBeat(e) && (
              <label className={`${field} ${off ? "opacity-40" : ""}`} title={e === "glow" ? "Notes: the colour of the last note played. Picked: always the colour you choose." : "Mood: changes with the key and the energy. Picked: always the colour you choose."}>
                Colour
                <select value={fx.colour[e] ? "picked" : "auto"} disabled={off} className={input}
                  onChange={(ev) => set({ colour: { ...fx.colour, [e]: ev.target.value === "picked" ? (fx.colour[e] ?? "#ff6a00") : null } })}>
                  <option value="auto">{e === "glow" ? "Notes" : "Mood"}</option>
                  <option value="picked">Picked</option>
                </select>
                {fx.colour[e] && (
                  <input type="color" value={fx.colour[e]!} disabled={off} aria-label={`${EFFECT_WORDS[e]} colour`}
                    onChange={(ev) => set({ colour: { ...fx.colour, [e]: ev.target.value } })} className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-slate-950" />
                )}
              </label>
            )}
          </div>
        );
      })}
    </fieldset>
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-slate-400">Face</legend>
      {FACE_EFFECTS.map((e) => {
        const off = !fx.effects.includes(e);
        return (
          <div key={e} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className={`${field} w-32`}>
              <input type="checkbox" checked={!off} onChange={(ev) => tick(e, ev.target.checked)} className="accent-sky-500" /> {EFFECT_WORDS[e]}
            </label>
            <Amount label="Strength" title="How strong the effect is. 100% is the usual look." value={fx.strength[e]} disabled={off}
              onChange={(v) => set({ strength: { ...fx.strength, [e]: v } })} />
            <span className="text-xs text-slate-500">{FACE_HINTS[e]}</span>
          </div>
        );
      })}
    </fieldset>
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <legend className="sr-only">Test effects</legend>
      <span className="text-slate-400">Test effects</span>
      {TEST_EFFECTS.map((e) => (
        <label key={e} className={field}>
          <input type="checkbox" checked={fx.effects.includes(e)} onChange={(ev) => tick(e, ev.target.checked)} className="accent-sky-500" /> {EFFECT_WORDS[e]}
        </label>
      ))}
    </fieldset>
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
