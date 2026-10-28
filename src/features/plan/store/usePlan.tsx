"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { EMPTY_STATE, type PlanState } from "../model/types";
import { localPlanStore } from "./localPlanStore";
import type { PlanStore } from "./PlanStore";

const StoreContext = createContext<PlanStore>(localPlanStore);

/** Swap the store for a subtree (an API store, a test double). Without it the plan lives in localStorage. */
export function PlanStoreProvider({ store, children }: { store: PlanStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The plan state from the store, and `update` to change it: the change shows at once and is saved behind it. */
export function usePlan() {
  const store = useContext(StoreContext);
  const [state, setState] = useState<PlanState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(state);

  useEffect(() => {
    let live = true;
    store.load().then((s) => {
      if (!live) return;
      latest.current = s;
      setState(s);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [store]);

  const update = useCallback((change: (s: PlanState) => PlanState) => {
    const next = change(latest.current);
    latest.current = next;
    setState(next);
    void store.save(next);
  }, [store]);

  return { state, loaded, update };
}
