"use client";

import Icon from "../Icon";
import { EFFECT_DEFS, type EffectSpec } from "@/lib/looper/engine";

const chip = "rounded px-1 py-0.5 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/**
 * The effect stack of a strip, like a DAW's insert slots: pre-fader effects, the fader, then post-fader effects.
 * The signal passes left to right, so the order here is the order they are applied. Click a name to bypass it,
 * the arrows to move it earlier or later, and + (or the empty slot) to open the full effects dialog.
 */
export default function EffectStack({ effects, onOpen, onBypass, onMove }: {
  effects: EffectSpec[];
  onOpen: () => void;
  onBypass: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const pre = effects.filter((e) => !e.post);
  const post = effects.filter((e) => e.post);
  const slot = (list: EffectSpec[]) =>
    list.map((e, i) => (
      <li key={e.id} className={`flex items-center rounded-md border ${e.bypass ? "border-slate-700 text-slate-500" : "border-violet-400/60 bg-violet-500/15 text-violet-100"}`}>
        <button type="button" className={`${chip} disabled:opacity-30`} disabled={i === 0} onClick={() => onMove(e.id, -1)} aria-label={`Move ${EFFECT_DEFS[e.kind].name} earlier`} title="Earlier in the chain"><Icon name="chevron-left" size={10} /></button>
        <button type="button" className={`${chip} ${e.bypass ? "line-through" : ""}`} aria-pressed={!e.bypass} onClick={() => onBypass(e.id)} title={e.bypass ? "Bypassed: click to switch on" : "Click to bypass"}>{EFFECT_DEFS[e.kind].name}</button>
        <button type="button" className={`${chip} disabled:opacity-30`} disabled={i === list.length - 1} onClick={() => onMove(e.id, 1)} aria-label={`Move ${EFFECT_DEFS[e.kind].name} later`} title="Later in the chain"><Icon name="chevron-right" size={10} /></button>
      </li>
    ));
  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label="Effect stack">
      {slot(pre)}
      <li className="flex items-center gap-0.5 rounded-md border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300" title="Fader: effects to its left are cut by mute and volume, effects to its right keep ringing"><Icon name="sliders-horizontal" size={10} />fader</li>
      {slot(post)}
      <li><button type="button" className="rounded-md border border-dashed border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" onClick={onOpen} title="Add or edit effects" aria-label="Add or edit effects"><Icon name="plus" size={10} /></button></li>
    </ul>
  );
}
