"use client";

import Icon from "@/components/Icon";
import type { Layout } from "@/features/stage";

const ITEM = "flex h-6 items-center gap-1 px-2 text-xs";
const LAYOUTS: { id: Layout; label: string; title: string }[] = [
  { id: "grid", label: "Grid", title: "Grid: each widget at its own size, in line. Drag one to change the order. A new widget goes at the end; the frame scrolls when they do not all fit." },
  { id: "free", label: "Free", title: "Free: put widgets anywhere, any size, over each other." },
];

/** The stage's layout, above the frame's right corner so it is never recorded: which layout, and Auto layout for the one that is on. */
export default function LayoutSelector({ layout, canArrange, onLayout, onAutoLayout }: { layout: Layout; canArrange: boolean; onLayout: (l: Layout) => void; onAutoLayout: () => void }) {
  return (
    <div data-chrome role="group" aria-label="Layout" className="flex divide-x divide-slate-800 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      {LAYOUTS.map((m) => (
        <button key={m.id} type="button" title={m.title} aria-pressed={layout === m.id} onClick={() => onLayout(m.id)} className={`${ITEM} ${layout === m.id ? "bg-sky-500/10 text-sky-100" : "text-slate-400 hover:text-slate-100"}`}>
          {m.label}
        </button>
      ))}
      <button
        type="button"
        disabled={!canArrange}
        onClick={onAutoLayout}
        title={layout === "grid" ? "Auto layout is for the Free layout: the grid is always in line" : "Auto layout: line the widgets up in rows inside the frame, keeping their shapes"}
        aria-label="Auto layout"
        className={`${ITEM} text-slate-300 hover:text-slate-100 disabled:opacity-40`}
      >
        <Icon name="layout-dashboard" size={13} />
      </button>
    </div>
  );
}
