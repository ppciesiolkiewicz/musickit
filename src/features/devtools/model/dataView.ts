import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";

/** One stored plan as /dev/data lists it. */
export interface PlanRow {
  id: string;
  title: string;
  startedOn: string;
  /** exercises with stars, of `total` in the week */
  rated: number;
  total: number;
  current: boolean;
  /** the AI's hidden progress summary that came with the plan */
  progress?: string;
}

const rowOf = (p: StoredPlan, current: boolean): PlanRow => ({
  id: p.id,
  title: p.config.title,
  startedOn: p.startedOn,
  rated: Object.keys(p.rated ?? {}).length,
  total: p.config.days.reduce((n, d) => n + d.exercises.length, 0),
  current,
  ...(p.config.progress ? { progress: p.config.progress } : {}),
});

/** The stored plans: the current one first, then the history in its own order (newest first). */
export const planRows = (state: PlanState): PlanRow[] => [...(state.current ? [rowOf(state.current, true)] : []), ...state.history.map((p) => rowOf(p, false))];

/** The progress log, newest rating first; `topic` (a topic id) keeps only that topic's rows. */
export const logRows = (entries: ProgressEntry[], topic?: string): ProgressEntry[] =>
  entries.filter((e) => !topic || e.topic === topic).sort((a, b) => b.at.localeCompare(a.at));
