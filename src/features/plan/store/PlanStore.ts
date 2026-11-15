import type { PlanState } from "../model/types";

/**
 * Where the plan feature keeps its data. The UI only talks to this, so the localStorage store can be swapped for an API
 * (same two calls, same document) without touching a component. Async on purpose, for that day.
 */
export interface PlanStore {
  load(): Promise<PlanState>;
  save(state: PlanState): Promise<void>;
  /** Sends a save still waiting now and waits for it: true once the latest state is on the server. A store in this browser has none. */
  flush?(): Promise<boolean>;
}
