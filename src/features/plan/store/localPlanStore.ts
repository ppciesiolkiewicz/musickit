import { EMPTY_STATE, type PlanState, type StoredPlan } from "../model/types";
import type { PlanStore } from "./PlanStore";

export const PLAN_KEY = "musickit.plan";

const isPlan = (p: unknown): p is StoredPlan => {
  const x = p as StoredPlan;
  return !!x && typeof x.id === "string" && typeof x.startedOn === "string" && Array.isArray(x.config?.days) && typeof x.done === "object";
};

/** A stored document, made safe: anything missing or broken falls back to the empty state's value. */
export function sanitiseState(raw: unknown): PlanState {
  const s = (raw ?? {}) as Partial<PlanState>;
  const r = s.reminder;
  return {
    answers: s.answers && typeof s.answers === "object" ? { ...s.answers } : null,
    current: isPlan(s.current) ? s.current : null,
    history: Array.isArray(s.history) ? s.history.filter(isPlan).slice(0, 20) : [],
    reminder: {
      enabled: !!r?.enabled,
      time: typeof r?.time === "string" && /^\d\d:\d\d$/.test(r.time) ? r.time : EMPTY_STATE.reminder.time,
      ...(typeof r?.lastShownOn === "string" ? { lastShownOn: r.lastShownOn } : {}),
    },
  };
}

/** The plan in this browser's localStorage, one JSON document. Private windows or blocked storage give the empty state. */
export const localPlanStore: PlanStore = {
  async load() {
    try {
      return sanitiseState(JSON.parse(window.localStorage.getItem(PLAN_KEY) ?? "null"));
    } catch {
      return sanitiseState(null);
    }
  },
  async save(state) {
    try {
      window.localStorage.setItem(PLAN_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep going in memory */
    }
  },
};
