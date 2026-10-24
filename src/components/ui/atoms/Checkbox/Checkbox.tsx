import type { ReactNode } from "react";

/** An on/off option with its label: a ticked box, not a pill, for a setting that stands alone rather than one choice of a row. */
export function Checkbox({ checked, onChange, children, title }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={title}
      className="group inline-flex items-center gap-2 text-left text-xs text-slate-300 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      <span
        aria-hidden
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
          checked ? "border-sky-400 bg-sky-500 text-slate-950" : "border-slate-600 bg-slate-900 group-hover:border-slate-400"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5 5 9l4.5-6" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}
