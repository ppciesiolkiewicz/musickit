import type { ProgressEntry } from "./log";

/**
 * Where the progress log is kept: one row per rated exercise. The UI only talks to this, so the localStorage store (a
 * mock database for now) can be swapped for an API without touching a component. Async on purpose, for that day.
 */
export interface ProgressStore {
  list(): Promise<ProgressEntry[]>;
  /** Add the row, or replace the one its exercise already has. */
  put(entry: ProgressEntry): Promise<void>;
  /** Drop the exercise's row, if it has one. */
  remove(exerciseId: string): Promise<void>;
}
