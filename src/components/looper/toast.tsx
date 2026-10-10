"use client";

import { useSyncExternalStore } from "react";
import Icon from "../Icon";

/** Short notices at the bottom of the screen (e.g. "Loop added in Looping"). Call `toast(text)` from anywhere; render `<Toasts />` once. */
interface Toast {
  id: number;
  text: string;
}

const EMPTY: Toast[] = [];
let list: Toast[] = EMPTY;
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dismissToast(id: number) {
  list = list.filter((t) => t.id !== id);
  emit();
}

/** Show a notice for a few seconds. At most three are shown; the oldest goes first. */
export function toast(text: string, ms = 3500) {
  const id = next++;
  list = [...list.slice(-2), { id, text }];
  emit();
  window.setTimeout(() => dismissToast(id), ms);
}

export function Toasts() {
  const items = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => list,
    () => EMPTY,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[2100] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg shadow-black/50">
          <Icon name="check" size={14} className="shrink-0 text-emerald-300" />
          <span>{t.text}</span>
          <button type="button" className="ml-1 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><Icon name="x" size={12} /></button>
        </div>
      ))}
    </div>
  );
}
