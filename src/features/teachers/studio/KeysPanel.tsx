"use client";

import { createPortal } from "react-dom";
import { KEYS } from "@/features/stage";

/** The one thing to reach for: add a widget (it opens the list of everything that can go on the stage). */
export default function KeysPanel({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="flex items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500">
      Add a widget
      <kbd className="shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">/ or ⌘K</kbd>
    </button>
  );
}

/** Every key, over the page (the ? key). */
export function KeysOverlay({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div data-chrome className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60" onPointerDown={onClose}>
      <div role="dialog" aria-label="Keys" className="w-[min(420px,90vw)] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <h2 className="mb-3 text-sm font-medium text-slate-100">Keys</h2>
        <ul className="flex flex-col gap-1 text-xs">
          {KEYS.map((k) => (
            <li key={k.shortcut} className="flex items-center justify-between gap-2">
              <span className="text-slate-300">{k.label}</span>
              <kbd className="shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">{k.keys}</kbd>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Press any key or click to close.</p>
      </div>
    </div>,
    document.body,
  );
}
