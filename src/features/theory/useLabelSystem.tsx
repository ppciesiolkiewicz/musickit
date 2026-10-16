"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LABEL_ROOT, DEFAULT_LABEL_SYSTEM, LABEL_ROOTS, LABEL_SYSTEMS, isLabelRoot, isLabelSystem, type LabelRoot, type LabelSystem } from "./labels";

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

/**
 * One dropdown for the label system. Every instance edits the same global setting.
 * `omit` hides systems a page has no use for; a stored omitted value shows as scale degrees, which is how such pages draw it.
 */
export function LabelSelect({ className = "", showLabel = true, omit = [] }: { className?: string; showLabel?: boolean; omit?: LabelSystem[] }) {
  const [stored, set] = useLabelSystem();
  const v = omit.includes(stored) ? "degree" : stored;
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      {showLabel && "Labels"}
      <select value={v} onChange={(e) => set(e.target.value as LabelSystem)} className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200" aria-label="Note labels">
        {LABEL_SYSTEMS.filter((s) => !omit.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.label} ({s.hint})</option>)}
      </select>
    </label>
  );
}

const ROOT_KEY = "musickit.labelRoot";
let root: LabelRoot = DEFAULT_LABEL_ROOT;
let rootLoaded = false;
const rootListeners = new Set<() => void>();

function subscribeRoot(fn: () => void) {
  if (!rootLoaded && typeof window !== "undefined") {
    rootLoaded = true;
    try {
      const v = window.localStorage.getItem(ROOT_KEY);
      if (isLabelRoot(v)) root = v;
    } catch { /* storage unavailable */ }
  }
  rootListeners.add(fn);
  queueMicrotask(fn);
  return () => { rootListeners.delete(fn); };
}

export function setLabelRoot(v: LabelRoot) {
  root = v;
  try { window.localStorage.setItem(ROOT_KEY, v); } catch { /* ignore */ }
  rootListeners.forEach((f) => f());
}

/** The global "count from the scale root or the chord root" setting: intervals, degrees and dot colours follow it. */
export function useLabelRoot(): [LabelRoot, (v: LabelRoot) => void] {
  const v = useSyncExternalStore(subscribeRoot, () => root, () => DEFAULT_LABEL_ROOT);
  return [v, setLabelRoot];
}

/** Scale root / chord root switch. Every instance edits the same global setting. */
export function RootSelect({ className = "" }: { className?: string }) {
  const [v, set] = useLabelRoot();
  return (
    <label className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      Count from
      <select value={v} onChange={(e) => set(e.target.value as LabelRoot)} className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200" aria-label="Count intervals and colours from">
        {LABEL_ROOTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
    </label>
  );
}
