"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { EFFECT_DEFS, getChoice, type CloudItem, type EffectSpec, type ParamDef } from "../model";
import { Slider, ibtn, Select } from "@/components/ui";

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
  const [remote, setRemote] = useState<CloudItem[]>([]);
  const [loading, setLoading] = useState(false);
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
  // the online library, when there is one, is part of the same list
  useEffect(() => {
    let alive = true;
    void source?.cloud?.list().then((r) => alive && "models" in r && setRemote(r.models));
    return () => {
      alive = false;
    };
  }, [source, options]);
  if (!source) return <p className="text-xs text-slate-500">{label}: not available</p>;
  const choose = async (raw: string) => {
    if (!raw.startsWith("c:")) return onChange(Number(raw));
    const item = remote.find((m) => m.path === raw.slice(2));
    if (!item || !source.cloud) return;
    setLoading(true);
    setError(null);
    const r = await source.cloud.use(item);
    setLoading(false);
    if ("error" in r) setError(r.error);
    else onChange(r.id);
  };
  const folderOf = (path: string) => {
    const parts = path.replace(/^nam\//, "").split("/");
    return parts.length > 1 ? parts[0] : "Cloud";
  };
  const have = new Set(options.map((o) => o.cloudPath).filter(Boolean));
  const groups = new Map<string, { value: string; text: string }[]>();
  const put = (g: string, value: string, text: string) => groups.set(g, [...(groups.get(g) ?? []), { value, text }]);
  for (const o of options) {
    if (o.cloudPath) put(folderOf(o.cloudPath), String(o.id), `☁ ${o.name.includes(" / ") ? o.name.split(" / ").slice(1).join(" / ") : o.name}`);
    else put("This device", String(o.id), o.name);
  }
  for (const m of remote) if (!have.has(m.path)) put(m.group ?? "Cloud", `c:${m.path}`, `☁ ${m.variant}`);
  const order = [...groups.keys()].sort((a, b) => (a === "This device" ? 1 : b === "This device" ? -1 : a.localeCompare(b)));
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
        <Select
          className="w-0 flex-1"
          value={String(value)}
          disabled={loading}
          onChange={(v) => void choose(v)}
          aria-label={label}
          options={[{ value: "0", label: loading ? "Loading…" : options.length || remote.length ? "None (clean)" : "No models yet: add or drop a file" }]}
          groups={order.map((g) => ({ label: g, options: groups.get(g)!.map((o) => ({ value: String(o.value), label: o.text })) }))}
        />
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

const EMPTY: { id: number; name: string; cloudPath?: string }[] = [];

/** The sliders, switches and pickers of one effect. Used in the dialog and in the widgets on the stage. */
export default function EffectControls({ fx, onParam, columns = true }: { fx: EffectSpec; onParam: (key: string, value: number) => void; columns?: boolean }) {
  const def = EFFECT_DEFS[fx.kind];
  return (
              <div className={`grid grid-cols-1 gap-x-4 gap-y-1 ${columns ? "sm:grid-cols-2" : ""}`}>
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
                      <Slider min={p.min} max={p.max} step={p.step} value={v} onChange={(x) => onParam(p.key, x)} className="flex-1" aria-label={label} />
                      <span className="w-16 text-right tabular-nums">{p.key === "gate" && v <= -89 ? "off" : p.unit ? `${Math.round(v * 100) / 100} ${p.unit}` : Math.round(v * 100) + "%"}</span>
                    </label>
                  );
                })}
              </div>
  );
}
