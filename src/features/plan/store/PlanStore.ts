import type { DayTime } from "../model/planTime";
import type { PlanState } from "../model/types";

/**
 * Where the plan feature keeps its data. The UI only talks to this, so the localStorage store can be swapped for an API
 * (same calls, same document) without touching a component. Async on purpose, for that day.
 *
 * The day timer's seconds (`DayTime`) are kept apart from the plan document: on the server they are rows of their own,
 * so a timer save sends a few bytes, never the plan.
 */
export interface PlanStore {
  load(): Promise<PlanState>;
  save(state: PlanState): Promise<void>;
  /** The day timer's records of one plan, a day each; none for a plan the timer never ran on. */
  loadTimes(planId: string): Promise<DayTime[]>;
  /** Keeps one day's record, replacing the one before. */
  saveTime(time: DayTime): Promise<void>;
  /** Sends a save still waiting now and waits for it: true once the latest state is on the server. A store in this browser has none. */
  flush?(): Promise<boolean>;
}
