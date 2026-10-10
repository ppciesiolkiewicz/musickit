"use client";

import { useMemo } from "react";
import Icon from "../Icon";
import LevelMeter from "./LevelMeter";
import InputBundle from "./InputBundle";
import { useFold } from "./fold";
import { MAX_INPUT_GAIN, type InputInfo, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const mini = "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-700 bg-slate-900 text-[10px] text-slate-300 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const kindIcon = (k: InputInfo["kind"]) => (k === "device" ? "mic" : k === "scalepiano" ? "music" : "piano");

/**
 * A small floating list of the played inputs (devices, the keyboard, the Scale Pianos; not the sequencers) under the metronome:
 * level, volume, mute and, for an input with a keyboard, a button that brings that keyboard on screen. Each row unfolds to its
 * switch options (its output buses and where the output goes, the same controls as its canvas block). The widget floats over
 * the page, so opening it or a row never moves the canvas. Folds are shared with the canvas blocks (`useFold`).
 */
export default function InputsMini({ engine, snap, keyboardOpen, onToggleKeyboard, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const [open, toggle] = useFold("inputs-widget");
  const inputs = snap.inputs.filter((i) => i.kind !== "sequencer");
  const muted = inputs.filter((i) => i.muted).length;
  return (
    <section className="flex max-h-[calc(100vh-6rem)] w-72 max-w-[calc(100vw-1rem)] flex-col rounded-xl border border-slate-700 bg-slate-900/95 text-xs shadow-lg backdrop-blur" aria-label="Inputs at a glance">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-slate-300 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
        <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
        <span className="font-medium">Inputs</span>
        <span className="text-slate-500">{inputs.length}{muted ? ` · ${muted} muted` : ""}</span>
      </button>
      {open && (
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5">
          {inputs.length === 0 && <li className="px-1 py-1 text-slate-500">No inputs yet.</li>}
          {inputs.map((inp) => (
            <Row key={inp.id} engine={engine} snap={snap} inp={inp} keyOpen={inp.kind === "extra" ? keyboardOpen : inp.kind === "scalepiano" && !!inp.sourceId && openPianos.includes(inp.sourceId)} onKeys={inp.kind === "extra" ? onToggleKeyboard : inp.kind === "scalepiano" && inp.sourceId ? () => onTogglePiano(inp.sourceId!) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ engine, snap, inp, keyOpen, onKeys }: { engine: LooperEngine; snap: LooperSnapshot; inp: InputInfo; keyOpen: boolean; onKeys?: () => void }) {
  const ownerId = `in:${inp.id}`;
  const [open, toggle] = useFold(`${ownerId}:row`, false);
  const hasBlock = snap.patch.nodes.some((n) => n.id === ownerId);
  const getLevel = useMemo(() => () => engine.getInputLevel(inp.id), [engine, inp.id]);
  const set = (patch: { muted?: boolean; volume?: number }) => engine.do({ type: "input.set", id: inp.id, patch });
  return (
    <li className={`flex flex-col rounded-md ${open && hasBlock ? "border border-slate-800 bg-slate-950/40" : ""}`}>
      <div className={`flex items-center gap-1 px-1 py-px ${inp.muted ? "opacity-60" : ""}`}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left text-slate-200 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" onClick={toggle} disabled={!hasBlock} aria-expanded={hasBlock ? open : undefined} title={hasBlock ? (open ? "Hide its switch options" : "Show its switch options") : inp.name}>
          <span className={`shrink-0 text-slate-500 ${hasBlock ? "" : "invisible"}`} aria-hidden><Icon name={open ? "chevron-down" : "chevron-right"} size={12} /></span>
          <span className="shrink-0 text-slate-400" aria-hidden><Icon name={kindIcon(inp.kind)} size={13} /></span>
          <span className="min-w-0 truncate">{inp.name}</span>
        </button>
        <LevelMeter vertical small getLevel={getLevel} />
        <input type="range" min={0} max={MAX_INPUT_GAIN} step={0.01} value={inp.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="h-3 w-14 shrink-0 accent-sky-400" aria-label={`Volume of ${inp.name}`} title={`Volume ${Math.round(inp.volume * 100)}%`} />
        <button type="button" className={`${mini} ${inp.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={inp.muted} onClick={() => set({ muted: !inp.muted })} title={inp.muted ? "Unmute" : "Mute"} aria-label={`Mute ${inp.name}`}>M</button>
        {onKeys ? (
          <button type="button" className={`${mini} ${keyOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={keyOpen} onClick={onKeys} title={keyOpen ? "Close the keyboard" : "Open the keyboard"} aria-label={`${keyOpen ? "Close" : "Open"} the keyboard of ${inp.name}`}><Icon name="keyboard" size={12} /></button>
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        )}
      </div>
      {open && hasBlock && <div className="pt-1"><InputBundle engine={engine} snap={snap} ownerId={ownerId} /></div>}
    </li>
  );
}
