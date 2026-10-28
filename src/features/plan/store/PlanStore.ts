import type { PlanState } from "../model/types";

/**
 * Where the plan feature keeps its data. The UI only talks to this, so the localStorage store can be swapped for an API
 * (same two calls, same document) without touching a component. Async on purpose, for that day.
 */
export interface PlanStore {
  load(): Promise<PlanState>;
  save(state: PlanState): Promise<void>;
}
