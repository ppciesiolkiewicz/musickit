"use client";

import { useMemo, useState } from "react";
import Icon from "../Icon";
import LevelMeter from "./LevelMeter";
import { MAX_INPUT_GAIN, type InputInfo, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const KEY = "musickit.looper.inputsMini";
const mini = "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-700 bg-slate-900 text-[10px] text-slate-300 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const kindIcon = (k: InputInfo["kind"]) => (k === "device" ? "mic" : k === "sequencer" ? "drum" : k === "scalepiano" ? "music" : "piano");

/**
 * A small floating list of every input under the metronome: level, mute, volume and, for an input with a keyboard
 * (the on-screen keyboard, a Scale Piano), a button that opens it. Folds to its header; the fold is remembered.
 */
export default function InputsMini({ engine, snap, keyboardOpen, onToggleKeyboard, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  // shown only once the engine runs (in the browser), so the saved fold can be read straight away
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) !== "closed";
    } catch {
      return true;
    }
  });
  const toggle = () => {
    setOpen((v) => {
      try {
        window.localStorage.setItem(KEY, v ? "closed" : "open");
      } catch {
        /* storage blocked */
      }
      return !v;
    });
  };
  const muted = snap.inputs.filter((i) => i.muted).length;
  return (
    <section className="w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-700 bg-slate-900/95 text-xs shadow-lg backdrop-blur" aria-label="Inputs at a glance">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-slate-300 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
        <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
        <span className="font-medium">Inputs</span>
        <span className="text-slate-500">{snap.inputs.length}{muted ? ` · ${muted} muted` : ""}</span>
      </button>
      {open && (
        <ul className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5">
          {snap.inputs.length === 0 && <li className="px-1 py-1 text-slate-500">No inputs yet.</li>}
          {snap.inputs.map((inp) => (
            <Row key={inp.id} engine={engine} inp={inp} keyOpen={inp.kind === "extra" ? keyboardOpen : inp.kind === "scalepiano" && !!inp.sourceId && openPianos.includes(inp.sourceId)} onKeys={inp.kind === "extra" ? onToggleKeyboard : inp.kind === "scalepiano" && inp.sourceId ? () => onTogglePiano(inp.sourceId!) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ engine, inp, keyOpen, onKeys }: { engine: LooperEngine; inp: InputInfo; keyOpen: boolean; onKeys?: () => void }) {
  const getLevel = useMemo(() => () => engine.getInputLevel(inp.id), [engine, inp.id]);
  const set = (patch: { muted?: boolean; volume?: number }) => engine.do({ type: "input.set", id: inp.id, patch });
  return (
    <li className={`flex items-center gap-1 rounded-md px-1 py-px ${inp.muted ? "opacity-60" : ""}`}>
      <span className="shrink-0 text-slate-400" aria-hidden><Icon name={kindIcon(inp.kind)} size={13} /></span>
      <span className="min-w-0 flex-1 truncate text-slate-200" title={inp.name}>{inp.name}</span>
      <LevelMeter vertical small getLevel={getLevel} />
      <input type="range" min={0} max={MAX_INPUT_GAIN} step={0.01} value={inp.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="h-3 w-14 shrink-0 accent-sky-400" aria-label={`Volume of ${inp.name}`} title={`Volume ${Math.round(inp.volume * 100)}%`} />
      <button type="button" className={`${mini} ${inp.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={inp.muted} onClick={() => set({ muted: !inp.muted })} title={inp.muted ? "Unmute" : "Mute"} aria-label={`Mute ${inp.name}`}>M</button>
      {onKeys ? (
        <button type="button" className={`${mini} ${keyOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={keyOpen} onClick={onKeys} title={keyOpen ? "Close the keyboard" : "Open the keyboard"} aria-label={`${keyOpen ? "Close" : "Open"} the keyboard of ${inp.name}`}><Icon name="keyboard" size={12} /></button>
      ) : (
        <span className="w-6 shrink-0" aria-hidden />
      )}
    </li>
  );
}
