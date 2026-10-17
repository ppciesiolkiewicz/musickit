import type { ReactNode } from "react";

/** − value + : nudge a number up or down. */
export function Stepper({ value, onDec, onInc, decDisabled, incDisabled, label }: { value: ReactNode; onDec: () => void; onInc: () => void; decDisabled?: boolean; incDisabled?: boolean; label: string }) {
  const btn = "h-6 w-6 rounded-md border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-slate-700";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={onDec} disabled={decDisabled} aria-label={`${label}: lower`}>−</button>
      <span className="min-w-[4.5rem] text-center tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={onInc} disabled={incDisabled} aria-label={`${label}: higher`}>+</button>
    </span>
  );
}
