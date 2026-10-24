"use client";

import { useRef, useState } from "react";

/**
 * A number you can type. Typing only edits a draft, so "1" on the way to "120" is not clamped to the minimum and the
 * second digit still lands; the value is rounded, clamped and set on blur or Enter, and Escape undoes the edit.
 * Text inside is unstyled: the parent sets the size and colour (`className` for the box's width and look).
 */
export default function NumberField({
  value,
  onCommit,
  min,
  max,
  disabled,
  className = "",
  title,
  "aria-label": ariaLabel,
}: {
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label": string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const commit = () => {
    const v = Math.min(max, Math.max(min, Math.round(Number(draft))));
    if (!cancelled.current && draft !== null && draft.trim() !== "" && Number.isFinite(v) && v !== value) onCommit(v);
    cancelled.current = false;
    setDraft(null);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft ?? value}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        // keep the page's shortcuts (Space, the piano keys) out of the box while typing
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`rounded-md bg-transparent text-center tabular-nums outline-none ring-sky-400 hover:bg-slate-800/60 focus:bg-slate-800 focus:ring-1 disabled:opacity-60 disabled:hover:bg-transparent ${className}`}
    />
  );
}
