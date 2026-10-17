"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LABEL_ROOT, DEFAULT_LABEL_SYSTEM, LABEL_ROOTS, LABEL_SYSTEMS, isLabelRoot, isLabelSystem, type LabelRoot, type LabelSystem } from "./labels";
import { Select, Field } from "@/components/ui";

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
    <Field label={showLabel ? "Labels" : null} className={className}>
      <Select size="sm" value={v} onChange={set} aria-label="Note labels" options={LABEL_SYSTEMS.filter((s) => !omit.includes(s.id)).map((s) => ({ value: s.id, label: `${s.label} (${s.hint})` }))} />
    </Field>
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
    <Field label="Count from" className={className}>
      <Select size="sm" value={v} onChange={set} aria-label="Count intervals and colours from" options={LABEL_ROOTS.map((r) => ({ value: r.id, label: r.label }))} />
    </Field>
  );
}
