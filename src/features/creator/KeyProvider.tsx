"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { KeyContext } from "@/features/theory";
import { EMPTY_KEY, fromQuery, keyContext, keyTitle, sanitiseKey, setMode as withMode, setTonic as withTonic, toQuery, type KeyChoice } from "./model/key";

const STORE = "musickit.creator.key";

interface Value {
  choice: KeyChoice;
  /** the theory of the chosen key; null when no key is chosen (plugins then show their general page) */
  ctx: KeyContext | null;
  title: string;
  setTonic: (pc: number | null) => void;
  setMode: (family: number, mode: number) => void;
  /** set everything at once (a plugin that picks a whole key, such as the circle of fifths) */
  setKey: (c: KeyChoice) => void;
  clear: () => void;
}

const Ctx = createContext<Value | null>(null);

/** Holds the one key every plugin follows. It starts empty, then restores the link (?key=) or the last choice; `initial` fixes the start (tests). */
export function CreatorKeyProvider({ children, initial }: { children: ReactNode; initial?: KeyChoice }) {
  const [choice, setChoice] = useState<KeyChoice>(initial ?? EMPTY_KEY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initial) {
      setReady(true);
      return;
    }
    let start: KeyChoice = EMPTY_KEY;
    try {
      start = fromQuery(window.location.search) ?? sanitiseKey(JSON.parse(window.localStorage.getItem(STORE) ?? "null"));
    } catch {
      /* use the empty key */
    }
    setChoice(start);
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORE, JSON.stringify(choice));
      window.history.replaceState(null, "", window.location.pathname + toQuery(choice));
    } catch {
      /* ignore */
    }
  }, [choice, ready]);

  const setTonic = useCallback((pc: number | null) => setChoice((c) => withTonic(c, pc)), []);
  const setMode = useCallback((family: number, mode: number) => setChoice((c) => withMode(c, family, mode)), []);
  const setKey = useCallback((c: KeyChoice) => setChoice(sanitiseKey(c)), []);
  const clear = useCallback(() => setChoice((c) => withTonic(c, null)), []);
  const ctx = useMemo(() => keyContext(choice), [choice]);
  const value = useMemo<Value>(() => ({ choice, ctx, title: keyTitle(choice), setTonic, setMode, setKey, clear }), [choice, ctx, setTonic, setMode, setKey, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The key every creator plugin follows. Plugins render their general page when `ctx` is null. */
export function useCreatorKey(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreatorKey needs a CreatorKeyProvider");
  return v;
}
