"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LABEL_SYSTEM, LABEL_SYSTEMS, isLabelSystem, type LabelSystem } from "./labels";

const KEY = "musickit.labelSystem";
let current: LabelSystem = DEFAULT_LABEL_SYSTEM;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(KEY);
    if (isLabelSystem(v)) current = v;
  } catch { /* storage unavailable */ }
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  // pick up the stored value after hydration
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}

export function setLabelSystem(v: LabelSystem) {
  current = v;
  try { window.localStorage.setItem(KEY, v); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}

/** The global "how are notes labelled" setting, shared by every page and persisted. */
export function useLabelSystem(): [LabelSystem, (v: LabelSystem) => void] {
  const v = useSyncExternalStore(subscribe, () => current, () => DEFAULT_LABEL_SYSTEM);
  return [v, setLabelSystem];
}

/** One dropdown for the label system. Every instance edits the same global setting. */
export function LabelSelect({ className = "", showLabel = true }: { className?: string; showLabel?: boolean }) {
  const [v, set] = useLabelSystem();
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      {showLabel && "Labels"}
      <select value={v} onChange={(e) => set(e.target.value as LabelSystem)} className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200" aria-label="Note labels">
        {LABEL_SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.hint})</option>)}
      </select>
    </label>
  );
}
