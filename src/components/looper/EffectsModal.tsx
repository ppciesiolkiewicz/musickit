"use client";

import { useState, type ReactNode } from "react";
import Icon from "../Icon";
import Modal from "../Modal";
import { EFFECT_DEFS, EFFECT_KINDS, type EffectKind, type EffectSpec } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/**
 * The effects on one input or bus: choose an effect to add, set it before or after the fader, tweak, bypass, remove.
 * Pre-fader effects are cut by the fader (mute, volume); post-fader effects keep ringing, so a reverb tail survives a mute.
 */
export default function EffectsModal({ title, effects, volume, onAdd, onRemove, onParam, onBypass, onPost, onClose }: {
  title: ReactNode;
  effects: EffectSpec[];
  volume?: { value: number; onChange: (v: number) => void };
  onAdd: (kind: EffectKind, post: boolean) => void;
  onRemove: (id: string) => void;
  onParam: (id: string, key: string, value: number) => void;
  onBypass: (id: string) => void;
  onPost: (id: string, post: boolean) => void;
  onClose: () => void;
}) {
  const [post, setPost] = useState(false);
  const seg = (on: boolean) => `rounded-md px-2 py-1 text-[11px] ${on ? "bg-sky-500/25 text-sky-100" : "text-slate-400 hover:text-slate-200"}`;
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {volume && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="volume-2" /> Fader
            <input type="range" min={0} max={1.5} step={0.01} value={volume.value} onChange={(e) => volume.onChange(Number(e.target.value))} className="flex-1 accent-sky-400" aria-label="Fader" />
            <span className="w-10 tabular-nums">{Math.round(volume.value * 100)}%</span>
          </label>
        )}
        {effects.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No effects yet. Pick one below.</p>}
        {effects.map((fx) => {
          const def = EFFECT_DEFS[fx.kind];
          return (
            <section key={fx.id} className={`flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 ${fx.bypass ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-slate-100">{def.name}</h3>
                <span className="flex rounded-lg border border-slate-700 p-0.5" role="group" aria-label="Position of the effect">
                  <button type="button" className={seg(!fx.post)} aria-pressed={!fx.post} onClick={() => onPost(fx.id, false)} title="Before the fader: muting or lowering the fader also cuts it">Pre-fader</button>
                  <button type="button" className={seg(fx.post)} aria-pressed={fx.post} onClick={() => onPost(fx.id, true)} title="After the fader: the effect keeps ringing when the fader is down">Post-fader</button>
                </span>
                <button type="button" className={`${ibtn} ml-auto ${fx.bypass ? "" : "!border-emerald-500/70 !text-emerald-200"}`} aria-pressed={!fx.bypass} onClick={() => onBypass(fx.id)} title={fx.bypass ? "Bypassed (tap to switch on)" : "On (tap to bypass)"} aria-label={`${def.name} on or off`}><Icon name="power" /></button>
                <button type="button" className={ibtn} onClick={() => onRemove(fx.id)} title="Remove" aria-label={`Remove ${def.name}`}><Icon name="trash" /></button>
              </div>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {def.params.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-14">{p.label}</span>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={fx.params[p.key]} onChange={(e) => onParam(fx.id, p.key, Number(e.target.value))} className="flex-1 accent-sky-400" aria-label={`${def.name} ${p.label}`} />
                    <span className="w-16 text-right tabular-nums">{p.unit ? `${Math.round(fx.params[p.key] * 100) / 100} ${p.unit}` : Math.round(fx.params[p.key] * 100) + "%"}</span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 p-2">
          <span className="text-xs text-slate-400">Add</span>
          {EFFECT_KINDS.map((k) => (
            <button key={k} type="button" disabled={effects.length >= 6} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400 disabled:opacity-40" onClick={() => onAdd(k, post)}>
              <Icon name="plus" size={14} /> {EFFECT_DEFS[k].name}
            </button>
          ))}
          <span className="ml-auto flex rounded-lg border border-slate-700 p-0.5" role="group" aria-label="Where new effects go">
            <button type="button" className={seg(!post)} aria-pressed={!post} onClick={() => setPost(false)}>Pre-fader</button>
            <button type="button" className={seg(post)} aria-pressed={post} onClick={() => setPost(true)}>Post-fader</button>
          </span>
        </div>
        <p className="text-xs text-slate-500">Effects run in order, top first, within their position.</p>
      </div>
    </Modal>
  );
}
