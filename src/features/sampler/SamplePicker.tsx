"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { previewSample, sampleLibrary, useSampleLibrary } from "./library";
import { tbtn } from "@/components/ui";

/** A sample's name, edited as typed and saved (trimmed) on blur or Enter, so spaces between words survive. */
function NameField({ id, name, title }: { id: string; name: string; title: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) sampleLibrary.rename(id, draft);
    setDraft(null);
  };
  return (
    <input className="min-w-0 flex-1 bg-transparent text-xs text-slate-100 outline-none focus-visible:underline" value={draft ?? name} aria-label="Sample name" title={title}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setDraft(null); }} />
  );
}

/**
 * Choose a sample from the library. The button shows the chosen one (a warning dot when it is no longer in the library); the list
 * plays, renames and deletes samples too. `null` = none.
 */
export default function SamplePicker({ value, onChange, label, compact = false }: { value: string | null; onChange: (id: string | null) => void; label: string; compact?: boolean }) {
  const lib = useSampleLibrary();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const current = lib.samples.find((s) => s.id === value);
  const missing = lib.ready && !!value && !current;
  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-1">
      <button type="button" className={`flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-left text-xs text-slate-100 hover:border-slate-600 ${compact ? "max-w-[7rem]" : "max-w-[14rem]"}`} aria-label={label} aria-expanded={open} title={missing ? "Sample missing: choose another" : label} onClick={() => setOpen(!open)}>
        {missing && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
        <span className="truncate">{current?.name ?? (missing ? "missing" : "Choose sample")}</span>
      </button>
      {current && !compact && <button type="button" className={tbtn} title="Play the sample" aria-label={`Play ${current.name}`} onClick={() => void previewSample(current.id)}><Icon name="play" size={12} /></button>}
      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 flex max-h-72 w-64 flex-col gap-0.5 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl shadow-black/30" role="listbox" aria-label={label}>
          <li><button type="button" className="w-full rounded px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-800" onClick={() => { onChange(null); setOpen(false); }}>None</button></li>
          {lib.samples.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">No samples yet. Generate one or drop a file.</li>}
          {lib.samples.map((s) => (
            <li key={s.id} className={`flex items-center gap-1 rounded px-1 ${s.id === value ? "bg-sky-500/10" : ""}`} role="option" aria-selected={s.id === value}>
              <button type="button" className={tbtn} title="Play" aria-label={`Play ${s.name}`} onClick={() => void previewSample(s.id)}><Icon name="play" size={11} /></button>
              <NameField id={s.id} name={s.name} title={s.prompt ?? s.name} />
              <button type="button" className={tbtn} title="Use this sample" aria-label={`Use ${s.name}`} onClick={() => { onChange(s.id); setOpen(false); }}><Icon name="check" size={11} /></button>
              <button type="button" className={`${tbtn} hover:!border-rose-400`} title="Delete from the library" aria-label={`Delete ${s.name}`} onClick={() => { if (window.confirm(`Delete ${s.name}? Instruments using it go silent.`)) void sampleLibrary.remove(s.id); }}><Icon name="trash" size={11} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
