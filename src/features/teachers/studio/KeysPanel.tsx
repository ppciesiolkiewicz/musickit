"use client";

import { createPortal } from "react-dom";
import { KEYS } from "@/features/stage";

function KeyList({ hasSelection }: { hasSelection: boolean }) {
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {KEYS.map((k) => (
        <li key={k.shortcut} className={`flex items-center justify-between gap-2 ${k.needsSelection && !hasSelection ? "opacity-40" : ""}`}>
          <span className="text-slate-300">{k.label}</span>
          <kbd className="shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">{k.keys}</kbd>
        </li>
      ))}
    </ul>
  );
}

/** The keys that work right now: the ones that need a selected widget are dimmed until one is selected. */
export default function KeysPanel({ hasSelection }: { hasSelection: boolean }) {
  return (
    <>
      <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">Keys</h2>
      <KeyList hasSelection={hasSelection} />
      <p className="text-xs text-slate-500">Drag a widget to move it, its corner to resize it.</p>
    </>
  );
}

/** Every key, over the page (the ? key). */
export function KeysOverlay({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div data-chrome className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60" onPointerDown={onClose}>
      <div role="dialog" aria-label="Keys" className="w-[min(420px,90vw)] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <h2 className="mb-3 text-sm font-medium text-slate-100">Keys</h2>
        <KeyList hasSelection />
        <p className="mt-3 text-xs text-slate-500">Press any key or click to close.</p>
      </div>
    </div>,
    document.body,
  );
}
