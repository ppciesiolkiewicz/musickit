"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

/** How a tune is drawn in the sing-along player: an endless staff or a piano roll. */
export type MelodyView = "staff" | "roll";

type Shared = { view: MelodyView };
const DEFAULTS: Shared = { view: "staff" };

type Scope = { values: Shared; set: <K extends keyof Shared>(key: K, v: Shared[K]) => void };
const ScopeContext = createContext<Scope | null>(null);

/**
 * The settings one exercise's tools share: how a melody is drawn (the melody and run singers alike). Wrap an exercise
 * in it. The app-wide ones (volume, accuracy, labels) are global stores; a tool's own (tempo, looping) stay in the tool.
 */
export function ExerciseSettings({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Shared>(DEFAULTS);
  const scope = useMemo<Scope>(() => ({ values, set: (key, v) => setValues((s) => ({ ...s, [key]: v })) }), [values]);
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

// Outside an exercise, the settings are one app-wide store, so every standalone tool (the singing page, say) agrees.
const standalone: Shared = { ...DEFAULTS };
const standaloneListeners = new Set<() => void>();
function subscribeStandalone(listener: () => void) {
  standaloneListeners.add(listener);
  return () => standaloneListeners.delete(listener);
}

/** One shared setting of the enclosing exercise; outside an exercise, the app-wide one. */
export function useExerciseSetting<K extends keyof Shared>(key: K): [Shared[K], (v: Shared[K]) => void] {
  const scope = useContext(ScopeContext);
  const standaloneValue = useSyncExternalStore(subscribeStandalone, () => standalone[key], () => DEFAULTS[key]);
  if (!scope) {
    return [standaloneValue, (v) => {
      standalone[key] = v;
      standaloneListeners.forEach((l) => l());
    }];
  }
  return [scope.values[key], (v) => scope.set(key, v)];
}
