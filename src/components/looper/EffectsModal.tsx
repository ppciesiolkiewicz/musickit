"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "../Icon";
import Modal from "../Modal";
import { EFFECT_DEFS, EFFECT_KINDS, getChoice, type EffectKind, type EffectSpec, type ParamDef } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** A picker over a registered choice source (the amp models): select, add files with the button or by dropping them. */
function ChoiceParam({ p, value, label, onChange }: { p: ParamDef; value: number; label: string; onChange: (v: number) => void }) {
  const source = getChoice(p.choice ?? "");
  const options = useSyncExternalStore(
    (fn) => source?.subscribe(fn) ?? (() => {}),
    () => source?.options() ?? EMPTY,
    () => EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const pending = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // after files are added, pick the newest one
  useEffect(() => {
    if (pending.current !== null && options.length) {
      const top = Math.max(...options.map((o) => o.id));
      if (top > pending.current) {
        pending.current = null;
        onChange(top);
      }
    }
  }, [options, onChange]);
  if (!source) return <p className="text-xs text-slate-500">{label}: not available</p>;
  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length || !source.addFiles) return;
    pending.current = options.reduce((m, o) => Math.max(m, o.id), 0);
    setError(await source.addFiles(files));
  };
  const note = value ? source.describe?.(value) : null;
  return (
    <div
      className={`col-span-full flex flex-col gap-1 rounded-lg ${over ? "outline outline-2 outline-sky-400" : ""}`}
      onDragOver={(e) => {
        if (!source.addFiles || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!source.addFiles) return;
        e.preventDefault();
        setOver(false);
        void add(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="w-14">{p.label}</span>
        <select className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
          <option value={0}>{options.length ? "None (clean)" : "No models yet: add or drop a file"}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {source.addFiles && (
          <>
            <button type="button" className={ibtn} onClick={() => input.current?.click()} title="Add model files, or drop them here" aria-label="Add model files"><Icon name="upload" /></button>
            <input ref={input} type="file" multiple accept={source.accept} className="hidden" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          </>
        )}
      </div>
      {note && <p className={`text-[11px] ${note.warn ? "text-amber-300" : "text-slate-500"}`}>{note.text}</p>}
      {error && <p className="text-[11px] text-rose-300" role="alert">{error}</p>}
    </div>
  );
}

const EMPTY: { id: number; name: string }[] = [];

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
                {def.params.map((p) => {
                  const label = `${def.name} ${p.label}`;
                  const v = fx.params[p.key];
                  if (p.choice) return <ChoiceParam key={p.key} p={p} value={v} label={label} onChange={(n) => onParam(fx.id, p.key, n)} />;
                  if (p.toggle) {
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                        <input type="checkbox" checked={v >= 0.5} onChange={(e) => onParam(fx.id, p.key, e.target.checked ? 1 : 0)} className="accent-sky-400" aria-label={label} />
                        {p.label}
                      </label>
                    );
                  }
                  return (
                    <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-14">{p.label}</span>
                      <input type="range" min={p.min} max={p.max} step={p.step} value={v} onChange={(e) => onParam(fx.id, p.key, Number(e.target.value))} className="flex-1 accent-sky-400" aria-label={label} />
                      <span className="w-16 text-right tabular-nums">{p.key === "gate" && v <= -89 ? "off" : p.unit ? `${Math.round(v * 100) / 100} ${p.unit}` : Math.round(v * 100) + "%"}</span>
                    </label>
                  );
                })}
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
