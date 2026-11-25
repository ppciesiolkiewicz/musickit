import { parseDayTime, withDayTime, type DayTime } from "../model/planTime";
import { sanitiseState } from "../model/state";
import type { PlanStore } from "./PlanStore";

export { sanitiseState };

/** The one localStorage key the plan document is kept under. */
export const PLAN_KEY = "musickit.plan";
/** The day timer's records (`DayTime`), every plan's, apart from the plan. */
export const PLAN_TIMES_KEY = "musickit.planTimes";
/** The most day records kept in this browser: three months of daily practice; the oldest go first. */
const MAX_TIMES = 100;

/** Every day timer record in this browser, made safe (for /admin/dev/data too). */
export function readLocalTimes(): DayTime[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(PLAN_TIMES_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.flatMap((r) => parseDayTime(r) ?? []) : [];
  } catch {
    return [];
  }
}
/**
 * The plan in this browser's localStorage, one JSON document: the store for the site without a database (accounts off).
 * Private windows or blocked storage give the empty state.
 */
export const localPlanStore: PlanStore = {
  async load() {
    try {
      const text = window.localStorage.getItem(PLAN_KEY);
      const state = sanitiseState(JSON.parse(text ?? "null"));
      // what loading changed (exercise ids given to an older plan) is stored at once, so it stays the same on the next load
      if (text !== null && JSON.stringify(state) !== text) await this.save(state);
      return state;
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
  async loadTimes(planId) {
    return readLocalTimes().filter((t) => t.planId === planId);
  },
  async loadAllTimes() {
    return readLocalTimes();
  },
  async saveTime(time) {
    const all = readLocalTimes();
    const next = withDayTime(all, time);
    if (next === all) return;
    try {
      // the record just saved goes last, so the oldest are the first dropped
      window.localStorage.setItem(PLAN_TIMES_KEY, JSON.stringify([...next.filter((t) => t !== time), time].slice(-MAX_TIMES)));
    } catch {
      /* storage full or blocked */
    }
  },
};
