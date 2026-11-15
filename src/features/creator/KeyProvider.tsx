"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { KeyContext } from "@/features/theory";
import { useUserDoc } from "@/features/userData/client/useUserDoc";
import { EMPTY_KEY, fromQuery, keyContext, keyTitle, sanitiseKey, setMode as withMode, setTonic as withTonic, toQuery, type KeyChoice } from "./model/key";

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

/**
 * Holds the one key every plugin follows: the player's `creator` document (`useUserDoc`), on the server for a signed-in
 * player, in localStorage without accounts. It starts empty, then shows a link's key (?key=), which is kept as the
 * choice, or else the saved one once it loads. `initial` fixes the start and keeps nothing (tests).
 */
export function CreatorKeyProvider({ children, initial }: { children: ReactNode; initial?: KeyChoice }) {
  const [stored, store, loaded] = useUserDoc("creator");
  const [fixed, setFixed] = useState<KeyChoice>(initial ?? EMPTY_KEY);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (initial) return;
    const fromLink = fromQuery(window.location.search);
    if (!fromLink) return;
    store(fromLink);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the link is only readable after mount
    setLinked(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choice = initial ? fixed : stored;
  const ready = !initial && (loaded || linked);
  useEffect(() => {
    if (!ready) return;
    try {
      window.history.replaceState(null, "", window.location.pathname + toQuery(choice));
    } catch {
      /* ignore */
    }
  }, [choice, ready]);

  return (
    <KeyScope value={choice} onChange={initial ? setFixed : store}>
      {children}
    </KeyScope>
  );
}

/**
 * A key for one subtree, held by the caller: no storage, no address bar. The creator page wraps it in its saved key;
 * another feature (the teacher studio) gives each widget its own.
 */
export function KeyScope({ value, onChange, children }: { value: KeyChoice; onChange: (c: KeyChoice) => void; children: ReactNode }) {
  const setTonic = useCallback((pc: number | null) => onChange(withTonic(value, pc)), [value, onChange]);
  const setMode = useCallback((family: number, mode: number) => onChange(withMode(value, family, mode)), [value, onChange]);
  const setKey = useCallback((c: KeyChoice) => onChange(sanitiseKey(c)), [onChange]);
  const clear = useCallback(() => onChange(withTonic(value, null)), [value, onChange]);
  const ctx = useMemo(() => keyContext(value), [value]);
  const v = useMemo<Value>(() => ({ choice: value, ctx, title: keyTitle(value), setTonic, setMode, setKey, clear }), [value, ctx, setTonic, setMode, setKey, clear]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

/** The key every creator plugin follows. Plugins render their general page when `ctx` is null. */
export function useCreatorKey(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreatorKey needs a CreatorKeyProvider");
  return v;
}
