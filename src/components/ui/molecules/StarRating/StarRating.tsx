"use client";

import { useState } from "react";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/**
 * A row of stars with the label of the hovered or chosen one beside it. `labels[0]` is 1 star. Tapping the chosen star
 * again clears it (`onChange(null)`).
 */
export function StarRating({ value, onChange, labels, label, size = "md" }: {
  value: number | null;
  onChange: (v: number | null) => void;
  /** one label per star, from 1 star up */
  labels: readonly string[];
  /** what the row asks, for screen readers */
  label: string;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  const icon = size === "sm" ? 22 : 28;
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <div role="radiogroup" aria-label={label} className="-ml-2.5 flex" onMouseLeave={() => setHover(null)}>
        {labels.map((text, i) => {
          const n = i + 1;
          const lit = shown !== null && n <= shown;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}: ${text}`}
              title={text}
              tabIndex={-1}
              // preview only with a mouse: on a touch screen the hover would stick after a tap and hide a cleared rating
              onPointerEnter={(ev) => { if (ev.pointerType === "mouse") setHover(n); }}
              onClick={() => { setHover(null); onChange(value === n ? null : n); }}
              className="grid size-11 cursor-pointer place-items-center transition active:scale-90"
            >
              <svg width={icon} height={icon} viewBox="0 0 24 24" aria-hidden="true" className={lit ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-500"}>
                <path d={STAR} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>
      <span aria-live="polite" className={`text-sm ${shown !== null ? "text-slate-200" : "text-slate-500"}`}>
        {shown !== null ? labels[shown - 1] : ""}
      </span>
    </div>
  );
}
