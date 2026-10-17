"use client";

import { useState, type ReactNode } from "react";
import Icon from "../Icon";
import { hasWidget, toggleWidget, useWidgetRefs } from "./widgets";
import { EFFECT_DEFS, EFFECT_KINDS, type EffectKind, type EffectSpec } from "@/lib/looper/engine";
import { EffectControls } from "@/features/instruments";
import { Slider, Modal, ibtn } from "@/components/ui";

export { EffectControls };


/**
 * The effects on one input or bus: choose an effect to add, set it before or after the fader, tweak, bypass, remove.
 * Pre-fader effects are cut by the fader (mute, volume); post-fader effects keep ringing, so a reverb tail survives a mute.
 */
export default function EffectsModal({ title, effects, volume, onAdd, onRemove, onParam, onBypass, onPost, onClose, pinScope }: {
  title: ReactNode;
  effects: EffectSpec[];
  volume?: { value: number; onChange: (v: number) => void };
  onAdd: (kind: EffectKind, post: boolean) => void;
  onRemove: (id: string) => void;
  onParam: (id: string, key: string, value: number) => void;
  onBypass: (id: string) => void;
  /** left out for an effect chain on the patch canvas, which has no fader to be before or after */
  onPost?: (id: string, post: boolean) => void;
  onClose: () => void;
  /** "g:<group id>" or "i:<input id>": effects can then be pinned to the stage as widgets */
  pinScope?: string;
}) {
  const pins = useWidgetRefs();
  const [adding, setAdding] = useState<null | boolean>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const card = (fx: EffectSpec) => {
    const def = EFFECT_DEFS[fx.kind];
    const collapsed = open[fx.id] === false;
    return (
      <section key={fx.id} className={`flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2 ${fx.bypass ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-1.5">
          <button type="button" className={ibtn} aria-expanded={!collapsed} onClick={() => setOpen({ ...open, [fx.id]: collapsed })} title={collapsed ? "Show settings" : "Hide settings"} aria-label={`${collapsed ? "Show" : "Hide"} ${def.name} settings`}><Icon name="chevron-right" size={14} className={collapsed ? "" : "rotate-90"} /></button>
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{def.name}</h3>
          {pinScope && (
            <button type="button" className={`${ibtn} ${hasWidget(pins, `${pinScope}:${fx.id}`) ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={hasWidget(pins, `${pinScope}:${fx.id}`)} onClick={() => toggleWidget(`${pinScope}:${fx.id}`)} title="Show this effect as a widget on the loop stage" aria-label={`Pin ${def.name} to the stage`}><Icon name="layout-dashboard" size={14} /></button>
          )}
          {onPost && <button type="button" className={ibtn} onClick={() => onPost(fx.id, !fx.post)} title={fx.post ? "After the fader: move before it (the fader then cuts it)" : "Before the fader: move after it (it keeps ringing when the fader is down)"} aria-label={`Move ${def.name} ${fx.post ? "before" : "after"} the fader`}><Icon name="chevron-right" size={14} className={fx.post ? "-rotate-90" : "rotate-90"} /></button>}
          <button type="button" className={`${ibtn} ${fx.bypass ? "" : "!border-emerald-500/70 !text-emerald-200"}`} aria-pressed={!fx.bypass} onClick={() => onBypass(fx.id)} title={fx.bypass ? "Bypassed (tap to switch on)" : "On (tap to bypass)"} aria-label={`${def.name} on or off`}><Icon name="power" /></button>
          <button type="button" className={ibtn} onClick={() => onRemove(fx.id)} title="Remove" aria-label={`Remove ${def.name}`}><Icon name="trash" /></button>
        </div>
        {!collapsed && (
              <EffectControls fx={fx} onParam={(k, v) => onParam(fx.id, k, v)} />
        )}
      </section>
    );
  };
  const section = (post: boolean) => {
    const list = effects.filter((e) => !!e.post === post);
    return (
      <div className="flex flex-col gap-1.5" role="group" aria-label={post ? "After the fader" : "Before the fader"}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
          <span>{post ? "After fader" : "Before fader"}</span>
          <span className="normal-case tracking-normal text-slate-500">{post ? "keeps ringing when muted" : "cut by mute and volume"}</span>
          <button type="button" className={`${ibtn} ml-auto`} disabled={effects.length >= 6} aria-pressed={adding === post} onClick={() => setAdding(adding === post ? null : post)} title="Add an effect here" aria-label={`Add an effect ${post ? "after" : "before"} the fader`}><Icon name="plus" size={14} /></button>
        </div>
        {adding === post && (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 p-2">
            {EFFECT_KINDS.map((k) => (
              <button key={k} type="button" className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:border-sky-400" onClick={() => { onAdd(k, post); setAdding(null); }}>{EFFECT_DEFS[k].name}</button>
            ))}
          </div>
        )}
        {list.length === 0 && adding !== post && <p className="rounded-lg border border-dashed border-slate-800 p-1.5 text-xs text-slate-500">Empty</p>}
        {list.map(card)}
      </div>
    );
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {section(false)}
        <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">
          <Icon name="sliders-horizontal" size={14} /> Fader
          {volume && (
            <>
              <Slider min={0} max={1.5} step={0.01} value={volume.value} onChange={volume.onChange} className="flex-1" aria-label="Fader" />
              <span className="w-10 tabular-nums">{Math.round(volume.value * 100)}%</span>
            </>
          )}
        </label>
        {section(true)}
        <p className="text-xs text-slate-500">Top to bottom is the order the signal passes through.</p>
      </div>
    </Modal>
  );
}
