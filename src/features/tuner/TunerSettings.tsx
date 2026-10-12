"use client";

import { useState, type ReactNode } from "react";
import { clampA4, resolveChoice, TUNER_INSTRUMENTS, withInstrument, type TunerChoice } from "./choice";
import type { InstrumentId } from "@/features/theory/tunings";
import InstrumentIcon from "./InstrumentIcon";

const fieldBase = "rounded-md border border-slate-700 bg-slate-900 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const chevron = "grid place-items-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-30";

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

/** A4 in hertz: type a value, or step it a hertz at a time with the chevrons (or the arrow keys). */
export function A4Field({ value, onChange, small }: { value: number; onChange: (hz: number) => void; small?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const n = Number(draft?.replace(",", "."));
    if (draft !== null && Number.isFinite(n) && n > 0) onChange(clampA4(n));
    setDraft(null);
  };
  const step = (d: number) => { setDraft(null); onChange(clampA4(Math.round(value) + d)); };
    return (
    <div className={`flex items-center gap-1.5 ${small ? "text-[11px]" : "text-xs"} text-slate-400`}>
      A4
      <div className={`flex h-8 items-stretch overflow-hidden ${fieldBase}`}>
        <button type="button" aria-label="Lower A4 by 1 Hz" onClick={() => step(-1)} className={`${chevron} ${small ? "w-5" : "w-7"}`}><Chevron /></button>
        <input type="text" inputMode="decimal" aria-label="A4 frequency in hertz" value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setDraft(null);
            else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); step(e.key === "ArrowUp" ? 1 : -1); }
          }}
          className={`${small ? "w-10" : "w-12"} border-x border-slate-700 bg-transparent text-center tabular-nums text-slate-100 outline-none`} />
        <button type="button" aria-label="Raise A4 by 1 Hz" onClick={() => step(1)} className={`${chevron} ${small ? "w-5" : "w-7"}`}><Chevron up /></button>
      </div>
      Hz
    </div>
  );
}

/** One-tap A4 references: concert pitch, and the 432 Hz some players prefer (after Verdi, who argued for it). */
const A4_PRESETS = [{ hz: 440, label: "Standard" }, { hz: 432, label: "Verdi" }];

function A4Presets({ value, onChange }: { value: number; onChange: (hz: number) => void }) {
  return (
    <div role="group" aria-label="A4 presets" className="flex gap-1.5">
      {A4_PRESETS.map((p) => {
        const on = value === p.hz;
        return (
          <button key={p.hz} type="button" aria-pressed={on} onClick={() => onChange(p.hz)}
            className={`h-8 rounded-md border px-2.5 text-xs transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-500/60 bg-sky-500/15 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}>
            {p.label} <span className="tabular-nums text-slate-400">{p.hz} Hz</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The instrument, tuning and A4 of a tuner. `compact` is the narrow form for the looper's tuner widget: selects instead of the
 * row of instrument buttons, `trailing` at the end of the selects' row and `aside` beside A4, and no A4 presets.
 */
export default function TunerSettings({ choice, onChange, compact, trailing, aside }: {
  choice: TunerChoice; onChange: (c: TunerChoice) => void; compact?: boolean; trailing?: ReactNode; aside?: ReactNode;
}) {
  const { instrument, tuning } = resolveChoice(choice);
  const pick = (id: InstrumentId) => onChange(withInstrument(choice, id));
  const tuningSelect = instrument.tunings.length > 1 && (
    <select aria-label="Tuning" className={`${fieldBase} ${compact ? "h-8 min-w-0 flex-1 px-1.5 text-xs" : "h-8 px-2 text-xs"}`} value={tuning?.id}
      onChange={(e) => onChange({ ...choice, tuning: e.target.value })}>
      {instrument.tunings.map((t) => (
        <option key={t.id} value={t.id}>{t.name} · {t.strings.map((x) => x.name).join(" ")}</option>
      ))}
    </select>
  );
  const a4 = <A4Field value={choice.a4} onChange={(hz) => onChange({ ...choice, a4: hz })} small={compact} />;

  if (compact) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex w-full items-center gap-1">
          <select aria-label="Instrument" className={`${fieldBase} h-8 px-1.5 text-xs`} value={instrument.id} onChange={(e) => pick(e.target.value as InstrumentId)}>
            {TUNER_INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {tuningSelect}
          {trailing}
        </div>
        <div className="flex w-full items-center gap-2">
          {a4}
          {aside}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Instrument" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TUNER_INSTRUMENTS.map((inst) => {
          const on = inst.id === instrument.id;
          return (
            <button key={inst.id} type="button" role="radio" aria-checked={on} onClick={() => pick(inst.id)}
              className={`flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-500/60 bg-sky-500/15 text-sky-100" : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
              <InstrumentIcon id={inst.id} size={28} />
              {inst.name}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        {tuningSelect && <label className="flex items-center gap-1.5">Tuning {tuningSelect}</label>}
        <div className="flex flex-wrap items-center gap-2">
          {a4}
          <A4Presets value={choice.a4} onChange={(hz) => onChange({ ...choice, a4: hz })} />
        </div>
      </div>
    </div>
  );
}
