import { sanitiseState } from "../model/state";
import type { PlanStore } from "./PlanStore";

export { sanitiseState };

/** The one localStorage key the plan document is kept under. */
export const PLAN_KEY = "musickit.plan";
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
};
