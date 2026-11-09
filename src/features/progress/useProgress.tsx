"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { upsert, without, type ProgressEntry } from "./log";
import { localProgressStore } from "./localProgressStore";
import type { ProgressStore } from "./ProgressStore";

const StoreContext = createContext<ProgressStore>(localProgressStore);

/** Swap the store for a subtree (an API store, a test double). Without it the log lives in localStorage. */
export function ProgressStoreProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The progress log from the store, with `put` and `remove`: a change shows at once and is saved behind it. */
export function useProgress() {
  const store = useContext(StoreContext);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(entries);

  useEffect(() => {
    let live = true;
    store.list().then((list) => {
      if (!live) return;
      latest.current = list;
      setEntries(list);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [store]);

  const put = useCallback((entry: ProgressEntry) => {
    latest.current = upsert(latest.current, entry);
    setEntries(latest.current);
    void store.put(entry);
  }, [store]);

  const remove = useCallback((exerciseId: string) => {
    latest.current = without(latest.current, exerciseId);
    setEntries(latest.current);
    void store.remove(exerciseId);
  }, [store]);

  return { entries, loaded, put, remove };
}
