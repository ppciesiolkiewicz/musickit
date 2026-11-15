"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { withDayTime, type DayTime } from "../model/planTime";
import { EMPTY_STATE, type PlanState } from "../model/types";
import { localPlanStore } from "./localPlanStore";
import type { PlanStore } from "./PlanStore";

const StoreContext = createContext<PlanStore>(localPlanStore);

/**
 * Swap the store for a subtree. `UserDataProvider` (root layout) picks it for the current data source: the server for a
 * signed-in player, memory for a visitor, localStorage without accounts; the demo plan sets its own. Without a provider
 * the plan lives in localStorage.
 */
export function PlanStoreProvider({ store, children }: { store: PlanStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The store itself, for a reader outside `usePlan` (the practice reminder). */
export const usePlanStore = (): PlanStore => useContext(StoreContext);

/** The plan state from the store, and `update` to change it: the change shows at once and is saved behind it. */
export function usePlan() {
  const store = useContext(StoreContext);
  const [state, setState] = useState<PlanState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(state);

  useEffect(() => {
    let live = true;
    // a load that is refused (logged out) stays not loaded: an empty plan shown now could be saved over the real one
    store.load().then(
      (s) => {
        if (!live) return;
        latest.current = s;
        setState(s);
        setLoaded(true);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [store]);

  const update = useCallback((change: (s: PlanState) => PlanState) => {
    const next = change(latest.current);
    // a change that changed nothing (the day timer saving the same seconds) is not sent: on the server each save is a request
    if (next === latest.current) return;
    latest.current = next;
    setState(next);
    void store.save(next);
  }, [store]);

  return { state, loaded, update };
}

/**
 * The day timer's records of one plan (`planId`, null: no plan), apart from the plan document, and `saveTime` to keep one
 * day's: it shows at once and is saved behind it. Not `loaded` until they are read, so a timer never starts from 0 over
 * seconds that were saved.
 */
export function usePlanTimes(planId: string | null) {
  const store = useContext(StoreContext);
  const [times, setTimes] = useState<{ planId: string | null; list: DayTime[] }>({ planId: null, list: [] });
  const latest = useRef(times);

  useEffect(() => {
    if (!planId) return;
    let live = true;
    store.loadTimes(planId).then(
      (list) => {
        if (!live) return;
        latest.current = { planId, list };
        setTimes(latest.current);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [store, planId]);

  const saveTime = useCallback((t: DayTime) => {
    if (latest.current.planId !== t.planId) return;
    const list = withDayTime(latest.current.list, t);
    // a save that changed nothing (the same seconds again) is not sent
    if (list === latest.current.list) return;
    latest.current = { planId: t.planId, list };
    setTimes(latest.current);
    void store.saveTime(t);
  }, [store]);

  return { times: times.planId === planId ? times.list : [], loaded: !planId || times.planId === planId, saveTime };
}
