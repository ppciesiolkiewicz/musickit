"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "../Icon";
import Modal from "../Modal";
import { isPinned, togglePin, usePins } from "./fxPins";
import { EFFECT_DEFS, EFFECT_KINDS, getChoice, type CloudItem, type CloudSource, type EffectKind, type EffectSpec, type ParamDef } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** Group library files by setup (folder), top-level files last. */
function groupItems(items: CloudItem[]): { name: string | null; items: CloudItem[] }[] {
  const by = new Map<string | null, CloudItem[]>();
  items.forEach((m) => by.set(m.group, [...(by.get(m.group) ?? []), m]));
  return [...by.entries()].sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : a[0].localeCompare(b[0]))).map(([name, list]) => ({ name, items: list }));
}

/** The private online library: sign in with the site password, pick a model to use (it is copied into the browser), add or remove models. */
function CloudPanel({ cloud, accept, onPick }: { cloud: CloudSource; accept?: string; onPick: (id: number) => void }) {
  const [pw, setPw] = useState(cloud.getPassword());
  const [items, setItems] = useState<CloudItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const load = async () => {
    setBusy(true);
    const r = await cloud.list();
    setBusy(false);
    if ("error" in r) {
      setItems(null);
      setMsg(r.error);
    } else {
      setItems(r.models);
      setMsg(null);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const use = async (m: CloudItem) => {
    setBusy(true);
    const r = await cloud.use(m);
    setBusy(false);
    if ("error" in r) setMsg(r.error);
    else onPick(r.id);
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-xs text-slate-300">
      <div className="flex items-center gap-1.5">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Site password" aria-label="Site password" className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" />
        <button type="button" className={ibtn} onClick={() => { cloud.setPassword(pw); void load(); }} title="Sign in" aria-label="Sign in"><Icon name="check" /></button>
        <button type="button" className={ibtn} onClick={() => file.current?.click()} title="Add model files to the cloud library" aria-label="Upload to the cloud library"><Icon name="upload" /></button>
        <input ref={file} type="file" multiple accept={accept} className="hidden" onChange={async (e) => { const f = Array.from(e.target.files ?? []) as File[]; e.target.value = ""; if (!f.length) return; setBusy(true); setMsg(await cloud.upload(f)); await load(); }} />
      </div>
      {busy && <p className="text-[11px] text-slate-500">Working...</p>}
      {msg && <p className="text-[11px] text-rose-300" role="alert">{msg}</p>}
      {items && items.length === 0 && <p className="text-[11px] text-slate-500">The library is empty. Upload a model.</p>}
      {items && groupItems(items).map((g) => (
        <div key={g.name ?? "_"} className="flex flex-col gap-1">
          {g.name && <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{g.name}</p>}
          <div className="flex flex-wrap gap-1">
            {g.items.map((m) => (
              <span key={m.path} className="inline-flex items-center overflow-hidden rounded-md border border-slate-700 bg-slate-950">
                <button type="button" className="px-2 py-1 hover:bg-slate-800" onClick={() => void use(m)} title={`Use ${g.name ? `${g.name} / ` : ""}${m.variant} (${Math.max(1, Math.round(m.size / 1024))} KB)`}>{m.variant}</button>
                <button type="button" className="border-l border-slate-700 px-1.5 py-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300" onClick={async () => { setMsg(await cloud.remove(m)); await load(); }} title="Delete from the cloud library" aria-label={`Delete ${m.variant}`}><Icon name="trash" size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [cloudOpen, setCloudOpen] = useState(false);
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
        {source.cloud && <button type="button" className={`${ibtn} ${cloudOpen ? "border-sky-500" : ""}`} aria-pressed={cloudOpen} onClick={() => setCloudOpen((v) => !v)} title="Private cloud library" aria-label="Private cloud library"><Icon name="cloud" /></button>}
        {source.addFiles && (
          <>
            <button type="button" className={ibtn} onClick={() => input.current?.click()} title="Add model files, or drop them here" aria-label="Add model files"><Icon name="upload" /></button>
            <input ref={input} type="file" multiple accept={source.accept} className="hidden" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          </>
        )}
      </div>
      {cloudOpen && source.cloud && <CloudPanel cloud={source.cloud} accept={source.accept} onPick={(id) => { onChange(id); setCloudOpen(false); }} />}
      {note && <p className={`text-[11px] ${note.warn ? "text-amber-300" : "text-slate-500"}`}>{note.text}</p>}
      {error && <p className="text-[11px] text-rose-300" role="alert">{error}</p>}
    </div>
  );
}

const EMPTY: { id: number; name: string }[] = [];

/** The sliders, switches and pickers of one effect. Used in the dialog and in the widgets on the stage. */
export function EffectControls({ fx, onParam, columns = true }: { fx: EffectSpec; onParam: (key: string, value: number) => void; columns?: boolean }) {
  const def = EFFECT_DEFS[fx.kind];
  return (
              <div className={`grid gap-x-4 gap-y-1 ${columns ? "sm:grid-cols-2" : ""}`}>
                {def.params.map((p) => {
                  const label = `${def.name} ${p.label}`;
                  const v = fx.params[p.key];
                  if (p.choice) return <ChoiceParam key={p.key} p={p} value={v} label={label} onChange={(n) => onParam(p.key, n)} />;
                  if (p.toggle) {
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                        <input type="checkbox" checked={v >= 0.5} onChange={(e) => onParam(p.key, e.target.checked ? 1 : 0)} className="accent-sky-400" aria-label={label} />
                        {p.label}
                      </label>
                    );
                  }
                  return (
                    <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-14">{p.label}</span>
                      <input type="range" min={p.min} max={p.max} step={p.step} value={v} onChange={(e) => onParam(p.key, Number(e.target.value))} className="flex-1 accent-sky-400" aria-label={label} />
                      <span className="w-16 text-right tabular-nums">{p.key === "gate" && v <= -89 ? "off" : p.unit ? `${Math.round(v * 100) / 100} ${p.unit}` : Math.round(v * 100) + "%"}</span>
                    </label>
                  );
                })}
              </div>
  );
}


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
  onPost: (id: string, post: boolean) => void;
  onClose: () => void;
  /** "g:<group id>" or "i:<input id>": effects can then be pinned to the stage as widgets */
  pinScope?: string;
}) {
  const pins = usePins();
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
            <button type="button" className={`${ibtn} ${isPinned(pins, `${pinScope}:${fx.id}`) ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={isPinned(pins, `${pinScope}:${fx.id}`)} onClick={() => togglePin(`${pinScope}:${fx.id}`)} title="Show this effect as a widget on the loop stage" aria-label={`Pin ${def.name} to the stage`}><Icon name="layout-dashboard" size={14} /></button>
          )}
          <button type="button" className={ibtn} onClick={() => onPost(fx.id, !fx.post)} title={fx.post ? "After the fader: move before it (the fader then cuts it)" : "Before the fader: move after it (it keeps ringing when the fader is down)"} aria-label={`Move ${def.name} ${fx.post ? "before" : "after"} the fader`}><Icon name="chevron-right" size={14} className={fx.post ? "-rotate-90" : "rotate-90"} /></button>
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
              <input type="range" min={0} max={1.5} step={0.01} value={volume.value} onChange={(e) => volume.onChange(Number(e.target.value))} className="flex-1 accent-sky-400" aria-label="Fader" />
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
