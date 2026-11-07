"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LabelScope } from "@/features/theory/useLabelSystem";
import type { LabelSystem } from "@/features/theory/labels";

/** How a tune is drawn in the sing-along player: an endless staff or a piano roll. */
export type MelodyView = "staff" | "roll";

type Shared = { view: MelodyView };
const DEFAULTS: Shared = { view: "staff" };

type Scope = { values: Shared; set: <K extends keyof Shared>(key: K, v: Shared[K]) => void };
const ScopeContext = createContext<Scope | null>(null);

/**
 * The settings one exercise's tools share: how notes are labelled (unset: the app's setting) and how a melody is drawn
 * (the melody and run singers alike). Wrap an exercise in it; a tool outside one keeps its own. The app-wide ones
 * (volume, accuracy) are global stores; a tool's own (tempo, looping) stay in the tool.
 */
export function ExerciseSettings({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Shared>(DEFAULTS);
  const [labels, setLabels] = useState<LabelSystem | undefined>(undefined);
  const scope = useMemo<Scope>(() => ({ values, set: (key, v) => setValues((s) => ({ ...s, [key]: v })) }), [values]);
  return (
    <ScopeContext.Provider value={scope}>
      <LabelScope value={labels} set={setLabels}>{children}</LabelScope>
    </ScopeContext.Provider>
  );
}

/** One shared setting of the enclosing exercise; outside an exercise the tool keeps its own. */
export function useExerciseSetting<K extends keyof Shared>(key: K): [Shared[K], (v: Shared[K]) => void] {
  const scope = useContext(ScopeContext);
  const [own, setOwn] = useState<Shared[K]>(DEFAULTS[key]);
  if (!scope) return [own, setOwn];
  return [scope.values[key], (v) => scope.set(key, v)];
}
