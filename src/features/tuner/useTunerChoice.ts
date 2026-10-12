"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CHOICE, sanitiseChoice, type TunerChoice } from "./choice";

/** A tuner choice kept in localStorage under `key`, restored after hydration. `initial` (a query string, say) wins over the stored one. */
export function useTunerChoice(key: string, initial?: () => TunerChoice | null): [TunerChoice, (c: TunerChoice | ((c: TunerChoice) => TunerChoice)) => void] {
  const [choice, setChoice] = useState<TunerChoice>(DEFAULT_CHOICE);
  const loaded = useRef(false);

  useEffect(() => {
    let start: TunerChoice | null = null;
    try {
      start = initial?.() ?? sanitiseChoice(JSON.parse(window.localStorage.getItem(key) ?? "null"));
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved choice after hydration
    if (start) setChoice(start);
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per key
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try { window.localStorage.setItem(key, JSON.stringify(choice)); } catch { /* storage blocked */ }
  }, [key, choice]);

  return [choice, setChoice];
}
