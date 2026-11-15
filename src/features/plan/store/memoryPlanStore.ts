import { withDayTime, type DayTime } from "../model/planTime";
import { EMPTY_STATE, type PlanState } from "../model/types";
import type { PlanStore } from "./PlanStore";

/** A plan kept in memory for one visit, saving nothing: a visitor's pages and the demo plan. Each call starts from `initial`. */
export function memoryPlanStore(initial: PlanState = EMPTY_STATE): PlanStore {
  let held = initial;
  let times: DayTime[] = [];
  return {
    load: async () => held,
    save: async (s) => {
      held = s;
    },
    loadTimes: async (planId) => times.filter((t) => t.planId === planId),
    saveTime: async (t) => {
      times = withDayTime(times, t);
    },
  };
}
